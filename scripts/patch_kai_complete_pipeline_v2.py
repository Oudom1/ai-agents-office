from pathlib import Path
import json

api=Path('api/src/index.ts')
s=api.read_text()

s=s.replace("import { randomBytes, timingSafeEqual, createECDH, hkdfSync, createDecipheriv } from 'node:crypto';", "import { randomBytes, timingSafeEqual, createECDH, hkdfSync, createDecipheriv } from 'node:crypto';\nimport { readFile, writeFile, mkdir } from 'node:fs/promises';\nimport { join } from 'node:path';\nimport { tmpdir } from 'node:os';\nimport { spawn } from 'node:child_process';\nimport { createRequire } from 'node:module';")
anchor="const HF_TOKEN = process.env.HF_TOKEN || '';"
extra="""const HF_TOKEN = process.env.HF_TOKEN || '';
const require = createRequire(import.meta.url);
const ffmpegPath = require('ffmpeg-static') as string | null;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1SDKs0stvoeIkYIhEcP5znRq7-tSyaEpl';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || 'https://ai-agents-office-api.onrender.com').replace(/\\/$/,'');"""
s=s.replace(anchor,extra,1)
s=s.replace("const videoJobs = new Map<string,{status:'generating'|'done'|'failed';provider:string;videoUrl?:string;error?:string;taskId?:string}>();", "const videoJobs = new Map<string,{status:'generating'|'done'|'failed';provider:string;videoUrl?:string;driveUrl?:string;localPath?:string;error?:string;taskId?:string}>();")
insert_after="""function hfHeaders(extra:Record<string,string>={}){
  return {...extra,accept:'application/json',...(HF_TOKEN?{authorization:`Bearer ${HF_TOKEN}`}:{})};
}
"""
helpers=r'''
function driveConfigured(){ return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN && GOOGLE_DRIVE_FOLDER_ID); }
function requestedVideoSeconds(prompt:string){
  const m=prompt.match(/(\d+)\s*(?:minute|minutes|min)\b/i); if(m) return Math.max(1,Math.min(60,Number(m[1])*60));
  const sec=prompt.match(/(\d+)\s*(?:second|seconds|sec|secs)\b/i); if(sec) return Math.max(1,Math.min(60,Number(sec[1])));
  return 8;
}
async function getGoogleAccessToken(){
  const body=new URLSearchParams({client_id:GOOGLE_CLIENT_ID,client_secret:GOOGLE_CLIENT_SECRET,refresh_token:GOOGLE_REFRESH_TOKEN,grant_type:'refresh_token'});
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  if(!r.ok) throw new Error(`Google OAuth HTTP ${r.status}: ${await r.text()}`);
  const j:any=await r.json(); if(!j.access_token) throw new Error('Google OAuth did not return an access token'); return String(j.access_token);
}
async function uploadToGoogleDrive(filePath:string,fileName:string){
  if(!driveConfigured()) return undefined;
  const accessToken=await getGoogleAccessToken();
  const init=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink,webContentLink',{method:'POST',headers:{authorization:`Bearer ${accessToken}`,'content-type':'application/json; charset=UTF-8','x-upload-content-type':'video/mp4'},body:JSON.stringify({name:fileName,mimeType:'video/mp4',parents:[GOOGLE_DRIVE_FOLDER_ID]})});
  if(!init.ok) throw new Error(`Google Drive initiate upload HTTP ${init.status}: ${await init.text()}`);
  const uploadUrl=init.headers.get('location'); if(!uploadUrl) throw new Error('Google Drive did not return a resumable upload URL');
  const bytes=await readFile(filePath);
  const put=await fetch(uploadUrl,{method:'PUT',headers:{authorization:`Bearer ${accessToken}`,'content-type':'video/mp4','content-length':String(bytes.length)},body:bytes});
  if(!put.ok) throw new Error(`Google Drive upload HTTP ${put.status}: ${await put.text()}`);
  const file:any=await put.json(); return {id:String(file.id),webViewLink:String(file.webViewLink||`https://drive.google.com/file/d/${file.id}/view`)};
}
async function downloadClip(url:string,filePath:string){
  const r=await fetch(url,{headers:url.includes(HF_SPACE_HOST)?hfHeaders():{}}); if(!r.ok) throw new Error(`Video download HTTP ${r.status}`);
  await writeFile(filePath,Buffer.from(await r.arrayBuffer()));
}
async function runFfmpeg(args:string[]){
  if(!ffmpegPath) throw new Error('FFmpeg binary unavailable');
  await new Promise<void>((resolve,reject)=>{
    const p:any=spawn(ffmpegPath,args,{stdio:['ignore','ignore','pipe']}); let err='';
    p.stderr?.on('data',(d:Buffer)=>{err+=String(d); if(err.length>12000) err=err.slice(-12000);});
    p.on('error',reject); p.on('close',(code:number|null)=>code===0?resolve():reject(new Error(`FFmpeg failed (${code}): ${err.slice(-2000)}`)));
  });
}
async function mergeClips(files:string[],output:string){
  if(files.length===1){ await writeFile(output,await readFile(files[0])); return; }
  const listPath=join(tmpdir(),`kai-list-${randomBytes(8).toString('hex')}.txt`); await writeFile(listPath,files.map(f=>`file '${f}'`).join('\n'));
  try{ await runFfmpeg(['-y','-f','concat','-safe','0','-i',listPath,'-c','copy',output]); }
  catch{ await runFfmpeg(['-y','-f','concat','-safe','0','-i',listPath,'-c:v','libx264','-preset','ultrafast','-c:a','aac','-movflags','+faststart',output]); }
}
'''
s=s.replace(insert_after,insert_after+helpers,1)
s=s.replace("function buildHfInputs(parameters:any[],prompt:string){", "function buildHfInputs(parameters:any[],prompt:string,clipSeconds=8){")
s=s.replace("if(label.includes('duration') || label.includes('seconds')) return 2;", "if(label.includes('duration') || label.includes('seconds')) return Math.max(1,Math.min(8,clipSeconds));")
start=s.index("async function runHfVideo(")
end=s.index("app.get('/api/video/providers'",start)
new_run=r'''async function generateHfClip(prompt:string,clipSeconds:number){
  const infoRes=await fetch(`${hfSpaceBase()}/gradio_api/info`,{headers:hfHeaders()}); if(!infoRes.ok) throw new Error(`Space info HTTP ${infoRes.status}`);
  const info:any=await infoRes.json(); const entries=Object.entries(info?.named_endpoints||{}) as [string,any][];
  const chosen=entries.find(([k])=>/text.*video|t2v/i.test(k)) || entries.find(([k])=>/generate.*video|video.*generate|generate|predict/i.test(k)); if(!chosen) throw new Error('No usable Gradio text-to-video endpoint found');
  const [endpoint,meta]=chosen; const apiName=endpoint.replace(/^\//,''); const data=buildHfInputs(meta?.parameters||[],prompt,clipSeconds);
  const call=await fetch(`${hfSpaceBase()}/gradio_api/call/${encodeURIComponent(apiName)}`,{method:'POST',headers:hfHeaders({'content-type':'application/json'}),body:JSON.stringify({data})}); if(!call.ok) throw new Error(`ZeroGPU queue HTTP ${call.status}`);
  const queued:any=await call.json(); const eventId=String(queued?.event_id||''); if(!eventId) throw new Error('ZeroGPU did not return an event id');
  const stream=await fetch(`${hfSpaceBase()}/gradio_api/call/${encodeURIComponent(apiName)}/${encodeURIComponent(eventId)}`,{headers:hfHeaders()}); if(!stream.ok) throw new Error(`ZeroGPU result HTTP ${stream.status}`);
  const text=await stream.text(); const providerError=providerErrorFromSse(text); if(providerError) throw new Error(providerError);
  let videoUrl:string|undefined; for(const line of text.split('\n')){ if(!line.startsWith('data:')) continue; try{videoUrl=normalizeVideoUrl(JSON.parse(line.slice(5).trim()))||videoUrl;}catch{} }
  if(!videoUrl) throw new Error('ZeroGPU completed without a real MP4 URL'); return videoUrl;
}
async function generateHfClipWithRetry(prompt:string,clipSeconds:number){
  let last='generation failed'; for(let attempt=1;attempt<=3;attempt++){ try{return await generateHfClip(prompt,clipSeconds);}catch(e:any){last=String(e?.message||e||last); if(/quota|exceeded|overquota/i.test(last)||attempt===3) break; await new Promise(r=>setTimeout(r,attempt*2500));} } throw new Error(last);
}
async function runHfVideo(jobId:string,prompt:string,taskId:string){
  const job=videoJobs.get(jobId); if(!job) return; const task=tasks.find(t=>t.id===taskId); const kai=agents.find(a=>a.id==='implement');
  try{
    const targetSeconds=requestedVideoSeconds(prompt); const sceneCount=Math.max(1,Math.ceil(targetSeconds/8)); const workDir=join(tmpdir(),`kai-${jobId}`); await mkdir(workDir,{recursive:true}); const clips:string[]=[]; let remaining=targetSeconds;
    for(let i=0;i<sceneCount;i++){
      const sceneSec=Math.max(1,Math.min(8,remaining)); remaining-=sceneSec;
      if(task){(task as any).phase='generating';(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).resultMessage=`Generating scene ${i+1}/${sceneCount} (${sceneSec}s target). Kai stays working until the final MP4 is ready.`;delete (task as any).blocker;}
      const scenePrompt=sceneCount>1?`${prompt}\nScene ${i+1} of ${sceneCount}. Keep the same characters, visual style and story continuity. Continue naturally and last about ${sceneSec} seconds.`:prompt;
      const clipUrl=await generateHfClipWithRetry(scenePrompt,sceneSec); const clipPath=join(workDir,`scene-${String(i+1).padStart(2,'0')}.mp4`); await downloadClip(clipUrl,clipPath); clips.push(clipPath);
    }
    if(task){(task as any).phase='merging';(task as any).resultMessage=`All ${sceneCount} scene(s) generated — merging into one MP4...`;}
    const finalPath=join(workDir,'final.mp4'); await mergeClips(clips,finalPath); job.localPath=finalPath; job.videoUrl=`${PUBLIC_BASE_URL}/api/video/files/${jobId}`;
    let driveUrl:string|undefined;
    if(driveConfigured()){
      if(task){(task as any).phase='uploading';(task as any).resultMessage='Final MP4 ready — uploading to Kai Video Workspace in Google Drive...';}
      const uploaded=await uploadToGoogleDrive(finalPath,`Kai-${new Date().toISOString().replace(/[:.]/g,'-')}-${jobId.slice(0,8)}.mp4`); driveUrl=uploaded?.webViewLink; job.driveUrl=driveUrl;
    }
    job.status='done'; const completedAt=new Date(); const startedMs=task?.startedAt?new Date((task as any).startedAt).getTime():completedAt.getTime(); const actualSec=Math.max(0,Math.floor((completedAt.getTime()-startedMs)/1000));
    if(task){task.status='done';(task as any).phase='completed';(task as any).videoUrl=job.videoUrl;(task as any).driveUrl=driveUrl;(task as any).durationSec=targetSeconds;(task as any).generationTimeSec=actualSec;(task as any).resultMessage=driveUrl?`Complete — ${targetSeconds}s target video assembled from ${sceneCount} scene(s), generated in ${actualSec}s and uploaded to Google Drive.`:`Complete — ${targetSeconds}s target video assembled from ${sceneCount} scene(s) in ${actualSec}s. Google Drive upload is not configured yet.`;delete (task as any).blocker;task.completedAt=completedAt.toISOString();}
    if(kai){(kai as any).state='working';(kai as any).currentTask=undefined;(kai as any).destination=(kai as any).home;}
  }catch(e:any){
    const err=String(e?.message||e||'ZeroGPU generation failed'); job.status='failed';job.error=err; const finalMsg=/quota|exceeded|overquota/i.test(err)?`Free ZeroGPU quota unavailable: ${err}`:`Kai pipeline failed: ${err}`;
    if(task){(task as any).phase='provider-error';(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).resultMessage=finalMsg;(task as any).blocker=`Kai video provider error: ${finalMsg}`;} console.error('Kai video pipeline failed',err);
  }
}
app.get('/api/video/files/:generationId',async(req,res)=>{const job=videoJobs.get(String(req.params.generationId||''));if(!job?.localPath)return res.status(404).send('Video file not found');res.setHeader('Cache-Control','private, max-age=3600');return res.sendFile(job.localPath);});

'''
s=s[:start]+new_run+s[end:]
s=s.replace("videoProvider:{name:'Hugging Face ZeroGPU LTX Video Fast',configured:true,freeOnly:true,paidFallback:false,bestEffort:true,space:HF_SPACE_ID,authenticated:Boolean(HF_TOKEN),quotaMode:HF_TOKEN?'free-account':'anonymous'},", "videoProvider:{name:'Hugging Face ZeroGPU LTX Video Fast',configured:true,freeOnly:true,paidFallback:false,bestEffort:true,space:HF_SPACE_ID,authenticated:Boolean(HF_TOKEN),quotaMode:HF_TOKEN?'free-account':'anonymous',maxOutputSeconds:60,sceneSeconds:8},\n  googleDrive:{configured:driveConfigured(),folderId:GOOGLE_DRIVE_FOLDER_ID},")
s=s.replace("if(job.status==='done' && job.videoUrl) return res.json({ok:true,status:'done',provider:job.provider,videoUrl:job.videoUrl,generationId});", "if(job.status==='done' && job.videoUrl) return res.json({ok:true,status:'done',provider:job.provider,videoUrl:job.videoUrl,driveUrl:job.driveUrl,generationId});")
api.write_text(s)

pkg=Path('api/package.json'); p=json.loads(pkg.read_text()); p.setdefault('dependencies',{})['ffmpeg-static']='^5.2.0'; pkg.write_text(json.dumps(p,indent=2)+"\n")
front=Path('frontend/src/main.tsx'); f=front.read_text(); f=f.replace("  driveUrl?: string;","  driveUrl?: string;\n  videoUrl?: string;\n  generationTimeSec?: number;")
f=f.replace("if(result.status==='done' && result.videoUrl){window.clearInterval(timer);await refresh();setNotice('Kai completed the task — a real MP4 was generated by Hugging Face ZeroGPU.');return;}","if(result.status==='done' && result.videoUrl){window.clearInterval(timer);patchTask(task.id,{videoUrl:result.videoUrl,driveUrl:result.driveUrl});await refresh();setNotice(result.driveUrl ? 'Kai completed the task — final MP4 uploaded to Google Drive.' : 'Kai completed the task — final MP4 is ready. Google Drive upload is not configured yet.');return;}")
f=f.replace("Real provider route: Hugging Face ZeroGPU LTX Video Fast first. PixVerse Free and Runway Free/Trial remain manual alternatives. FREE ONLY; no paid fallback. ZeroGPU is best-effort and may queue or be temporarily unavailable. Kai completes only when a real MP4 URL is returned.","Real provider route: Hugging Face ZeroGPU LTX Video Fast. Longer requests are split into short scenes, merged into one MP4, then uploaded to Google Drive when Drive OAuth is configured. FREE ONLY; no paid fallback. Kai completes only after the final MP4 exists.")
f=f.replace("{task.driveUrl && <a className=\"result-link\" href={task.driveUrl} target=\"_blank\" rel=\"noreferrer\">Open Video in Google Drive</a>}</div>; }","{task.videoUrl && <a className=\"result-link\" href={task.videoUrl} target=\"_blank\" rel=\"noreferrer\">Open Final MP4</a>}{task.driveUrl && <a className=\"result-link\" href={task.driveUrl} target=\"_blank\" rel=\"noreferrer\">Open Video in Google Drive</a>}</div>; }")
f=f.replace("function friendlyPhase(phase?: string) { if (phase === 'starting') return 'Connecting'; if (phase === 'generating') return 'Generating';","function friendlyPhase(phase?: string) { if (phase === 'starting') return 'Connecting'; if (phase === 'generating') return 'Generating'; if (phase === 'merging') return 'Merging'; if (phase === 'uploading') return 'Uploading';")
front.write_text(f)

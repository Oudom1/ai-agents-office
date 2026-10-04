from pathlib import Path

p=Path('api/src/index.ts')
s=p.read_text()

# 1) stable landscape frames and deterministic seed
s=s.replace("    if(name==='randomize_seed') return true;", "    if(name==='randomize_seed') return false;", 1)
s=s.replace("    if(label.includes('height')) return 512;\n    if(label.includes('width')) return 288;", "    if(label.includes('height')) return 288;\n    if(label.includes('width')) return 512;", 1)

# 2) add Edge TTS import after createRequire setup
anchor="const ffmpegPath = require('ffmpeg-static') as string | null;"
if "node-edge-tts" not in s:
    s=s.replace(anchor, anchor+"\nconst { EdgeTTS } = require('node-edge-tts');\nconst KAI_TTS_VOICE = process.env.KAI_TTS_VOICE || 'en-US-GuyNeural';", 1)

# 3) normalize each provider clip to exact requested scene duration and 16:9
merge_anchor="""async function mergeClips(files:string[],output:string){
  if(files.length===1){ await writeFile(output,await readFile(files[0])); return; }
  const listPath=join(tmpdir(),`kai-list-${randomBytes(8).toString('hex')}.txt`); await writeFile(listPath,files.map(f=>`file '${f}'`).join('\\n'));
  try{ await runFfmpeg(['-y','-f','concat','-safe','0','-i',listPath,'-c','copy',output]); }
  catch{ await runFfmpeg(['-y','-f','concat','-safe','0','-i',listPath,'-c:v','libx264','-preset','ultrafast','-c:a','aac','-movflags','+faststart',output]); }
}
"""
extra="""
async function normalizeSceneClip(input:string,output:string,seconds:number){
  await runFfmpeg(['-y','-stream_loop','-1','-i',input,'-t',String(seconds),'-vf','scale=512:288:force_original_aspect_ratio=decrease,pad=512:288:(ow-iw)/2:(oh-ih)/2,setsar=1','-an','-r','24','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-movflags','+faststart',output]);
}
function narrationFromPrompt(prompt:string){
  if(/\\b(?:no voice|silent|mute|without (?:voice|audio|narration))\\b/i.test(prompt)) return '';
  let text=prompt.replace(/\\b(?:create|make|generate|produce)\\b/ig,'').replace(/\\b\\d+\\s*(?:minutes?|mins?|seconds?|secs?)\\b/ig,'').replace(/\\b(?:video|cartoon|animation|clip)\\b/ig,'').replace(/\\s+/g,' ').trim();
  if(!text) text='Here is Kai with your animated story.';
  return text.slice(0,600);
}
async function addNarration(videoPath:string,output:string,prompt:string,targetSeconds:number){
  const narration=narrationFromPrompt(prompt);
  if(!narration){ await writeFile(output,await readFile(videoPath)); return false; }
  const audioPath=join(tmpdir(),`kai-voice-${randomBytes(8).toString('hex')}.mp3`);
  const tts=new EdgeTTS({voice:KAI_TTS_VOICE,lang:'en-US',outputFormat:'audio-24khz-96kbitrate-mono-mp3',rate:'+0%',pitch:'+0Hz',volume:'+0%',timeout:30000});
  await tts.ttsPromise(narration,audioPath);
  await runFfmpeg(['-y','-i',videoPath,'-i',audioPath,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-af','apad','-t',String(targetSeconds),'-movflags','+faststart',output]);
  return true;
}
"""
if 'async function normalizeSceneClip' not in s:
    if merge_anchor not in s: raise SystemExit('merge anchor not found')
    s=s.replace(merge_anchor, merge_anchor+extra, 1)

# 4) normalize every scene after download
old="const clipUrl=await generateHfClipWithRetry(scenePrompt,sceneSec); const clipPath=join(workDir,`scene-${String(i+1).padStart(2,'0')}.mp4`); await downloadClip(clipUrl,clipPath); clips.push(clipPath);"
new="const clipUrl=await generateHfClipWithRetry(scenePrompt,sceneSec); const rawClipPath=join(workDir,`scene-${String(i+1).padStart(2,'0')}-raw.mp4`); const clipPath=join(workDir,`scene-${String(i+1).padStart(2,'0')}.mp4`); await downloadClip(clipUrl,rawClipPath); await normalizeSceneClip(rawClipPath,clipPath,sceneSec); clips.push(clipPath);"
if old not in s: raise SystemExit('clip anchor not found')
s=s.replace(old,new,1)

# 5) add narration after merge, use voiced path as final artifact
old2="const finalPath=join(workDir,'final.mp4'); await mergeClips(clips,finalPath); job.localPath=finalPath; job.videoUrl=`${PUBLIC_BASE_URL}/api/video/files/${jobId}`;"
new2="const mergedPath=join(workDir,'merged.mp4'); await mergeClips(clips,mergedPath); const finalPath=join(workDir,'final.mp4'); if(task){(task as any).phase='voicing';(task as any).resultMessage='Scenes merged — adding free neural voice narration...';} let voiceAdded=false; try{voiceAdded=await addNarration(mergedPath,finalPath,prompt,targetSeconds);}catch(e:any){console.warn('Kai TTS unavailable, keeping video without narration',String(e?.message||e));await writeFile(finalPath,await readFile(mergedPath));} job.localPath=finalPath; job.videoUrl=`${PUBLIC_BASE_URL}/api/video/files/${jobId}`; (job as any).voiceAdded=voiceAdded;"
if old2 not in s: raise SystemExit('final merge anchor not found')
s=s.replace(old2,new2,1)

# 6) expose voice and frame in health and completion status
s=s.replace("maxOutputSeconds:60,sceneSeconds:8}", "maxOutputSeconds:60,sceneSeconds:8,frame:'512x288 16:9',voice:'Edge neural TTS (free best-effort)'}", 1)
s=s.replace("`Complete — ${targetSeconds}s target video assembled from ${sceneCount} scene(s), generated in ${actualSec}s and uploaded to Google Drive.`", "`Complete — ${targetSeconds}s target video assembled from ${sceneCount} normalized 16:9 scene(s), ${voiceAdded?'voice added':'voice unavailable'}, generated in ${actualSec}s and uploaded to Google Drive.`", 1)
s=s.replace("`Complete — ${targetSeconds}s target video assembled from ${sceneCount} scene(s) in ${actualSec}s. Google Drive upload is not configured yet.`", "`Complete — ${targetSeconds}s target video assembled from ${sceneCount} normalized 16:9 scene(s), ${voiceAdded?'voice added':'voice unavailable'}, in ${actualSec}s. Google Drive upload is not configured yet.`", 1)

p.write_text(s)

pkg=Path('api/package.json')
ps=pkg.read_text()
if 'node-edge-tts' not in ps:
    ps=ps.replace('"ffmpeg-static": "^5.2.0"', '"ffmpeg-static": "^5.2.0",\n    "node-edge-tts": "^1.2.10"')
pkg.write_text(ps)
print('Kai frame + voice patch applied')

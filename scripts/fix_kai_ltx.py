from pathlib import Path

p = Path('api/src/index.ts')
s = p.read_text()
s = s.replace("const HF_SPACE_ID = process.env.HF_SPACE_ID || 'numanajmal0/Wan-Video-API';", "const HF_SPACE_ID = process.env.HF_SPACE_ID || 'Lightricks/ltx-video-distilled';")

start = s.index('function normalizeVideoUrl')
end = s.index("app.get('/api/video/providers'", start)
block = r'''function normalizeVideoUrl(value:any):string|undefined{
  const base=hfSpaceBase();
  const walk=(v:any):string|undefined=>{
    if(!v) return undefined;
    if(typeof v==='string'){
      if(/^https?:\/\//i.test(v) && /\.mp4(?:\?|$)/i.test(v)) return v;
      if(v.startsWith('/tmp/') && /\.mp4(?:\?|$)/i.test(v)) return `${base}/gradio_api/file=${v}`;
      if(v.startsWith('/gradio_api/file=') && /\.mp4(?:\?|$)/i.test(v)) return base+v;
      return undefined;
    }
    if(Array.isArray(v)){ for(const item of v){const found=walk(item);if(found)return found;} return undefined; }
    if(typeof v==='object'){
      const direct=(v.url || v.video_url || v.path || v.name) as any;
      const found=walk(direct); if(found) return found;
      if(v.video){const nestedVideo=walk(v.video);if(nestedVideo)return nestedVideo;}
      for(const val of Object.values(v)){const nested=walk(val);if(nested)return nested;}
    }
    return undefined;
  };
  return walk(value);
}

function buildHfInputs(parameters:any[],prompt:string){
  return (parameters||[]).map((p:any)=>{
    const name=String(p?.parameter_name||'').toLowerCase();
    const label=String(p?.label||name||p?.name||'').toLowerCase();
    const def=p?.parameter_default ?? p?.default ?? p?.value;
    const example=p?.example_input;
    if(name==='input_image_filepath' || name==='input_video_filepath') return null;
    if(name==='mode') return 'text-to-video';
    if(name==='randomize_seed') return true;
    if(name==='ui_frames_to_use') return def ?? 9;
    if(label.includes('negative')) return def ?? '';
    if(label.includes('prompt')) return prompt;
    if(name==='seed_ui' || label==='seed') return 42;
    if(label.includes('height')) return 512;
    if(label.includes('width')) return 288;
    if(label.includes('guidance') || label.includes('cfg')) return def ?? 1;
    if(label.includes('duration') || label.includes('seconds')) return 2;
    return def ?? example ?? null;
  });
}

function providerErrorFromSse(text:string):string|undefined{
  const lines=text.split('\n');
  let errorEvent=false;
  for(const line of lines){
    if(line.trim()==='event: error') errorEvent=true;
    if(errorEvent && line.startsWith('data:')){
      const raw=line.slice(5).trim();
      try{
        const payload=JSON.parse(raw);
        return String(payload?.error || payload?.title || 'Provider returned an error');
      }catch{return raw || 'Provider returned an error';}
    }
  }
  return undefined;
}

async function runHfVideo(jobId:string,prompt:string,taskId:string){
  const job=videoJobs.get(jobId); if(!job) return;
  const task=tasks.find(t=>t.id===taskId);
  try{
    const infoRes=await fetch(`${hfSpaceBase()}/gradio_api/info`,{headers:{accept:'application/json'}});
    if(!infoRes.ok) throw new Error(`Space info HTTP ${infoRes.status}`);
    const info:any=await infoRes.json();
    const endpoints=info?.named_endpoints || {};
    const entries=Object.entries(endpoints) as [string,any][];
    const chosen=entries.find(([k])=>/text.*video|t2v/i.test(k)) || entries.find(([k])=>/generate.*video|video.*generate|generate|predict/i.test(k));
    if(!chosen) throw new Error('No usable Gradio text-to-video endpoint found');
    const [endpoint,meta]=chosen;
    const apiName=endpoint.replace(/^\//,'');
    const data=buildHfInputs(meta?.parameters||[],prompt);
    const call=await fetch(`${hfSpaceBase()}/gradio_api/call/${encodeURIComponent(apiName)}`,{
      method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({data})
    });
    if(!call.ok) throw new Error(`ZeroGPU queue HTTP ${call.status}`);
    const queued:any=await call.json();
    const eventId=String(queued?.event_id||'');
    if(!eventId) throw new Error('ZeroGPU did not return an event id');
    const stream=await fetch(`${hfSpaceBase()}/gradio_api/call/${encodeURIComponent(apiName)}/${encodeURIComponent(eventId)}`);
    if(!stream.ok) throw new Error(`ZeroGPU result HTTP ${stream.status}`);
    const text=await stream.text();
    const providerError=providerErrorFromSse(text);
    if(providerError) throw new Error(providerError);
    let videoUrl:string|undefined;
    for(const line of text.split('\n')){
      if(!line.startsWith('data:')) continue;
      const raw=line.slice(5).trim();
      try{ const payload=JSON.parse(raw); videoUrl=normalizeVideoUrl(payload) || videoUrl; }catch{}
    }
    if(!videoUrl) throw new Error('ZeroGPU completed without a real MP4 URL');
    job.status='done'; job.videoUrl=videoUrl;
    if(task){task.status='done';(task as any).phase='completed';(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).driveUrl=videoUrl;(task as any).resultMessage='Complete — real MP4 generated by Hugging Face ZeroGPU LTX Video Fast';task.completedAt=new Date().toISOString();}
  }catch(e:any){
    job.status='failed'; job.error=String(e?.message||e||'ZeroGPU generation failed');
    if(task){(task as any).phase='provider-error';(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).resultMessage=`ZeroGPU unavailable: ${job.error}`;}
    console.error('Hugging Face ZeroGPU generation error',e);
  }
}

'''
s = s[:start] + block + s[end:]
s = s.replace("{id:'hf-zerogpu',name:'Hugging Face ZeroGPU Wan',configured:true,mode:'api',priority:1,space:HF_SPACE_ID,note:'Free best-effort; queue/availability can change'},", "{id:'hf-zerogpu-ltx',name:'Hugging Face ZeroGPU LTX Video Fast',configured:true,mode:'api',priority:1,space:HF_SPACE_ID,note:'Free best-effort; queue/availability can change'},")
s = s.replace("provider:'Hugging Face ZeroGPU Wan'", "provider:'Hugging Face ZeroGPU LTX Video Fast'")
s = s.replace("(task as any).provider='Hugging Face ZeroGPU Wan'", "(task as any).provider='Hugging Face ZeroGPU LTX Video Fast'")
p.write_text(s)

f = Path('frontend/src/main.tsx')
x = f.read_text().replace('Hugging Face ZeroGPU Wan','Hugging Face ZeroGPU LTX Video Fast')
f.write_text(x)

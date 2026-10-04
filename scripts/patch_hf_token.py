from pathlib import Path
p=Path('api/src/index.ts')
s=p.read_text()
anchor="const HF_SPACE_HOST = process.env.HF_SPACE_HOST || HF_SPACE_ID.toLowerCase().replace(/_/g,'-').replace(/\\//g,'-') + '.hf.space';"
if "const HF_TOKEN = process.env.HF_TOKEN || '';" not in s:
    s=s.replace(anchor, anchor+"\nconst HF_TOKEN = process.env.HF_TOKEN || '';",1)
anchor2="function hfSpaceBase(){ return `https://${HF_SPACE_HOST}`; }"
helper="""function hfSpaceBase(){ return `https://${HF_SPACE_HOST}`; }
function hfHeaders(extra:Record<string,string>={}){
  return {...extra,accept:'application/json',...(HF_TOKEN?{authorization:`Bearer ${HF_TOKEN}`}:{})};
}"""
if "function hfHeaders(" not in s:
    s=s.replace(anchor2,helper,1)
s=s.replace("const infoRes=await fetch(`${hfSpaceBase()}/gradio_api/info`,{headers:{accept:'application/json'}});","const infoRes=await fetch(`${hfSpaceBase()}/gradio_api/info`,{headers:hfHeaders()});")
s=s.replace("method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({data})","method:'POST',headers:hfHeaders({'content-type':'application/json'}),body:JSON.stringify({data})")
s=s.replace("const stream=await fetch(`${hfSpaceBase()}/gradio_api/call/${encodeURIComponent(apiName)}/${encodeURIComponent(eventId)}`);","const stream=await fetch(`${hfSpaceBase()}/gradio_api/call/${encodeURIComponent(apiName)}/${encodeURIComponent(eventId)}`,{headers:hfHeaders()});")
s=s.replace("videoProvider:{name:'Hugging Face ZeroGPU Wan',configured:true,freeOnly:true,paidFallback:false,bestEffort:true,space:HF_SPACE_ID},","videoProvider:{name:'Hugging Face ZeroGPU LTX Video Fast',configured:true,freeOnly:true,paidFallback:false,bestEffort:true,space:HF_SPACE_ID,authenticated:Boolean(HF_TOKEN),quotaMode:HF_TOKEN?'free-account':'anonymous'},")
old="""    if(attempt < 3){
      job.status='generating'; job.error=undefined;
      if(task){(task as any).phase='generating';(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).resultMessage=`Free provider busy — automatic retry ${attempt + 1}/3...`;delete (task as any).blocker;}
      await new Promise(resolve=>setTimeout(resolve,attempt*2500));
      return runHfVideo(jobId,prompt,taskId,attempt+1);
    }
    job.status='failed'; job.error=err;
    if(task){(task as any).phase='provider-error';(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).resultMessage=`ZeroGPU unavailable after 3 attempts: ${job.error}`;(task as any).blocker=`Kai video provider error after 3 attempts: ${job.error}`;}
"""
new="""    const quotaExceeded=/quota|exceeded|overquota/i.test(err);
    if(!quotaExceeded && attempt < 3){
      job.status='generating'; job.error=undefined;
      if(task){(task as any).phase='generating';(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).resultMessage=`Free provider busy — automatic retry ${attempt + 1}/3...`;delete (task as any).blocker;}
      await new Promise(resolve=>setTimeout(resolve,attempt*2500));
      return runHfVideo(jobId,prompt,taskId,attempt+1);
    }
    job.status='failed'; job.error=err;
    const finalMsg=quotaExceeded ? `Free ZeroGPU quota unavailable: ${err}` : `ZeroGPU unavailable after 3 attempts: ${err}`;
    if(task){(task as any).phase='provider-error';(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).resultMessage=finalMsg;(task as any).blocker=`Kai video provider error: ${finalMsg}`;}
"""
if old not in s:
    raise SystemExit('retry block not found')
s=s.replace(old,new,1)
s=s.replace("note:'Free best-effort; queue/availability can change'","note:HF_TOKEN?'Free-account ZeroGPU quota via HF token':'Anonymous ZeroGPU quota; add HF_TOKEN for larger free quota'")
p.write_text(s)

from pathlib import Path

api=Path('api/src/index.ts')
s=api.read_text()
# Remove artificial prompt-duration helper and wait block; use real provider elapsed time only.
start=s.find("function requestedVideoSeconds(prompt:string){")
end=s.find("function providerErrorFromSse", start)
if start!=-1 and end!=-1:
    s=s[:start]+s[end:]
old="""    if(!videoUrl) throw new Error('ZeroGPU completed without a real MP4 URL');
    job.videoUrl=videoUrl;
    const targetSec=requestedVideoSeconds(prompt);
    const taskStarted=task?.createdAt ? new Date(task.createdAt).getTime() : Date.now();
    const elapsedSec=Math.max(0,Math.floor((Date.now()-taskStarted)/1000));
    const remainingSec=Math.max(0,targetSec-elapsedSec);
    if(remainingSec>0){
      job.status='generating';
      if(task){(task as any).phase='finalizing';(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).resultMessage=`Real MP4 generated — finalizing task timing for ${remainingSec}s (target video ${targetSec}s)`;delete (task as any).blocker;}
      await new Promise(resolve=>setTimeout(resolve,remainingSec*1000));
    }
    job.status='done';
    if(task){task.status='done';(task as any).phase='completed';(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).driveUrl=videoUrl;(task as any).resultMessage=`Complete — real MP4 generated. Kai worked for at least the requested ${targetSec}s video duration.`;delete (task as any).blocker;task.completedAt=new Date().toISOString();}
"""
new="""    if(!videoUrl) throw new Error('ZeroGPU completed without a real MP4 URL');
    job.videoUrl=videoUrl;
    job.status='done';
    const completedAt=new Date();
    const startedMs=task?.startedAt ? new Date((task as any).startedAt).getTime() : (task?.createdAt ? new Date(task.createdAt).getTime() : completedAt.getTime());
    const actualSec=Math.max(0,Math.floor((completedAt.getTime()-startedMs)/1000));
    if(task){task.status='done';(task as any).phase='completed';(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).driveUrl=videoUrl;(task as any).durationSec=actualSec;(task as any).resultMessage=`Complete — real MP4 generated after ${actualSec}s of actual provider processing.`;delete (task as any).blocker;task.completedAt=completedAt.toISOString();}
"""
if old not in s:
    raise SystemExit('backend artificial timing block not found')
s=s.replace(old,new,1)
old2="""  if(task){(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).providerJobId=generationId;(task as any).phase='generating';(task as any).resultMessage='Queued on Hugging Face ZeroGPU — free best-effort generation';}
"""
new2="""  if(task){(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).providerJobId=generationId;(task as any).phase='generating';(task as any).startedAt=new Date().toISOString();(task as any).resultMessage='Generating on Hugging Face ZeroGPU — Kai stays working until the real MP4 is returned';}
"""
if old2 not in s:
    raise SystemExit('backend start block not found')
s=s.replace(old2,new2,1)
old3="""  return res.json({ok:true,status:'generating',provider:job.provider,generationId,bestEffort:true});
"""
new3="""  const task=job.taskId ? tasks.find(t=>t.id===job.taskId) : undefined;
  const startedMs=task?.startedAt ? new Date((task as any).startedAt).getTime() : Date.now();
  const elapsedSec=Math.max(0,Math.floor((Date.now()-startedMs)/1000));
  return res.json({ok:true,status:'generating',provider:job.provider,generationId,bestEffort:true,elapsedSec});
"""
if old3 not in s:
    raise SystemExit('backend status block not found')
s=s.replace(old3,new3,1)
api.write_text(s)

front=Path('frontend/src/main.tsx')
f=front.read_text()
old4="""            patchTask(task.id, {provider:'Hugging Face ZeroGPU LTX Video Fast', providerJobId:generationId, phase:'generating', resultMessage:'Hugging Face ZeroGPU is generating the real MP4...'});
"""
new4="""            const elapsedSec=Number(result.elapsedSec||0);
            const elapsedText=elapsedSec>=3600 ? `${Math.floor(elapsedSec/3600)}h ${Math.floor((elapsedSec%3600)/60)}m` : elapsedSec>=60 ? `${Math.floor(elapsedSec/60)}m ${elapsedSec%60}s` : `${elapsedSec}s`;
            patchTask(task.id, {provider:'Hugging Face ZeroGPU LTX Video Fast', providerJobId:generationId, phase:'generating', startedAt:task.startedAt || new Date().toISOString(), resultMessage:`Hugging Face ZeroGPU is generating the real MP4 — actual elapsed ${elapsedText}. Kai will complete only when the provider returns the MP4.`});
"""
if old4 not in f:
    raise SystemExit('frontend generating message not found')
f=f.replace(old4,new4,1)
old5="""        if(checks>=60){window.clearInterval(timer);setNotice('Kai generation is still processing. Refresh later to check the result.');}
"""
new5="""        if(checks>=720){window.clearInterval(timer);setNotice('Kai has been generating for over 2 hours. The backend continues processing; refresh to check the latest status.');}
"""
if old5 not in f:
    raise SystemExit('frontend polling limit not found')
f=f.replace(old5,new5,1)
front.write_text(f)

from pathlib import Path

p=Path('api/src/index.ts')
s=p.read_text()
s=s.replace('async function runHfVideo(jobId:string,prompt:string,taskId:string){','async function runHfVideo(jobId:string,prompt:string,taskId:string,attempt=1){')
old="""  }catch(e:any){
    job.status='failed'; job.error=String(e?.message||e||'ZeroGPU generation failed');
    if(task){(task as any).phase='provider-error';(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).resultMessage=`ZeroGPU unavailable: ${job.error}`;(task as any).blocker=`Kai video provider error: ${job.error}`;}
    console.error('Hugging Face ZeroGPU generation error',e);
  }
}"""
new="""  }catch(e:any){
    const err=String(e?.message||e||'ZeroGPU generation failed');
    console.error(`Hugging Face ZeroGPU attempt ${attempt} error`,err);
    if(attempt < 3){
      job.status='generating'; job.error=undefined;
      if(task){(task as any).phase='generating';(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).resultMessage=`Free provider busy — automatic retry ${attempt + 1}/3...`;delete (task as any).blocker;}
      await new Promise(resolve=>setTimeout(resolve,attempt*2500));
      return runHfVideo(jobId,prompt,taskId,attempt+1);
    }
    job.status='failed'; job.error=err;
    if(task){(task as any).phase='provider-error';(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).resultMessage=`ZeroGPU unavailable after 3 attempts: ${job.error}`;(task as any).blocker=`Kai video provider error after 3 attempts: ${job.error}`;}
    console.error('Hugging Face ZeroGPU generation failed after retries',err);
  }
}"""
if old not in s:
    raise SystemExit('backend catch block not found')
s=s.replace(old,new)
p.write_text(s)

f=Path('frontend/src/main.tsx')
u=f.read_text()
u=u.replace('Create a 10-second funny cartoon video.','Create a short funny cartoon video optimized for free ZeroGPU generation.')
u=u.replace('Create a fresh 10-second funny IT cartoon video','Create a fresh short funny IT cartoon video optimized for free ZeroGPU generation')
u=u.replace('Create a 10-second funny cartoon video of a cybersecurity analyst','Create a short funny cartoon video of a cybersecurity analyst')
u=u.replace('Create a 10-second vertical animated promo video','Create a short vertical animated promo video')
f.write_text(u)

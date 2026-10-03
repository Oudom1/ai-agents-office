from pathlib import Path

# Backend
p = Path('api/src/index.ts')
s = p.read_text()
marker = "const PASSWORD_RESET_KEY = process.env.PASSWORD_RESET_KEY || '';\n"
if "LEONARDO_API_KEY" not in s:
    s = s.replace(marker, marker + "const LEONARDO_API_KEY = process.env.LEONARDO_API_KEY || '';\n")

helper_marker = "function remainingLockSeconds(attempt:{count:number,windowStart:number}){\n  const remaining=Math.max(0,LOGIN_WINDOW_MS-(Date.now()-attempt.windowStart));\n  return Math.ceil(remaining/1000);\n}\n"
helpers = '''

function findGenerationId(value:any):string|undefined{
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const walk=(v:any):string|undefined=>{
    if(!v) return undefined;
    if(typeof v==='string' && uuid.test(v)) return v;
    if(Array.isArray(v)){ for(const item of v){const found=walk(item);if(found)return found;} return undefined; }
    if(typeof v==='object'){
      for(const [k,val] of Object.entries(v)) if(/generation.?id|^id$/i.test(k) && typeof val==='string' && uuid.test(val)) return val;
      for(const val of Object.values(v)){const found=walk(val);if(found)return found;}
    }
    return undefined;
  };
  return walk(value);
}

function findMp4Url(value:any):string|undefined{
  const walk=(v:any):string|undefined=>{
    if(!v) return undefined;
    if(typeof v==='string' && /^https?:\\/\\//i.test(v) && v.includes('.mp4')) return v;
    if(Array.isArray(v)){ for(const item of v){const found=walk(item);if(found)return found;} return undefined; }
    if(typeof v==='object'){
      for(const [k,val] of Object.entries(v)) if(/motionMP4URL|videoUrl|video_url/i.test(k) && typeof val==='string' && /^https?:\\/\\//i.test(val)) return val;
      for(const val of Object.values(v)){const found=walk(val);if(found)return found;}
    }
    return undefined;
  };
  return walk(value);
}
'''
if "function findGenerationId" not in s:
    s = s.replace(helper_marker, helper_marker + helpers)

s = s.replace(
    "  passwordResetConfigured:Boolean(PASSWORD_RESET_KEY) && databaseConfigured(),\n  authTransport:'ECDH-P256 + HKDF-SHA256 + AES-256-GCM',",
    "  passwordResetConfigured:Boolean(PASSWORD_RESET_KEY) && databaseConfigured(),\n  videoProvider:{name:'Leonardo Free Trial',configured:Boolean(LEONARDO_API_KEY),freeOnly:true,paidFallback:false},\n  authTransport:'ECDH-P256 + HKDF-SHA256 + AES-256-GCM',"
)

endpoint_marker = "app.post('/api/manager/call/:agentId', requireAuth, (req,res)=>{"
endpoints = '''
app.get('/api/video/providers', requireAuth, (_req,res)=>{
  res.json({freeOnly:true,paidFallback:false,providers:[
    {id:'leonardo',name:'Leonardo Free Trial',configured:Boolean(LEONARDO_API_KEY),mode:'api',priority:1},
    {id:'pixverse',name:'PixVerse Free',configured:false,mode:'manual',priority:2},
    {id:'runway',name:'Runway Free/Trial',configured:false,mode:'manual',priority:3}
  ]});
});

app.post('/api/video/generate', requireAuth, async (req:any,res)=>{
  const prompt=String(req.body?.prompt||'').trim();
  const taskId=String(req.body?.taskId||'').trim();
  if(!prompt) return res.status(400).json({error:'prompt is required'});
  if(!LEONARDO_API_KEY){
    const task=tasks.find(t=>t.id===taskId);
    if(task){(task as any).provider='Free Video Router';(task as any).resultMessage='Leonardo Free Trial API key is not configured';}
    return res.status(503).json({error:'Leonardo Free Trial API key is not configured',freeOnly:true,paidFallback:false});
  }
  try{
    const r=await fetch('https://cloud.leonardo.ai/api/rest/v1/generations-text-to-video',{
      method:'POST',
      headers:{accept:'application/json','content-type':'application/json',authorization:`Bearer ${LEONARDO_API_KEY}`},
      body:JSON.stringify({prompt,resolution:'RESOLUTION_480',model:'MOTION2FAST',frameInterpolation:false,isPublic:false,promptEnhance:true})
    });
    const text=await r.text();
    let data:any={};
    try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
    if(!r.ok){
      addSecurityLog(req,'FAILED',req.auth?.user||'Admin',`Leonardo generation rejected with HTTP ${r.status}; no paid fallback used`);
      return res.status(r.status===402?429:502).json({error:'Free Leonardo generation unavailable',provider:'Leonardo Free Trial',freeOnly:true,paidFallback:false,providerStatus:r.status});
    }
    const generationId=findGenerationId(data);
    if(!generationId) return res.status(502).json({error:'Leonardo accepted the request but no generation id was returned',provider:'Leonardo Free Trial'});
    const task=tasks.find(t=>t.id===taskId);
    if(task){(task as any).provider='Leonardo Free Trial';(task as any).providerJobId=generationId;(task as any).phase='generating';(task as any).resultMessage='Real video generation started with Leonardo Free Trial';}
    addSecurityLog(req,'SUCCESS',req.auth?.user||'Admin',`Kai started Leonardo video generation ${generationId}`);
    return res.status(202).json({ok:true,provider:'Leonardo Free Trial',generationId,freeOnly:true,paidFallback:false});
  }catch(e){
    console.error('Leonardo generation error',e);
    return res.status(502).json({error:'Unable to reach Leonardo API',provider:'Leonardo Free Trial',freeOnly:true,paidFallback:false});
  }
});

app.get('/api/video/status/:generationId', requireAuth, async (req:any,res)=>{
  if(!LEONARDO_API_KEY) return res.status(503).json({error:'Leonardo Free Trial API key is not configured'});
  const generationId=String(req.params.generationId||'');
  const taskId=String(req.query?.taskId||'');
  try{
    const r=await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${encodeURIComponent(generationId)}`,{headers:{accept:'application/json',authorization:`Bearer ${LEONARDO_API_KEY}`}});
    const text=await r.text();
    let data:any={};
    try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
    if(!r.ok) return res.status(502).json({error:'Unable to read Leonardo generation status',providerStatus:r.status});
    const videoUrl=findMp4Url(data);
    const rawStatus=String(data?.generations_by_pk?.status || data?.status || '').toUpperCase();
    const failed=/FAIL|ERROR|CANCEL/.test(rawStatus);
    const task=tasks.find(t=>t.id===taskId || (t as any).providerJobId===generationId);
    if(videoUrl){
      if(task){task.status='done';(task as any).phase='completed';(task as any).provider='Leonardo Free Trial';(task as any).driveUrl=videoUrl;(task as any).resultMessage='Complete — real MP4 generated by Leonardo Free Trial';task.completedAt=new Date().toISOString();}
      return res.json({ok:true,status:'done',provider:'Leonardo Free Trial',videoUrl,generationId});
    }
    if(failed){
      if(task){(task as any).phase='provider-error';(task as any).resultMessage='Leonardo free generation failed; no paid fallback used';}
      return res.json({ok:false,status:'failed',provider:'Leonardo Free Trial',generationId});
    }
    return res.json({ok:true,status:'generating',provider:'Leonardo Free Trial',generationId});
  }catch(e){
    console.error('Leonardo status error',e);
    return res.status(502).json({error:'Unable to reach Leonardo API'});
  }
});

'''
if "app.get('/api/video/providers'" not in s:
    s = s.replace(endpoint_marker, endpoints + endpoint_marker)
p.write_text(s)

# Frontend
p = Path('frontend/src/main.tsx')
s = p.read_text()
s = s.replace(
    "const KAI_PROVIDER_PENDING = 'Free video router is waiting for a real provider integration. Route: PixVerse Free → Leonardo Free → Runway Free/Trial. FREE ONLY; no paid fallback.';",
    "const KAI_PROVIDER_PENDING = 'Free video router: Leonardo Free Trial API → PixVerse Free/manual → Runway Free/manual. FREE ONLY; no paid fallback.';"
)
s = s.replace(
    "implement: ['Implementation', 'Video', 'Comedy Cartoon', 'PixVerse Free', 'Leonardo Free', 'Runway Free/Trial', 'Google Drive', 'Automation'],",
    "implement: ['Implementation', 'Video', 'Comedy Cartoon', 'Leonardo Free Trial API', 'PixVerse Free', 'Runway Free/Trial', 'Google Drive', 'Automation'],"
)

insert_marker = "    return task;\n  };\n\n  const launchKaiQuickTemplate"
helper = '''    return task;
  };

  const startKaiProviderTask = async (title: string) => {
    try {
      const create = await authFetch(`${API}/tasks`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId:'implement',title})});
      if(!create.ok) throw new Error('task create failed');
      const task = await create.json();
      const start = await authFetch(`${API}/video/generate`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({taskId:task.id,prompt:title})});
      const data = await start.json().catch(() => ({}));
      if(!start.ok){await refresh();setNotice(data.error || 'Kai free provider unavailable. No paid fallback used.');return;}
      await refresh();
      setNotice(`Kai started a real video with ${data.provider}. Waiting for MP4...`);
      const generationId=String(data.generationId||'');
      if(!generationId) return;
      let checks=0;
      const timer=window.setInterval(async()=>{
        checks+=1;
        try{
          const status=await authFetch(`${API}/video/status/${encodeURIComponent(generationId)}?taskId=${encodeURIComponent(task.id)}`);
          if(status.ok){
            const result=await status.json();
            if(result.status==='done' && result.videoUrl){window.clearInterval(timer);await refresh();setNotice('Kai completed the task — a real MP4 was generated by Leonardo Free Trial.');return;}
            if(result.status==='failed'){window.clearInterval(timer);await refresh();setNotice('Kai video generation failed. No paid fallback was used.');return;}
          }
        }catch{}
        if(checks>=60){window.clearInterval(timer);setNotice('Kai generation is still processing. Refresh later to check the result.');}
      },10000);
    } catch {
      addLocalTask('implement',title);
      setNotice('Video backend unavailable — task kept in FREE ONLY queue.');
    }
  };

  const launchKaiQuickTemplate'''
if "const startKaiProviderTask" not in s:
    s = s.replace(insert_marker, helper)

old_quick = """  const launchKaiQuickTemplate = (name: string, fallbackPrompt: string) => {
    const title = name === 'IT Comedy' ? makeItComedyPrompt() : fallbackPrompt;
    setSelected('implement');
    addLocalTask('implement', title);
    setTaskTitle('');
    setNotice(KAI_FREE_VIDEO_AVAILABLE
      ? (name === 'IT Comedy' ? 'Kai received a fresh IT Comedy idea and started a new video task' : `Kai started ${name}`)
      : 'Alex prepared the brief. Kai is waiting for a real free provider integration.');
  };"""
new_quick = """  const launchKaiQuickTemplate = async (name: string, fallbackPrompt: string) => {
    const title = name === 'IT Comedy' ? makeItComedyPrompt() : fallbackPrompt;
    setSelected('implement');
    setTaskTitle('');
    await startKaiProviderTask(title);
  };"""
s = s.replace(old_quick,new_quick)

old_assign = """    if (targetAgent === 'implement') {
      addLocalTask(targetAgent, title);
      setTaskTitle('');
      setSelected(targetAgent);
      return;
    }"""
new_assign = """    if (targetAgent === 'implement') {
      setTaskTitle('');
      setSelected(targetAgent);
      await startKaiProviderTask(title);
      return;
    }"""
s = s.replace(old_assign,new_assign)
s = s.replace(
    "Free routing order: PixVerse Free → Leonardo Free → Runway Free/Trial. No real provider API is connected yet, so this router is policy/UI only. Kai stays READY and no task is marked complete until a real MP4 exists.",
    "Real provider route: Leonardo Free Trial API first. PixVerse Free and Runway Free/Trial remain manual alternatives. FREE ONLY; no paid fallback. Kai completes only when a real MP4 URL is returned."
)
p.write_text(s)

# Render blueprint
p = Path('render.yaml')
if p.exists():
    s = p.read_text()
    if 'LEONARDO_API_KEY' not in s:
        anchor = "      - key: SESSION_TTL_HOURS\n        value: 8\n"
        if anchor in s:
            s = s.replace(anchor, anchor + "      - key: LEONARDO_API_KEY\n        sync: false\n")
        else:
            s += "\n# Secret required for Kai real video generation: LEONARDO_API_KEY\n"
    p.write_text(s)

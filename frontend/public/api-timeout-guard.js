(()=>{
  const API_PREFIX='https://ai-agents-office-api.onrender.com/api';
  const originalFetch=window.fetch.bind(window);
  const DEFAULT_TIMEOUT_MS=30000;
  const AUTH_TIMEOUT_MS=60000;

  window.fetch=async function(input,init={}){
    let url='';
    try{url=typeof input==='string'?input:input instanceof URL?input.href:input.url||''}catch{}
    if(!url.startsWith(API_PREFIX)) return originalFetch(input,init);

    const isAuth=/\/api\/auth\/(?:handshake|login|status)(?:\?|$)/i.test(url);
    const timeoutMs=isAuth?AUTH_TIMEOUT_MS:DEFAULT_TIMEOUT_MS;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    const callerSignal=init.signal;
    let abortListener;
    if(callerSignal){
      if(callerSignal.aborted) controller.abort();
      else {
        abortListener=()=>controller.abort();
        callerSignal.addEventListener('abort',abortListener,{once:true});
      }
    }

    try{
      return await originalFetch(input,{...init,signal:controller.signal});
    }catch(err){
      if(controller.signal.aborted){
        const seconds=Math.round(timeoutMs/1000);
        throw new Error(`AI Agents Office API did not respond within ${seconds} seconds. The backend may still be waking up; please retry once.`);
      }
      throw err;
    }finally{
      clearTimeout(timer);
      if(callerSignal&&abortListener) callerSignal.removeEventListener('abort',abortListener);
    }
  };
})();

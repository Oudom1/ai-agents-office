(()=>{
  const API_PREFIX='https://ai-agents-office-api.onrender.com/api';
  const originalFetch=window.fetch.bind(window);
  const DEFAULT_TIMEOUT_MS=5000;

  window.fetch=async function(input,init={}){
    let url='';
    try{url=typeof input==='string'?input:input instanceof URL?input.href:input.url||''}catch{}
    if(!url.startsWith(API_PREFIX)) return originalFetch(input,init);

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),DEFAULT_TIMEOUT_MS);
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
        throw new Error('AI Agents Office API did not respond within 5 seconds. Please retry; the backend may be waking up.');
      }
      throw err;
    }finally{
      clearTimeout(timer);
      if(callerSignal&&abortListener) callerSignal.removeEventListener('abort',abortListener);
    }
  };
})();

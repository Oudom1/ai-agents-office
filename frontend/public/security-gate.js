(()=>{
  const API='https://ai-agents-office-api.onrender.com/api';
  const TOKEN_KEY='ai-office-auth-token-v1';
  const USER_KEY='ai-office-auth-user-v1';
  const originalFetch=window.fetch.bind(window);

  const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
  function style(el,props){Object.assign(el.style,props)}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  async function fetchWithTimeout(url,options={},timeout=12000){
    const controller=new AbortController();
    const t=setTimeout(()=>controller.abort(),timeout);
    try{return await originalFetch(url,{...options,signal:controller.signal})}
    finally{clearTimeout(t)}
  }

  function installAuthenticatedFetch(){
    window.fetch=(input,init={})=>{
      let url='';
      try{url=typeof input==='string'?input:input instanceof URL?input.href:input.url||''}catch{}
      if(url.startsWith(API)){
        const headers=new Headers(init.headers || (input instanceof Request?input.headers:undefined) || {});
        const t=token(); if(t) headers.set('Authorization',`Bearer ${t}`);
        return originalFetch(input,{...init,headers});
      }
      return originalFetch(input,init);
    };
  }

  async function api(path,options={}){
    const headers=new Headers(options.headers||{});
    const t=token(); if(t) headers.set('Authorization',`Bearer ${t}`);
    return fetchWithTimeout(`${API}${path}`,{...options,headers},12000);
  }

  function addButtons(){
    if(!document.getElementById('ai-security-logout')){
      const b=document.createElement('button');
      b.id='ai-security-logout';b.textContent='↪';b.title='Log Out';
      style(b,{position:'fixed',right:'10px',bottom:'10px',zIndex:'99990',width:'32px',height:'32px',borderRadius:'50%',border:'1px solid #70434c',background:'#2b1720',color:'#ffd0d6',cursor:'pointer'});
      b.onclick=async()=>{try{await api('/auth/logout',{method:'POST'})}catch{}sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(USER_KEY);location.reload()};
      document.body.appendChild(b);
    }
  }

  function unlock(){
    document.documentElement.style.overflow='';
    installAuthenticatedFetch();
    addButtons();
  }

  function showLogin(message=''){
    document.documentElement.style.overflow='hidden';
    document.getElementById('ai-security-gate')?.remove();
    const overlay=document.createElement('div');overlay.id='ai-security-gate';
    style(overlay,{position:'fixed',inset:'0',zIndex:'100000',display:'grid',placeItems:'center',padding:'20px',background:'radial-gradient(circle at 50% 0,#10354b 0,#06111d 45%,#030911 100%)',fontFamily:'Inter,Segoe UI,Arial,sans-serif',color:'#e8f4fb'});
    const card=document.createElement('div');
    style(card,{width:'min(430px,94vw)',background:'#091827',border:'1px solid #244761',borderRadius:'16px',padding:'22px',boxShadow:'0 28px 70px rgba(0,0,0,.5)'});
    card.innerHTML=`<div style="font-size:10px;letter-spacing:1px;color:#66dbe8;font-weight:900">AI AGENTS OFFICE</div><h2 style="margin:7px 0 5px;font-size:20px">Secure Login</h2><p style="font-size:10px;line-height:1.5;color:#7f9fb1;margin:0 0 14px">Sign in over HTTPS to enter the platform.</p><label style="font-size:9px;color:#9fc3d5">Username</label><input id="ai-sec-user" autocomplete="username" value="${esc(sessionStorage.getItem(USER_KEY)||'Admin')}" style="box-sizing:border-box;width:100%;margin:5px 0 10px;padding:10px;border-radius:8px;border:1px solid #284b61;background:#06121d;color:#fff;outline:none"><label style="font-size:9px;color:#9fc3d5">Password</label><input id="ai-sec-pass" type="password" autocomplete="current-password" placeholder="Enter password" style="box-sizing:border-box;width:100%;margin:5px 0 7px;padding:10px;border-radius:8px;border:1px solid #284b61;background:#06121d;color:#fff;outline:none"><div id="ai-sec-msg" style="min-height:24px;font-size:10px;color:#ff9eaa">${esc(message)}</div><button id="ai-sec-enter" style="width:100%;padding:11px;border-radius:8px;border:1px solid #2b6d87;background:#123d55;color:#e9f8ff;font-weight:900;cursor:pointer">Login</button>`;
    overlay.appendChild(card);document.body.appendChild(overlay);
    const user=card.querySelector('#ai-sec-user');
    const pass=card.querySelector('#ai-sec-pass');
    const msg=card.querySelector('#ai-sec-msg');
    const button=card.querySelector('#ai-sec-enter');
    async function submit(){
      const username=user.value.trim(),password=pass.value;
      if(!username||!password){msg.textContent='Enter username and password.';return}
      button.disabled=true;button.textContent='Signing in…';msg.textContent='';
      try{
        const r=await fetchWithTimeout(`${API}/auth/login-basic`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})},12000);
        const data=await r.json().catch(()=>({}));
        if(!r.ok){msg.textContent=data.error||'Login failed.';pass.value='';return}
        sessionStorage.setItem(TOKEN_KEY,data.token);
        sessionStorage.setItem(USER_KEY,data.user||username);
        overlay.remove();unlock();
      }catch(e){
        msg.textContent=e?.name==='AbortError'?'Login service timed out. Please try again.':(e?.message||'Unable to reach login service.');
      }finally{button.disabled=false;button.textContent='Login'}
    }
    button.onclick=submit;
    pass.addEventListener('keydown',e=>{if(e.key==='Enter')submit()});
    setTimeout(()=>pass.focus(),50);
  }

  async function gate(){
    const t=token();
    if(t){
      try{const r=await api('/auth/status');if(r.ok){unlock();return}}catch{}
      sessionStorage.removeItem(TOKEN_KEY);
    }
    showLogin();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',gate);
  else gate();
})();

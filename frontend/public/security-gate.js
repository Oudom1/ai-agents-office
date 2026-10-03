(()=>{
  const API='https://ai-agents-office-api.onrender.com/api';
  const TOKEN_KEY='ai-office-auth-token-v1';
  const USER_KEY='ai-office-auth-user-v1';

  function style(el,props){Object.assign(el.style,props)}
  function escapeHtml(v){return String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]))}
  const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
  const authHeaders=()=>token()?{Authorization:`Bearer ${token()}`}:{ };

  async function api(path,options={}){
    const headers={...(options.headers||{}),...authHeaders()};
    return fetch(`${API}${path}`,{...options,headers});
  }

  async function showLogs(){
    document.getElementById('ai-security-log-modal')?.remove();
    let logs=[];
    try{
      const r=await api('/auth/logs');
      if(!r.ok) throw new Error('Unable to load logs');
      logs=await r.json();
    }catch{
      alert('Unable to load server security logs.');
      return;
    }
    const wrap=document.createElement('div');
    wrap.id='ai-security-log-modal';
    style(wrap,{position:'fixed',inset:'0',zIndex:'100001',background:'rgba(2,8,14,.82)',display:'grid',placeItems:'center',padding:'18px',fontFamily:'Inter,Segoe UI,Arial,sans-serif'});
    const box=document.createElement('div');
    style(box,{width:'min(820px,96vw)',maxHeight:'82vh',overflow:'auto',background:'#081521',border:'1px solid #2a4e65',borderRadius:'14px',padding:'16px',color:'#e7f3fb',boxShadow:'0 24px 60px rgba(0,0,0,.45)'});
    box.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b style="font-size:15px">Server Security Access Logs</b><div style="font-size:9px;color:#7f9fb1;margin-top:3px">Latest ${logs.length} authentication events</div></div><button id="ai-log-close">Close</button></div><div style="margin-top:12px;border-top:1px solid #1d3b4f">${logs.length?logs.map(x=>`<div style="display:grid;grid-template-columns:155px 80px 1fr;gap:8px;padding:9px 0;border-bottom:1px solid #173143;font-size:9px"><span style="color:#8db1c4">${new Date(x.time).toLocaleString()}</span><b style="color:${x.result==='SUCCESS'?'#79e7a8':x.result==='BLOCKED'?'#ffd27d':'#ff9eaa'}">${escapeHtml(x.result)}</b><span>${escapeHtml(x.user)} • ${escapeHtml(x.detail)} • ${escapeHtml(x.ip)}</span></div>`).join(''):'<p style="font-size:10px;color:#7f9fb1">No authentication events recorded yet.</p>'}</div>`;
    wrap.appendChild(box);document.body.appendChild(wrap);
    const b=box.querySelector('#ai-log-close');
    if(b)style(b,{border:'1px solid #31536a',background:'#10293a',color:'#dff4ff',borderRadius:'7px',padding:'7px 10px',cursor:'pointer',fontWeight:'700',fontSize:'9px'});
    b?.addEventListener('click',()=>wrap.remove());
  }

  function addSecurityButtons(){
    if(!document.getElementById('ai-security-button')){
      const b=document.createElement('button');b.id='ai-security-button';b.textContent='🔒 Security Logs';
      style(b,{position:'fixed',left:'14px',bottom:'14px',zIndex:'99990',border:'1px solid #2d5c73',background:'#0b2232',color:'#d9f3ff',borderRadius:'999px',padding:'8px 11px',font:'800 9px Inter,Segoe UI,Arial,sans-serif',cursor:'pointer',boxShadow:'0 10px 26px rgba(0,0,0,.35)'});
      b.onclick=showLogs;document.body.appendChild(b);
    }
    if(!document.getElementById('ai-security-logout')){
      const b=document.createElement('button');b.id='ai-security-logout';b.textContent='↪ Log Out';
      style(b,{position:'fixed',left:'132px',bottom:'14px',zIndex:'99990',border:'1px solid #70434c',background:'#2b1720',color:'#ffd0d6',borderRadius:'999px',padding:'8px 11px',font:'800 9px Inter,Segoe UI,Arial,sans-serif',cursor:'pointer',boxShadow:'0 10px 26px rgba(0,0,0,.35)'});
      b.onclick=async()=>{try{await api('/auth/logout',{method:'POST'})}catch{}sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(USER_KEY);location.reload()};document.body.appendChild(b);
    }
  }

  function lockPage(){document.documentElement.style.overflow='hidden'}
  function unlockPage(){document.documentElement.style.overflow='';addSecurityButtons();loadHealthBridge()}

  function loadHealthBridge(){
    if(!/health-monitoring\.html$/i.test(location.pathname)||document.getElementById('health-office-bridge-script'))return;
    const s=document.createElement('script');s.id='health-office-bridge-script';s.src='./health-office-bridge.js?v=2';document.head.appendChild(s);
  }

  function showLogin(message=''){
    lockPage();
    document.getElementById('ai-security-gate')?.remove();
    const overlay=document.createElement('div');overlay.id='ai-security-gate';
    style(overlay,{position:'fixed',inset:'0',zIndex:'100000',display:'grid',placeItems:'center',padding:'20px',background:'radial-gradient(circle at 50% 0,#10354b 0,#06111d 45%,#030911 100%)',fontFamily:'Inter,Segoe UI,Arial,sans-serif',color:'#e8f4fb'});
    const card=document.createElement('div');style(card,{width:'min(430px,94vw)',background:'#091827',border:'1px solid #244761',borderRadius:'16px',padding:'22px',boxShadow:'0 28px 70px rgba(0,0,0,.5)'});
    card.innerHTML=`<div style="font-size:10px;letter-spacing:1px;color:#66dbe8;font-weight:900">AI AGENTS OFFICE SECURITY</div><h2 style="margin:7px 0 5px;font-size:20px">Secure Access Required</h2><p style="font-size:10px;line-height:1.5;color:#7f9fb1;margin:0 0 14px">Only approved credentials created on the server can access this office. Visitors cannot create their own password.</p><label style="font-size:9px;color:#9fc3d5">Admin name</label><input id="ai-sec-user" autocomplete="username" value="${escapeHtml(sessionStorage.getItem(USER_KEY)||'Admin')}" style="width:100%;margin:5px 0 10px;padding:10px;border-radius:8px;border:1px solid #284b61;background:#06121d;color:#fff;outline:none"><label style="font-size:9px;color:#9fc3d5">Password</label><input id="ai-sec-pass" type="password" autocomplete="current-password" placeholder="Enter server password" style="width:100%;margin:5px 0 7px;padding:10px;border-radius:8px;border:1px solid #284b61;background:#06121d;color:#fff;outline:none"><div id="ai-sec-msg" style="min-height:22px;font-size:9px;color:#ff9eaa">${escapeHtml(message)}</div><button id="ai-sec-enter" style="width:100%;padding:10px;border-radius:8px;border:1px solid #2b6d87;background:#123d55;color:#e9f8ff;font-weight:900;cursor:pointer">Unlock Office</button><div style="margin-top:10px;font-size:8px;line-height:1.4;color:#63869a">Authentication is verified by the server. Login attempts are rate-limited and recorded centrally.</div>`;
    overlay.appendChild(card);document.body.appendChild(overlay);
    const user=card.querySelector('#ai-sec-user'),pass=card.querySelector('#ai-sec-pass'),msg=card.querySelector('#ai-sec-msg'),button=card.querySelector('#ai-sec-enter');
    async function submit(){
      const username=user.value.trim(),password=pass.value;
      if(!username||!password){msg.textContent='Enter the approved admin name and password.';return}
      button.disabled=true;button.textContent='Checking…';msg.textContent='';
      try{
        const r=await fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
        const data=await r.json().catch(()=>({}));
        if(!r.ok){msg.textContent=data.error||'Access denied.';pass.value='';return}
        sessionStorage.setItem(TOKEN_KEY,data.token);sessionStorage.setItem(USER_KEY,data.user||username);
        overlay.remove();unlockPage();
      }catch{
        msg.textContent='Security service unavailable. Access remains locked.';
      }finally{button.disabled=false;button.textContent='Unlock Office'}
    }
    button.onclick=submit;pass.addEventListener('keydown',e=>{if(e.key==='Enter')submit()});setTimeout(()=>pass.focus(),50);
  }

  async function gate(){
    lockPage();
    if(token()){
      try{
        const r=await api('/auth/status');
        if(r.ok){unlockPage();return}
      }catch{}
      sessionStorage.removeItem(TOKEN_KEY);
    }
    showLogin();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',gate);else gate();
})();

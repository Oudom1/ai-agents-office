(()=>{
  const CFG_KEY='ai-office-security-config-v1';
  const LOG_KEY='ai-office-security-logs-v1';
  const SESSION_KEY='ai-office-security-session-v1';
  const MAX_LOGS=100;

  const pageName=()=>document.title||location.pathname||'AI Agents Office';
  const nowIso=()=>new Date().toISOString();

  async function hashText(text){
    const bytes=new TextEncoder().encode(text);
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function getLogs(){
    try{return JSON.parse(localStorage.getItem(LOG_KEY)||'[]')}catch{return []}
  }
  function addLog(result,user,detail=''){
    const logs=getLogs();
    logs.unshift({time:nowIso(),result,user:user||'unknown',page:pageName(),detail});
    localStorage.setItem(LOG_KEY,JSON.stringify(logs.slice(0,MAX_LOGS)));
  }

  function style(el,props){Object.assign(el.style,props)}

  function showLogs(){
    document.getElementById('ai-security-log-modal')?.remove();
    const wrap=document.createElement('div');
    wrap.id='ai-security-log-modal';
    style(wrap,{position:'fixed',inset:'0',zIndex:'100001',background:'rgba(2,8,14,.82)',display:'grid',placeItems:'center',padding:'18px',fontFamily:'Inter,Segoe UI,Arial,sans-serif'});
    const box=document.createElement('div');
    style(box,{width:'min(760px,96vw)',maxHeight:'82vh',overflow:'auto',background:'#081521',border:'1px solid #2a4e65',borderRadius:'14px',padding:'16px',color:'#e7f3fb',boxShadow:'0 24px 60px rgba(0,0,0,.45)'});
    const logs=getLogs();
    box.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b style="font-size:15px">Security Access Logs</b><div style="font-size:9px;color:#7f9fb1;margin-top:3px">Latest ${logs.length} local browser events</div></div><div style="display:flex;gap:8px"><button id="ai-log-clear">Clear Logs</button><button id="ai-log-close">Close</button></div></div><div style="margin-top:12px;border-top:1px solid #1d3b4f">${logs.length?logs.map(x=>`<div style="display:grid;grid-template-columns:145px 80px 1fr;gap:8px;padding:9px 0;border-bottom:1px solid #173143;font-size:9px"><span style="color:#8db1c4">${new Date(x.time).toLocaleString()}</span><b style="color:${x.result==='SUCCESS'?'#79e7a8':'#ff9eaa'}">${x.result}</b><span>${escapeHtml(x.user)} • ${escapeHtml(x.page)}${x.detail?` • ${escapeHtml(x.detail)}`:''}</span></div>`).join(''):'<p style="font-size:10px;color:#7f9fb1">No access attempts recorded yet.</p>'}</div>`;
    wrap.appendChild(box);document.body.appendChild(wrap);
    ['ai-log-close','ai-log-clear'].forEach(id=>{const b=box.querySelector('#'+id);if(b)style(b,{border:'1px solid #31536a',background:'#10293a',color:'#dff4ff',borderRadius:'7px',padding:'7px 10px',cursor:'pointer',fontWeight:'700',fontSize:'9px'})});
    box.querySelector('#ai-log-close')?.addEventListener('click',()=>wrap.remove());
    box.querySelector('#ai-log-clear')?.addEventListener('click',()=>{localStorage.removeItem(LOG_KEY);wrap.remove();showLogs()});
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

  function addSecurityButton(){
    if(document.getElementById('ai-security-button'))return;
    const b=document.createElement('button');b.id='ai-security-button';b.textContent='🔒 Security Logs';
    style(b,{position:'fixed',left:'14px',bottom:'14px',zIndex:'99990',border:'1px solid #2d5c73',background:'#0b2232',color:'#d9f3ff',borderRadius:'999px',padding:'8px 11px',font:'800 9px Inter,Segoe UI,Arial,sans-serif',cursor:'pointer',boxShadow:'0 10px 26px rgba(0,0,0,.35)'});
    b.onclick=showLogs;document.body.appendChild(b);
  }

  function lockPage(){document.documentElement.style.overflow='hidden'}
  function unlockPage(){document.documentElement.style.overflow='';sessionStorage.setItem(SESSION_KEY,'ok');addSecurityButton()}

  function gate(){
    if(sessionStorage.getItem(SESSION_KEY)==='ok'){addSecurityButton();return}
    lockPage();
    const existing=document.getElementById('ai-security-gate');if(existing)return;
    const overlay=document.createElement('div');overlay.id='ai-security-gate';
    style(overlay,{position:'fixed',inset:'0',zIndex:'100000',display:'grid',placeItems:'center',padding:'20px',background:'radial-gradient(circle at 50% 0,#10354b 0,#06111d 45%,#030911 100%)',fontFamily:'Inter,Segoe UI,Arial,sans-serif',color:'#e8f4fb'});
    const card=document.createElement('div');style(card,{width:'min(430px,94vw)',background:'#091827',border:'1px solid #244761',borderRadius:'16px',padding:'22px',boxShadow:'0 28px 70px rgba(0,0,0,.5)'});
    let cfg=null;try{cfg=JSON.parse(localStorage.getItem(CFG_KEY)||'null')}catch{}
    const setup=!cfg?.pinHash;
    card.innerHTML=`<div style="font-size:10px;letter-spacing:1px;color:#66dbe8;font-weight:900">AI AGENTS OFFICE SECURITY</div><h2 style="margin:7px 0 5px;font-size:20px">${setup?'Set Access PIN':'Secure Access Required'}</h2><p style="font-size:10px;line-height:1.5;color:#7f9fb1;margin:0 0 14px">${setup?'Create a local admin PIN for this browser.':'Enter your admin name and PIN to continue.'}</p><label style="font-size:9px;color:#9fc3d5">Admin name</label><input id="ai-sec-user" autocomplete="username" value="${escapeHtml(cfg?.user||'Admin')}" style="width:100%;margin:5px 0 10px;padding:10px;border-radius:8px;border:1px solid #284b61;background:#06121d;color:#fff;outline:none"><label style="font-size:9px;color:#9fc3d5">PIN</label><input id="ai-sec-pin" type="password" inputmode="numeric" autocomplete="current-password" placeholder="Minimum 4 digits" style="width:100%;margin:5px 0 10px;padding:10px;border-radius:8px;border:1px solid #284b61;background:#06121d;color:#fff;outline:none"><div id="ai-sec-msg" style="min-height:17px;font-size:9px;color:#ff9eaa"></div><button id="ai-sec-enter" style="width:100%;padding:10px;border-radius:8px;border:1px solid #2b6d87;background:#123d55;color:#e9f8ff;font-weight:900;cursor:pointer">${setup?'Create PIN & Enter':'Unlock Office'}</button><button id="ai-sec-review" style="width:100%;margin-top:8px;padding:9px;border-radius:8px;border:1px solid #355468;background:#0c2534;color:#bfe7f7;font-weight:800;cursor:pointer">Review Attempt Logs</button><div style="margin-top:10px;font-size:8px;line-height:1.4;color:#63869a">Local security layer: access attempts are stored in this browser. For strong internet-wide protection, use host-level authentication such as Cloudflare Access.</div>`;
    overlay.appendChild(card);document.body.appendChild(overlay);
    const user=card.querySelector('#ai-sec-user'),pin=card.querySelector('#ai-sec-pin'),msg=card.querySelector('#ai-sec-msg');
    card.querySelector('#ai-sec-review').onclick=showLogs;
    async function submit(){
      const u=user.value.trim()||'Admin',p=pin.value.trim();
      if(!/^\d{4,12}$/.test(p)){msg.textContent='Use a 4–12 digit PIN.';addLog('FAILED',u,'Invalid PIN format');return}
      const pinHash=await hashText(p);
      if(setup){localStorage.setItem(CFG_KEY,JSON.stringify({user:u,pinHash,createdAt:nowIso()}));addLog('SUCCESS',u,'Security PIN created');overlay.remove();unlockPage();return}
      if(pinHash!==cfg.pinHash){msg.textContent='Access denied. Attempt logged.';addLog('FAILED',u,'Wrong PIN');pin.value='';pin.focus();return}
      addLog('SUCCESS',u,'Login accepted');overlay.remove();unlockPage();
    }
    card.querySelector('#ai-sec-enter').onclick=submit;
    pin.addEventListener('keydown',e=>{if(e.key==='Enter')submit()});
    setTimeout(()=>pin.focus(),50);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',gate);else gate();
})();

(()=>{
  const API='https://ai-agents-office-api.onrender.com/api';
  const TOKEN_KEY='ai-office-auth-token-v1';
  const AGENTS=[
    ['manager','Alex','Manager'],['sysadmin','Sam','Senior System Administrator'],['security','Mina','Senior Security'],
    ['cloud','Noah','Senior Cloud Operator'],['qa','Lina','Senior Q/A'],['implement','Kai','Senior Implement'],['developer','Leo','Senior Developer']
  ];
  let lastData=null,lastLatency=null,lastError='';

  function msLabel(ms){if(!Number.isFinite(ms))return '—';if(ms<1000)return `${Math.round(ms)} ms`;return `${(ms/1000).toFixed(1)} s`;}
  function ensurePanel(){
    const aside=document.querySelector('aside'); if(!(aside instanceof HTMLElement))return null;
    let panel=document.getElementById('ai-office-ops-panel'); if(panel)return panel;
    panel=document.createElement('div');panel.id='ai-office-ops-panel';panel.className='panel';
    panel.innerHTML=`<h2 style="display:flex;justify-content:space-between;gap:8px;align-items:center">AI Office System Operations <span id="office-link-state" style="font-size:8px;color:#ffd27d">● CONNECTING</span></h2><p style="margin-top:-2px">Authenticated live bridge to the AI Agents Office backend. Shows server operations and request latency.</p><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin:10px 0"><div class="task"><small>API LATENCY</small><b id="office-latency">—</b></div><div class="task"><small>ACTIVE TASKS</small><b id="office-active">0</b></div><div class="task"><small>BLOCKED</small><b id="office-blocked">0</b></div><div class="task"><small>COMPLETED</small><b id="office-done">0</b></div></div><div id="office-agent-ops" style="display:grid;gap:5px"></div><div style="display:flex;gap:7px;margin-top:9px"><a class="btn" style="text-align:center;text-decoration:none;margin:0" href="./">Open AI Office</a><button class="btn" id="office-refresh" style="margin:0">Refresh</button></div><div id="office-last-sync" class="notice">Waiting for secure backend sync…</div>`;
    aside.insertBefore(panel,aside.firstChild);panel.querySelector('#office-refresh')?.addEventListener('click',refresh);return panel;
  }
  function render(){
    const panel=ensurePanel();if(!panel)return;
    const state=panel.querySelector('#office-link-state');
    if(!lastData){state.textContent=lastError?'● OFFLINE':'● CONNECTING';state.style.color=lastError?'#ff9eaa':'#ffd27d';panel.querySelector('#office-last-sync').textContent=lastError||'Waiting for secure backend sync…';return}
    state.textContent='● CONNECTED';state.style.color='#8ff0bd';
    panel.querySelector('#office-latency').textContent=msLabel(lastLatency);
    panel.querySelector('#office-active').textContent=String(lastData.counts?.active??0);
    panel.querySelector('#office-blocked').textContent=String(lastData.counts?.blocked??0);
    panel.querySelector('#office-done').textContent=String(lastData.counts?.done??0);
    const byId=new Map((lastData.agents||[]).map(a=>[a.id,a]));
    panel.querySelector('#office-agent-ops').innerHTML=AGENTS.map(([id,name,role])=>{const a=byId.get(id)||{};const s=String(a.state||'unknown').toUpperCase();const color=/BLOCK/.test(s)?'#ff9eaa':/WORK|ASSIGNED|CALLED/.test(s)?'#ffd27d':'#8ff0bd';return `<div style="display:grid;grid-template-columns:42px 1fr auto;gap:7px;align-items:center;padding:6px 7px;border:1px solid #1d4055;border-radius:8px;background:#081724"><b style="font-size:9px">${name}</b><span style="font-size:8px;color:#7899ad;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${role}</span><span style="font-size:7px;color:${color};font-weight:900">${s}</span></div>`}).join('');
    panel.querySelector('#office-last-sync').textContent=`Last secure sync ${new Date().toLocaleTimeString()} • server uptime ${Math.floor((lastData.uptimeSec||0)/60)} min`;
  }
  async function refresh(){
    const t=sessionStorage.getItem(TOKEN_KEY)||''; if(!t){lastData=null;lastError='Authentication token missing.';render();return}
    const started=performance.now();
    try{const r=await fetch(`${API}/operations`,{headers:{Authorization:`Bearer ${t}`}});lastLatency=performance.now()-started;if(!r.ok)throw new Error(r.status===401?'Session expired. Log in again.':`Backend error ${r.status}`);lastData=await r.json();lastError='';}catch(e){lastData=null;lastError=e.message||'Backend unavailable.'}render();
  }
  const obs=new MutationObserver(()=>{if(!document.getElementById('ai-office-ops-panel'))render()});obs.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{render();refresh()});else{render();refresh()}
  setInterval(refresh,4000);
})();

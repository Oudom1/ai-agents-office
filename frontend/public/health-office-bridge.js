(()=>{
  const TASK_KEY='ai-agents-office-tasks-v3';
  const AGENTS=[
    ['alex','Alex','Manager'],['sam','Sam','Senior System Administrator'],['mina','Mina','Senior Security'],
    ['noah','Noah','Senior Cloud Operator'],['lina','Lina','Senior Q/A'],['kai','Kai','Senior Implement'],['leo','Leo','Senior Developer']
  ];

  const safeParse=(v,f)=>{try{return JSON.parse(v)}catch{return f}};
  const getTasks=()=>{
    const raw=safeParse(localStorage.getItem(TASK_KEY)||'[]',[]);
    return Array.isArray(raw)?raw:[];
  };
  const statusOf=t=>String(t?.status||'').toLowerCase();
  const isDone=t=>['done','completed','complete'].includes(statusOf(t));
  const isBlocked=t=>statusOf(t)==='blocked'||Boolean(t?.blocker);
  const isActive=t=>!isDone(t)&&!isBlocked(t);

  function msLabel(ms){
    if(!Number.isFinite(ms))return '—';
    if(ms<1000)return `${Math.round(ms)} ms`;
    if(ms<60000)return `${(ms/1000).toFixed(1)} s`;
    return `${Math.round(ms/60000)} min`;
  }

  function navLatency(){
    const nav=performance.getEntriesByType('navigation')[0];
    return nav?.duration||performance.now();
  }

  function ensurePanel(){
    const aside=document.querySelector('aside');
    if(!(aside instanceof HTMLElement))return null;
    let panel=document.getElementById('ai-office-ops-panel');
    if(panel)return panel;
    panel=document.createElement('div');
    panel.id='ai-office-ops-panel';
    panel.className='panel';
    panel.innerHTML=`
      <h2 style="display:flex;justify-content:space-between;gap:8px;align-items:center">AI Office System Operations <span id="office-link-state" style="font-size:8px;color:#8ff0bd">● CONNECTED</span></h2>
      <p style="margin-top:-2px">Live bridge to the main AI Agents Office using the same browser task store. Shows operations, queue health and client-side latency.</p>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin:10px 0">
        <div class="task"><small>PAGE LOAD LATENCY</small><b id="office-latency">—</b></div>
        <div class="task"><small>ACTIVE TASKS</small><b id="office-active">0</b></div>
        <div class="task"><small>BLOCKED</small><b id="office-blocked">0</b></div>
        <div class="task"><small>COMPLETED</small><b id="office-done">0</b></div>
      </div>
      <div id="office-agent-ops" style="display:grid;gap:5px"></div>
      <div style="display:flex;gap:7px;margin-top:9px"><a class="btn" style="text-align:center;text-decoration:none;margin:0" href="./">Open AI Office</a><button class="btn" id="office-refresh" style="margin:0">Refresh</button></div>
      <div id="office-last-sync" class="notice">Waiting for first sync…</div>`;
    aside.insertBefore(panel,aside.firstChild);
    panel.querySelector('#office-refresh')?.addEventListener('click',render);
    return panel;
  }

  function render(){
    const panel=ensurePanel(); if(!panel)return;
    const tasks=getTasks();
    const active=tasks.filter(isActive), blocked=tasks.filter(isBlocked), done=tasks.filter(isDone);
    panel.querySelector('#office-latency').textContent=msLabel(navLatency());
    panel.querySelector('#office-active').textContent=String(active.length);
    panel.querySelector('#office-blocked').textContent=String(blocked.length);
    panel.querySelector('#office-done').textContent=String(done.length);

    const ops=panel.querySelector('#office-agent-ops');
    ops.innerHTML=AGENTS.map(([id,name,role])=>{
      const mine=tasks.filter(t=>String(t?.agentId||'').toLowerCase()===id);
      const a=mine.filter(isActive).length,b=mine.filter(isBlocked).length,d=mine.filter(isDone).length;
      const state=b?'BLOCKED':a?'WORKING':'READY';
      const color=b?'#ff9eaa':a?'#ffd27d':'#8ff0bd';
      return `<div style="display:grid;grid-template-columns:42px 1fr auto;gap:7px;align-items:center;padding:6px 7px;border:1px solid #1d4055;border-radius:8px;background:#081724">
        <b style="font-size:9px">${name}</b><span style="font-size:8px;color:#7899ad;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${role}</span><span style="font-size:7px;color:${color};font-weight:900">${state} · ${a}/${b}/${d}</span>
      </div>`;
    }).join('');
    panel.querySelector('#office-last-sync').textContent=`Last sync ${new Date().toLocaleTimeString()} • same-origin browser bridge • ${tasks.length} total task records`;
  }

  window.addEventListener('storage',e=>{if(e.key===TASK_KEY)render()});
  const obs=new MutationObserver(()=>{if(!document.getElementById('ai-office-ops-panel'))render()});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
  setInterval(render,2000);
})();

(()=>{
  const PANEL_ID='system-integrations-panel';
  const STYLE_ID='system-integrations-style';
  const TOKEN_KEY='ai-office-auth-token-v1';
  const API='https://ai-agents-office-production.up.railway.app/api';

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      #${PANEL_ID}{margin-top:12px;padding:14px;border:1px solid #23465d;border-radius:12px;background:linear-gradient(180deg,#081725,#07131f);font-family:Inter,Segoe UI,Arial,sans-serif}
      #${PANEL_ID} .si-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
      #${PANEL_ID} h2{margin:0;font-size:14px;color:#e7f7ff}
      #${PANEL_ID} .si-sub{font-size:9px;color:#7fa9bd;margin:3px 0 11px}
      #${PANEL_ID} .si-grid{display:grid;grid-template-columns:1fr;gap:7px}
      #${PANEL_ID} .si-item{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:8px;padding:8px 9px;border:1px solid #18384d;border-radius:9px;background:#0a1d2c}
      #${PANEL_ID} .si-icon{width:28px;height:28px;display:grid;place-items:center;border-radius:7px;background:#102f43;font-size:15px}
      #${PANEL_ID} .si-name{font-size:10px;font-weight:800;color:#e7f7ff;line-height:1.2}
      #${PANEL_ID} .si-desc{font-size:8px;color:#7ea1b4;margin-top:2px;line-height:1.3}
      #${PANEL_ID} .si-status{font-size:7px;font-weight:900;padding:3px 6px;border-radius:999px;border:1px solid #28516a;color:#9fd6ef;white-space:nowrap}
      #${PANEL_ID} .si-status.online{border-color:#1f7a52;color:#6ff0a7;background:#0d2a1d}
      #${PANEL_ID} .si-status.warn{border-color:#7b5c1d;color:#ffd77c;background:#30250d}
      #${PANEL_ID} a.si-open{grid-column:2/4;margin-top:4px;width:100%;box-sizing:border-box;text-align:center;text-decoration:none;border:1px solid #25597a;background:#103654;color:#dff5ff;padding:6px 8px;border-radius:7px;font-size:8px;font-weight:800}
      #${PANEL_ID} .si-badge{font-size:7px;color:#66d9ff;border:1px solid #28536a;padding:3px 6px;border-radius:999px}
    `;
    document.head.appendChild(s);
  }

  const integrations=[
    {icon:'🩺',name:'Health Monitoring',desc:'Office health/status monitoring page',status:'AVAILABLE',statusClass:'online',href:'./health-monitoring.html'},
    {icon:'⌨️',name:'Typing Tool',desc:'External typing utility used by QA',status:'AVAILABLE',statusClass:'online',href:'https://typing-tool-pu0o.onrender.com'},
    {icon:'🌐',name:'Portfolio',desc:'Leo portfolio project site',status:'AVAILABLE',statusClass:'online',href:'./portfolio/'},
    {icon:'🐙',name:'GitHub Repository',desc:'Source code, commits and deployments',status:'CONNECTED',statusClass:'online',href:'https://github.com/Oudom1/ai-agents-office'},
    {icon:'⚙️',name:'Backend API',desc:'AI Office task and agent API on Railway',status:'CHECKING',statusClass:'warn',href:null,id:'backend'},
    {icon:'🎬',name:'Kai Video Provider',desc:'Hugging Face ZeroGPU LTX video route',status:'INTEGRATED',statusClass:'online',href:null},
    {icon:'📁',name:'Google Drive',desc:'Final video/result upload target',status:'WHEN CONFIGURED',statusClass:'warn',href:'https://drive.google.com/'}
  ];

  function render(){
    if(document.getElementById(PANEL_ID)) return true;
    const aside=document.querySelector('aside');
    if(!aside) return false;
    const manager=aside.querySelector('.manager-control');
    const panel=document.createElement('section');
    panel.id=PANEL_ID;
    panel.innerHTML=`<div class="si-head"><h2>System Integrations</h2><span class="si-badge">LIVE LINKS</span></div><div class="si-sub">Connected tools and services used by the AI Agents Office</div><div class="si-grid">${integrations.map(x=>`<div class="si-item" ${x.id?`data-integration="${x.id}"`:''}><div class="si-icon">${x.icon}</div><div><div class="si-name">${x.name}</div><div class="si-desc">${x.desc}</div></div><span class="si-status ${x.statusClass||''}">${x.status}</span>${x.href?`<a class="si-open" href="${x.href}" ${x.href.startsWith('http')?'target="_blank" rel="noopener"':''}>Open ${x.name}</a>`:''}</div>`).join('')}</div>`;
    if(manager && manager.parentNode) manager.parentNode.insertBefore(panel,manager.nextSibling); else aside.prepend(panel);
    checkBackend();
    return true;
  }

  async function checkBackend(){
    const item=document.querySelector(`#${PANEL_ID} [data-integration="backend"]`);
    if(!item) return;
    const status=item.querySelector('.si-status');
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),5000);
    try{
      const token=sessionStorage.getItem(TOKEN_KEY)||'';
      const r=await fetch(`${API}/auth/status`,{headers:token?{Authorization:`Bearer ${token}`}:{},cache:'no-store',signal:controller.signal});
      if(r.ok){status.textContent='ONLINE';status.className='si-status online';}
      else{status.textContent=`API ${r.status}`;status.className='si-status warn';}
    }catch{status.textContent='UNREACHABLE';status.className='si-status warn';}
    finally{clearTimeout(timer);}
  }

  addStyle();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(render() || tries>=20) clearInterval(timer);
  },250);
})();
(()=>{
  const API='https://ai-agents-office-production.up.railway.app/api';
  const TOKEN_KEY='ai-office-auth-token-v1';
  const ID='ai-office-logs-overlay';

  function styles(){
    if(document.getElementById('ai-office-logs-style')) return;
    const s=document.createElement('style');
    s.id='ai-office-logs-style';
    s.textContent=`
      #ai-office-logs-btn{position:fixed;right:18px;bottom:18px;z-index:9000;border:1px solid #2f6686;background:#0b2b40;color:#e9f7ff;border-radius:10px;padding:10px 14px;font:700 12px Inter,Segoe UI,Arial,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);cursor:pointer}
      #ai-office-logs-btn:hover{background:#123c57}
      #${ID}{position:fixed;inset:0;z-index:9500;background:rgba(2,8,15,.88);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#e8f4fb}
      #${ID} .log-card{width:min(1050px,96vw);height:min(760px,92vh);background:#071827;border:1px solid #28516d;border-radius:14px;box-shadow:0 28px 80px rgba(0,0,0,.58);display:flex;flex-direction:column;overflow:hidden}
      #${ID} .log-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#0c2233;border-bottom:1px solid #28516d}
      #${ID} .log-head h2{margin:0;font-size:16px}
      #${ID} .log-head small{color:#7fa4bb;margin-left:10px}
      #${ID} .log-actions{display:flex;gap:8px}
      #${ID} button{border:1px solid #315f7d;background:#11344b;color:#eefaff;border-radius:8px;padding:8px 11px;font-weight:700;cursor:pointer}
      #${ID} .danger{background:#3a1720;border-color:#81404f}
      #${ID} .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;padding:12px 14px;border-bottom:1px solid #18364a}
      #${ID} .stat{background:#0b2232;border:1px solid #1f455e;border-radius:9px;padding:10px}
      #${ID} .stat span{display:block;color:#789bb0;font-size:10px;text-transform:uppercase;letter-spacing:.06em}
      #${ID} .stat b{display:block;margin-top:5px;font-size:14px}
      #${ID} .body{display:grid;grid-template-columns:1.15fr .85fr;gap:12px;padding:12px;overflow:auto;min-height:0}
      #${ID} .panel{background:#081c2b;border:1px solid #1d425a;border-radius:10px;padding:11px;min-height:250px}
      #${ID} .panel h3{margin:0 0 9px;font-size:13px;color:#c8edff}
      #${ID} .entry{padding:9px;border-top:1px solid #17384d;font-size:11px;line-height:1.4}
      #${ID} .entry:first-of-type{border-top:none}
      #${ID} .time{color:#6e91a7}.success{color:#7ee2a8}.failed,.blocked{color:#ff9eaa}.info{color:#b9dcf0}
      #${ID} .empty{color:#7899ad;font-size:11px;padding:12px 2px}
      #${ID} .error{color:#ff9eaa;background:#35151d;border:1px solid #743846;border-radius:8px;padding:9px;margin:10px 14px 0}
      @media(max-width:760px){#${ID} .summary{grid-template-columns:1fr 1fr}#${ID} .body{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function token(){try{return sessionStorage.getItem(TOKEN_KEY)||''}catch{return ''}}
  async function api(path){
    const headers={}; const t=token(); if(t) headers.Authorization='Bearer '+t;
    const r=await fetch(API+path,{headers,cache:'no-store'});
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.error||`HTTP ${r.status}`);
    return data;
  }
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const when=v=>{try{return new Date(v).toLocaleString()}catch{return String(v||'')}};

  async function refresh(){
    const root=document.getElementById(ID); if(!root) return;
    const error=root.querySelector('.error'); if(error) error.remove();
    root.querySelector('#audit-list').innerHTML='<div class="empty">Loading security logs…</div>';
    root.querySelector('#task-list').innerHTML='<div class="empty">Loading task activity…</div>';
    try{
      const [health,logs,ops]=await Promise.all([api('/health'),api('/auth/logs'),api('/operations')]);
      root.querySelector('#st-health').textContent=health.ok?'ONLINE':'DEGRADED';
      root.querySelector('#st-auth').textContent=health.authConfigured?'CONFIGURED':'NOT CONFIGURED';
      root.querySelector('#st-agents').textContent=String(ops?.counts?.agents??'-');
      root.querySelector('#st-tasks').textContent=`${ops?.counts?.active??0} active / ${ops?.counts?.done??0} done`;

      const audit=Array.isArray(logs)?logs:[];
      root.querySelector('#audit-list').innerHTML=audit.length?audit.slice(0,80).map(x=>`<div class="entry"><div><b class="${String(x.result||'info').toLowerCase()}">${esc(x.result||'INFO')}</b> · <b>${esc(x.user||'unknown')}</b></div><div>${esc(x.detail||'')}</div><div class="time">${esc(when(x.time))}${x.ip?` · ${esc(x.ip)}`:''}</div></div>`).join(''):'<div class="empty">No security events recorded in this backend process yet.</div>';

      const tasks=Array.isArray(ops?.recentTasks)?ops.recentTasks:[];
      root.querySelector('#task-list').innerHTML=tasks.length?tasks.map(t=>`<div class="entry"><div><b>${esc(t.title||'Task')}</b></div><div>${esc(t.agentId||'agent')} · ${esc(t.status||'unknown')}${t.phase?` · ${esc(t.phase)}`:''}</div><div class="time">${esc(when(t.completedAt||t.startedAt||t.createdAt))}</div>${t.blocker?`<div class="failed">⚠ ${esc(t.blocker)}</div>`:''}</div>`).join(''):'<div class="empty">No recent task activity.</div>';
    }catch(e){
      root.insertAdjacentHTML('afterbegin',`<div class="error">Unable to load office logs: ${esc(e?.message||e)}. Sign in again if the session expired.</div>`);
      root.querySelector('#audit-list').innerHTML='<div class="empty">Logs unavailable.</div>';
      root.querySelector('#task-list').innerHTML='<div class="empty">Task activity unavailable.</div>';
    }
  }

  function open(){
    if(document.getElementById(ID)) return;
    styles();
    const d=document.createElement('div'); d.id=ID;
    d.innerHTML=`<div class="log-card"><div class="log-head"><div><h2>Office Logs & Audit <small>Railway backend</small></h2></div><div class="log-actions"><button id="logs-refresh">Refresh</button><button id="logs-close" class="danger">Close</button></div></div><div class="summary"><div class="stat"><span>Backend</span><b id="st-health">Checking…</b></div><div class="stat"><span>Authentication</span><b id="st-auth">Checking…</b></div><div class="stat"><span>Agents</span><b id="st-agents">-</b></div><div class="stat"><span>Tasks</span><b id="st-tasks">-</b></div></div><div class="body"><div class="panel"><h3>Security / Login Audit</h3><div id="audit-list"></div></div><div class="panel"><h3>Recent Agent / Task Activity</h3><div id="task-list"></div></div></div></div>`;
    d.addEventListener('click',e=>{if(e.target===d)d.remove()});
    document.body.appendChild(d);
    d.querySelector('#logs-close').onclick=()=>d.remove();
    d.querySelector('#logs-refresh').onclick=refresh;
    refresh();
  }

  function mount(){
    styles();
    if(document.getElementById('ai-office-logs-btn')) return;
    const b=document.createElement('button'); b.id='ai-office-logs-btn'; b.textContent='☰ Logs / Audit'; b.onclick=open; document.body.appendChild(b);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,800)); else setTimeout(mount,800);
})();
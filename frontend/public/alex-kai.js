(() => {
  const TASK_KEY = 'ai-agents-office-tasks-v3';
  let scheduled = false;

  function toast(message) {
    let el = document.getElementById('office-helper-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'office-helper-toast';
      Object.assign(el.style, {
        position:'fixed',right:'22px',top:'74px',zIndex:'9999',maxWidth:'360px',
        padding:'10px 12px',borderRadius:'9px',background:'#132a3d',border:'1px solid #3b769a',
        color:'#bfeaff',font:'700 11px Inter,system-ui,sans-serif',boxShadow:'0 12px 30px rgba(0,0,0,.35)'
      });
      document.body.appendChild(el);
    }
    el.textContent = message;
    clearTimeout(window.__officeToast);
    window.__officeToast = setTimeout(() => el?.remove(), 3200);
  }

  function clearAllTasks() {
    localStorage.removeItem(TASK_KEY);
    toast('All dashboard tasks and blockers cleared.');
    setTimeout(() => location.reload(), 350);
  }

  function clearSelectedAgentTasks() {
    const select = document.querySelector('.manager-control select');
    if (!(select instanceof HTMLSelectElement)) return;
    const agentId = select.value;
    const agentName = select.selectedOptions[0]?.textContent?.trim() || 'selected agent';
    try {
      const data = JSON.parse(localStorage.getItem(TASK_KEY) || '[]');
      const tasks = Array.isArray(data) ? data : [];
      const remaining = tasks.filter(t => t?.agentId !== agentId);
      const removed = tasks.length - remaining.length;
      localStorage.setItem(TASK_KEY, JSON.stringify(remaining));
      toast(`${removed} task${removed === 1 ? '' : 's'} cleared for ${agentName}.`);
      setTimeout(() => location.reload(), 350);
    } catch {
      toast(`Could not clear tasks for ${agentName}.`);
    }
  }

  function ensureClearAllButton() {
    const manager = document.querySelector('.manager-control');
    if (!(manager instanceof HTMLElement) || document.getElementById('clear-previous-tasks')) return;
    const btn = document.createElement('button');
    btn.id = 'clear-previous-tasks';
    btn.className = 'secondary';
    btn.textContent = 'Clear Tasks';
    Object.assign(btn.style,{display:'block',width:'100%',marginTop:'8px',borderColor:'#8f3d4b',color:'#ffc1c8',background:'#2c1720',fontWeight:'800'});
    btn.addEventListener('click', clearAllTasks);
    manager.appendChild(btn);
  }

  function ensureCleanupCard() {
    const results = document.querySelector('.results-panel');
    const select = document.querySelector('.manager-control select');
    if (!(results instanceof HTMLElement) || !(select instanceof HTMLSelectElement)) return;
    const agentName = select.selectedOptions[0]?.textContent?.trim() || 'Selected Agent';
    let card = document.getElementById('task-cleanup-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'task-cleanup-card';
      card.className = 'panel';
      card.innerHTML = `<div class="panel-title"><h2>Task Cleanup</h2><span>USER TASKS</span></div><p class="muted" style="margin:6px 0 10px">Clear tasks only for: <b id="task-cleanup-user" style="color:#dcecff"></b></p><button id="clear-selected-user-tasks" style="width:100%;background:#5a2832;border-color:#8f3d4b;color:#ffd7dc">Clear User Tasks</button>`;
      results.insertAdjacentElement('afterend', card);
      card.querySelector('#clear-selected-user-tasks')?.addEventListener('click', clearSelectedAgentTasks);
    }
    const label = card.querySelector('#task-cleanup-user');
    if (label && label.textContent !== agentName) label.textContent = agentName;
  }

  function ensureKaiProviderStatus() {
    const panel = document.querySelector('.kai-panel');
    if (!(panel instanceof HTMLElement) || document.getElementById('kai-provider-status')) return;
    const box = document.createElement('div');
    box.id = 'kai-provider-status';
    box.innerHTML = `<b style="color:#8fdcff">REMOTION VIDEO ENGINE</b><br><span>Remotion only — React timeline, scenes, captions, motion and MP4 rendering.</span><br><span style="color:#9ef5ff">Kai target: full 60-second comedy composition (1800 frames @ 30fps).</span><br><span style="color:#8ba6ba">No PixVerse, HeyGen, OpenArt, Runway, ZeroGPU or other video provider fallback.</span>`;
    Object.assign(box.style,{margin:'8px 0',padding:'8px',borderRadius:'8px',border:'1px solid #365f73',background:'#102532',color:'#d5edf8',fontSize:'9px',lineHeight:1.45});
    const note = panel.querySelector('.kai-note');
    note?.insertAdjacentElement('afterend', box);
  }

  function ensureHealthLink() {
    if (document.getElementById('health-office-link')) return;
    const link = document.createElement('a');
    link.id = 'health-office-link';
    link.href = './health-monitoring.html';
    link.textContent = 'Health Monitoring Office';
    Object.assign(link.style,{position:'fixed',left:'18px',bottom:'18px',zIndex:'9998',padding:'9px 12px',borderRadius:'999px',background:'#103044',border:'1px solid #2b718d',color:'#d9f7ff',textDecoration:'none',font:'800 10px Inter,system-ui,sans-serif',boxShadow:'0 10px 24px rgba(0,0,0,.35)'});
    document.body.appendChild(link);
  }

  function apply() {
    scheduled = false;
    ensureClearAllButton();
    ensureCleanupCard();
    ensureKaiProviderStatus();
    ensureHealthLink();
  }

  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});
  apply();
})();
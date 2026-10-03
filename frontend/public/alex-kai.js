(() => {
  const PREPARED = 'data-alex-prepared';

  const ideas = [
    'an IT administrator fixing one issue and accidentally creating three new alerts',
    'a confident Wi-Fi restart that makes the whole office lose connection',
    'a printer that looks fixed and then suddenly floods the office with paper',
    'a server reboot promised to take five seconds but everyone keeps waiting',
    'a security analyst celebrating too early before dozens of alerts appear',
    'an IT administrator unplugging the wrong cable and every monitor suddenly going dark'
  ];

  function setReactInput(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.dispatchEvent(new Event('change', {bubbles: true}));
  }

  function buildBrief(seed) {
    const clean = (seed || ideas[Math.floor(Math.random() * ideas.length)]).trim().slice(0, 82);
    return `Alex brief → Kai: Create a 10-second funny comedy cartoon video about ${clean}. Bright colorful 2D cartoon, exaggerated reactions, playful timing, vertical 9:16. FREE ONLY; no paid fallback; upload real final MP4 to Drive.`.slice(0, 240);
  }

  function showPrepToast(message) {
    let toast = document.getElementById('alex-kai-prep-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'alex-kai-prep-toast';
      Object.assign(toast.style, {
        position: 'fixed', right: '22px', top: '74px', zIndex: '9999',
        maxWidth: '360px', padding: '11px 13px', borderRadius: '10px',
        background: '#132a3d', border: '1px solid #3b769a', color: '#bfeaff',
        font: '700 11px Inter,system-ui,sans-serif', boxShadow: '0 14px 34px rgba(0,0,0,.35)'
      });
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    clearTimeout(window.__alexKaiToastTimer);
    window.__alexKaiToastTimer = setTimeout(() => toast?.remove(), 4200);
  }

  function selectKai() {
    const select = document.querySelector('.manager-control select');
    if (!(select instanceof HTMLSelectElement)) return false;
    const kaiOption = [...select.options].find(o => /Senior Implement|Kai/i.test(o.textContent || ''));
    if (!kaiOption) return false;
    select.value = kaiOption.value;
    select.dispatchEvent(new Event('change', {bubbles: true}));
    return true;
  }

  function prepareBlockedComedy() {
    selectKai();
    setTimeout(() => {
      const input = document.querySelector('.manager-control .task-compose input');
      if (!(input instanceof HTMLInputElement)) return;
      const brief = buildBrief('a fresh funny IT office mishap selected by Alex');
      setReactInput(input, brief);
      showPrepToast('Alex prepared Kai’s Comedy Cartoon brief, but generation is BLOCKED: no free video provider is currently available.');
    }, 150);
  }

  function ensureTaskBoardCard() {
    const office = document.querySelector('.office');
    if (!(office instanceof HTMLElement) || document.getElementById('alex-kai-board-card')) return;

    const card = document.createElement('div');
    card.id = 'alex-kai-board-card';
    card.innerHTML = `
      <div style="font-size:8px;font-weight:900;letter-spacing:.8px;color:#75e9ff">ALEX → KAI • FREE VIDEO ROUTER</div>
      <div style="font-size:11px;font-weight:900;color:#fff;margin:4px 0 4px">Comedy Cartoon</div>
      <div style="display:grid;gap:3px;font-size:7px;line-height:1.35">
        <div style="color:#ff9eaa">● HeyGen — BLOCKED • Avatar IV monthly free limit reached</div>
        <div style="color:#ffd37a">● OpenArt — BLOCKED • 40 credits available, cheapest video needs 50</div>
        <div style="color:#ff9eaa">● Runway — BLOCKED • free workspace has no video models</div>
      </div>
      <div style="display:flex;gap:4px;margin-top:6px;align-items:center"><span style="font-size:7px;padding:2px 4px;border:1px solid #8f3d4b;border-radius:999px;color:#ffb4bd;background:#341820">BLOCKED</span><span style="font-size:7px;color:#85a4bb">FREE ONLY • NO PAID FALLBACK</span></div>
      <button id="alex-kai-board-run" style="margin-top:6px;width:100%;padding:5px 6px;border-radius:6px;border:1px solid #705229;background:#302715;color:#ffe0a0;font-size:8px;font-weight:800;cursor:pointer">Prepare Brief While Waiting</button>`;
    Object.assign(card.style, {
      position: 'absolute', left: '26.2%', top: '8.2%', width: '19.5%', minHeight: '15%', zIndex: '9',
      padding: '8px', borderRadius: '8px', border: '1px solid #2a6a86',
      background: 'linear-gradient(180deg,rgba(12,43,59,.96),rgba(8,27,39,.96))',
      boxShadow: '0 8px 20px rgba(0,0,0,.28)', fontFamily: 'Inter,system-ui,sans-serif'
    });
    office.appendChild(card);
    card.querySelector('#alex-kai-board-run')?.addEventListener('click', prepareBlockedComedy);
  }

  function ensureProviderBanner() {
    const kaiPanel = document.querySelector('.kai-panel');
    if (!(kaiPanel instanceof HTMLElement) || document.getElementById('kai-provider-status')) return;
    const box = document.createElement('div');
    box.id = 'kai-provider-status';
    box.innerHTML = `<b style="color:#ff9eaa">VIDEO GENERATION BLOCKED</b><br><span>HeyGen free limit reached • OpenArt 40/50 credits • Runway free video unavailable</span><br><span style="color:#8ba6ba">Kai will not mark a video complete until a real MP4 exists.</span>`;
    Object.assign(box.style, {
      margin: '8px 0', padding: '8px', borderRadius: '8px', border: '1px solid #743d48',
      background: '#2c1720', color: '#ffd2d7', fontSize: '9px', lineHeight: '1.45'
    });
    const note = kaiPanel.querySelector('.kai-note');
    note?.insertAdjacentElement('afterend', box);
  }

  function ensureButton() {
    ensureTaskBoardCard();
    ensureProviderBanner();
    const control = document.querySelector('.manager-control');
    const assign = control?.querySelector('.assign-btn');
    const input = control?.querySelector('.task-compose input');
    if (!(assign instanceof HTMLButtonElement) || !(input instanceof HTMLInputElement)) return;

    const kaiSelected = /Kai/i.test(assign.textContent || '');
    let prep = document.getElementById('alex-prepare-kai');

    if (!kaiSelected) {
      prep?.remove();
      return;
    }
    if (prep) return;

    prep = document.createElement('button');
    prep.id = 'alex-prepare-kai';
    prep.className = 'secondary';
    prep.textContent = 'Alex Prepare Comedy Brief (Provider Blocked)';
    prep.setAttribute('title', 'Alex can prepare the brief, but free video generation is currently blocked');
    assign.insertAdjacentElement('afterend', prep);

    prep.addEventListener('click', () => {
      const seed = input.value.trim() || 'a fresh funny IT office mishap selected by Alex';
      const brief = buildBrief(seed);
      setReactInput(input, brief);
      showPrepToast('Alex prepared the Comedy Cartoon brief. Kai is waiting for a free video provider.');
    });
  }

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('.kai-panel .template-btn') : null;
    if (!(button instanceof HTMLButtonElement)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const name = button.textContent?.trim() || 'video task';
    const input = document.querySelector('.manager-control .task-compose input');
    if (input instanceof HTMLInputElement) {
      const seed = name === 'IT Comedy' ? ideas[Math.floor(Math.random() * ideas.length)] : `${name} comedy cartoon concept`;
      setReactInput(input, buildBrief(seed));
    }
    showPrepToast(`Alex prepared ${name} for Kai, but real video generation is blocked until a free provider becomes available.`);
  }, true);

  const observer = new MutationObserver(ensureButton);
  observer.observe(document.documentElement, {subtree: true, childList: true, characterData: true});
  ensureButton();
})();

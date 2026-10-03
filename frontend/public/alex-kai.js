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
    return `Alex brief → Kai: Create a 10-second funny comedy cartoon video about ${clean}. Bright colorful 2D cartoon, exaggerated reactions, playful timing, vertical 9:16. HeyGen FREE ONLY; no paid fallback; upload final MP4 to Drive.`.slice(0, 240);
  }

  function showPrepToast(message) {
    let toast = document.getElementById('alex-kai-prep-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'alex-kai-prep-toast';
      Object.assign(toast.style, {
        position: 'fixed', right: '22px', top: '74px', zIndex: '9999',
        maxWidth: '340px', padding: '11px 13px', borderRadius: '10px',
        background: '#132a3d', border: '1px solid #3b769a', color: '#bfeaff',
        font: '700 11px Inter,system-ui,sans-serif', boxShadow: '0 14px 34px rgba(0,0,0,.35)'
      });
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    clearTimeout(window.__alexKaiToastTimer);
    window.__alexKaiToastTimer = setTimeout(() => toast?.remove(), 3200);
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

  function prepareAndAssignComedy() {
    selectKai();
    setTimeout(() => {
      const input = document.querySelector('.manager-control .task-compose input');
      const assign = document.querySelector('.manager-control .assign-btn');
      if (!(input instanceof HTMLInputElement) || !(assign instanceof HTMLButtonElement)) return;
      const brief = buildBrief('a fresh funny IT office mishap selected by Alex');
      setReactInput(input, brief);
      showPrepToast('Alex is preparing a Comedy Cartoon task for Kai…');
      setTimeout(() => {
        assign.setAttribute(PREPARED, '1');
        assign.click();
        showPrepToast('Alex prepared and assigned the Comedy Cartoon task to Kai.');
      }, 1000);
    }, 150);
  }

  function ensureTaskBoardCard() {
    const office = document.querySelector('.office');
    if (!(office instanceof HTMLElement) || document.getElementById('alex-kai-board-card')) return;

    const card = document.createElement('div');
    card.id = 'alex-kai-board-card';
    card.innerHTML = `
      <div style="font-size:8px;font-weight:900;letter-spacing:.8px;color:#75e9ff">ALEX → KAI</div>
      <div style="font-size:11px;font-weight:900;color:#fff;margin:4px 0 2px">Comedy Cartoon</div>
      <div style="font-size:7px;line-height:1.35;color:#a9bfd2">Alex prepares a fresh funny IT cartoon brief, then assigns it to Kai for video generation.</div>
      <div style="display:flex;gap:4px;margin-top:6px;align-items:center"><span style="font-size:7px;padding:2px 4px;border:1px solid #277653;border-radius:999px;color:#80f3b7;background:#0d3023">READY</span><span style="font-size:7px;color:#85a4bb">FREE ONLY • 9:16</span></div>
      <button id="alex-kai-board-run" style="margin-top:6px;width:100%;padding:5px 6px;border-radius:6px;border:1px solid #2b6f8d;background:#123e55;color:#d9f5ff;font-size:8px;font-weight:800;cursor:pointer">Prepare & Assign to Kai</button>`;
    Object.assign(card.style, {
      position: 'absolute', left: '26.2%', top: '8.2%', width: '19.5%', minHeight: '15%', zIndex: '9',
      padding: '8px', borderRadius: '8px', border: '1px solid #2a6a86',
      background: 'linear-gradient(180deg,rgba(12,43,59,.96),rgba(8,27,39,.96))',
      boxShadow: '0 8px 20px rgba(0,0,0,.28)', fontFamily: 'Inter,system-ui,sans-serif'
    });
    office.appendChild(card);
    card.querySelector('#alex-kai-board-run')?.addEventListener('click', prepareAndAssignComedy);
  }

  function ensureButton() {
    ensureTaskBoardCard();
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
    prep.textContent = 'Alex Prepare Comedy Cartoon for Kai';
    prep.setAttribute('title', 'Alex prepares the comedy cartoon video brief first, then assigns it to Kai');
    assign.insertAdjacentElement('afterend', prep);

    prep.addEventListener('click', () => {
      const seed = input.value.trim() || 'a fresh funny IT office mishap selected by Alex';
      const brief = buildBrief(seed);
      setReactInput(input, brief);
      showPrepToast('Alex is preparing the Comedy Cartoon brief for Kai…');
      prep.disabled = true;
      prep.textContent = 'Alex preparing…';

      setTimeout(() => {
        assign.setAttribute(PREPARED, '1');
        assign.click();
        showPrepToast('Alex prepared the brief and assigned it to Kai.');
        prep?.remove();
      }, 1200);
    });
  }

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('.kai-panel .template-btn') : null;
    if (!(button instanceof HTMLButtonElement)) return;
    if (button.getAttribute(PREPARED) === '1') {
      button.removeAttribute(PREPARED);
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    const name = button.textContent?.trim() || 'video task';
    showPrepToast(`Alex is preparing the ${name} brief for Kai…`);
    setTimeout(() => {
      showPrepToast(`Alex finished preparation and assigned ${name} to Kai.`);
      button.setAttribute(PREPARED, '1');
      button.click();
    }, 1000);
  }, true);

  const observer = new MutationObserver(ensureButton);
  observer.observe(document.documentElement, {subtree: true, childList: true, characterData: true});
  ensureButton();
})();

(() => {
  const PREPARED = 'data-alex-prepared';

  const ideas = [
    'an IT administrator fixing one issue and accidentally creating three new alerts',
    'a confident Wi-Fi restart that makes the whole office lose connection',
    'a printer that looks fixed and then suddenly floods the office with paper',
    'a server reboot promised to take five seconds but everyone keeps waiting',
    'a security analyst celebrating too early before dozens of alerts appear'
  ];

  function setReactInput(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.dispatchEvent(new Event('change', {bubbles: true}));
  }

  function buildBrief(seed) {
    const clean = (seed || ideas[Math.floor(Math.random() * ideas.length)]).trim().slice(0, 82);
    return `Alex brief → Kai: Create a 10s vertical 9:16 video about ${clean}. Use 3 scenes: setup → key/funny moment → ending. Bright engaging style. HeyGen FREE ONLY; no paid fallback; upload final MP4 to Drive.`.slice(0, 240);
  }

  function showPrepToast(message) {
    let toast = document.getElementById('alex-kai-prep-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'alex-kai-prep-toast';
      Object.assign(toast.style, {
        position: 'fixed', right: '22px', top: '74px', zIndex: '9999',
        maxWidth: '320px', padding: '11px 13px', borderRadius: '10px',
        background: '#132a3d', border: '1px solid #3b769a', color: '#bfeaff',
        font: '700 11px Inter,system-ui,sans-serif', boxShadow: '0 14px 34px rgba(0,0,0,.35)'
      });
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    clearTimeout(window.__alexKaiToastTimer);
    window.__alexKaiToastTimer = setTimeout(() => toast?.remove(), 3200);
  }

  function ensureButton() {
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
    prep.textContent = 'Alex Prepare & Assign to Kai';
    prep.setAttribute('title', 'Alex prepares the video brief first, then assigns it to Kai');
    assign.insertAdjacentElement('afterend', prep);

    prep.addEventListener('click', () => {
      const seed = input.value.trim();
      const brief = buildBrief(seed);
      setReactInput(input, brief);
      showPrepToast('Alex is preparing the task brief for Kai…');
      prep.disabled = true;
      prep.textContent = 'Alex preparing…';

      setTimeout(() => {
        showPrepToast('Alex prepared the brief and assigned it to Kai.');
        assign.setAttribute(PREPARED, '1');
        assign.click();
        prep?.remove();
      }, 1600);
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
    }, 1400);
  }, true);

  const observer = new MutationObserver(ensureButton);
  observer.observe(document.documentElement, {subtree: true, childList: true, characterData: true});
  ensureButton();
})();

const securityScript = document.createElement('script');
securityScript.src = '../security-gate.js';
document.head.appendChild(securityScript);

document.getElementById('year').textContent = new Date().getFullYear();

const profileCore = document.querySelector('.profile-core');
if (profileCore) {
  const roleLine = profileCore.querySelector('span');
  const titleLine = profileCore.querySelector('b');
  if (roleLine) roleLine.textContent = 'Senior System Administration';
  if (titleLine) titleLine.textContent = '& Access Management Specialist';
}

const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');

// Connect portfolio with the two AI office experiences.
if (links && !document.getElementById('portfolio-office-link')) {
  const officeLink = document.createElement('a');
  officeLink.id = 'portfolio-office-link';
  officeLink.href = '../';
  officeLink.textContent = 'AI Office';
  officeLink.title = 'Open AI Agents Office';
  links.appendChild(officeLink);

  const healthLink = document.createElement('a');
  healthLink.id = 'portfolio-health-link';
  healthLink.href = '../health-monitoring.html';
  healthLink.textContent = 'Health Monitor';
  healthLink.title = 'Open Health Monitoring AI Agents Office';
  links.appendChild(healthLink);
}

const heroActions = document.querySelector('.hero-actions');
if (heroActions && !document.getElementById('hero-health-office')) {
  const officeBtn = document.createElement('a');
  officeBtn.className = 'btn ghost';
  officeBtn.id = 'hero-ai-office';
  officeBtn.href = '../';
  officeBtn.textContent = 'AI Agents Office';
  heroActions.appendChild(officeBtn);

  const healthBtn = document.createElement('a');
  healthBtn.className = 'btn ghost';
  healthBtn.id = 'hero-health-office';
  healthBtn.href = '../health-monitoring.html';
  healthBtn.textContent = 'Health Monitor';
  heroActions.appendChild(healthBtn);
}

toggle?.addEventListener('click', () => {
  const open = links?.classList.toggle('open') ?? false;
  toggle.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    links?.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
  });
});

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {threshold: 0.1});

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

const navAnchors = [...document.querySelectorAll('.nav-links a')];
const sections = navAnchors
  .map(link => {
    const href = link.getAttribute('href') || '';
    return href.startsWith('#') ? document.querySelector(href) : null;
  })
  .filter(Boolean);

const navObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navAnchors.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
    });
  });
}, {rootMargin: '-35% 0px -55% 0px'});

sections.forEach(section => navObserver.observe(section));

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
  .map(link => document.querySelector(link.getAttribute('href')))
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

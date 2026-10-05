(()=>{
  const MOBILE=matchMedia('(max-width:900px)');
  const root=document.documentElement;
  const apply=()=>root.classList.toggle('mobile-office',MOBILE.matches);
  apply();
  MOBILE.addEventListener?.('change',apply);

  // Pause CSS-heavy office rendering while the tab is hidden.
  document.addEventListener('visibilitychange',()=>{
    root.classList.toggle('office-paused',document.hidden);
  });

  // Avoid smooth-scroll work on mobile and keep touch scrolling native.
  if(MOBILE.matches){
    root.style.scrollBehavior='auto';
    document.body.style.touchAction='pan-y';
  }
})();
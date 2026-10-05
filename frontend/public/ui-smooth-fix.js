(()=>{
  const STYLE_ID='ai-office-ui-smooth-fix';
  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      html,body{height:auto!important;min-height:100%!important;overflow-x:auto!important;overflow-y:auto!important;overscroll-behavior-y:auto!important;scroll-behavior:smooth!important}
      body{position:static!important;touch-action:pan-x pan-y!important}
      #root,.app,main{height:auto!important;max-height:none!important;overflow:visible!important}
      .app{min-height:100vh!important;padding-bottom:48px!important}
      main{align-items:start!important}
      aside{height:auto!important;max-height:none!important;overflow:visible!important;align-self:start!important}
      .panel,.office-card{contain:layout style}
      .tasks-panel,.results-panel{overscroll-behavior:contain;scrollbar-gutter:stable}
      .office{will-change:auto!important}
      .agent{will-change:auto!important}
      @media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
    `;
    document.head.appendChild(style);
  }

  // If a wheel event reaches the edge of an inner scroll area, let the page continue scrolling.
  window.addEventListener('wheel',(e)=>{
    const el=e.target instanceof Element?e.target.closest('.tasks-panel,.results-panel'):null;
    if(!el) return;
    const atTop=el.scrollTop<=0;
    const atBottom=Math.ceil(el.scrollTop+el.clientHeight)>=el.scrollHeight;
    if((e.deltaY<0&&atTop)||(e.deltaY>0&&atBottom)){
      window.scrollBy({top:e.deltaY,behavior:'auto'});
    }
  },{passive:true});
})();
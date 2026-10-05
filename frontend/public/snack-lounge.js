(()=>{
  const SNACKS=['🍕','🍔','🍩','🍪','🍎','🍌','🥪','🍟','🥤','🧃','☕','💧'];
  const STYLE_ID='ai-office-snack-lounge-style';
  const LOUNGE_ID='ai-office-snack-lounge';

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${LOUNGE_ID}{position:absolute;left:4.5%;top:72.7%;width:40.5%;height:19.5%;z-index:3;pointer-events:none;font-family:Inter,Segoe UI,Arial,sans-serif}
      .lounge-sofa{position:absolute;left:3%;bottom:5%;width:39%;height:42%;filter:drop-shadow(0 5px 5px rgba(0,0,0,.28))}
      .sofa-back{position:absolute;left:0;bottom:25%;width:82%;height:54%;border-radius:12px 12px 7px 7px;background:linear-gradient(180deg,#247da1,#15506e);border:2px solid #71d1ef;box-shadow:inset 0 -8px 0 rgba(0,0,0,.16)}
      .sofa-seat{position:absolute;left:4%;bottom:5%;width:78%;height:29%;border-radius:7px;background:linear-gradient(180deg,#2d8cb1,#165773);border:2px solid #83def6}
      .sofa-chaise{position:absolute;left:63%;bottom:4%;width:34%;height:31%;border-radius:7px;background:linear-gradient(180deg,#2d8cb1,#165773);border:2px solid #83def6}
      .sofa-arm{position:absolute;left:-3%;bottom:5%;width:12%;height:50%;border-radius:9px;background:#1d6687;border:2px solid #70cfe9}
      .sofa-cushion{position:absolute;width:21%;height:22%;bottom:32%;border-radius:6px;background:#4ca4c3;border:1px solid #8fe3f7;box-shadow:inset 0 -3px 0 rgba(0,0,0,.12)}
      .sofa-cushion.c1{left:10%}.sofa-cushion.c2{left:33%}.sofa-cushion.c3{left:56%}
      .snack-bar{position:absolute;left:48%;bottom:4%;width:50%;height:67%;border-radius:10px;background:linear-gradient(180deg,rgba(19,51,68,.96),rgba(8,26,38,.97));border:1px solid #39758e;box-shadow:0 6px 16px rgba(0,0,0,.3),inset 0 0 20px rgba(67,198,239,.05)}
      .snack-title{position:absolute;left:8%;top:7%;font-size:8px;font-weight:900;letter-spacing:.11em;color:#9fe9ff;text-transform:uppercase}
      .snack-shelf{position:absolute;left:7%;right:7%;top:31%;height:45%;display:grid;grid-template-columns:repeat(6,1fr);align-items:center;gap:2px;padding:3px 5px;border-radius:7px;background:#0d2635;border:1px solid #244d62}
      .snack-item{font-size:15px;text-align:center;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35));animation:snackFloat 2.4s ease-in-out infinite}
      .snack-item:nth-child(2n){animation-delay:.4s}.snack-item:nth-child(3n){animation-delay:.8s}
      .snack-cooler{position:absolute;right:5%;top:4%;font-size:18px;opacity:.9}
      .snack-note{position:absolute;left:7%;bottom:5%;font-size:7px;color:#78a9bd}
      .break-snack{position:absolute;transform:translate(-50%,-50%);font-size:17px;z-index:25;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5));animation:snackBob 1.3s ease-in-out infinite;pointer-events:none}
      @keyframes snackFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
      @keyframes snackBob{0%,100%{transform:translate(-50%,-50%) rotate(-4deg)}50%{transform:translate(-50%,-57%) rotate(5deg)}}
      @media(max-width:900px){.snack-item{font-size:11px}.snack-title,.snack-note{font-size:6px}}
    `;
    document.head.appendChild(style);
  }

  function addLounge(){
    const office=document.querySelector('.office');
    if(!office || document.getElementById(LOUNGE_ID)) return;
    const wrap=document.createElement('div');
    wrap.id=LOUNGE_ID;
    wrap.innerHTML=`
      <div class="lounge-sofa" aria-label="L shaped lounge sofa">
        <div class="sofa-back"></div><div class="sofa-seat"></div><div class="sofa-chaise"></div><div class="sofa-arm"></div>
        <div class="sofa-cushion c1"></div><div class="sofa-cushion c2"></div><div class="sofa-cushion c3"></div>
      </div>
      <div class="snack-bar" aria-label="Agent snack bar">
        <div class="snack-title">Agent Snack Bar</div><div class="snack-cooler">🧊</div>
        <div class="snack-shelf">${SNACKS.map((s,i)=>`<span class="snack-item" data-snack="${i}">${s}</span>`).join('')}</div>
        <div class="snack-note">Free snacks during break • grab & recharge</div>
      </div>`;
    office.appendChild(wrap);
  }

  function decorateBreakAgents(){
    const office=document.querySelector('.office');
    if(!office) return;
    office.querySelectorAll('.break-snack').forEach(n=>n.remove());
    const breakAgents=[...office.querySelectorAll('.agent.state-break,.agent.state-coffee,.agent.state-off-duty')];
    breakAgents.forEach((agent,i)=>{
      const el=agent;
      const snack=document.createElement('div');
      snack.className='break-snack';
      snack.textContent=SNACKS[(i*3+Math.floor(Date.now()/12000))%SNACKS.length];
      const left=parseFloat(el.style.left||'20');
      const top=parseFloat(el.style.top||'80');
      snack.style.left=`${Math.min(44,Math.max(6,left+3))}%`;
      snack.style.top=`${Math.min(92,Math.max(72,top-3))}%`;
      office.appendChild(snack);
    });
  }

  function init(){addStyle();addLounge();decorateBreakAgents();}
  init();
  const obs=new MutationObserver(()=>{addLounge();decorateBreakAgents();});
  const root=document.getElementById('root')||document.body;
  obs.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  setInterval(decorateBreakAgents,12000);
})();
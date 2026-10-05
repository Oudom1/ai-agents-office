(()=>{
  const SNACKS=['🍕','🍔','🍩','🍪','🍎','🍌','🥪','🍟','🥤','🧃','☕','💧'];
  const LUNCHES=['🍱','🍜','🍛','🍚','🍗','🥗','🍕','🥪','🍲','🥤','🧃','🍉'];
  const STYLE_ID='ai-office-snack-lounge-style';
  const LOUNGE_ID='ai-office-snack-lounge';
  const CAFE_ID='ai-office-cafeteria';

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${LOUNGE_ID}{position:absolute;left:4.5%;top:72.7%;width:40.5%;height:19.5%;z-index:3;pointer-events:none;font-family:Inter,Segoe UI,Arial,sans-serif}
      #${CAFE_ID}{position:absolute;left:51.5%;top:72.7%;width:43.5%;height:19.5%;z-index:3;pointer-events:none;font-family:Inter,Segoe UI,Arial,sans-serif}
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
      .break-snack,.lunch-plate{position:absolute;transform:translate(-50%,-50%);font-size:17px;z-index:25;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5));animation:snackBob 1.3s ease-in-out infinite;pointer-events:none}

      .cafe-counter{position:absolute;right:2%;top:8%;width:31%;height:73%;border-radius:7px;background:linear-gradient(180deg,#694928,#3b2919);border:2px solid #b78a56;box-shadow:0 6px 12px rgba(0,0,0,.35),inset 0 0 0 2px rgba(255,220,170,.06)}
      .cafe-counter-top{position:absolute;left:-3%;right:-3%;top:-5%;height:13%;border-radius:5px;background:linear-gradient(180deg,#d1a26a,#96683e);border:1px solid #e8c99d}
      .cafe-sign{position:absolute;left:8%;top:10%;font-size:8px;font-weight:900;letter-spacing:.1em;color:#ffe2b7;text-transform:uppercase}
      .cafe-food{position:absolute;left:7%;right:7%;top:31%;display:grid;grid-template-columns:repeat(4,1fr);gap:2px;align-items:center}
      .cafe-food span{font-size:15px;text-align:center;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35));animation:snackFloat 2.8s ease-in-out infinite}
      .cafe-appliances{position:absolute;left:6%;right:6%;bottom:5%;display:flex;justify-content:space-between;align-items:center;font-size:16px}
      .cafe-fridge{position:absolute;right:35%;top:11%;width:10%;height:58%;border-radius:6px;background:linear-gradient(180deg,#b9d3da,#688995);border:2px solid #d9f2f7;box-shadow:0 4px 9px rgba(0,0,0,.3)}
      .cafe-fridge:before{content:'🧃';position:absolute;left:50%;top:16%;transform:translateX(-50%);font-size:15px}
      .cafe-fridge:after{content:'';position:absolute;left:12%;right:12%;top:49%;border-top:2px solid #4b6872}
      .dining-table{position:absolute;left:7%;top:20%;width:43%;height:42%}
      .dining-top{position:absolute;left:17%;top:23%;width:66%;height:43%;border-radius:50%;background:radial-gradient(ellipse at 45% 38%,#b98a57,#6c4a2b);border:2px solid #d7ac78;box-shadow:0 5px 9px rgba(0,0,0,.35)}
      .dining-center{position:absolute;left:42%;top:35%;font-size:15px;z-index:2}
      .chair-seat{position:absolute;width:17%;height:25%;border-radius:5px;background:#8a623e;border:2px solid #c89a65;box-shadow:0 3px 5px rgba(0,0,0,.3)}
      .chair-seat.c1{left:0;top:31%}.chair-seat.c2{right:0;top:31%}.chair-seat.c3{left:42%;top:-4%}.chair-seat.c4{left:42%;bottom:-6%}
      .cafe-plant{position:absolute;left:52%;bottom:6%;font-size:23px;filter:drop-shadow(0 3px 3px rgba(0,0,0,.35))}
      .cafe-note{position:absolute;left:4%;bottom:1%;font-size:7px;color:#b99a73}

      @keyframes snackFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
      @keyframes snackBob{0%,100%{transform:translate(-50%,-50%) rotate(-4deg)}50%{transform:translate(-50%,-57%) rotate(5deg)}}
      @media(max-width:900px){.snack-item,.cafe-food span{font-size:11px}.snack-title,.snack-note,.cafe-sign,.cafe-note{font-size:6px}}
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

  function addCafeteria(){
    const office=document.querySelector('.office');
    if(!office || document.getElementById(CAFE_ID)) return;
    const wrap=document.createElement('div');
    wrap.id=CAFE_ID;
    wrap.innerHTML=`
      <div class="dining-table" aria-label="Cafeteria dining table">
        <div class="dining-top"></div><div class="dining-center">🍲</div>
        <div class="chair-seat c1"></div><div class="chair-seat c2"></div><div class="chair-seat c3"></div><div class="chair-seat c4"></div>
      </div>
      <div class="cafe-fridge" aria-label="Drinks fridge"></div>
      <div class="cafe-counter" aria-label="Lunch serving counter">
        <div class="cafe-counter-top"></div><div class="cafe-sign">Lunch Counter</div>
        <div class="cafe-food">${LUNCHES.slice(0,8).map(x=>`<span>${x}</span>`).join('')}</div>
        <div class="cafe-appliances"><span title="Microwave">📻</span><span title="Coffee">☕</span><span title="Cold drinks">🥤</span></div>
      </div>
      <div class="cafe-plant">🪴</div>
      <div class="cafe-note">Lunch zone • sit, eat & recharge</div>`;
    office.appendChild(wrap);
  }

  function decorateAgents(){
    const office=document.querySelector('.office');
    if(!office) return;
    office.querySelectorAll('.break-snack,.lunch-plate').forEach(n=>n.remove());

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

    const lunchAgents=[...office.querySelectorAll('.agent.state-lunch')];
    lunchAgents.forEach((agent,i)=>{
      const el=agent;
      const meal=document.createElement('div');
      meal.className='lunch-plate';
      meal.textContent=LUNCHES[(i*2+Math.floor(Date.now()/15000))%LUNCHES.length];
      const left=parseFloat(el.style.left||'75');
      const top=parseFloat(el.style.top||'80');
      meal.style.left=`${Math.min(93,Math.max(53,left+3))}%`;
      meal.style.top=`${Math.min(92,Math.max(72,top-3))}%`;
      office.appendChild(meal);
    });
  }

  function init(){addStyle();addLounge();addCafeteria();decorateAgents();}
  init();
  const obs=new MutationObserver(()=>{addLounge();addCafeteria();decorateAgents();});
  const root=document.getElementById('root')||document.body;
  obs.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  setInterval(decorateAgents,12000);
})();
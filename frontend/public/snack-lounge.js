(()=>{
  const SNACKS=['🍕','🍔','🍩','🍪','🍎','🍌','🥪','🍟','🥤','🧃','☕','💧'];
  const LUNCHES=['🍱','🍜','🍛','🍚','🍗','🥗','🍕','🥪','🍲','🥤','🧃','🍉'];
  const STYLE_ID='ai-office-snack-lounge-style';
  const LOUNGE_ID='ai-office-snack-lounge';
  const CAFE_ID='ai-office-cafeteria';
  let snackTick=0;

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .office > .sofa,.office > .coffee,.office > .table{display:none!important}
      #${LOUNGE_ID}{position:absolute;left:4.5%;top:72.7%;width:40.5%;height:19.5%;z-index:3;pointer-events:none;font-family:Inter,Segoe UI,Arial,sans-serif}
      #${CAFE_ID}{position:absolute;left:51.5%;top:72.7%;width:43.5%;height:19.5%;z-index:3;pointer-events:none;font-family:Inter,Segoe UI,Arial,sans-serif}
      .lounge-sofa{position:absolute;left:3%;bottom:5%;width:39%;height:42%;filter:drop-shadow(0 5px 5px rgba(0,0,0,.28))}
      .sofa-back{position:absolute;left:0;bottom:25%;width:82%;height:54%;border-radius:12px 12px 7px 7px;background:linear-gradient(180deg,#247da1,#15506e);border:2px solid #71d1ef}
      .sofa-seat{position:absolute;left:4%;bottom:5%;width:78%;height:29%;border-radius:7px;background:linear-gradient(180deg,#2d8cb1,#165773);border:2px solid #83def6}
      .sofa-chaise{position:absolute;left:63%;bottom:4%;width:34%;height:31%;border-radius:7px;background:linear-gradient(180deg,#2d8cb1,#165773);border:2px solid #83def6}
      .sofa-arm{position:absolute;left:-3%;bottom:5%;width:12%;height:50%;border-radius:9px;background:#1d6687;border:2px solid #70cfe9}
      .sofa-cushion{position:absolute;width:21%;height:22%;bottom:32%;border-radius:6px;background:#4ca4c3;border:1px solid #8fe3f7}
      .sofa-cushion.c1{left:10%}.sofa-cushion.c2{left:33%}.sofa-cushion.c3{left:56%}
      .snack-bar{position:absolute;left:48%;bottom:4%;width:50%;height:67%;border-radius:10px;background:linear-gradient(180deg,rgba(19,51,68,.96),rgba(8,26,38,.97));border:1px solid #39758e}
      .snack-title{position:absolute;left:8%;top:7%;font-size:8px;font-weight:900;letter-spacing:.11em;color:#9fe9ff;text-transform:uppercase}
      .snack-shelf{position:absolute;left:7%;right:7%;top:31%;height:45%;display:grid;grid-template-columns:repeat(6,1fr);align-items:center;gap:2px;padding:3px 5px;border-radius:7px;background:#0d2635;border:1px solid #244d62}
      .snack-item{font-size:15px;text-align:center}
      .snack-cooler{position:absolute;right:5%;top:4%;font-size:18px;opacity:.9}
      .snack-note{position:absolute;left:7%;bottom:5%;font-size:7px;color:#78a9bd}
      .break-snack,.lunch-plate{position:absolute;transform:translate(-50%,-50%);font-size:17px;z-index:25;pointer-events:none}
      .cafe-counter{position:absolute;right:2%;top:8%;width:31%;height:73%;border-radius:7px;background:linear-gradient(180deg,#694928,#3b2919);border:2px solid #b78a56}
      .cafe-counter-top{position:absolute;left:-3%;right:-3%;top:-5%;height:13%;border-radius:5px;background:linear-gradient(180deg,#d1a26a,#96683e);border:1px solid #e8c99d}
      .cafe-sign{position:absolute;left:8%;top:10%;font-size:8px;font-weight:900;letter-spacing:.1em;color:#ffe2b7;text-transform:uppercase}
      .cafe-food{position:absolute;left:7%;right:7%;top:31%;display:grid;grid-template-columns:repeat(4,1fr);gap:2px;align-items:center}
      .cafe-food span{font-size:15px;text-align:center}
      .cafe-appliances{position:absolute;left:6%;right:6%;bottom:5%;display:flex;justify-content:space-between;align-items:center;font-size:16px}
      .cafe-fridge{position:absolute;right:35%;top:11%;width:10%;height:58%;border-radius:6px;background:linear-gradient(180deg,#b9d3da,#688995);border:2px solid #d9f2f7}
      .cafe-fridge:before{content:'🧃';position:absolute;left:50%;top:16%;transform:translateX(-50%);font-size:15px}
      .cafe-fridge:after{content:'';position:absolute;left:12%;right:12%;top:49%;border-top:2px solid #4b6872}
      .dining-table{position:absolute;left:7%;top:20%;width:43%;height:42%}
      .dining-top{position:absolute;left:17%;top:23%;width:66%;height:43%;border-radius:50%;background:radial-gradient(ellipse at 45% 38%,#b98a57,#6c4a2b);border:2px solid #d7ac78}
      .dining-center{position:absolute;left:42%;top:35%;font-size:15px;z-index:2}
      .chair-seat{position:absolute;width:17%;height:25%;border-radius:5px;background:#8a623e;border:2px solid #c89a65}
      .chair-seat.c1{left:0;top:31%}.chair-seat.c2{right:0;top:31%}.chair-seat.c3{left:42%;top:-4%}.chair-seat.c4{left:42%;bottom:-6%}
      .cafe-plant{position:absolute;left:52%;bottom:6%;font-size:23px}
      .cafe-note{position:absolute;left:4%;bottom:1%;font-size:7px;color:#b99a73}
      @media(max-width:900px){.snack-item,.cafe-food span{font-size:11px}.snack-title,.snack-note,.cafe-sign,.cafe-note{font-size:6px}}
    `;
    document.head.appendChild(style);
  }

  function addStaticAreas(){
    const office=document.querySelector('.office');
    if(!office) return false;
    if(!document.getElementById(LOUNGE_ID)){
      const lounge=document.createElement('div');
      lounge.id=LOUNGE_ID;
      lounge.innerHTML=`<div class="lounge-sofa"><div class="sofa-back"></div><div class="sofa-seat"></div><div class="sofa-chaise"></div><div class="sofa-arm"></div><div class="sofa-cushion c1"></div><div class="sofa-cushion c2"></div><div class="sofa-cushion c3"></div></div><div class="snack-bar"><div class="snack-title">Agent Snack Bar</div><div class="snack-cooler">🧊</div><div class="snack-shelf">${SNACKS.map(s=>`<span class="snack-item">${s}</span>`).join('')}</div><div class="snack-note">Free snacks during break • grab & recharge</div></div>`;
      office.appendChild(lounge);
    }
    if(!document.getElementById(CAFE_ID)){
      const cafe=document.createElement('div');
      cafe.id=CAFE_ID;
      cafe.innerHTML=`<div class="dining-table"><div class="dining-top"></div><div class="dining-center">🍲</div><div class="chair-seat c1"></div><div class="chair-seat c2"></div><div class="chair-seat c3"></div><div class="chair-seat c4"></div></div><div class="cafe-fridge"></div><div class="cafe-counter"><div class="cafe-counter-top"></div><div class="cafe-sign">Lunch Counter</div><div class="cafe-food">${LUNCHES.slice(0,8).map(x=>`<span>${x}</span>`).join('')}</div><div class="cafe-appliances"><span>📻</span><span>☕</span><span>🥤</span></div></div><div class="cafe-plant">🪴</div><div class="cafe-note">Lunch zone • sit, eat & recharge</div>`;
      office.appendChild(cafe);
    }
    return true;
  }

  function decorateAgents(){
    const office=document.querySelector('.office');
    if(!office) return;
    office.querySelectorAll('.break-snack,.lunch-plate').forEach(n=>n.remove());
    const breakAgents=[...office.querySelectorAll('.agent.state-break,.agent.state-coffee,.agent.state-off-duty')];
    breakAgents.forEach((el,i)=>{
      const snack=document.createElement('div');
      snack.className='break-snack';
      snack.textContent=SNACKS[(i*3+snackTick)%SNACKS.length];
      const left=parseFloat(el.style.left||'20');
      const top=parseFloat(el.style.top||'80');
      snack.style.left=`${Math.min(44,Math.max(6,left+3))}%`;
      snack.style.top=`${Math.min(92,Math.max(72,top-3))}%`;
      office.appendChild(snack);
    });
    const lunchAgents=[...office.querySelectorAll('.agent.state-lunch')];
    lunchAgents.forEach((el,i)=>{
      const meal=document.createElement('div');
      meal.className='lunch-plate';
      meal.textContent=LUNCHES[(i*2+snackTick)%LUNCHES.length];
      const left=parseFloat(el.style.left||'75');
      const top=parseFloat(el.style.top||'80');
      meal.style.left=`${Math.min(93,Math.max(53,left+3))}%`;
      meal.style.top=`${Math.min(92,Math.max(72,top-3))}%`;
      office.appendChild(meal);
    });
    snackTick=(snackTick+1)%120;
  }

  addStyle();
  let tries=0;
  const boot=setInterval(()=>{
    tries++;
    if(addStaticAreas() || tries>=20){
      clearInterval(boot);
      decorateAgents();
    }
  },250);
  setInterval(()=>{
    if(document.hidden) return;
    addStaticAreas();
    decorateAgents();
  },12000);
})();
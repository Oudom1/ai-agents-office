import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

type Agent={id:string;name:string;role:string;state:string;position:{x:number;y:number};home:{x:number;y:number};destination?:{x:number;y:number};currentTask?:string};
type Task={id:string;title:string;agentId:string;status:string;createdAt:string};

const API=(import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';
const fallbackAgents:Agent[]=[
{id:'manager',name:'Alex',role:'Manager',state:'working',position:{x:14.3,y:18.2},home:{x:14.3,y:18.2}},
{id:'sysadmin',name:'Sam',role:'Senior System Admin',state:'working',position:{x:43.0,y:45.2},home:{x:43.0,y:45.2}},
{id:'security',name:'Mina',role:'Senior Security',state:'working',position:{x:64.7,y:45.2},home:{x:64.7,y:45.2}},
{id:'cloud',name:'Noah',role:'Senior Cloud Operator',state:'working',position:{x:84.5,y:45.2},home:{x:84.5,y:45.2}},
{id:'qa',name:'Lina',role:'Senior Q/A',state:'working',position:{x:46.0,y:63.7},home:{x:46.0,y:63.7}},
{id:'implement',name:'Kai',role:'Senior Implement',state:'working',position:{x:78.5,y:63.7},home:{x:78.5,y:63.7}}
];

const sampleTasks=[
  ['Review vulnerability alert','High','In Progress'],
  ['Optimize cloud cost','Medium','Pending'],
  ['Run regression tests','Low','Pending'],
  ['Update server configuration','Medium','Pending']
];

function App(){
 const [agents,setAgents]=useState<Agent[]>(fallbackAgents);
 const [tasks,setTasks]=useState<Task[]>([]);
 const [selected,setSelected]=useState('security');
 const [taskTitle,setTaskTitle]=useState('');
 const [controls,setControls]=useState(false);
 const refresh=async()=>{try{const [a,t]=await Promise.all([fetch(`${API}/agents`),fetch(`${API}/tasks`)]); if(a.ok)setAgents(await a.json()); if(t.ok)setTasks(await t.json());}catch{}};
 useEffect(()=>{refresh(); const id=setInterval(refresh,1500); return()=>clearInterval(id)},[]);
 const updateLocal=(id:string,patch:Partial<Agent>)=>setAgents(prev=>prev.map(a=>a.id===id?{...a,...patch}:a));
 const call=async()=>{try{const r=await fetch(`${API}/manager/call/${selected}`,{method:'POST'});if(!r.ok)throw 0;await refresh()}catch{updateLocal(selected,{state:'called',destination:{x:46,y:27}})}};
 const state=async(s:string)=>{try{const r=await fetch(`${API}/agents/${selected}/state`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:s})});if(!r.ok)throw 0;await refresh()}catch{const a=agents.find(x=>x.id===selected);const destination=s==='break'?{x:18,y:60}:s==='lunch'?{x:28,y:86}:a?.home;updateLocal(selected,{state:s,destination})}};
 const assign=async()=>{if(!taskTitle.trim())return;try{const r=await fetch(`${API}/tasks`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId:selected,title:taskTitle})});if(!r.ok)throw 0;setTaskTitle('');await refresh()}catch{const t={id:crypto.randomUUID(),agentId:selected,title:taskTitle,status:'active',createdAt:new Date().toISOString()};setTasks(prev=>[t,...prev]);updateLocal(selected,{state:'assigned-task',currentTask:taskTitle,destination:agents.find(a=>a.id===selected)?.home});setTaskTitle('')}};
 const workerAgents=useMemo(()=>agents.filter(a=>a.id!=='manager'),[agents]);
 const called=agents.find(a=>a.state==='called');
 const assigned=agents.find(a=>a.state==='assigned-task');
 return <div className="page">
   <div className="game-shell">
     <header className="hero-bar">
       <div className="hero-brand"><div className="building-icon"><i/><i/><i/></div><div><h1>AI Agents Office</h1><p>6 Agents <b>•</b> 1 Team <b>•</b> 1 Goal <b>•</b> Work Together for Better Results!</p></div></div>
       <div className="legend">
         <Legend c="work" t="Work"/><Legend c="relax" t="Relax / Break"/><Legend c="lunch" t="Lunch"/><Legend c="call" t="Manager Call"/><Legend c="assigned" t="Assigned Task"/>
       </div>
     </header>

     <section className="office-map">
       <div className="zone manager-zone"><WoodSign>Manager Office</WoodSign><Bookshelf/><Plant x={7} y={18}/><Plant x={79} y={27}/><WallChart/><ManagerDesk/><VisitorChair x={10}/><VisitorChair x={67}/></div>
       <div className="zone lounge-zone"><GreenSign>Lounge / Relax</GreenSign><Bookshelf small/><WaterCooler/><Tv/><Sofa/><RoundTable/><Plant x={5} y={78}/><Plant x={80} y={74}/></div>
       <div className="zone cafe-zone"><WoodSign>Cafeteria / Lunch</WoodSign><FoodCounter/><Chef/><Vending/><CafeTable x={4} y={55}/><CafeTable x={37} y={66}/><CafeTable x={67} y={58}/><Poster/><Plant x={85} y={20}/></div>
       <div className="zone work-zone"><WoodSign>Work Area</WoodSign>
         <WorkDesk x={16} y={30} icon="terminal"/><WorkDesk x={48} y={30} icon="shield"/><WorkDesk x={80} y={30} icon="cloud"/>
         <WorkDesk x={20} y={68} icon="check"/><WorkDesk x={70} y={68} icon="gear"/>
         <div className="center-table"><span>▣</span><span>🌿</span><span>▤</span></div>
         <Plant x={3} y={36}/><Plant x={94} y={39}/>
       </div>

       <TaskBoard/>
       <ActiveBoard tasks={tasks}/>
       <Entrance/>

       {called && <div className="route call-route"><i/><i/><i/><i/><span>➜</span></div>}
       {assigned && <div className="route assigned-route"><i/><i/><i/><i/><span>➜</span></div>}
       {agents.map(a=><AgentSprite key={a.id} agent={a}/>)}

       <button className="control-fab" onClick={()=>setControls(v=>!v)}>⚙</button>
       {controls && <div className="control-popover">
         <h3>Manager Control</h3>
         <select value={selected} onChange={e=>setSelected(e.target.value)}>{workerAgents.map(a=><option key={a.id} value={a.id}>{a.role}</option>)}</select>
         <button className="purple" onClick={call}>☎ Call Agent</button>
         <div className="control-row"><button onClick={()=>state('working')}>Work</button><button onClick={()=>state('break')}>Break</button><button onClick={()=>state('lunch')}>Lunch</button></div>
         <input value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} placeholder="Assign a task..."/>
         <button className="red" onClick={assign}>▤ Assign Task</button>
       </div>}
     </section>
   </div>
 </div>
}

function Legend({c,t}:{c:string;t:string}){return <div className="legend-item"><i className={c}/><span>{t}</span></div>}
function WoodSign({children}:{children:React.ReactNode}){return <div className="wood-sign">{children}</div>}
function GreenSign({children}:{children:React.ReactNode}){return <div className="green-sign">{children}</div>}
function Plant({x,y}:{x:number;y:number}){return <div className="plant" style={{left:`${x}%`,top:`${y}%`}}><span>♣</span></div>}
function Bookshelf({small=false}:{small?:boolean}){return <div className={`bookshelf ${small?'small':''}`}><b/><i/><i/><i/><i/><i/><i/><i/><i/></div>}
function WallChart(){return <div className="wall-chart"><div>↗</div></div>}
function VisitorChair({x}:{x:number}){return <div className="visitor-chair" style={{left:`${x}%`}}/>}
function ManagerDesk(){return <div className="manager-desk"><div className="monitor m1"/><div className="monitor m2"/><div className="paper">▤</div><div className="mug">☕</div></div>}
function WaterCooler(){return <div className="water-cooler"><b/><span/></div>}
function Tv(){return <div className="tv"><span/></div>}
function Sofa(){return <div className="sofa"><i/><i/><i/></div>}
function RoundTable(){return <div className="round-table">☕</div>}
function FoodCounter(){return <div className="food-counter"><div>🥗</div><div>🍱</div><div>🍜</div><div>🥪</div></div>}
function Chef(){return <div className="chef">👨‍🍳</div>}
function Vending(){return <div className="vending"><i/><i/><i/><i/><i/><i/></div>}
function CafeTable({x,y}:{x:number;y:number}){return <div className="cafe-table" style={{left:`${x}%`,top:`${y}%`}}><span>🌿</span></div>}
function Poster(){return <div className="poster">GOOD<br/>FOOD<br/>BETTER<br/>IDEAS</div>}
function WorkDesk({x,y,icon}:{x:number;y:number;icon:string}){return <div className="work-desk" style={{left:`${x}%`,top:`${y}%`}}><div className="desk-top"><div className="monitor left"/><div className={`monitor main ${icon}`}/><div className="monitor right"/><span className="books">▥</span><span className="deskplant">♣</span></div><div className="desk-chair"/></div>}
function TaskBoard(){return <div className="task-board"><h3>Task Board</h3>{sampleTasks.map(([title],i)=><div className="task-line" key={title}><i className={`task-dot d${i}`}/><span>{title}</span></div>)}</div>}
function ActiveBoard({tasks}:{tasks:Task[]}){const rows=tasks.length?tasks.slice(0,4).map((t,i)=>[t.title,i===0?'High':'Medium',t.status]):sampleTasks;return <div className="active-board"><h3>Active Tasks</h3>{rows.map(([title,sev,status],i)=><div className="active-line" key={`${title}-${i}`}><i className={`task-dot d${i}`}/><div><b>{title}</b><p><em className={sev.toLowerCase()}>{sev}</em><span>{i===0?'1/1':'0/1'}</span><strong>{status}</strong></p></div></div>)}</div>}
function Entrance(){return <div className="entrance"><div className="glass"><i/><i/></div><div className="entrance-sign">AI AGENTS<br/>OFFICE</div><Plant x={6} y={42}/><Plant x={76} y={42}/></div>}

function AgentSprite({agent}:{agent:Agent}){
 const p=agent.destination??agent.position;
 const statusLabel=agent.state==='working'?'Working':agent.state==='break'?'On Break':agent.state==='lunch'?'Lunch':agent.state==='called'?'Called':agent.state==='assigned-task'?'Assigned Task':agent.state;
 return <div className={`agent agent-${agent.id} state-${agent.state}`} style={{left:`${p.x}%`,top:`${p.y}%`}}>
   <div className="role-tag">{agent.role}</div>
   <div className="status-bubble">{agent.state==='called'?'☎':agent.state==='lunch'?'🍔':agent.state==='assigned-task'?'▤':agent.state==='break'?'☕':'▣'} <span>{agent.currentTask??statusLabel}</span></div>
   <div className="sprite"><div className="hair"/><div className="head"><i/><i/></div><div className="torso"/><div className="legs"><i/><i/></div></div>
   {agent.id!=='manager' && agent.state==='working' && <div className="work-pill">▣ Working</div>}
 </div>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

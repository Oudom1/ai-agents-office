import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

type Agent={id:string;name:string;role:string;state:string;position:{x:number;y:number};home:{x:number;y:number};destination?:{x:number;y:number};currentTask?:string};
type Task={id:string;title:string;agentId:string;status:string;createdAt:string};

const API=(import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';
const fallbackAgents:Agent[]=[
{id:'manager',name:'Alex',role:'Manager',state:'working',position:{x:16,y:19},home:{x:16,y:19}},
{id:'sysadmin',name:'Sam',role:'Senior System Admin',state:'working',position:{x:40,y:48},home:{x:40,y:48}},
{id:'security',name:'Mina',role:'Senior Security',state:'working',position:{x:59,y:48},home:{x:59,y:48}},
{id:'cloud',name:'Noah',role:'Senior Cloud Operator',state:'working',position:{x:78,y:48},home:{x:78,y:48}},
{id:'qa',name:'Lina',role:'Senior Q/A',state:'working',position:{x:43,y:66},home:{x:43,y:66}},
{id:'implement',name:'Kai',role:'Senior Implement',state:'working',position:{x:73,y:66},home:{x:73,y:66}}
];

function App(){
 const [agents,setAgents]=useState<Agent[]>(fallbackAgents); const [tasks,setTasks]=useState<Task[]>([]); const [selected,setSelected]=useState('security'); const [taskTitle,setTaskTitle]=useState('');
 const refresh=async()=>{try{const [a,t]=await Promise.all([fetch(`${API}/agents`),fetch(`${API}/tasks`)]); if(a.ok)setAgents(await a.json()); if(t.ok)setTasks(await t.json());}catch{}};
 useEffect(()=>{refresh(); const id=setInterval(refresh,1500); return()=>clearInterval(id)},[]);
 const updateLocal=(id:string,patch:Partial<Agent>)=>setAgents(prev=>prev.map(a=>a.id===id?{...a,...patch}:a));
 const call=async()=>{try{const r=await fetch(`${API}/manager/call/${selected}`,{method:'POST'});if(!r.ok)throw 0;await refresh()}catch{updateLocal(selected,{state:'called',destination:{x:27,y:28}})}};
 const state=async(s:string)=>{try{const r=await fetch(`${API}/agents/${selected}/state`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:s})});if(!r.ok)throw 0;await refresh()}catch{const a=agents.find(x=>x.id===selected);const destination=s==='break'?{x:15,y:59}:s==='lunch'?{x:24,y:84}:a?.home;updateLocal(selected,{state:s,destination})}};
 const assign=async()=>{if(!taskTitle.trim())return;try{const r=await fetch(`${API}/tasks`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId:selected,title:taskTitle})});if(!r.ok)throw 0;setTaskTitle('');await refresh()}catch{const t={id:crypto.randomUUID(),agentId:selected,title:taskTitle,status:'active',createdAt:new Date().toISOString()};setTasks(prev=>[t,...prev]);updateLocal(selected,{state:'assigned-task',currentTask:taskTitle,destination:agents.find(a=>a.id===selected)?.home});setTaskTitle('')}};
 const workerAgents=useMemo(()=>agents.filter(a=>a.id!=='manager'),[agents]);
 const activeTasks=tasks.filter(t=>t.status!=='done');
 return <div className="shell">
   <header className="topbar">
     <div className="brand"><div className="building">🏢</div><div><h1>AI Agents Office</h1><p>6 Agents • 1 Team • 1 Goal <span>•</span> Work Together for Better Results!</p></div></div>
     <div className="legend"><Legend c="blue" t="Work"/><Legend c="green" t="Relax / Break"/><Legend c="yellow" t="Lunch"/><Legend c="purple" t="Manager Call"/><Legend c="red" t="Assigned Task"/></div>
   </header>
   <div className="workspace">
     <section className="office-frame">
       <div className="office-map">
         <div className="room manager-office"><RoomTitle>Manager Office</RoomTitle><div className="rug"/><Plant x={9} y={22}/><Plant x={80} y={31}/><Desk x={49} y={56} manager/><div className="couch c1"/><div className="couch c2"/></div>
         <div className="room lounge"><RoomTitle>Lounge / Relax</RoomTitle><div className="big-plant">🌿</div><div className="sofa-pixel"><span/><span/><span/></div><div className="coffee-table">☕</div><div className="water">💧</div></div>
         <div className="room cafeteria"><RoomTitle>Cafeteria / Lunch</RoomTitle><div className="foodbar">🥗 🍱 🍲 🥪</div><div className="fridge">▦</div><div className="vending">▥</div><div className="lunch-table lt1">🍽️</div><div className="lunch-table lt2">🍽️</div><div className="lunch-table lt3">🍽️</div><div className="chef">👨‍🍳</div></div>
         <div className="room work-area"><RoomTitle>Work Area</RoomTitle>
           <Desk x={24} y={35}/><Desk x={52} y={35}/><Desk x={80} y={35}/><Desk x={30} y={70}/><Desk x={70} y={70}/>
           <div className="meeting-table">🖥️ 🌿 📄</div><Plant x={5} y={55}/><Plant x={93} y={57}/>
         </div>
         <div className="task-board"><h3>Task Board</h3>{['Review vulnerability alert','Optimize cloud cost','Run regression tests','Update server configuration'].map((t,i)=><div key={t} className="board-row"><span className={`priority p${i}`}></span>{t}</div>)}</div>
         <div className="active-board"><h3>Active Tasks</h3>{activeTasks.length===0?<><BoardTask title="Review vulnerability alert" sev="High" state="In Progress"/><BoardTask title="Optimize cloud cost" sev="Medium" state="Pending"/><BoardTask title="Run regression tests" sev="Low" state="Pending"/><BoardTask title="Update server configuration" sev="Medium" state="Pending"/></>:activeTasks.slice(0,4).map((t,i)=><BoardTask key={t.id} title={t.title} sev={i===0?'High':'Medium'} state={t.status}/>)}</div>
         <div className="entrance"><div className="glass-door">Ⅱ</div><div className="sign">AI AGENTS<br/>OFFICE</div><Plant x={8} y={60}/><Plant x={82} y={60}/></div>
         {agents.map(a=><AgentSprite key={a.id} agent={a}/>)}
       </div>
     </section>
     <aside className="control-panel">
       <div className="panel manager-control"><h2>Manager Control</h2><label>Choose agent</label><select value={selected} onChange={e=>setSelected(e.target.value)}>{workerAgents.map(a=><option key={a.id} value={a.id}>{a.role}</option>)}</select><button className="call-btn" onClick={call}>☎ Call to Manager</button><div className="action-grid"><button onClick={()=>state('working')}>💻 Work</button><button onClick={()=>state('break')}>☕ Break</button><button onClick={()=>state('lunch')}>🍱 Lunch</button></div><input placeholder="Assign a task..." value={taskTitle} onChange={e=>setTaskTitle(e.target.value)}/><button className="assign-btn" onClick={assign}>📋 Assign Task</button></div>
       <div className="panel"><h2>Agent Status</h2>{workerAgents.map(a=><div className="agent-row" key={a.id}><div><b>{a.name}</b><span>{a.role}</span></div><em className={`badge ${a.state}`}>{a.state}</em></div>)}</div>
     </aside>
   </div>
 </div>
}

function Legend({c,t}:{c:string;t:string}){return <div className="legend-item"><i className={c}/>{t}</div>}
function RoomTitle({children}:{children:React.ReactNode}){return <div className="room-title">{children}</div>}
function Plant({x,y}:{x:number;y:number}){return <div className="plant" style={{left:`${x}%`,top:`${y}%`}}>🪴</div>}
function Desk({x,y,manager=false}:{x:number;y:number;manager?:boolean}){return <div className={`pixel-desk ${manager?'manager-desk':''}`} style={{left:`${x}%`,top:`${y}%`}}><div className="screen">▦</div><div className="keyboard">▬</div><div className="chair"/><div className="desk-cup">☕</div></div>}
function BoardTask({title,sev,state}:{title:string;sev:string;state:string}){return <div className="active-task"><span className="task-icon">▣</span><div><b>{title}</b><div><em className={`sev ${sev.toLowerCase()}`}>{sev}</em><span>{state}</span></div></div></div>}
function AgentSprite({agent}:{agent:Agent}){const p=agent.destination??agent.position; const icon=agent.id==='manager'?'👨‍💼':agent.id==='security'?'🛡️':agent.id==='cloud'?'☁️':agent.id==='qa'?'🧪':agent.id==='implement'?'🛠️':'🖥️'; return <div className={`agent agent-${agent.id}`} title={`${agent.role} • ${agent.state}`} style={{left:`${p.x}%`,top:`${p.y}%`}}><div className={`speech state-${agent.state}`}>{agent.currentTask??agent.state}</div><div className="pixel-person"><div className="hair"/><div className="face">•‿•</div><div className="body">{icon}</div></div><div className="nameplate">{agent.role}</div></div>}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

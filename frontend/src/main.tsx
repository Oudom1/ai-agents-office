import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

type Agent={id:string;name:string;role:string;state:string;position:{x:number;y:number};home:{x:number;y:number};destination?:{x:number;y:number};currentTask?:string};
type Task={id:string;title:string;agentId:string;status:string;createdAt:string};

const API=(import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';
const TASK_TARGET=12;
const fallbackAgents:Agent[]=[
{id:'manager',name:'Alex',role:'Manager',state:'working',position:{x:18,y:18},home:{x:18,y:18}},
{id:'sysadmin',name:'Sam',role:'Senior System Administrator',state:'working',position:{x:20,y:43},home:{x:20,y:43}},
{id:'security',name:'Mina',role:'Senior Security',state:'working',position:{x:42,y:43},home:{x:42,y:43}},
{id:'cloud',name:'Noah',role:'Senior Cloud Operator',state:'working',position:{x:65,y:43},home:{x:65,y:43}},
{id:'qa',name:'Lina',role:'Senior Q/A',state:'working',position:{x:33,y:59},home:{x:33,y:59}},
{id:'implement',name:'Kai',role:'Senior Implement',state:'working',position:{x:58,y:59},home:{x:58,y:59}}
];

const kaiVideoTemplates=[
 {name:'Funny Cartoon',prompt:'Create a 10-second funny cartoon video. A cute office worker spills coffee on the desk, looks shocked, then pretends nothing happened while coworkers stare. Bright colorful 2D cartoon style, exaggerated facial expressions, playful movement, humorous tone, smooth animation, vertical 9:16.'},
 {name:'IT Comedy',prompt:'Create a 10-second funny cartoon video of an IT administrator confidently fixing a computer, accidentally unplugging the wrong cable, then freezing while every monitor goes dark. Bright 2D cartoon style, exaggerated reaction, playful comedy, vertical 9:16.'},
 {name:'Security Joke',prompt:'Create a 10-second funny cartoon video of a cybersecurity analyst celebrating that the system is secure, then 99 warning alerts suddenly appear on the monitor. Funny timing, exaggerated facial expression, colorful cartoon office, vertical 9:16.'},
 {name:'Short Promo',prompt:'Create a 10-second vertical animated promo video with energetic motion, clean modern graphics, short punchy scenes, upbeat mood, and a strong final hero shot. Format 9:16 for Shorts and Reels.'}
];

function App(){
 const [agents,setAgents]=useState<Agent[]>(fallbackAgents); const [tasks,setTasks]=useState<Task[]>([]); const [selected,setSelected]=useState('sysadmin'); const [taskTitle,setTaskTitle]=useState('');
 const refresh=async()=>{try{const [a,t]=await Promise.all([fetch(`${API}/agents`),fetch(`${API}/tasks`)]); if(a.ok)setAgents(await a.json()); if(t.ok)setTasks(await t.json());}catch{}};
 useEffect(()=>{refresh(); const id=setInterval(refresh,1500); return()=>clearInterval(id)},[]);
 const updateLocal=(id:string,patch:Partial<Agent>)=>setAgents(prev=>prev.map(a=>a.id===id?{...a,...patch}:a));
 const call=async()=>{try{const r=await fetch(`${API}/manager/call/${selected}`,{method:'POST'});if(!r.ok)throw 0;await refresh()}catch{updateLocal(selected,{state:'called',destination:{x:18,y:15}})}};
 const state=async(s:string)=>{try{const r=await fetch(`${API}/agents/${selected}/state`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:s})});if(!r.ok)throw 0;await refresh()}catch{const a=agents.find(x=>x.id===selected);const destination=s==='break'?{x:13,y:72}:s==='lunch'?{x:75,y:73}:a?.home;updateLocal(selected,{state:s,destination})}};
 const assign=async()=>{if(!taskTitle.trim())return;try{const r=await fetch(`${API}/tasks`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId:selected,title:taskTitle})});if(!r.ok)throw 0;setTaskTitle('');await refresh()}catch{const t={id:crypto.randomUUID(),agentId:selected,title:taskTitle,status:'active',createdAt:new Date().toISOString()};setTasks(prev=>[t,...prev]);updateLocal(selected,{state:'assigned-task',currentTask:taskTitle,destination:agents.find(a=>a.id===selected)?.home});setTaskTitle('')}};
 const workerAgents=useMemo(()=>agents.filter(a=>a.id!=='manager'),[agents]);
 const completedByAgent=useMemo(()=>Object.fromEntries(agents.map(a=>[a.id,Math.min(TASK_TARGET,tasks.filter(t=>t.agentId===a.id&&t.status.toLowerCase()==='done').length)])),[agents,tasks]);
 return <div className="app">
  <header><div><h1>AI AGENTS OFFICE</h1><p>Live multi-agent operations floor</p></div><div className="status"><span className="dot"/> SYSTEM ONLINE</div></header>
  <main>
   <section className="office-card">
    <div className="office">
      <Room x={3} y={4} w={29} h={25} title="MANAGER OFFICE" cls="manager-room"/>
      <Room x={34} y={4} w={28} h={25} title="TASK BOARD" cls="task-room"/>
      <Room x={64} y={4} w={33} h={25} title="ACTIVE TASKS" cls="active-room"/>
      <Room x={3} y={33} w={94} h={34} title="OPERATIONS FLOOR" cls="ops-room"/>
      <Room x={3} y={70} w={44} h={25} title="LOUNGE / BREAK" cls="lounge-room"/>
      <Room x={50} y={70} w={47} h={25} title="CAFETERIA / LUNCH" cls="cafe-room"/>
      <Desk x={16} y={16}/><Desk x={17} y={42}/><Desk x={39} y={42}/><Desk x={62} y={42}/><Desk x={30} y={57}/><Desk x={55} y={57}/>
      <div className="sofa" style={{left:'11%',top:'79%'}}>▰▰</div><div className="coffee" style={{left:'33%',top:'81%'}}>☕</div>
      <div className="table" style={{left:'67%',top:'80%'}}>▭</div><div className="coffee" style={{left:'84%',top:'82%'}}>☕</div>
      {agents.map(a=><AgentSprite key={a.id} agent={a} completed={completedByAgent[a.id]??0}/>)}
    </div>
   </section>
   <aside>
    <div className="panel"><h2>Manager Control</h2><label>Agent</label><select value={selected} onChange={e=>setSelected(e.target.value)}>{workerAgents.map(a=><option key={a.id} value={a.id}>{a.role}</option>)}</select><button onClick={call}>Call to Manager</button><div className="row"><button className="secondary" onClick={()=>state('working')}>Work</button><button className="secondary" onClick={()=>state('break')}>Break</button><button className="secondary" onClick={()=>state('lunch')}>Lunch</button></div><input placeholder="Assign a task..." value={taskTitle} onChange={e=>setTaskTitle(e.target.value)}/><button onClick={assign}>Assign Task</button></div>
    {selected==='implement'&&<div className="panel kai-panel"><div className="kai-title"><h2>Kai Video Studio</h2><span>FREE-FIRST</span></div><p className="kai-note">Create the prompt first, then route generation to an available video provider. Finished videos can be stored in Google Drive.</p><div className="skill-tags"><span>Runway</span><span>OpenArt</span><span>HeyGen</span><span>Adobe</span><span>Google Drive</span></div><label>Quick video templates</label><div className="template-grid">{kaiVideoTemplates.map(t=><button key={t.name} className="template-btn" onClick={()=>setTaskTitle(t.prompt)}>{t.name}</button>)}</div></div>}
    <div className="panel"><h2>Agent Status</h2>{workerAgents.map(a=><div className="agent-row" key={a.id}><div className="agent-info"><b>{a.name}</b><span>{a.role}</span>{a.id==='implement'&&<span className="kai-skill-line">Video AI • Adobe • Drive</span>}<MiniProgress completed={completedByAgent[a.id]??0}/></div><em className={`badge ${a.state}`}>{a.state}</em></div>)}</div>
    <div className="panel"><h2>Active Tasks</h2>{tasks.filter(t=>t.status!=='done').length===0?<p className="muted">No active tasks</p>:tasks.filter(t=>t.status!=='done').map(t=><div className="task" key={t.id}><b>{t.title}</b><span>{agents.find(a=>a.id===t.agentId)?.name}</span></div>)}</div>
   </aside>
  </main>
 </div>
}

function Room({x,y,w,h,title,cls}:{x:number;y:number;w:number;h:number;title:string;cls:string}){return <div className={`room ${cls}`} style={{left:`${x}%`,top:`${y}%`,width:`${w}%`,height:`${h}%`}}><span>{title}</span></div>}
function Desk({x,y}:{x:number;y:number}){return <div className="desk" style={{left:`${x}%`,top:`${y}%`}}><div className="monitor">▣</div><div className="chair">◉</div></div>}
function TaskLights({completed}:{completed:number}){const pct=Math.round((completed/TASK_TARGET)*100);return <div className="task-progress"><div className="task-lights" aria-label={`${completed} of ${TASK_TARGET} tasks completed`}>{Array.from({length:TASK_TARGET},(_,i)=><i key={i} className={i<completed?'on':'off'}/>)}</div><span>{completed}/{TASK_TARGET} task <b>{pct}%</b></span></div>}
function MiniProgress({completed}:{completed:number}){return <div className="mini-progress"><div>{Array.from({length:TASK_TARGET},(_,i)=><i key={i} className={i<completed?'on':'off'}/>)}</div><span>{completed}/{TASK_TARGET} task</span></div>}
function AgentSprite({agent,completed}:{agent:Agent;completed:number}){const p=agent.destination??agent.position; const initial=agent.name[0]; return <div className="agent" title={`${agent.role} • ${agent.state}`} style={{left:`${p.x}%`,top:`${p.y}%`}}><div className="bubble">{agent.currentTask??agent.state}</div><div className={`avatar ${agent.id}`}>{initial}</div><small>{agent.name}</small>{agent.id!=='manager'&&<TaskLights completed={completed}/>}</div>}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

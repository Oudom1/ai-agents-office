import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

type Agent={id:string;name:string;role:string;state:string;position:{x:number;y:number};home:{x:number;y:number};destination?:{x:number;y:number};currentTask?:string};
type Task={id:string;title:string;agentId:string;status:string;createdAt:string;phase?:string};

const API=(import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';
const TASK_TARGET=12;
const STORAGE_KEY='ai-agents-office-tasks-v2';
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

function loadLocalTasks():Task[]{
 try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return []}
}

function App(){
 const [agents,setAgents]=useState<Agent[]>(fallbackAgents);
 const [tasks,setTasks]=useState<Task[]>(loadLocalTasks);
 const [selected,setSelected]=useState('sysadmin');
 const [taskTitle,setTaskTitle]=useState('');
 const [notice,setNotice]=useState('');

 const refresh=async()=>{try{const [a,t]=await Promise.all([fetch(`${API}/agents`),fetch(`${API}/tasks`)]);if(a.ok){const data=await a.json();if(Array.isArray(data)&&data.length)setAgents(data)}if(t.ok){const data=await t.json();if(Array.isArray(data)&&data.length)setTasks(data)}}catch{}};
 useEffect(()=>{refresh();const id=setInterval(refresh,4000);return()=>clearInterval(id)},[]);
 useEffect(()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(tasks))},[tasks]);
 useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(''),2600);return()=>clearTimeout(id)},[notice]);

 const updateLocal=(id:string,patch:Partial<Agent>)=>setAgents(prev=>prev.map(a=>a.id===id?{...a,...patch}:a));
 const patchTask=(id:string,patch:Partial<Task>)=>setTasks(prev=>prev.map(t=>t.id===id?{...t,...patch}:t));

 const call=async()=>{try{const r=await fetch(`${API}/manager/call/${selected}`,{method:'POST'});if(!r.ok)throw 0;await refresh()}catch{updateLocal(selected,{state:'called',destination:{x:18,y:15}})}};
 const state=async(s:string)=>{try{const r=await fetch(`${API}/agents/${selected}/state`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:s})});if(!r.ok)throw 0;await refresh()}catch{const a=agents.find(x=>x.id===selected);const destination=s==='break'?{x:13,y:72}:s==='lunch'?{x:75,y:73}:a?.home;updateLocal(selected,{state:s,currentTask:undefined,destination})}};

 const startLocalTaskMotion=(agentId:string,title:string,taskId:string)=>{
   const a=agents.find(x=>x.id===agentId);if(!a)return;
   updateLocal(agentId,{state:'assigned-task',currentTask:title,destination:{x:48,y:18}});
   patchTask(taskId,{phase:'received'});
   window.setTimeout(()=>{updateLocal(agentId,{state:'preparing',currentTask:title,destination:{x:48,y:24}});patchTask(taskId,{phase:'preparing'})},900);
   window.setTimeout(()=>{updateLocal(agentId,{state:'working-task',currentTask:title,destination:a.home});patchTask(taskId,{phase:'working'})},2100);
 };

 const assign=async()=>{
   if(!taskTitle.trim())return;
   const title=taskTitle.trim();
   try{
     const r=await fetch(`${API}/tasks`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId:selected,title})});
     if(!r.ok)throw 0;
     setTaskTitle('');setNotice('Task assigned');await refresh();
   }catch{
     const id=crypto.randomUUID();
     const t:Task={id,agentId:selected,title,status:'active',phase:'queued',createdAt:new Date().toISOString()};
     setTasks(prev=>[t,...prev]);
     startLocalTaskMotion(selected,title,id);
     setTaskTitle('');
     setNotice(`${agents.find(a=>a.id===selected)?.name??'Agent'} started the task`);
   }
 };

 const completeTask=(task:Task)=>{
   patchTask(task.id,{status:'done',phase:'completed'});
   const next=tasks.find(t=>t.id!==task.id&&t.agentId===task.agentId&&t.status!=='done');
   if(next){startLocalTaskMotion(next.agentId,next.title,next.id)}else{const a=agents.find(x=>x.id===task.agentId);updateLocal(task.agentId,{state:'working',currentTask:undefined,destination:a?.home})}
   setNotice('Task completed — progress updated');
 };

 const clearDone=()=>setTasks(prev=>prev.filter(t=>t.status!=='done'));
 const workerAgents=useMemo(()=>agents.filter(a=>a.id!=='manager'),[agents]);
 const completedByAgent=useMemo(()=>Object.fromEntries(agents.map(a=>[a.id,Math.min(TASK_TARGET,tasks.filter(t=>t.agentId===a.id&&t.status.toLowerCase()==='done').length)])),[agents,tasks]);
 const activeTasks=tasks.filter(t=>t.status!=='done');
 const doneCount=tasks.filter(t=>t.status==='done').length;

 return <div className="app">
  <header><div><h1>AI AGENTS OFFICE</h1><p>Live multi-agent operations floor</p></div><div className="header-actions"><div className="status"><span className="dot"/> SYSTEM ONLINE</div>{notice&&<div className="toast">{notice}</div>}</div></header>
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
    <div className="panel manager-control"><h2>Manager Control</h2><label>Agent</label><select value={selected} onChange={e=>setSelected(e.target.value)}>{workerAgents.map(a=><option key={a.id} value={a.id}>{a.role}</option>)}</select><button onClick={call}>Call to Manager</button><div className="row"><button className="secondary" onClick={()=>state('working')}>Work</button><button className="secondary" onClick={()=>state('break')}>Break</button><button className="secondary" onClick={()=>state('lunch')}>Lunch</button></div><div className="task-compose"><input placeholder="Assign a task..." value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')assign()}}/><span>{taskTitle.length}/240</span></div><button className="assign-btn" disabled={!taskTitle.trim()} onClick={assign}>Assign Task</button></div>
    {selected==='implement'&&<div className="panel kai-panel"><div className="kai-title"><h2>Kai Video Studio</h2><span>FREE-FIRST</span></div><p className="kai-note">Pick a template or write your own prompt. Kai prepares the job first, then the video provider can be connected to execute it.</p><div className="skill-tags"><span>Runway</span><span>OpenArt</span><span>HeyGen</span><span>Adobe</span><span>Google Drive</span></div><label>Quick video templates</label><div className="template-grid">{kaiVideoTemplates.map(t=><button key={t.name} className="template-btn" onClick={()=>setTaskTitle(t.prompt)}>{t.name}</button>)}</div></div>}
    <div className="panel"><div className="panel-title"><h2>Agent Status</h2><span>{activeTasks.length} active</span></div>{workerAgents.map(a=><div className="agent-row" key={a.id}><div className="agent-info"><b>{a.name}</b><span>{a.role}</span>{a.id==='implement'&&<span className="kai-skill-line">Video AI • Adobe • Drive</span>}<MiniProgress completed={completedByAgent[a.id]??0}/></div><em className={`badge ${a.state}`}>{friendlyState(a.state)}</em></div>)}</div>
    <div className="panel tasks-panel"><div className="panel-title"><h2>Active Tasks</h2>{doneCount>0&&<button className="text-btn" onClick={clearDone}>Clear done</button>}</div>{activeTasks.length===0?<p className="muted">No active tasks</p>:activeTasks.map(t=><div className="task-card" key={t.id}><div className="task-top"><span className={`task-phase ${t.phase??'queued'}`}>{friendlyPhase(t.phase)}</span><span className="task-agent">{agents.find(a=>a.id===t.agentId)?.name}</span></div><b>{t.title}</b><div className="task-bottom"><span>{timeAgo(t.createdAt)}</span><button onClick={()=>completeTask(t)}>✓ Complete</button></div></div>)}</div>
   </aside>
  </main>
 </div>
}

function friendlyState(state:string){if(state==='assigned-task')return 'assigned';if(state==='working-task')return 'working';return state}
function friendlyPhase(phase?:string){if(phase==='received')return 'Received';if(phase==='preparing')return 'Preparing';if(phase==='working')return 'Working';return 'Queued'}
function timeAgo(value:string){const s=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/1000));if(s<60)return `${s}s ago`;const m=Math.floor(s/60);if(m<60)return `${m}m ago`;return `${Math.floor(m/60)}h ago`}
function Room({x,y,w,h,title,cls}:{x:number;y:number;w:number;h:number;title:string;cls:string}){return <div className={`room ${cls}`} style={{left:`${x}%`,top:`${y}%`,width:`${w}%`,height:`${h}%`}}><span>{title}</span></div>}
function Desk({x,y}:{x:number;y:number}){return <div className="desk" style={{left:`${x}%`,top:`${y}%`}}><div className="monitor">▣</div><div className="chair">◉</div></div>}
function TaskLights({completed}:{completed:number}){const pct=Math.round((completed/TASK_TARGET)*100);return <div className="task-progress"><div className="task-lights" aria-label={`${completed} of ${TASK_TARGET} tasks completed`}>{Array.from({length:TASK_TARGET},(_,i)=><i key={i} className={i<completed?'on':'off'}/>)}</div><span>{completed}/{TASK_TARGET} task <b>{pct}%</b></span></div>}
function MiniProgress({completed}:{completed:number}){return <div className="mini-progress"><div>{Array.from({length:TASK_TARGET},(_,i)=><i key={i} className={i<completed?'on':'off'}/>)}</div><span>{completed}/{TASK_TARGET} task</span></div>}
function AgentSprite({agent,completed}:{agent:Agent;completed:number}){const p=agent.destination??agent.position;const initial=agent.name[0];const bubble=agent.state==='assigned-task'?'Task received…':agent.state==='preparing'?'Preparing…':agent.state==='working-task'?'Working on task…':agent.currentTask??agent.state;return <div className={`agent state-${agent.state}`} title={`${agent.role} • ${agent.state}`} style={{left:`${p.x}%`,top:`${p.y}%`}}><div className="bubble">{bubble}</div><div className={`avatar ${agent.id}`}>{initial}</div><small>{agent.name}</small>{agent.id!=='manager'&&<TaskLights completed={completed}/>}</div>}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

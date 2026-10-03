import express from 'express';
import cors from 'cors';
import { agents, tasks, managerPoint, loungePoint, cafeteriaPoint, startedAt } from './store.js';

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors({ origin: true }));
app.use(express.json());

app.get('/api/health', (_req,res)=>res.json({
  ok:true,
  service:'ai-agents-office-api',
  startedAt,
  uptimeSec:Math.floor(process.uptime()),
  now:new Date().toISOString()
}));

app.get('/api/agents', (_req,res)=>res.json(agents));
app.get('/api/tasks', (_req,res)=>res.json(tasks));
app.get('/api/operations', (_req,res)=>{
  const active = tasks.filter(t=>t.status==='active').length;
  const done = tasks.filter(t=>t.status==='done').length;
  const blocked = tasks.filter(t=>t.blocker || t.status==='blocked').length;
  res.json({
    ok:true,
    startedAt,
    uptimeSec:Math.floor(process.uptime()),
    serverTime:new Date().toISOString(),
    counts:{agents:agents.length,tasks:tasks.length,active,done,blocked},
    agents:agents.map(a=>({id:a.id,name:a.name,role:a.role,state:a.state,currentTask:(a as any).currentTask||null})),
    recentTasks:tasks.slice(0,20)
  });
});

app.post('/api/manager/call/:agentId', (req,res)=>{
  const agent = agents.find(a=>a.id===req.params.agentId);
  if(!agent) return res.status(404).json({error:'Agent not found'});
  agent.state='called';
  (agent as any).destination=managerPoint;
  res.json(agent);
});

app.post('/api/agents/:agentId/state', (req,res)=>{
  const agent = agents.find(a=>a.id===req.params.agentId);
  if(!agent) return res.status(404).json({error:'Agent not found'});
  const state = req.body.state;
  agent.state=state;
  if(state==='break') (agent as any).destination=loungePoint;
  else if(state==='lunch') (agent as any).destination=cafeteriaPoint;
  else if(state==='working') (agent as any).destination=agent.home;
  res.json(agent);
});

app.post('/api/tasks', (req,res)=>{
  const {agentId,title,description=''}=req.body;
  const agent=agents.find(a=>a.id===agentId);
  if(!agent || !title) return res.status(400).json({error:'agentId and title are required'});
  const task:any={id:crypto.randomUUID(),agentId,title,description,status:'active',createdAt:new Date().toISOString()};
  tasks.unshift(task);
  agent.state='assigned-task';
  (agent as any).currentTask=title;
  (agent as any).destination=agent.home;
  res.status(201).json(task);
});

app.patch('/api/tasks/:id/done',(req,res)=>{
  const task=tasks.find(t=>t.id===req.params.id);
  if(!task) return res.status(404).json({error:'Task not found'});
  task.status='done';
  task.completedAt=new Date().toISOString();
  const agent=agents.find(a=>a.id===task.agentId);
  if(agent){agent.state='working'; delete (agent as any).currentTask; (agent as any).destination=agent.home;}
  res.json(task);
});

app.delete('/api/tasks/:id',(req,res)=>{
  const index=tasks.findIndex(t=>t.id===req.params.id);
  if(index<0) return res.status(404).json({error:'Task not found'});
  const [removed]=tasks.splice(index,1);
  const agent=agents.find(a=>a.id===removed.agentId);
  if(agent && (agent as any).currentTask===removed.title){agent.state='working'; delete (agent as any).currentTask;}
  res.json({ok:true,removed});
});

app.delete('/api/tasks',(req,res)=>{
  tasks.splice(0,tasks.length);
  agents.forEach(a=>{delete (a as any).currentTask;if(a.id!=='implement')a.state='working';});
  res.json({ok:true});
});

app.listen(port,'0.0.0.0',()=>console.log(`AI Agents Office API running on port ${port}`));

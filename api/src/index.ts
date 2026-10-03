import express from 'express';
import cors from 'cors';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { agents, tasks, managerPoint, loungePoint, cafeteriaPoint, startedAt } from './store.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 8);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://oudom1.github.io,http://localhost:5173')
  .split(',').map(v=>v.trim()).filter(Boolean);

const sessions = new Map<string,{user:string,expiresAt:number}>();
const loginAttempts = new Map<string,{count:number,windowStart:number}>();
const securityLogs:any[] = [];
const MAX_SECURITY_LOGS = 200;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

function addSecurityLog(req:any,result:string,user:string,detail:string){
  securityLogs.unshift({
    time:new Date().toISOString(),result,user,detail,
    ip:req.ip || req.socket?.remoteAddress || 'unknown',
    userAgent:req.get?.('user-agent') || 'unknown'
  });
  securityLogs.splice(MAX_SECURITY_LOGS);
}

function secureEqual(a:string,b:string){
  const aa=Buffer.from(a); const bb=Buffer.from(b);
  if(aa.length!==bb.length) return false;
  return timingSafeEqual(aa,bb);
}

function bearer(req:any){
  const h=String(req.headers.authorization||'');
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

function requireAuth(req:any,res:any,next:any){
  const token=bearer(req);
  const session=sessions.get(token);
  if(!session || session.expiresAt<=Date.now()){
    if(token) sessions.delete(token);
    return res.status(401).json({error:'Authentication required'});
  }
  req.auth=session;
  next();
}

app.set('trust proxy',1);
app.use(cors({
  origin(origin,cb){
    if(!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null,true);
    return cb(new Error('Origin not allowed'));
  }
}));
app.use(express.json({limit:'100kb'}));

app.get('/api/health', (_req,res)=>res.json({
  ok:true,
  service:'ai-agents-office-api',
  authConfigured:Boolean(ADMIN_PASSWORD),
  startedAt,
  uptimeSec:Math.floor(process.uptime()),
  now:new Date().toISOString()
}));

app.post('/api/auth/login',(req,res)=>{
  if(!ADMIN_PASSWORD) return res.status(503).json({error:'Security backend is not configured'});
  const ip=req.ip || req.socket?.remoteAddress || 'unknown';
  const now=Date.now();
  let attempt=loginAttempts.get(ip);
  if(!attempt || now-attempt.windowStart>LOGIN_WINDOW_MS){attempt={count:0,windowStart:now};loginAttempts.set(ip,attempt);}
  if(attempt.count>=MAX_LOGIN_ATTEMPTS){
    addSecurityLog(req,'BLOCKED',String(req.body?.username||'unknown'),'Too many login attempts');
    return res.status(429).json({error:'Too many login attempts. Try again later.'});
  }
  const username=String(req.body?.username||'').trim();
  const password=String(req.body?.password||'');
  const okUser=secureEqual(username,ADMIN_USERNAME);
  const okPass=secureEqual(password,ADMIN_PASSWORD);
  if(!okUser || !okPass){
    attempt.count += 1;
    addSecurityLog(req,'FAILED',username||'unknown','Invalid username or password');
    return res.status(401).json({error:'Invalid username or password'});
  }
  loginAttempts.delete(ip);
  const token=randomBytes(32).toString('hex');
  const expiresAt=Date.now()+SESSION_TTL_HOURS*60*60*1000;
  sessions.set(token,{user:ADMIN_USERNAME,expiresAt});
  addSecurityLog(req,'SUCCESS',ADMIN_USERNAME,'Login accepted');
  res.json({ok:true,token,user:ADMIN_USERNAME,expiresAt:new Date(expiresAt).toISOString()});
});

app.get('/api/auth/status',requireAuth,(req:any,res)=>res.json({ok:true,user:req.auth.user,expiresAt:new Date(req.auth.expiresAt).toISOString()}));
app.get('/api/auth/logs',requireAuth,(_req,res)=>res.json(securityLogs));
app.post('/api/auth/logout',requireAuth,(req:any,res)=>{
  const token=bearer(req);
  addSecurityLog(req,'SUCCESS',req.auth.user,'Logged out');
  sessions.delete(token);
  res.json({ok:true});
});

app.get('/api/agents', requireAuth, (_req,res)=>res.json(agents));
app.get('/api/tasks', requireAuth, (_req,res)=>res.json(tasks));
app.get('/api/operations', requireAuth, (_req,res)=>{
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

app.post('/api/manager/call/:agentId', requireAuth, (req,res)=>{
  const agent = agents.find(a=>a.id===req.params.agentId);
  if(!agent) return res.status(404).json({error:'Agent not found'});
  agent.state='called';
  (agent as any).destination=managerPoint;
  res.json(agent);
});

app.post('/api/agents/:agentId/state', requireAuth, (req,res)=>{
  const agent = agents.find(a=>a.id===req.params.agentId);
  if(!agent) return res.status(404).json({error:'Agent not found'});
  const state = req.body.state;
  agent.state=state;
  if(state==='break') (agent as any).destination=loungePoint;
  else if(state==='lunch') (agent as any).destination=cafeteriaPoint;
  else if(state==='working') (agent as any).destination=agent.home;
  res.json(agent);
});

app.post('/api/tasks', requireAuth, (req,res)=>{
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

app.patch('/api/tasks/:id/done', requireAuth, (req,res)=>{
  const task=tasks.find(t=>t.id===req.params.id);
  if(!task) return res.status(404).json({error:'Task not found'});
  task.status='done';
  task.completedAt=new Date().toISOString();
  const agent=agents.find(a=>a.id===task.agentId);
  if(agent){agent.state='working'; delete (agent as any).currentTask; (agent as any).destination=agent.home;}
  res.json(task);
});

app.delete('/api/tasks/:id', requireAuth, (req,res)=>{
  const index=tasks.findIndex(t=>t.id===req.params.id);
  if(index<0) return res.status(404).json({error:'Task not found'});
  const [removed]=tasks.splice(index,1);
  const agent=agents.find(a=>a.id===removed.agentId);
  if(agent && (agent as any).currentTask===removed.title){agent.state='working'; delete (agent as any).currentTask;}
  res.json({ok:true,removed});
});

app.delete('/api/tasks', requireAuth, (_req,res)=>{
  tasks.splice(0,tasks.length);
  agents.forEach(a=>{delete (a as any).currentTask;if(a.id!=='implement')a.state='working';});
  res.json({ok:true});
});

app.listen(port,'0.0.0.0',()=>console.log(`AI Agents Office API running on port ${port}`));

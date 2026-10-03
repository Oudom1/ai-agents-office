import express from 'express';
import cors from 'cors';
import { randomBytes, timingSafeEqual, createECDH, hkdfSync, createDecipheriv } from 'node:crypto';
import { agents, tasks, managerPoint, loungePoint, cafeteriaPoint, startedAt } from './store.js';
import { databaseConfigured, strongPassword, verifyAdminPassword, resetAdminPassword, persistSecurityLog } from './auth-store.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const PASSWORD_RESET_KEY = process.env.PASSWORD_RESET_KEY || '';
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 8);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://oudom1.github.io,http://localhost:5173')
  .split(',').map(v=>v.trim()).filter(Boolean);

const sessions = new Map<string,{user:string,expiresAt:number}>();
const loginAttempts = new Map<string,{count:number,windowStart:number}>();
const resetAttempts = new Map<string,{count:number,windowStart:number}>();
const handshakes = new Map<string,{ecdh:ReturnType<typeof createECDH>,challenge:string,expiresAt:number}>();
const securityLogs:any[] = [];
const MAX_SECURITY_LOGS = 200;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const HANDSHAKE_TTL_MS = 2 * 60 * 1000;

function addSecurityLog(req:any,result:string,user:string,detail:string){
  securityLogs.unshift({
    time:new Date().toISOString(),result,user,detail,
    ip:req.ip || req.socket?.remoteAddress || 'unknown',
    userAgent:req.get?.('user-agent') || 'unknown'
  });
  securityLogs.splice(MAX_SECURITY_LOGS);
  void persistSecurityLog({result,username:user,detail,ip:req.ip || req.socket?.remoteAddress || 'unknown',userAgent:req.get?.('user-agent') || 'unknown'});
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

function pruneHandshakes(){
  const now=Date.now();
  for(const [id,h] of handshakes) if(h.expiresAt<=now) handshakes.delete(id);
}

function attemptState(ip:string){
  const now=Date.now();
  let attempt=loginAttempts.get(ip);
  if(!attempt || now-attempt.windowStart>=LOGIN_WINDOW_MS){
    attempt={count:0,windowStart:now};
    loginAttempts.set(ip,attempt);
  }
  return attempt;
}

function remainingLockSeconds(attempt:{count:number,windowStart:number}){
  const remaining=Math.max(0,LOGIN_WINDOW_MS-(Date.now()-attempt.windowStart));
  return Math.ceil(remaining/1000);
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
  authConfigured:Boolean(ADMIN_PASSWORD) || databaseConfigured(),
  databaseConfigured:databaseConfigured(),
  passwordResetConfigured:Boolean(PASSWORD_RESET_KEY) && databaseConfigured(),
  authTransport:'ECDH-P256 + HKDF-SHA256 + AES-256-GCM',
  loginPolicy:{maxAttempts:MAX_LOGIN_ATTEMPTS,windowSeconds:LOGIN_WINDOW_MS/1000},
  startedAt,
  uptimeSec:Math.floor(process.uptime()),
  now:new Date().toISOString()
}));

app.post('/api/auth/handshake',(req,res)=>{
  if(!ADMIN_PASSWORD && !databaseConfigured()) return res.status(503).json({error:'Security backend is not configured'});
  pruneHandshakes();
  const ip=req.ip || req.socket?.remoteAddress || 'unknown';
  const attempt=attemptState(ip);
  if(attempt.count>=MAX_LOGIN_ATTEMPTS){
    const retryAfterSec=remainingLockSeconds(attempt);
    res.setHeader('Retry-After',String(retryAfterSec));
    addSecurityLog(req,'BLOCKED','unknown',`Too many login attempts; retry in ${retryAfterSec}s`);
    return res.status(429).json({error:'Too many login attempts. Please wait before trying again.',retryAfterSec});
  }

  const ecdh=createECDH('prime256v1');
  ecdh.generateKeys();
  const handshakeId=randomBytes(24).toString('hex');
  const challenge=randomBytes(32).toString('base64');
  const expiresAt=Date.now()+HANDSHAKE_TTL_MS;
  handshakes.set(handshakeId,{ecdh,challenge,expiresAt});
  res.json({
    ok:true,
    handshakeId,
    challenge,
    serverPublicKey:ecdh.getPublicKey().toString('base64'),
    curve:'P-256',
    kdf:'HKDF-SHA-256',
    cipher:'AES-256-GCM',
    expiresAt:new Date(expiresAt).toISOString()
  });
});

app.post('/api/auth/login',async(req,res)=>{
  if(!ADMIN_PASSWORD && !databaseConfigured()) return res.status(503).json({error:'Security backend is not configured'});
  const ip=req.ip || req.socket?.remoteAddress || 'unknown';
  const now=Date.now();
  const attempt=attemptState(ip);
  if(attempt.count>=MAX_LOGIN_ATTEMPTS){
    const retryAfterSec=remainingLockSeconds(attempt);
    res.setHeader('Retry-After',String(retryAfterSec));
    addSecurityLog(req,'BLOCKED','unknown',`Too many login attempts; retry in ${retryAfterSec}s`);
    return res.status(429).json({error:'Too many login attempts. Please wait before trying again.',retryAfterSec});
  }

  const handshakeId=String(req.body?.handshakeId||'');
  const clientPublicKey=String(req.body?.clientPublicKey||'');
  const ivB64=String(req.body?.iv||'');
  const ciphertextB64=String(req.body?.ciphertext||'');
  const tagB64=String(req.body?.tag||'');
  const h=handshakes.get(handshakeId);
  handshakes.delete(handshakeId);
  if(!h || h.expiresAt<=now){
    attempt.count+=1;
    addSecurityLog(req,'FAILED','unknown','Expired or invalid key exchange');
    return res.status(401).json({error:'Secure key exchange expired. Retry login.',attemptsRemaining:Math.max(0,MAX_LOGIN_ATTEMPTS-attempt.count)});
  }

  let username='unknown';
  try{
    const shared=h.ecdh.computeSecret(Buffer.from(clientPublicKey,'base64'));
    const key=Buffer.from(hkdfSync('sha256',shared,Buffer.from(h.challenge),Buffer.from('ai-agents-office-auth-v1'),32));
    const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(ivB64,'base64'));
    decipher.setAAD(Buffer.from(handshakeId));
    decipher.setAuthTag(Buffer.from(tagB64,'base64'));
    const plaintext=Buffer.concat([decipher.update(Buffer.from(ciphertextB64,'base64')),decipher.final()]).toString('utf8');
    const payload=JSON.parse(plaintext);
    username=String(payload.username||'').trim();
    const password=String(payload.password||'');
    const challenge=String(payload.challenge||'');
    const issuedAt=Number(payload.issuedAt||0);
    if(challenge!==h.challenge || Math.abs(Date.now()-issuedAt)>HANDSHAKE_TTL_MS) throw new Error('challenge verification failed');

    const okUser=secureEqual(username,ADMIN_USERNAME);
    const okPass=await verifyAdminPassword(username,password,ADMIN_USERNAME,ADMIN_PASSWORD);
    if(!okUser || !okPass){
      attempt.count += 1;
      const attemptsRemaining=Math.max(0,MAX_LOGIN_ATTEMPTS-attempt.count);
      addSecurityLog(req,'FAILED',username||'unknown',`Invalid username or password after encrypted key exchange; ${attemptsRemaining} attempts remaining`);
      return res.status(401).json({error:'Invalid username or password',attemptsRemaining});
    }
  }catch{
    attempt.count += 1;
    const attemptsRemaining=Math.max(0,MAX_LOGIN_ATTEMPTS-attempt.count);
    addSecurityLog(req,'FAILED',username,'Encrypted login verification failed');
    return res.status(401).json({error:'Secure login verification failed',attemptsRemaining});
  }

  loginAttempts.delete(ip);
  const token=randomBytes(32).toString('hex');
  const expiresAt=Date.now()+SESSION_TTL_HOURS*60*60*1000;
  sessions.set(token,{user:ADMIN_USERNAME,expiresAt});
  addSecurityLog(req,'SUCCESS',ADMIN_USERNAME,'Login accepted via ECDH key exchange + AES-GCM verification');
  res.json({ok:true,token,user:ADMIN_USERNAME,expiresAt:new Date(expiresAt).toISOString()});
});

app.post('/api/auth/reset-password',async(req,res)=>{
  if(!PASSWORD_RESET_KEY || !databaseConfigured()) return res.status(503).json({error:'Password reset service is not configured'});
  const ip=req.ip || req.socket?.remoteAddress || 'unknown';
  const now=Date.now();
  const RESET_WINDOW_MS=15*60*1000;
  const MAX_RESET_ATTEMPTS=3;
  let attempt=resetAttempts.get(ip);
  if(!attempt || now-attempt.windowStart>=RESET_WINDOW_MS){attempt={count:0,windowStart:now};resetAttempts.set(ip,attempt);}
  if(attempt.count>=MAX_RESET_ATTEMPTS){
    const retryAfterSec=Math.ceil(Math.max(0,RESET_WINDOW_MS-(now-attempt.windowStart))/1000);
    res.setHeader('Retry-After',String(retryAfterSec));
    addSecurityLog(req,'BLOCKED','unknown','Too many password reset attempts');
    return res.status(429).json({error:'Too many reset attempts. Please wait before trying again.',retryAfterSec});
  }
  const username=String(req.body?.username||'').trim();
  const recoveryKey=String(req.body?.recoveryKey||'');
  const newPassword=String(req.body?.newPassword||'');
  if(!strongPassword(newPassword)) return res.status(400).json({error:'Password must be 15+ characters with uppercase, lowercase, number and special character.'});
  if(!secureEqual(username,ADMIN_USERNAME) || !secureEqual(recoveryKey,PASSWORD_RESET_KEY)){
    attempt.count+=1;
    addSecurityLog(req,'FAILED',username||'unknown','Invalid password recovery credentials');
    return res.status(401).json({error:'Invalid recovery credentials',attemptsRemaining:Math.max(0,MAX_RESET_ATTEMPTS-attempt.count)});
  }
  try{
    await resetAdminPassword(username,newPassword);
    sessions.clear();
    loginAttempts.clear();
    resetAttempts.delete(ip);
    addSecurityLog(req,'SUCCESS',username,'Admin password reset in Neon; active sessions revoked');
    return res.json({ok:true,message:'Password reset successful. Sign in with the new password.'});
  }catch(e){
    console.error('Password reset failed',e);
    addSecurityLog(req,'FAILED',username,'Password reset database error');
    return res.status(500).json({error:'Unable to update password'});
  }
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

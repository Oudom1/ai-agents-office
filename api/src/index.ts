import express from 'express';
import cors from 'cors';
import { randomBytes, timingSafeEqual, createECDH, hkdfSync, createDecipheriv } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { agents, tasks, managerPoint, loungePoint, cafeteriaPoint, startedAt } from './store.js';
import { databaseConfigured, strongPassword, verifyAdminPassword, resetAdminPassword, createAppUser, persistSecurityLog, databaseHealth } from './auth-store.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const PASSWORD_RESET_KEY = process.env.PASSWORD_RESET_KEY || '';
const HF_SPACE_ID = process.env.HF_SPACE_ID || 'Lightricks/ltx-video-distilled';
const HF_SPACE_HOST = process.env.HF_SPACE_HOST || HF_SPACE_ID.toLowerCase().replace(/_/g,'-').replace(/\//g,'-') + '.hf.space';
const HF_TOKEN = process.env.HF_TOKEN || '';
const require = createRequire(import.meta.url);
const ffmpegPath = require('ffmpeg-static') as string | null;
const { EdgeTTS } = require('node-edge-tts');
const KAI_TTS_VOICE = process.env.KAI_TTS_VOICE || 'en-US-GuyNeural';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1SDKs0stvoeIkYIhEcP5znRq7-tSyaEpl';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || 'https://ai-agents-office-api.onrender.com').replace(/\/$/,'');
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


function findGenerationId(value:any):string|undefined{
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const walk=(v:any):string|undefined=>{
    if(!v) return undefined;
    if(typeof v==='string' && uuid.test(v)) return v;
    if(Array.isArray(v)){ for(const item of v){const found=walk(item);if(found)return found;} return undefined; }
    if(typeof v==='object'){
      for(const [k,val] of Object.entries(v)) if(/generation.?id|^id$/i.test(k) && typeof val==='string' && uuid.test(val)) return val;
      for(const val of Object.values(v)){const found=walk(val);if(found)return found;}
    }
    return undefined;
  };
  return walk(value);
}

function findMp4Url(value:any):string|undefined{
  const walk=(v:any):string|undefined=>{
    if(!v) return undefined;
    if(typeof v==='string' && /^https?:\/\//i.test(v) && v.includes('.mp4')) return v;
    if(Array.isArray(v)){ for(const item of v){const found=walk(item);if(found)return found;} return undefined; }
    if(typeof v==='object'){
      for(const [k,val] of Object.entries(v)) if(/motionMP4URL|videoUrl|video_url/i.test(k) && typeof val==='string' && /^https?:\/\//i.test(val)) return val;
      for(const val of Object.values(v)){const found=walk(val);if(found)return found;}
    }
    return undefined;
  };
  return walk(value);
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
  videoProvider:{name:'Hugging Face ZeroGPU LTX Video Fast',configured:true,freeOnly:true,paidFallback:false,bestEffort:true,space:HF_SPACE_ID,authenticated:Boolean(HF_TOKEN),quotaMode:HF_TOKEN?'free-account':'anonymous',maxOutputSeconds:60,sceneSeconds:8,defaultSeconds:12,talkingDefaultSeconds:20,frame:'512x288 16:9',voice:'Edge neural TTS (free best-effort)'},
  googleDrive:{configured:driveConfigured(),folderId:GOOGLE_DRIVE_FOLDER_ID},
  authTransport:'ECDH-P256 + HKDF-SHA256 + AES-256-GCM',
  loginPolicy:{maxAttempts:MAX_LOGIN_ATTEMPTS,windowSeconds:LOGIN_WINDOW_MS/1000},
  startedAt,
  uptimeSec:Math.floor(process.uptime()),
  now:new Date().toISOString()
}));

app.get('/api/database/health', requireAuth, async (_req,res)=>{
  const db=await databaseHealth();
  return res.status(db.connected?200:503).json({
    ...db,
    sharedTaskStorage:false,
    taskStore:'in-memory',
    recommendation:'Do not route task writes to multiple API replicas before implementing persistent task storage.'
  });
});

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
    const key=Buffer.from(hkdfSync('sha256',shared,Buffer.from(h.challenge,'base64'),Buffer.from('ai-agents-office-auth-v1'),32));
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

    const okUser=databaseConfigured() ? Boolean(username) : secureEqual(username,ADMIN_USERNAME);
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
  sessions.set(token,{user:username,expiresAt});
  addSecurityLog(req,'SUCCESS',username,'Login accepted via ECDH key exchange + AES-GCM verification');
  res.json({ok:true,token,user:username,expiresAt:new Date(expiresAt).toISOString()});
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

app.post('/api/admin/users',requireAuth,async(req:any,res)=>{
  if(req.auth.user!==ADMIN_USERNAME) return res.status(403).json({error:'Admin account required'});
  if(!databaseConfigured()) return res.status(503).json({error:'Database is not configured'});
  const adminPassword=String(req.body?.adminPassword||'');
  const firstName=String(req.body?.firstName||'').trim();
  const lastName=String(req.body?.lastName||'').trim();
  const password=String(req.body?.password||'');
  const clean=(v:string)=>v.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'');
  const first=clean(firstName), last=clean(lastName);
  if(!first || !last) return res.status(400).json({error:'First name and last name are required'});
  const username=`${first}.${last}`;
  if(!/^[a-z0-9]+\.[a-z0-9]+$/.test(username) || username.length>80) return res.status(400).json({error:'Invalid username format'});
  if(!strongPassword(password)) return res.status(400).json({error:'Password must be 15+ characters with uppercase, lowercase, number and special character.'});
  const adminOk=await verifyAdminPassword(ADMIN_USERNAME,adminPassword,ADMIN_USERNAME,ADMIN_PASSWORD);
  if(!adminOk){addSecurityLog(req,'FAILED',req.auth.user,`Admin verification failed while creating ${username}`);return res.status(401).json({error:'Admin password is incorrect'});}
  try{
    await createAppUser(username,password);
    addSecurityLog(req,'SUCCESS',req.auth.user,`Created user ${username}`);
    return res.json({ok:true,username,role:'user',message:'User created successfully'});
  }catch(e:any){
    if(String(e?.message)==='USER_EXISTS') return res.status(409).json({error:'User already exists'});
    console.error('User creation failed',e); return res.status(500).json({error:'Unable to create user'});
  }
});

// Advance non-video office project tasks on the server so refreshes do not reset progress.
function advanceOfficeTasks(){
  const now=Date.now();
  const managedAgentIds=new Set(agents.filter(a=>a.id!=='implement').map(a=>a.id));
  for(const agentId of managedAgentIds){
    const agent:any=agents.find(a=>a.id===agentId);
    const agentTasks=tasks.filter(t=>t.agentId===agentId).sort((x,y)=>new Date(x.createdAt).getTime()-new Date(y.createdAt).getTime());
    let current:any=agentTasks.find(t=>t.status!=='done' && t.phase==='working');
    if(current && current.startedAt && current.durationSec){
      const elapsed=Math.floor((now-new Date(current.startedAt).getTime())/1000);
      if(elapsed>=Number(current.durationSec)){
        current.status='done';
        current.phase='completed';
        current.completedAt=new Date().toISOString();
        current.resultMessage=`Complete — ${agent?.name || agentId} finished this task and the next assigned task can start automatically.`;
        delete current.blocker;
        current=undefined;
      }
    }
    if(!current){
      const next:any=agentTasks.find(t=>t.status!=='done' && !t.blocker);
      if(next){
        next.phase='working';
        next.startedAt=next.startedAt || new Date().toISOString();
        next.resultMessage=`${agent?.name || agentId} is actively working on this task.`;
        if(agent){agent.state='working-task';agent.currentTask=next.title;agent.destination=agent.home;}
      }else if(agent){
        agent.state='working';
        delete agent.currentTask;
        agent.destination=agent.home;
      }
    }
  }
}
advanceOfficeTasks();
setInterval(advanceOfficeTasks,5000);

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


const videoJobs = new Map<string,{status:'generating'|'done'|'failed';provider:string;videoUrl?:string;driveUrl?:string;localPath?:string;error?:string;taskId?:string}>();

function hfSpaceBase(){ return `https://${HF_SPACE_HOST}`; }
function hfHeaders(extra:Record<string,string>={}){
  return {...extra,accept:'application/json',...(HF_TOKEN?{authorization:`Bearer ${HF_TOKEN}`}:{})};
}

function driveConfigured(){ return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN && GOOGLE_DRIVE_FOLDER_ID); }
function requestedVideoSeconds(prompt:string){
  const m=prompt.match(/(\d+)\s*(?:minute|minutes|min)\b/i); if(m) return Math.max(1,Math.min(60,Number(m[1])*60));
  const sec=prompt.match(/(\d+)\s*(?:second|seconds|sec|secs)\b/i); if(sec) return Math.max(1,Math.min(60,Number(sec[1])));
  if(/\b(?:talk|talking|conversation|dialogue|speak|speaking|discuss|chat)\b/i.test(prompt)) return 20;
  return 12;
}
async function getGoogleAccessToken(){
  const body=new URLSearchParams({client_id:GOOGLE_CLIENT_ID,client_secret:GOOGLE_CLIENT_SECRET,refresh_token:GOOGLE_REFRESH_TOKEN,grant_type:'refresh_token'});
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  if(!r.ok) throw new Error(`Google OAuth HTTP ${r.status}: ${await r.text()}`);
  const j:any=await r.json(); if(!j.access_token) throw new Error('Google OAuth did not return an access token'); return String(j.access_token);
}
async function uploadToGoogleDrive(filePath:string,fileName:string){
  if(!driveConfigured()) return undefined;
  const accessToken=await getGoogleAccessToken();
  const init=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink,webContentLink',{method:'POST',headers:{authorization:`Bearer ${accessToken}`,'content-type':'application/json; charset=UTF-8','x-upload-content-type':'video/mp4'},body:JSON.stringify({name:fileName,mimeType:'video/mp4',parents:[GOOGLE_DRIVE_FOLDER_ID]})});
  if(!init.ok) throw new Error(`Google Drive initiate upload HTTP ${init.status}: ${await init.text()}`);
  const uploadUrl=init.headers.get('location'); if(!uploadUrl) throw new Error('Google Drive did not return a resumable upload URL');
  const bytes=await readFile(filePath);
  const put=await fetch(uploadUrl,{method:'PUT',headers:{authorization:`Bearer ${accessToken}`,'content-type':'video/mp4','content-length':String(bytes.length)},body:bytes});
  if(!put.ok) throw new Error(`Google Drive upload HTTP ${put.status}: ${await put.text()}`);
  const file:any=await put.json(); return {id:String(file.id),webViewLink:String(file.webViewLink||`https://drive.google.com/file/d/${file.id}/view`)};
}
async function downloadClip(url:string,filePath:string){
  const r=await fetch(url,{headers:url.includes(HF_SPACE_HOST)?hfHeaders():{}}); if(!r.ok) throw new Error(`Video download HTTP ${r.status}`);
  await writeFile(filePath,Buffer.from(await r.arrayBuffer()));
}
async function runFfmpeg(args:string[]){
  if(!ffmpegPath) throw new Error('FFmpeg binary unavailable');
  await new Promise<void>((resolve,reject)=>{
    const p:any=spawn(ffmpegPath,args,{stdio:['ignore','ignore','pipe']}); let err='';
    p.stderr?.on('data',(d:Buffer)=>{err+=String(d); if(err.length>12000) err=err.slice(-12000);});
    p.on('error',reject); p.on('close',(code:number|null)=>code===0?resolve():reject(new Error(`FFmpeg failed (${code}): ${err.slice(-2000)}`)));
  });
}
async function mergeClips(files:string[],output:string){
  if(files.length===1){ await writeFile(output,await readFile(files[0])); return; }
  const listPath=join(tmpdir(),`kai-list-${randomBytes(8).toString('hex')}.txt`); await writeFile(listPath,files.map(f=>`file '${f}'`).join('\n'));
  try{ await runFfmpeg(['-y','-f','concat','-safe','0','-i',listPath,'-c','copy',output]); }
  catch{ await runFfmpeg(['-y','-f','concat','-safe','0','-i',listPath,'-c:v','libx264','-preset','ultrafast','-c:a','aac','-movflags','+faststart',output]); }
}

async function normalizeSceneClip(input:string,output:string,seconds:number){
  await runFfmpeg(['-y','-stream_loop','-1','-i',input,'-t',String(seconds),'-vf','scale=512:288:force_original_aspect_ratio=decrease,pad=512:288:(ow-iw)/2:(oh-ih)/2,setsar=1','-an','-r','24','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-movflags','+faststart',output]);
}
function narrationFromPrompt(prompt:string){
  if(/\b(?:no voice|silent|mute|without (?:voice|audio|narration))\b/i.test(prompt)) return '';
  let text=prompt.replace(/\b(?:create|make|generate|produce)\b/ig,'').replace(/\b\d+\s*(?:minutes?|mins?|seconds?|secs?)\b/ig,'').replace(/\b(?:video|cartoon|animation|clip)\b/ig,'').replace(/\s+/g,' ').trim();
  const wantsTalking=/\b(?:talk|talking|conversation|dialogue|speak|speaking|discuss|chat)\b/i.test(prompt);
  if(wantsTalking && text) text=`Hello! ${text}. Sure, let's talk about it together. That sounds good. Let's continue.`;
  if(!text) text='Here is Kai with your animated story.';
  return text.slice(0,600);
}
async function addNarration(videoPath:string,output:string,prompt:string,targetSeconds:number){
  const narration=narrationFromPrompt(prompt);
  if(!narration){ await writeFile(output,await readFile(videoPath)); return false; }
  const audioPath=join(tmpdir(),`kai-voice-${randomBytes(8).toString('hex')}.mp3`);
  const tts=new EdgeTTS({voice:KAI_TTS_VOICE,lang:'en-US',outputFormat:'audio-24khz-96kbitrate-mono-mp3',rate:'+0%',pitch:'+0Hz',volume:'+0%',timeout:30000});
  await tts.ttsPromise(narration,audioPath);
  await runFfmpeg(['-y','-i',videoPath,'-i',audioPath,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-af','apad','-t',String(targetSeconds),'-movflags','+faststart',output]);
  return true;
}

function normalizeVideoUrl(value:any):string|undefined{
  const base=hfSpaceBase();
  const walk=(v:any):string|undefined=>{
    if(!v) return undefined;
    if(typeof v==='string'){
      if(/^https?:\/\//i.test(v) && /\.mp4(?:\?|$)/i.test(v)) return v;
      if(v.startsWith('/tmp/') && /\.mp4(?:\?|$)/i.test(v)) return `${base}/gradio_api/file=${v}`;
      if(v.startsWith('/gradio_api/file=') && /\.mp4(?:\?|$)/i.test(v)) return base+v;
      return undefined;
    }
    if(Array.isArray(v)){ for(const item of v){const found=walk(item);if(found)return found;} return undefined; }
    if(typeof v==='object'){
      const direct=(v.url || v.video_url || v.path || v.name) as any;
      const found=walk(direct); if(found) return found;
      if(v.video){const nestedVideo=walk(v.video);if(nestedVideo)return nestedVideo;}
      for(const val of Object.values(v)){const nested=walk(val);if(nested)return nested;}
    }
    return undefined;
  };
  return walk(value);
}

function buildHfInputs(parameters:any[],prompt:string,clipSeconds=8){
  return (parameters||[]).map((p:any)=>{
    const name=String(p?.parameter_name||'').toLowerCase();
    const label=String(p?.label||name||p?.name||'').toLowerCase();
    const def=p?.parameter_default ?? p?.default ?? p?.value;
    const example=p?.example_input;
    if(name==='input_image_filepath' || name==='input_video_filepath') return null;
    if(name==='mode') return 'text-to-video';
    if(name==='randomize_seed') return false;
    if(name==='ui_frames_to_use') return def ?? 9;
    if(label.includes('negative')) return def ?? '';
    if(label.includes('prompt')) return prompt;
    if(name==='seed_ui' || label==='seed') return 42;
    if(label.includes('height')) return 288;
    if(label.includes('width')) return 512;
    if(label.includes('guidance') || label.includes('cfg')) return def ?? 1;
    if(label.includes('duration') || label.includes('seconds')) return Math.max(1,Math.min(8,clipSeconds));
    return def ?? example ?? null;
  });
}

function providerErrorFromSse(text:string):string|undefined{
  const lines=text.split('\n');
  let errorEvent=false;
  for(const line of lines){
    if(line.trim()==='event: error') errorEvent=true;
    if(errorEvent && line.startsWith('data:')){
      const raw=line.slice(5).trim();
      try{
        const payload=JSON.parse(raw);
        const detail = payload?.error?.message || payload?.error?.detail || payload?.error || payload?.message || payload?.detail || payload?.title;
        if (typeof detail === 'string' && detail.trim()) return detail.trim();
        return 'Hugging Face ZeroGPU returned an unspecified provider error. The free GPU/Space may be temporarily unavailable; retry shortly.';
      }catch{return raw || 'Hugging Face ZeroGPU returned an unspecified provider error. Retry shortly.';}
    }
  }
  return undefined;
}

async function generateHfClip(prompt:string,clipSeconds:number){
  const infoRes=await fetch(`${hfSpaceBase()}/gradio_api/info`,{headers:hfHeaders()}); if(!infoRes.ok) throw new Error(`Space info HTTP ${infoRes.status}`);
  const info:any=await infoRes.json(); const entries=Object.entries(info?.named_endpoints||{}) as [string,any][];
  const chosen=entries.find(([k])=>/text.*video|t2v/i.test(k)) || entries.find(([k])=>/generate.*video|video.*generate|generate|predict/i.test(k)); if(!chosen) throw new Error('No usable Gradio text-to-video endpoint found');
  const [endpoint,meta]=chosen; const apiName=endpoint.replace(/^\//,''); const data=buildHfInputs(meta?.parameters||[],prompt,clipSeconds);
  const call=await fetch(`${hfSpaceBase()}/gradio_api/call/${encodeURIComponent(apiName)}`,{method:'POST',headers:hfHeaders({'content-type':'application/json'}),body:JSON.stringify({data})}); if(!call.ok) throw new Error(`ZeroGPU queue HTTP ${call.status}`);
  const queued:any=await call.json(); const eventId=String(queued?.event_id||''); if(!eventId) throw new Error('ZeroGPU did not return an event id');
  const stream=await fetch(`${hfSpaceBase()}/gradio_api/call/${encodeURIComponent(apiName)}/${encodeURIComponent(eventId)}`,{headers:hfHeaders()}); if(!stream.ok) throw new Error(`ZeroGPU result HTTP ${stream.status}`);
  const text=await stream.text(); const providerError=providerErrorFromSse(text); if(providerError) throw new Error(providerError);
  let videoUrl:string|undefined; for(const line of text.split('\n')){ if(!line.startsWith('data:')) continue; try{videoUrl=normalizeVideoUrl(JSON.parse(line.slice(5).trim()))||videoUrl;}catch{} }
  if(!videoUrl) throw new Error('ZeroGPU completed without a real MP4 URL'); return videoUrl;
}
async function generateHfClipWithRetry(prompt:string,clipSeconds:number){
  let last='generation failed'; for(let attempt=1;attempt<=3;attempt++){ try{return await generateHfClip(prompt,clipSeconds);}catch(e:any){last=String(e?.message||e||last); if(/quota|exceeded|overquota/i.test(last)||attempt===3) break; await new Promise(r=>setTimeout(r,attempt*2500));} } throw new Error(last);
}
async function runHfVideo(jobId:string,prompt:string,taskId:string){
  const job=videoJobs.get(jobId); if(!job) return; const task=tasks.find(t=>t.id===taskId); const kai=agents.find(a=>a.id==='implement');
  try{
    const targetSeconds=requestedVideoSeconds(prompt); const sceneCount=Math.max(1,Math.ceil(targetSeconds/8)); const workDir=join(tmpdir(),`kai-${jobId}`); await mkdir(workDir,{recursive:true}); const clips:string[]=[]; let remaining=targetSeconds;
    for(let i=0;i<sceneCount;i++){
      const sceneSec=Math.max(1,Math.min(8,remaining)); remaining-=sceneSec;
      if(task){(task as any).phase='generating';(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).resultMessage=`Generating scene ${i+1}/${sceneCount} (${sceneSec}s target). Kai stays working until the final MP4 is ready.`;delete (task as any).blocker;}
      const wantsTalking=/\b(?:talk|talking|conversation|dialogue|speak|speaking|discuss|chat)\b/i.test(prompt);
      const talkingDirection=wantsTalking?' The characters must visibly speak to each other with natural mouth movement, alternating conversational gestures, eye contact, and reaction shots.':' ';
      const scenePrompt=sceneCount>1?`${prompt}\nScene ${i+1} of ${sceneCount}. Keep the same characters, clothing, visual style and story continuity.${talkingDirection} Continue naturally and last about ${sceneSec} seconds.`:`${prompt}${talkingDirection}`;
      const clipUrl=await generateHfClipWithRetry(scenePrompt,sceneSec); const rawClipPath=join(workDir,`scene-${String(i+1).padStart(2,'0')}-raw.mp4`); const clipPath=join(workDir,`scene-${String(i+1).padStart(2,'0')}.mp4`); await downloadClip(clipUrl,rawClipPath); await normalizeSceneClip(rawClipPath,clipPath,sceneSec); clips.push(clipPath);
    }
    if(task){(task as any).phase='merging';(task as any).resultMessage=`All ${sceneCount} scene(s) generated — merging into one MP4...`;}
    const mergedPath=join(workDir,'merged.mp4'); await mergeClips(clips,mergedPath); const finalPath=join(workDir,'final.mp4'); if(task){(task as any).phase='voicing';(task as any).resultMessage='Scenes merged — adding free neural voice narration...';} let voiceAdded=false; try{voiceAdded=await addNarration(mergedPath,finalPath,prompt,targetSeconds);}catch(e:any){console.warn('Kai TTS unavailable, keeping video without narration',String(e?.message||e));await writeFile(finalPath,await readFile(mergedPath));} job.localPath=finalPath; job.videoUrl=`${PUBLIC_BASE_URL}/api/video/files/${jobId}`; (job as any).voiceAdded=voiceAdded;
    let driveUrl:string|undefined;
    if(driveConfigured()){
      if(task){(task as any).phase='uploading';(task as any).resultMessage='Final MP4 ready — uploading to Kai Video Workspace in Google Drive...';}
      const uploaded=await uploadToGoogleDrive(finalPath,`Kai-${new Date().toISOString().replace(/[:.]/g,'-')}-${jobId.slice(0,8)}.mp4`); driveUrl=uploaded?.webViewLink; job.driveUrl=driveUrl;
    }
    job.status='done'; const completedAt=new Date(); const startedMs=task?.startedAt?new Date((task as any).startedAt).getTime():completedAt.getTime(); const actualSec=Math.max(0,Math.floor((completedAt.getTime()-startedMs)/1000));
    if(task){task.status='done';(task as any).phase='completed';(task as any).videoUrl=job.videoUrl;(task as any).driveUrl=driveUrl;(task as any).durationSec=targetSeconds;(task as any).generationTimeSec=actualSec;(task as any).resultMessage=driveUrl?`Complete — ${targetSeconds}s target video assembled from ${sceneCount} normalized 16:9 scene(s), ${voiceAdded?'voice added':'voice unavailable'}, generated in ${actualSec}s and uploaded to Google Drive.`:`Complete — ${targetSeconds}s target video assembled from ${sceneCount} normalized 16:9 scene(s), ${voiceAdded?'voice added':'voice unavailable'}, in ${actualSec}s. Google Drive upload is not configured yet.`;delete (task as any).blocker;task.completedAt=completedAt.toISOString();}
    if(kai){(kai as any).state='working';(kai as any).currentTask=undefined;(kai as any).destination=(kai as any).home;}
  }catch(e:any){
    const err=String(e?.message||e||'ZeroGPU generation failed'); job.status='failed';job.error=err; const finalMsg=/quota|exceeded|overquota/i.test(err)?`Free ZeroGPU quota unavailable: ${err}`:`Kai pipeline failed: ${err}`;
    if(task){(task as any).phase='provider-error';(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).resultMessage=finalMsg;(task as any).blocker=`Kai video provider error: ${finalMsg}`;} console.error('Kai video pipeline failed',err);
  }
}
app.get('/api/video/files/:generationId',async(req,res)=>{const job=videoJobs.get(String(req.params.generationId||''));if(!job?.localPath)return res.status(404).send('Video file not found');res.setHeader('Cache-Control','private, max-age=3600');return res.sendFile(job.localPath);});

app.get('/api/video/providers', requireAuth, (_req,res)=>{
  res.json({freeOnly:true,paidFallback:false,bestEffort:true,providers:[
    {id:'hf-zerogpu-ltx',name:'Hugging Face ZeroGPU LTX Video Fast',configured:true,mode:'api',priority:1,space:HF_SPACE_ID,note:HF_TOKEN?'Free-account ZeroGPU quota via HF token':'Anonymous ZeroGPU quota; add HF_TOKEN for larger free quota'},
    {id:'pixverse',name:'PixVerse Free',configured:false,mode:'manual',priority:2},
    {id:'runway',name:'Runway Free/Trial',configured:false,mode:'manual',priority:3}
  ]});
});

app.post('/api/video/generate', requireAuth, async (req:any,res)=>{
  const prompt=String(req.body?.prompt||'').trim();
  const taskId=String(req.body?.taskId||'').trim();
  if(!prompt) return res.status(400).json({error:'prompt is required'});
  const generationId=randomBytes(18).toString('hex');
  videoJobs.set(generationId,{status:'generating',provider:'Hugging Face ZeroGPU LTX Video Fast',taskId});
  const task=tasks.find(t=>t.id===taskId);
  if(task){(task as any).provider='Hugging Face ZeroGPU LTX Video Fast';(task as any).providerJobId=generationId;(task as any).phase='generating';(task as any).startedAt=new Date().toISOString();(task as any).resultMessage='Generating on Hugging Face ZeroGPU — Kai stays working until the real MP4 is returned';}
  void runHfVideo(generationId,prompt,taskId);
  addSecurityLog(req,'SUCCESS',req.auth?.user||'Admin',`Kai queued Hugging Face ZeroGPU video ${generationId}`);
  return res.status(202).json({ok:true,provider:'Hugging Face ZeroGPU LTX Video Fast',generationId,freeOnly:true,paidFallback:false,bestEffort:true,space:HF_SPACE_ID});
});

app.get('/api/video/status/:generationId', requireAuth, async (req:any,res)=>{
  const generationId=String(req.params.generationId||'');
  const job=videoJobs.get(generationId);
  if(!job) return res.status(404).json({error:'Generation job not found'});
  if(job.status==='done' && job.videoUrl) return res.json({ok:true,status:'done',provider:job.provider,videoUrl:job.videoUrl,driveUrl:job.driveUrl,generationId});
  if(job.status==='failed') return res.json({ok:false,status:'failed',provider:job.provider,generationId,error:job.error});
  const task=job.taskId ? tasks.find(t=>t.id===job.taskId) : undefined;
  const startedMs=task?.startedAt ? new Date((task as any).startedAt).getTime() : Date.now();
  const elapsedSec=Math.max(0,Math.floor((Date.now()-startedMs)/1000));
  return res.json({ok:true,status:'generating',provider:job.provider,generationId,bestEffort:true,elapsedSec});
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

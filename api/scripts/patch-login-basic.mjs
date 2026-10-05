import fs from 'node:fs';

const file = new URL('../src/index.ts', import.meta.url);
let s = fs.readFileSync(file, 'utf8');

if (!s.includes("app.post('/api/auth/login-basic'")) {
  const marker = "app.post('/api/auth/handshake',(req,res)=>{";
  const route = `app.post('/api/auth/login-basic',async(req,res)=>{\n  if(!ADMIN_PASSWORD && !databaseConfigured()) return res.status(503).json({error:'Security backend is not configured'});\n  const ip=req.ip || req.socket?.remoteAddress || 'unknown';\n  const attempt=attemptState(ip);\n  if(attempt.count>=MAX_LOGIN_ATTEMPTS){\n    const retryAfterSec=remainingLockSeconds(attempt);\n    res.setHeader('Retry-After',String(retryAfterSec));\n    addSecurityLog(req,'BLOCKED','unknown',\`Too many login attempts; retry in \${retryAfterSec}s\`);\n    return res.status(429).json({error:'Too many login attempts. Please wait before trying again.',retryAfterSec});\n  }\n  const username=String(req.body?.username||'').trim();\n  const password=String(req.body?.password||'');\n  if(!username || !password) return res.status(400).json({error:'Username and password are required'});\n  try{\n    const okUser=databaseConfigured() ? Boolean(username) : secureEqual(username,ADMIN_USERNAME);\n    const okPass=await verifyAdminPassword(username,password,ADMIN_USERNAME,ADMIN_PASSWORD);\n    if(!okUser || !okPass){\n      attempt.count+=1;\n      const attemptsRemaining=Math.max(0,MAX_LOGIN_ATTEMPTS-attempt.count);\n      addSecurityLog(req,'FAILED',username||'unknown',\`Invalid username or password; \${attemptsRemaining} attempts remaining\`);\n      return res.status(401).json({error:'Invalid username or password',attemptsRemaining});\n    }\n    loginAttempts.delete(ip);\n    const token=randomBytes(32).toString('hex');\n    const expiresAt=Date.now()+SESSION_TTL_HOURS*60*60*1000;\n    sessions.set(token,{user:username,expiresAt});\n    addSecurityLog(req,'SUCCESS',username,'Login accepted via HTTPS/TLS fallback');\n    return res.json({ok:true,token,user:username,expiresAt:new Date(expiresAt).toISOString()});\n  }catch(e){\n    console.error('Basic login failed',e);\n    return res.status(500).json({error:'Login service error'});\n  }\n});\n\n`;
  if (!s.includes(marker)) throw new Error('handshake marker not found');
  s = s.replace(marker, route + marker);
  fs.writeFileSync(file, s);
}

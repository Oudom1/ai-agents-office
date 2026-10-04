from pathlib import Path

p=Path('api/src/index.ts')
s=p.read_text()
s=s.replace("import { databaseConfigured, strongPassword, verifyAdminPassword, resetAdminPassword, persistSecurityLog } from './auth-store.js';","import { databaseConfigured, strongPassword, verifyAdminPassword, resetAdminPassword, createAppUser, persistSecurityLog } from './auth-store.js';",1)
s=s.replace("    const okUser=secureEqual(username,ADMIN_USERNAME);\n    const okPass=await verifyAdminPassword(username,password,ADMIN_USERNAME,ADMIN_PASSWORD);","    const okUser=databaseConfigured() ? Boolean(username) : secureEqual(username,ADMIN_USERNAME);\n    const okPass=await verifyAdminPassword(username,password,ADMIN_USERNAME,ADMIN_PASSWORD);",1)
s=s.replace("  sessions.set(token,{user:ADMIN_USERNAME,expiresAt});\n  addSecurityLog(req,'SUCCESS',ADMIN_USERNAME,'Login accepted via ECDH key exchange + AES-GCM verification');\n  res.json({ok:true,token,user:ADMIN_USERNAME,expiresAt:new Date(expiresAt).toISOString()});","  sessions.set(token,{user:username,expiresAt});\n  addSecurityLog(req,'SUCCESS',username,'Login accepted via ECDH key exchange + AES-GCM verification');\n  res.json({ok:true,token,user:username,expiresAt:new Date(expiresAt).toISOString()});",1)
anchor="""app.post('/api/auth/logout',requireAuth,(req:any,res)=>{\n  const token=bearer(req);\n  addSecurityLog(req,'SUCCESS',req.auth.user,'Logged out');\n  sessions.delete(token);\n  res.json({ok:true});\n});\n"""
route="""
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
"""
if route.strip() not in s:
    if anchor not in s: raise SystemExit('logout anchor missing')
    s=s.replace(anchor,anchor+route,1)
p.write_text(s)

html=Path('frontend/index.html')
h=html.read_text()
if 'create-user.html' not in h:
    h=h.replace('<a href="./health-monitoring.html">Health Monitor</a>','<a href="./health-monitoring.html">Health Monitor</a><a href="./create-user.html">Create User</a>',1)
html.write_text(h)

page=Path('frontend/public/create-user.html')
page.write_text(r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Create User - AI Agents Office</title>
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 50% 0,#10354b 0,#06111d 45%,#030911 100%);font-family:Inter,Segoe UI,Arial,sans-serif;color:#e8f4fb;padding:20px}.card{width:min(520px,96vw);background:#091827;border:1px solid #244761;border-radius:16px;padding:22px;box-shadow:0 28px 70px rgba(0,0,0,.5)}.eyebrow{font-size:10px;letter-spacing:1px;color:#66dbe8;font-weight:900}h1{font-size:22px;margin:7px 0 6px}p{font-size:10px;line-height:1.55;color:#7f9fb1}.notice{border:1px solid #274c63;background:#071522;border-radius:9px;padding:10px;margin:12px 0;font-size:9px;color:#9fc3d5}label{display:block;font-size:9px;color:#9fc3d5;margin-top:10px}input{width:100%;margin:5px 0 2px;padding:11px;border-radius:8px;border:1px solid #284b61;background:#06121d;color:#fff;outline:none}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.preview{font:800 12px ui-monospace,monospace;color:#79e7a8;margin-top:8px}.msg{min-height:24px;font-size:9px;margin-top:8px;color:#ff9eaa}.ok{color:#79e7a8}.btn{width:100%;padding:11px;border-radius:8px;border:1px solid #2b6d87;background:#123d55;color:#e9f8ff;font-weight:900;cursor:pointer}.btn:disabled{opacity:.6}.link{display:block;text-align:center;margin-top:10px;color:#8fd9ff;font-size:9px;text-decoration:none}.policy{font-size:8px;color:#63869a;margin-top:10px;line-height:1.5}@media(max-width:560px){.row{grid-template-columns:1fr}}</style></head>
<body><div class="card"><div class="eyebrow">AI AGENTS OFFICE ADMIN</div><h1>Create Office User</h1><p>Only the signed-in Admin can create accounts. The Admin password is verified again by the backend before the user is created.</p><div class="notice">Username format: <b>firstname.lastname</b><br>Password policy: 15+ characters, uppercase, lowercase, number and special character.</div><div class="row"><div><label>First name</label><input id="first" autocomplete="off" placeholder="Monyratanak"></div><div><label>Last name</label><input id="last" autocomplete="off" placeholder="Mok"></div></div><div class="preview">Username: <span id="preview">firstname.lastname</span></div><label>User password</label><input id="password" type="password" autocomplete="new-password" placeholder="Strong password"><label>Confirm user password</label><input id="confirm" type="password" autocomplete="new-password" placeholder="Confirm password"><label>Admin password verification</label><input id="adminPassword" type="password" autocomplete="current-password" placeholder="Enter Admin password"><div id="msg" class="msg"></div><button id="create" class="btn">Verify Admin & Create User</button><a class="link" href="./">← Back to AI Agents Office</a><div class="policy">The user password is stored only as a salted scrypt hash in Neon. Usernames are generated by the server from first and last name. Standard users cannot use this page to create more accounts.</div></div>
<script>
const API='https://ai-agents-office-api.onrender.com/api',TOKEN_KEY='ai-office-auth-token-v1',USER_KEY='ai-office-auth-user-v1';
const el=id=>document.getElementById(id),clean=v=>v.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,''),strong=p=>p.length>=15&&/[a-z]/.test(p)&&/[A-Z]/.test(p)&&/\d/.test(p)&&/[^A-Za-z0-9]/.test(p);
function refreshPreview(){const a=clean(el('first').value),b=clean(el('last').value);el('preview').textContent=a&&b?`${a}.${b}`:'firstname.lastname'}el('first').oninput=refreshPreview;el('last').oninput=refreshPreview;
(async()=>{const token=sessionStorage.getItem(TOKEN_KEY),user=sessionStorage.getItem(USER_KEY);if(!token||user!=='Admin'){el('msg').textContent='Admin login is required. Return to the Office and sign in as Admin.';el('create').disabled=true;return}try{const r=await fetch(`${API}/auth/status`,{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok||d.user!=='Admin')throw 0}catch{el('msg').textContent='Admin session is not valid. Return to the Office and sign in again.';el('create').disabled=true}})();
el('create').onclick=async()=>{const firstName=el('first').value.trim(),lastName=el('last').value.trim(),password=el('password').value,confirm=el('confirm').value,adminPassword=el('adminPassword').value,token=sessionStorage.getItem(TOKEN_KEY)||'';el('msg').className='msg';el('msg').textContent='';if(!firstName||!lastName){el('msg').textContent='Enter first name and last name.';return}if(!strong(password)){el('msg').textContent='Password does not meet the 15-character complexity policy.';return}if(password!==confirm){el('msg').textContent='User passwords do not match.';return}if(!adminPassword){el('msg').textContent='Enter the Admin password for verification.';return}el('create').disabled=true;el('create').textContent='Verifying & creating…';try{const r=await fetch(`${API}/admin/users`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({firstName,lastName,password,adminPassword})});const d=await r.json().catch(()=>({}));if(!r.ok){el('msg').textContent=d.error||'Unable to create user.';return}el('msg').className='msg ok';el('msg').textContent=`Created successfully: ${d.username}`;el('first').value='';el('last').value='';el('password').value='';el('confirm').value='';el('adminPassword').value='';refreshPreview()}catch{el('msg').textContent='Backend unavailable.'}finally{el('create').disabled=false;el('create').textContent='Verify Admin & Create User'}};
</script></body></html>''')
print('admin user creation page patch applied')

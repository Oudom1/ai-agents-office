from pathlib import Path

p=Path('api/src/index.ts')
s=p.read_text()
old="""    const okUser=secureEqual(username,ADMIN_USERNAME);\n    const okPass=await verifyAdminPassword(username,password,ADMIN_USERNAME,ADMIN_PASSWORD);\n    if(!okUser || !okPass){"""
new="""    const okUser=databaseConfigured() ? Boolean(username) : secureEqual(username,ADMIN_USERNAME);\n    const okPass=await verifyAdminPassword(username,password,ADMIN_USERNAME,ADMIN_PASSWORD);\n    if(!okUser || !okPass){"""
if old not in s:
    raise SystemExit('login auth anchor not found')
s=s.replace(old,new,1)
s=s.replace("sessions.set(token,{user:ADMIN_USERNAME,expiresAt});\n  addSecurityLog(req,'SUCCESS',ADMIN_USERNAME,'Login accepted via ECDH key exchange + AES-GCM verification');\n  res.json({ok:true,token,user:ADMIN_USERNAME,expiresAt:new Date(expiresAt).toISOString()});",
            "sessions.set(token,{user:username,expiresAt});\n  addSecurityLog(req,'SUCCESS',username,'Login accepted via ECDH key exchange + AES-GCM verification');\n  res.json({ok:true,token,user:username,expiresAt:new Date(expiresAt).toISOString()});",1)
p.write_text(s)
print('multi-user auth patch applied')

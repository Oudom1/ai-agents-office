import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../src/index.ts', import.meta.url);
let s = await readFile(path, 'utf8');

const oldAuth = "    const okUser=secureEqual(username,ADMIN_USERNAME);\n    const okPass=await verifyAdminPassword(username,password,ADMIN_USERNAME,ADMIN_PASSWORD);\n    if(!okUser || !okPass){";
const newAuth = "    const okUser=databaseConfigured() ? Boolean(username) : secureEqual(username,ADMIN_USERNAME);\n    const okPass=await verifyAdminPassword(username,password,ADMIN_USERNAME,ADMIN_PASSWORD);\n    if(!okUser || !okPass){";
if (s.includes(oldAuth)) s = s.replace(oldAuth, newAuth);

const oldSession = "sessions.set(token,{user:ADMIN_USERNAME,expiresAt});\n  addSecurityLog(req,'SUCCESS',ADMIN_USERNAME,'Login accepted via ECDH key exchange + AES-GCM verification');\n  res.json({ok:true,token,user:ADMIN_USERNAME,expiresAt:new Date(expiresAt).toISOString()});";
const newSession = "sessions.set(token,{user:username,expiresAt});\n  addSecurityLog(req,'SUCCESS',username,'Login accepted via ECDH key exchange + AES-GCM verification');\n  res.json({ok:true,token,user:username,expiresAt:new Date(expiresAt).toISOString()});";
if (s.includes(oldSession)) s = s.replace(oldSession, newSession);

await writeFile(path, s);
console.log('Multi-user authentication enabled for active database users.');

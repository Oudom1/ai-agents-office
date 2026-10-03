import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL || '';
const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } }) : null;

function safeEqual(a:string,b:string){
  const aa=Buffer.from(a); const bb=Buffer.from(b);
  return aa.length===bb.length && timingSafeEqual(aa,bb);
}

export function databaseConfigured(){ return Boolean(pool); }

export function strongPassword(password:string){
  return password.length>=15 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export async function verifyAdminPassword(username:string,password:string,fallbackUsername:string,fallbackPassword:string){
  if(pool){
    try{
      const r=await pool.query('SELECT username,password_hash,password_salt,is_active FROM app_users WHERE username=$1 LIMIT 1',[username]);
      const row=r.rows[0];
      if(row?.is_active && row.password_hash && row.password_salt){
        const derived=scryptSync(password,row.password_salt,64).toString('hex');
        return safeEqual(derived,row.password_hash);
      }
    }catch(e){ console.error('DB auth lookup failed',e); }
  }
  return Boolean(fallbackPassword) && safeEqual(username,fallbackUsername) && safeEqual(password,fallbackPassword);
}

export async function resetAdminPassword(username:string,newPassword:string){
  if(!pool) throw new Error('Database is not configured');
  const salt=randomBytes(24).toString('hex');
  const hash=scryptSync(newPassword,salt,64).toString('hex');
  await pool.query(`INSERT INTO app_users(username,role,is_active,password_hash,password_salt,password_updated_at,updated_at)
    VALUES($1,'admin',true,$2,$3,now(),now())
    ON CONFLICT(username) DO UPDATE SET role='admin',is_active=true,password_hash=EXCLUDED.password_hash,password_salt=EXCLUDED.password_salt,password_updated_at=now(),updated_at=now()`,[username,hash,salt]);
}

export async function persistSecurityLog(event:{result:string,username?:string,detail?:string,ip?:string,userAgent?:string}){
  if(!pool) return;
  try{
    await pool.query('INSERT INTO security_logs(result,username,detail,ip_address,user_agent) VALUES($1,$2,$3,$4,$5)',[
      event.result,event.username||null,event.detail||null,event.ip||null,event.userAgent||null
    ]);
  }catch(e){ console.error('DB security log write failed',e); }
}

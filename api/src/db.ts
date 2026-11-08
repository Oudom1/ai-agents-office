import pg from 'pg';

const { Pool } = pg;
const rawDatabaseUrl = process.env.DATABASE_URL || '';

function normalizeDatabaseUrl(value:string){
  if(!value) return '';
  try{
    const url=new URL(value);
    if(url.searchParams.get('sslmode')==='require') url.searchParams.set('sslmode','verify-full');
    return url.toString();
  }catch{
    return value.replace(/sslmode=require/g,'sslmode=verify-full');
  }
}

export const DATABASE_URL = normalizeDatabaseUrl(rawDatabaseUrl);
export const pool = DATABASE_URL ? new Pool({connectionString:DATABASE_URL,max:5,idleTimeoutMillis:30000,connectionTimeoutMillis:10000}) : null;

export function databaseConfigured(){ return Boolean(pool); }

export async function databaseHealth(){
  if(!pool) return {configured:false,ok:false};
  try{
    const r=await pool.query('SELECT now() AS now');
    return {configured:true,ok:true,now:r.rows[0]?.now};
  }catch(e:any){
    return {configured:true,ok:false,error:String(e?.message||e)};
  }
}

import pg from 'pg';

const {Pool}=pg;
const url=process.env.DATABASE_URL || '';
const pool=url ? new Pool({connectionString:url,ssl:{rejectUnauthorized:false},max:3}) : null;
const KEY='production';

/** Recover the latest task snapshot; seed once only for a new database. */
export async function initializeTaskHistory(seed:any[]):Promise<void>{
  if(!pool){ console.warn('DATABASE_URL absent: task history is not durable'); return; }
  await pool.query(`CREATE TABLE IF NOT EXISTS office_task_snapshots (
    name text PRIMARY KEY,
    payload jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  const existing=await pool.query('SELECT payload FROM office_task_snapshots WHERE name=$1',[KEY]);
  if(existing.rows.length){
    const data=existing.rows[0].payload;
    if(!Array.isArray(data))throw new Error('Task database contains invalid snapshot');
    seed.splice(0,seed.length,...data);
    console.info('Recovered',seed.length,'tasks from PostgreSQL');
    return;
  }
  await pool.query('INSERT INTO office_task_snapshots(name,payload) VALUES($1,$2::jsonb) ON CONFLICT(name) DO NOTHING',[KEY,JSON.stringify(seed)]);
  const persisted=await pool.query('SELECT payload FROM office_task_snapshots WHERE name=$1',[KEY]);
  if(!Array.isArray(persisted.rows[0]?.payload))throw new Error('Task database initialization failed');
  seed.splice(0,seed.length,...persisted.rows[0].payload);
  console.info('Initialized persistent task history');
}

let pending:Promise<void>=Promise.resolve();
export function persistTaskHistory(tasks:any[]):Promise<void>{
  if(!pool)return Promise.resolve();
  const payload=JSON.stringify(tasks);
  const op=pending.catch(()=>{}).then(async()=>{
    await pool.query(`INSERT INTO office_task_snapshots(name,payload,updated_at)
      VALUES($1,$2::jsonb,now()) ON CONFLICT(name)
      DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()`,[KEY,payload]);
  });
  pending=op;
  return op;
}

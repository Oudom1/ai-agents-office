import { pool } from './db.js';

let ready=false;

export function officePersistenceReady(){ return ready; }

export async function hydrateOfficeState(agents:any[],tasks:any[]){
  if(!pool){ ready=false; return; }
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    for(const agent of agents){
      await client.query(`INSERT INTO agents(id,name,role,state,current_task,destination,updated_at)
        VALUES($1,$2,$3,'working',NULL,$4::jsonb,now())
        ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,role=EXCLUDED.role`,
        [agent.id,agent.name,agent.role,JSON.stringify(agent.home||agent.destination||null)]);
    }
    await client.query('COMMIT');

    const ar=await pool.query('SELECT id,state,current_task,destination FROM agents');
    const byId=new Map(ar.rows.map((row:any)=>[String(row.id),row]));
    for(const agent of agents){
      const row:any=byId.get(agent.id);
      if(!row) continue;
      agent.state=row.state||'working';
      if(row.current_task) agent.currentTask=row.current_task; else delete agent.currentTask;
      agent.destination=row.destination||agent.home;
    }

    const tr=await pool.query(`SELECT id::text,agent_id,title,description,status,blocker,provider,free_only,result_message,drive_url,
      phase,video_url,generation_time_sec,duration_sec,next_run_at,source_task_id,provider_job_id,
      created_at,started_at,completed_at
      FROM tasks ORDER BY created_at DESC`);
    tasks.splice(0,tasks.length,...tr.rows.map((row:any)=>({
      id:String(row.id),
      agentId:row.agent_id,
      title:row.title,
      description:row.description||'',
      status:row.status,
      blocker:row.blocker||undefined,
      provider:row.provider||undefined,
      freeOnly:Boolean(row.free_only),
      resultMessage:row.result_message||undefined,
      driveUrl:row.drive_url||undefined,
      phase:row.phase||undefined,
      videoUrl:row.video_url||undefined,
      generationTimeSec:row.generation_time_sec==null?undefined:Number(row.generation_time_sec),
      durationSec:row.duration_sec==null?undefined:Number(row.duration_sec),
      nextRunAt:row.next_run_at?new Date(row.next_run_at).toISOString():undefined,
      sourceTaskId:row.source_task_id||undefined,
      providerJobId:row.provider_job_id||undefined,
      createdAt:new Date(row.created_at).toISOString(),
      startedAt:row.started_at?new Date(row.started_at).toISOString():undefined,
      completedAt:row.completed_at?new Date(row.completed_at).toISOString():undefined
    })));
    ready=true;
  }catch(e){
    try{await client.query('ROLLBACK');}catch{}
    ready=false;
    throw e;
  }finally{
    client.release();
  }
}

export async function persistAgentState(agent:any){
  if(!pool) return;
  await pool.query(`INSERT INTO agents(id,name,role,state,current_task,destination,updated_at)
    VALUES($1,$2,$3,$4,$5,$6::jsonb,now())
    ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,role=EXCLUDED.role,state=EXCLUDED.state,
      current_task=EXCLUDED.current_task,destination=EXCLUDED.destination,updated_at=now()`,[
    agent.id,agent.name,agent.role,agent.state||'working',agent.currentTask||null,
    JSON.stringify(agent.destination||agent.home||null)
  ]);
}

export async function persistTaskState(task:any){
  if(!pool) return;
  await pool.query(`INSERT INTO tasks(
      id,agent_id,title,description,status,blocker,provider,free_only,result_message,drive_url,
      phase,video_url,generation_time_sec,duration_sec,next_run_at,source_task_id,provider_job_id,
      created_at,started_at,completed_at)
    VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
    ON CONFLICT(id) DO UPDATE SET
      agent_id=EXCLUDED.agent_id,title=EXCLUDED.title,description=EXCLUDED.description,status=EXCLUDED.status,
      blocker=EXCLUDED.blocker,provider=EXCLUDED.provider,free_only=EXCLUDED.free_only,result_message=EXCLUDED.result_message,
      drive_url=EXCLUDED.drive_url,phase=EXCLUDED.phase,video_url=EXCLUDED.video_url,
      generation_time_sec=EXCLUDED.generation_time_sec,duration_sec=EXCLUDED.duration_sec,next_run_at=EXCLUDED.next_run_at,
      source_task_id=EXCLUDED.source_task_id,provider_job_id=EXCLUDED.provider_job_id,
      started_at=EXCLUDED.started_at,completed_at=EXCLUDED.completed_at`,[
    task.id,task.agentId,task.title,task.description||'',task.status||'active',task.blocker||null,
    task.provider||null,Boolean(task.freeOnly),task.resultMessage||null,task.driveUrl||null,
    task.phase||null,task.videoUrl||null,task.generationTimeSec??null,task.durationSec??null,
    task.nextRunAt||null,task.sourceTaskId||null,task.providerJobId||null,
    task.createdAt||new Date().toISOString(),task.startedAt||null,task.completedAt||null
  ]);
}

export async function deleteTaskState(id:string){
  if(!pool) return;
  await pool.query('DELETE FROM tasks WHERE id=$1::uuid',[id]);
}

export async function deleteCompletedTaskStates(expectedCount:number){
  if(!pool) return {removedCount:0};
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const locked=await client.query("SELECT id FROM tasks WHERE status='done' FOR UPDATE");
    const actual=locked.rowCount||0;
    if(actual!==expectedCount){
      await client.query('ROLLBACK');
      return {conflict:true,actualCount:actual,removedCount:0};
    }
    const result=await client.query("DELETE FROM tasks WHERE status='done'");
    await client.query('COMMIT');
    return {removedCount:result.rowCount||0};
  }catch(e){
    try{await client.query('ROLLBACK');}catch{}
    throw e;
  }finally{client.release();}
}

export async function clearTaskStates(){
  if(!pool) return;
  await pool.query('DELETE FROM tasks');
}

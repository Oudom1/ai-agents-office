import React, {useEffect,useState} from 'react';

type Plugin = {
 id:string;name:string;category:string;agents:string[];repository:string;
 capability:string;integration:string;risk:string;notes:string;status:string;enabled:boolean;
};
type PluginResponse = {plugins:Plugin[];summary:{installed:number;enabled:number};message:string};
const agentNames:Record<string,string>={manager:'Alex',developer:'Leo',verification:'Kai',qa:'Lina',cloud:'Noah',sysadmin:'Sam',security:'Mina'};

export function PluginManager({api,authFetch,onClose}:{
 api:string;authFetch:(url:string,init?:RequestInit)=>Promise<Response>;onClose:()=>void;
}){
 const [data,setData]=useState<PluginResponse|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [query,setQuery]=useState('');
 const [selected,setSelected]=useState<string|null>(null);
 async function refresh(){
  setLoading(true);setError('');
  try{
   const response=await authFetch(api+'/plugins');
   if(!response.ok)throw new Error(response.status===401?'Please sign in to view plugins.':response.status===404?'Plugin catalog API is not deployed yet.':'Unable to load plugin catalog ('+response.status+').');
   const next=await response.json() as PluginResponse;
   if(!Array.isArray(next.plugins))throw new Error('Unexpected catalog response.');
   setData(next);
  }catch(e){setError(e instanceof Error?e.message:'Unable to load plugins.');}
  finally{setLoading(false);}
 }
 useEffect(()=>{void refresh();},[api]);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[onClose]);
 const list=(data?.plugins||[]).filter(p=>(p.name+' '+p.capability+' '+p.category).toLowerCase().includes(query.toLowerCase()));
 const detail=data?.plugins.find(p=>p.id===selected);
 return <div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(3,8,19,.88)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
  <section role="dialog" aria-modal="true" aria-label="Plugin Management" style={{width:'min(1060px,96vw)',maxHeight:'92vh',overflowY:'auto',background:'#0b1828',border:'1px solid #34516b',borderRadius:16,padding:22,color:'#e8f3ff',boxShadow:'0 28px 90px #0009'}}>
   <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
    <div><h2 style={{margin:0,fontSize:24}}>🧩 Plugin Management</h2><p style={{color:'#91aabe'}}>Review agent integrations, ownership and installation readiness</p></div>
    <button type="button" onClick={onClose} style={{background:'#203348',color:'white',border:'1px solid #58718a',borderRadius:8,padding:'8px 14px'}}>Close ✕</button>
   </div>
   <div style={{padding:12,border:'1px solid #745f36',borderRadius:9,background:'#302619',color:'#f8ddb1',marginBottom:18}}>Integration review mode — plugins are not installed or enabled. Third-party installation requires approval, security review and QA.</div>
   <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:18}}>
    <input aria-label="Search plugins" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search plugins or capabilities..." style={{padding:11,border:'1px solid #34516b',borderRadius:9,background:'#07111f',color:'white',flex:'1 1 260px'}}/>
    <button type="button" onClick={()=>void refresh()} disabled={loading} style={{padding:'10px 14px',borderRadius:8,border:'1px solid #34516b',background:'#143752',color:'#c8edff'}}>↻ Refresh</button>
   </div>
   {loading && <p role="status">Loading catalog…</p>}
   {error && <p role="alert" style={{color:'#ffb5b5'}}>{error}</p>}
   {!loading&&!error&&<><p style={{color:'#9fb5c7'}}>{list.length} available for assessment · {data?.summary.installed||0} installed · {data?.summary.enabled||0} enabled</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:14}}>
    {list.map(p=><article key={p.id} style={{border:'1px solid #29445c',background:'#102238',borderRadius:11,padding:16}}>
     <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}><b style={{fontSize:17}}>{p.name}</b><span style={{fontSize:10,color:'#f1c88c'}}>NOT INSTALLED</span></div>
     <p style={{minHeight:38,color:'#b9cadb',fontSize:13}}>{p.capability}</p>
     <p style={{fontSize:12,color:'#8bb4d2'}}>Agents: {p.agents.map(a=>agentNames[a]||a).join(', ')}</p>
     <p style={{fontSize:12,color:'#91aabe'}}>Integration: {p.integration.replaceAll('-',' ')} · Risk: {p.risk}</p>
     <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
       <button type="button" onClick={()=>setSelected(selected===p.id?null:p.id)} style={{padding:'8px 11px',border:'1px solid #375775',borderRadius:7,background:'#1b405e',color:'#dff4ff'}}>Details</button>
       <a href={p.repository} target="_blank" rel="noopener noreferrer" style={{padding:'8px 11px',borderRadius:7,border:'1px solid #375775',color:'#bfe9ff'}}>Source ↗</a>
     </div>
     {detail?.id===p.id&&<div style={{marginTop:12,padding:10,background:'#091625',borderRadius:8,fontSize:12,lineHeight:1.6}}><b>Integration notes</b><p>{p.notes}</p><b>Review sequence</b><p>Mina: security → Lina: QA → Noah: deployment approval</p><button type="button" disabled title="Not available until integration has been security-reviewed" style={{opacity:.55}}>Install (pending approval)</button></div>}
    </article>)}
    </div>
    {list.length===0&&<p>No matching plugins.</p>}
   </>}
  </section>
 </div>;
}

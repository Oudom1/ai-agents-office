(()=>{
  const STORAGE_KEY='ai-agents-office-tasks-v3';

  function readTasks(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return[]}
  }

  function formatElapsed(ms){
    const total=Math.max(0,Math.floor(ms/1000));
    const h=Math.floor(total/3600);
    const m=Math.floor((total%3600)/60);
    const s=total%60;
    if(h>0) return `${h}h ${m}m ${s}s`;
    if(m>0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function render(){
    const tasks=readTasks();
    document.querySelectorAll('.result-card').forEach(card=>{
      const title=(card.querySelector('b')?.textContent||'').trim();
      if(!title) return;
      const task=tasks.find(t=>String(t.title||'').trim()===title && String(t.status||'').toLowerCase()==='done');
      const old=card.querySelector('.result-duration');
      if(!task?.completedAt){old?.remove();return}
      const started=task.startedAt||task.createdAt;
      if(!started){old?.remove();return}
      const startMs=new Date(started).getTime();
      const endMs=new Date(task.completedAt).getTime();
      if(!Number.isFinite(startMs)||!Number.isFinite(endMs)||endMs<startMs){old?.remove();return}

      const line=old||document.createElement('div');
      line.className='result-duration';
      line.textContent=`⏱ Time spent: ${formatElapsed(endMs-startMs)}`;
      Object.assign(line.style,{margin:'7px 0 3px',fontSize:'10px',fontWeight:'800',color:'#8ff0b7'});

      if(!old){
        const bottom=card.querySelector('.task-bottom');
        if(bottom) card.insertBefore(line,bottom); else card.appendChild(line);
      }
    });
  }

  new MutationObserver(render).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('storage',render);
  setInterval(render,1500);
  render();
})();

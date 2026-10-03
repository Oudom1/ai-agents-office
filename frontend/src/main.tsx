import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

type Agent = {
  id: string;
  name: string;
  role: string;
  state: string;
  position: {x: number; y: number};
  home: {x: number; y: number};
  destination?: {x: number; y: number};
  currentTask?: string;
};

type Task = {
  id: string;
  title: string;
  agentId: string;
  status: string;
  createdAt: string;
  phase?: string;
  provider?: string;
  freeOnly?: boolean;
  startedAt?: string;
  durationSec?: number;
  completedAt?: string;
  driveUrl?: string;
  resultMessage?: string;
  recurringEveryHours?: number;
  nextRunAt?: string;
  sourceTaskId?: string;
};

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';
const TASK_TARGET = 12;
const STORAGE_KEY = 'ai-agents-office-tasks-v3';
const GOOGLE_DRIVE_PLACEHOLDER = 'https://drive.google.com/drive/folders/1SDKs0stvoeIkYIhEcP5znRq7-tSyaEpl';
const KAI_REFRESH_HOURS = 4;
const KAI_REFRESH_MS = KAI_REFRESH_HOURS * 60 * 60 * 1000;
const IT_COMEDY_LAST_KEY = 'kai-last-it-comedy';

const fallbackAgents: Agent[] = [
  {id: 'manager', name: 'Alex', role: 'Manager', state: 'working', position: {x: 18, y: 18}, home: {x: 18, y: 18}},
  {id: 'sysadmin', name: 'Sam', role: 'Senior System Administrator', state: 'working', position: {x: 20, y: 43}, home: {x: 20, y: 43}},
  {id: 'security', name: 'Mina', role: 'Senior Security', state: 'working', position: {x: 42, y: 43}, home: {x: 42, y: 43}},
  {id: 'cloud', name: 'Noah', role: 'Senior Cloud Operator', state: 'working', position: {x: 65, y: 43}, home: {x: 65, y: 43}},
  {id: 'qa', name: 'Lina', role: 'Senior Q/A', state: 'working', position: {x: 28, y: 59}, home: {x: 28, y: 59}},
  {id: 'implement', name: 'Kai', role: 'Senior Implement', state: 'working', position: {x: 51, y: 59}, home: {x: 51, y: 59}},
  {id: 'developer', name: 'Leo', role: 'Senior Developer', state: 'working', position: {x: 75, y: 59}, home: {x: 75, y: 59}}
];

const kaiVideoTemplates = [
  {name: 'Funny Cartoon', prompt: 'Create a 10-second funny cartoon video. A cute office worker spills coffee on the desk, looks shocked, then pretends nothing happened while coworkers stare. Bright colorful 2D cartoon style, exaggerated facial expressions, playful movement, humorous tone, smooth animation, vertical 9:16.'},
  {name: 'IT Comedy', prompt: 'Create a fresh 10-second funny IT cartoon video with a new office technology mishap. Bright colorful 2D cartoon style, exaggerated reactions, playful comedy, smooth animation, vertical 9:16.'},
  {name: 'Security Joke', prompt: 'Create a 10-second funny cartoon video of a cybersecurity analyst celebrating that the system is secure, then 99 warning alerts suddenly appear on the monitor. Funny timing, exaggerated facial expression, colorful cartoon office, vertical 9:16.'},
  {name: 'Short Promo', prompt: 'Create a 10-second vertical animated promo video with energetic motion, clean modern graphics, short punchy scenes, upbeat mood, and a strong final hero shot. Format 9:16 for Shorts and Reels.'}
];

const leoPortfolioTemplates = [
  {name: 'Build Portfolio', prompt: 'Build my professional IT portfolio with Home, About, Experience, Skills, Projects, Certificates, and Contact sections. Use React and TypeScript with a modern responsive dark design.'},
  {name: 'Add Projects', prompt: 'Add a Projects section to my portfolio highlighting Microsoft 365, Entra, Intune, SAP S/4 HANA, Graylog, security automation, and enterprise application projects.'},
  {name: 'Improve UI', prompt: 'Improve my portfolio UI with responsive cards, smooth animations, mobile navigation, polished typography, and professional IT branding.'},
  {name: 'Deploy Portfolio', prompt: 'Prepare my portfolio for deployment to GitHub Pages, check the production build, routes, assets, and deployment configuration.'}
];

const itComedyIdeas = [
  'An IT administrator confidently fixes a computer, accidentally unplugs the wrong cable, and every monitor in the office goes dark while he freezes and slowly looks around.',
  'An IT administrator proudly announces that the printer is fixed, presses Print, and the printer suddenly launches a giant stream of paper across the whole office.',
  'An IT administrator resets a user password, celebrates too early, then realizes he accidentally locked his own admin account and stares at the login screen in disbelief.',
  'An IT administrator restarts the Wi-Fi router to fix one user, then the entire office loses Wi-Fi and everyone slowly turns toward him at the same time.',
  'An IT administrator says the server reboot will take only five seconds, clicks Restart, and a giant loading spinner appears while the whole office waits silently.',
  'An IT administrator fixes one small software error, gives a thumbs-up, then three new warning windows immediately pop up behind him one after another.',
  'An IT administrator plugs in a network cable with confidence, gets a success light, then notices he connected the cable back into the same switch port loop.',
  'An IT administrator tells everyone not to panic during an outage, then his own laptop shows a huge red error message and he quietly closes the lid.',
  'An IT administrator cleans up old files to free storage, empties the recycle bin, then suddenly remembers the important file he was supposed to keep.',
  'An IT administrator fixes a frozen laptop by pressing one key, looks like a hero for two seconds, then the laptop starts installing 47 updates.'
];

function makeItComedyPrompt() {
  const last = Number(localStorage.getItem(IT_COMEDY_LAST_KEY) ?? '-1');
  let index = Math.floor(Math.random() * itComedyIdeas.length);
  if (itComedyIdeas.length > 1 && index === last) index = (index + 1) % itComedyIdeas.length;
  localStorage.setItem(IT_COMEDY_LAST_KEY, String(index));
  return `Create a 10-second funny cartoon video. ${itComedyIdeas[index]} Bright colorful 2D cartoon style, exaggerated facial expressions, playful movement, humorous timing, smooth animation, vertical 9:16.`;
}

function loadLocalTasks(): Task[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function App() {
  const [agents, setAgents] = useState<Agent[]>(fallbackAgents);
  const [tasks, setTasks] = useState<Task[]>(loadLocalTasks);
  const [selected, setSelected] = useState('sysadmin');
  const [taskTitle, setTaskTitle] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());

  const refresh = async () => {
    try {
      const [a, t] = await Promise.all([fetch(`${API}/agents`), fetch(`${API}/tasks`)]);
      if (a.ok) {
        const data = await a.json();
        if (Array.isArray(data) && data.length) {
          const hasLeo = data.some((x: Agent) => x.id === 'developer');
          setAgents(hasLeo ? data : [...data, fallbackAgents.find(x => x.id === 'developer')!]);
        }
      }
      if (t.ok) {
        const data = await t.json();
        if (Array.isArray(data) && data.length) setTasks(data);
      }
    } catch {}
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(id);
  }, [notice]);

  const updateLocal = (id: string, patch: Partial<Agent>) => setAgents(prev => prev.map(a => a.id === id ? {...a, ...patch} : a));
  const patchTask = (id: string, patch: Partial<Task>) => setTasks(prev => prev.map(t => t.id === id ? {...t, ...patch} : t));

  const call = async () => {
    try {
      const r = await fetch(`${API}/manager/call/${selected}`, {method: 'POST'});
      if (!r.ok) throw 0;
      await refresh();
    } catch { updateLocal(selected, {state: 'called', destination: {x: 18, y: 15}}); }
  };

  const state = async (s: string) => {
    try {
      const r = await fetch(`${API}/agents/${selected}/state`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({state: s})
      });
      if (!r.ok) throw 0;
      await refresh();
    } catch {
      const a = agents.find(x => x.id === selected);
      const destination = s === 'break' ? {x: 13, y: 72} : s === 'lunch' ? {x: 75, y: 73} : a?.home;
      updateLocal(selected, {state: s, currentTask: undefined, destination});
    }
  };

  const startLocalTaskMotion = (agentId: string, title: string, taskId: string) => {
    const a = agents.find(x => x.id === agentId);
    if (!a) return;
    updateLocal(agentId, {state: 'assigned-task', currentTask: title, destination: {x: 48, y: 18}});
    patchTask(taskId, {phase: agentId === 'implement' ? 'free-check' : 'received'});
    window.setTimeout(() => {
      updateLocal(agentId, {state: 'preparing', currentTask: title, destination: {x: 48, y: 24}});
      patchTask(taskId, {phase: 'preparing'});
    }, 1200);
    window.setTimeout(() => {
      updateLocal(agentId, {state: 'working-task', currentTask: title, destination: a.home});
      patchTask(taskId, {phase: 'working', startedAt: new Date().toISOString()});
    }, 2800);
  };

  const addLocalTask = (agentId: string, title: string) => {
    const isKai = agentId === 'implement';
    const isLeo = agentId === 'developer';
    const id = crypto.randomUUID();
    const task: Task = {
      id, agentId, title, status: 'active', phase: 'queued', createdAt: new Date().toISOString(),
      provider: isKai ? 'HeyGen Free' : isLeo ? 'Developer Workspace' : 'Internal Demo',
      freeOnly: isKai,
      durationSec: isKai ? 24 : isLeo ? 45 : 12,
      recurringEveryHours: isKai ? KAI_REFRESH_HOURS : undefined
    };
    setTasks(prev => [task, ...prev]);
    startLocalTaskMotion(agentId, title, id);
    return task;
  };

  const launchKaiQuickTemplate = (name: string, fallbackPrompt: string) => {
    const title = name === 'IT Comedy' ? makeItComedyPrompt() : fallbackPrompt;
    setSelected('implement');
    addLocalTask('implement', title);
    setTaskTitle('');
    setNotice(name === 'IT Comedy' ? 'Kai received a fresh IT Comedy idea and started a new video task' : `Kai started ${name}`);
  };

  const launchLeoTemplate = (name: string, prompt: string) => {
    setSelected('developer');
    addLocalTask('developer', prompt);
    setTaskTitle('');
    setNotice(`Alex assigned ${name} to Leo`);
  };

  const assign = async () => {
    if (!taskTitle.trim()) return;
    const title = taskTitle.trim();
    try {
      const r = await fetch(`${API}/tasks`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({agentId: selected, title})});
      if (!r.ok) throw 0;
      setTaskTitle('');
      setNotice(selected === 'implement' ? 'Kai started free video generation' : selected === 'developer' ? 'Leo started development work' : 'Task assigned');
      await refresh();
    } catch {
      addLocalTask(selected, title);
      setTaskTitle('');
      const name = agents.find(a => a.id === selected)?.name ?? 'Agent';
      setNotice(selected === 'implement' ? 'Kai is checking free quota and preparing the video' : selected === 'developer' ? 'Leo received the development task and started coding' : `${name} started the task`);
    }
  };

  const completeTask = (task: Task, auto = false) => {
    const isKai = task.agentId === 'implement';
    const isLeo = task.agentId === 'developer';
    patchTask(task.id, {
      status: 'done', phase: 'completed', completedAt: new Date().toISOString(),
      driveUrl: isKai ? GOOGLE_DRIVE_PLACEHOLDER : undefined,
      nextRunAt: isKai ? new Date(Date.now() + KAI_REFRESH_MS).toISOString() : undefined,
      resultMessage: isKai
        ? 'Complete — Kai finished this cycle. The same video task is scheduled to refresh again in 4 hours.'
        : isLeo
        ? 'Complete — Leo finished the development task and it is ready for review.'
        : 'Complete — task finished successfully.'
    });

    const next = tasks.filter(t => t.id !== task.id && t.agentId === task.agentId && t.status !== 'done')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    if (next) startLocalTaskMotion(next.agentId, next.title, next.id);
    else {
      const a = agents.find(x => x.id === task.agentId);
      updateLocal(task.agentId, {state: 'working', currentTask: undefined, destination: a?.home});
    }
    setNotice(isKai ? 'Complete — video ready, open Google Drive' : isLeo ? 'Leo completed the development task' : auto ? 'Complete — task finished' : 'Task completed — progress updated');
  };

  useEffect(() => {
    const dueTask = tasks.find(t => t.status !== 'done' && t.phase === 'working' && getRemainingSeconds(t, now) <= 0);
    if (dueTask) completeTask(dueTask, true);
  }, [tasks, now]);

  useEffect(() => {
    const dueRecurring = tasks.find(t => t.agentId === 'implement' && t.status === 'done' && t.nextRunAt &&
      new Date(t.nextRunAt).getTime() <= now &&
      !tasks.some(a => a.status !== 'done' && a.agentId === 'implement' && (a.sourceTaskId === t.id || a.title === t.title)));
    if (!dueRecurring) return;
    const id = crypto.randomUUID();
    const nextTask: Task = {
      id, agentId: 'implement', title: dueRecurring.title, status: 'active', phase: 'queued', createdAt: new Date().toISOString(),
      provider: dueRecurring.provider ?? 'HeyGen Free', freeOnly: true, durationSec: dueRecurring.durationSec ?? 24,
      recurringEveryHours: KAI_REFRESH_HOURS, sourceTaskId: dueRecurring.id
    };
    setTasks(prev => prev.map(t => t.id === dueRecurring.id ? {...t, nextRunAt: undefined} : t));
    setTasks(prev => [nextTask, ...prev]);
    startLocalTaskMotion('implement', nextTask.title, id);
    setNotice('Alex refreshed Kai’s video task — new 4-hour cycle started');
  }, [tasks, now]);

  const clearDone = () => setTasks(prev => prev.filter(t => t.status !== 'done'));
  const workerAgents = useMemo(() => agents.filter(a => a.id !== 'manager'), [agents]);
  const completedByAgent = useMemo(() => Object.fromEntries(agents.map(a => [a.id, Math.min(TASK_TARGET, tasks.filter(t => t.agentId === a.id && t.status.toLowerCase() === 'done').length)])), [agents, tasks]);
  const activeTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const selectedPlaceholder = selected === 'implement' ? 'Give Kai a video task...' : selected === 'developer' ? 'Ask Leo to build or improve your portfolio...' : 'Assign a task...';
  const selectedButton = selected === 'implement' ? 'Send Task to Kai' : selected === 'developer' ? 'Send Task to Leo' : 'Assign Task';

  return (
    <div className="app">
      <header>
        <div><h1>AI AGENTS OFFICE</h1><p>Live multi-agent operations floor</p></div>
        <div className="header-actions"><div className="status"><span className="dot" /> SYSTEM ONLINE</div>{notice && <div className="toast">{notice}</div>}</div>
      </header>

      <main>
        <section className="office-card">
          <div className="office">
            <Room x={3} y={4} w={29} h={25} title="MANAGER OFFICE" cls="manager-room" />
            <Room x={34} y={4} w={28} h={25} title="TASK BOARD" cls="task-room" />
            <Room x={64} y={4} w={33} h={25} title="ACTIVE TASKS" cls="active-room" />
            <Room x={3} y={33} w={94} h={34} title="OPERATIONS FLOOR" cls="ops-room" />
            <Room x={3} y={70} w={44} h={25} title="LOUNGE / BREAK" cls="lounge-room" />
            <Room x={50} y={70} w={47} h={25} title="CAFETERIA / LUNCH" cls="cafe-room" />

            <Desk x={16} y={16} />
            <Desk x={17} y={42} />
            <Desk x={39} y={42} />
            <Desk x={62} y={42} />
            <Desk x={25} y={57} />
            <Desk x={49} y={57} />
            <Desk x={73} y={57} />

            <div className="sofa" style={{left: '11%', top: '79%'}}>▰▰</div>
            <div className="coffee" style={{left: '33%', top: '81%'}}>☕</div>
            <div className="table" style={{left: '67%', top: '80%'}}>▭</div>
            <div className="coffee" style={{left: '84%', top: '82%'}}>☕</div>
            {agents.map(a => <AgentSprite key={a.id} agent={a} completed={completedByAgent[a.id] ?? 0} />)}
          </div>
        </section>

        <aside>
          <div className="panel manager-control">
            <h2>Manager Control</h2>
            <label>Agent</label>
            <select value={selected} onChange={e => setSelected(e.target.value)}>
              {workerAgents.map(a => <option key={a.id} value={a.id}>{a.role}</option>)}
            </select>
            <button onClick={call}>Call to Manager</button>
            <div className="row">
              <button className="secondary" onClick={() => state('working')}>Work</button>
              <button className="secondary" onClick={() => state('break')}>Break</button>
              <button className="secondary" onClick={() => state('lunch')}>Lunch</button>
            </div>
            <div className="task-compose">
              <input placeholder={selectedPlaceholder} value={taskTitle} onChange={e => setTaskTitle(e.target.value.slice(0, 240))} onKeyDown={e => { if (e.key === 'Enter') assign(); }} />
              <span>{taskTitle.length}/240</span>
            </div>
            <button className="assign-btn" disabled={!taskTitle.trim()} onClick={assign}>{selectedButton}</button>
          </div>

          {selected === 'implement' && (
            <div className="panel kai-panel">
              <div className="kai-title"><h2>Kai Video Studio</h2><span>FREE-ONLY</span></div>
              <p className="kai-note">Click a quick template to send a new video task directly to Kai. IT Comedy creates a fresh IT scenario on every click and keeps the 4-hour refresh cycle enabled.</p>
              <div className="skill-tags"><span>HeyGen Free</span><span>Google Drive</span><span>No Paid Fallback</span><span>Refresh Every 4h</span></div>
              <label>Quick video templates</label>
              <div className="template-grid">{kaiVideoTemplates.map(t => <button key={t.name} className="template-btn" onClick={() => launchKaiQuickTemplate(t.name, t.prompt)}>{t.name}</button>)}</div>
            </div>
          )}

          {selected === 'developer' && (
            <div className="panel developer-panel">
              <div className="kai-title"><h2>Leo Developer Studio</h2><span>PORTFOLIO</span></div>
              <p className="kai-note">Alex delegates portfolio development to Leo. Leo focuses on React, TypeScript, responsive UI, GitHub integration, testing handoff to Lina, and deployment preparation.</p>
              <div className="skill-tags"><span>React</span><span>TypeScript</span><span>UI / UX</span><span>GitHub</span><span>GitHub Pages</span><span>Portfolio</span></div>
              <label>Quick development tasks</label>
              <div className="template-grid">{leoPortfolioTemplates.map(t => <button key={t.name} className="template-btn" onClick={() => launchLeoTemplate(t.name, t.prompt)}>{t.name}</button>)}</div>
            </div>
          )}

          <div className="panel">
            <div className="panel-title"><h2>Agent Status</h2><span>{activeTasks.length} active</span></div>
            {workerAgents.map(a => (
              <div className="agent-row" key={a.id}>
                <div className="agent-info">
                  <b>{a.name}</b><span>{a.role}</span>
                  {a.id === 'implement' && <span className="kai-skill-line">Free Video • HeyGen Free • Drive</span>}
                  {a.id === 'developer' && <span className="developer-skill-line" style={{color: '#ffc878', fontSize: '8px', fontWeight: 700}}>React • TypeScript • Portfolio • GitHub</span>}
                  <MiniProgress completed={completedByAgent[a.id] ?? 0} />
                </div>
                <em className={`badge ${a.state}`}>{friendlyState(a.state)}</em>
              </div>
            ))}
          </div>

          <div className="panel tasks-panel">
            <div className="panel-title"><h2>Active Tasks</h2>{doneTasks.length > 0 && <button className="text-btn" onClick={clearDone}>Clear done</button>}</div>
            {activeTasks.length === 0 ? <p className="muted">No active tasks</p> : activeTasks.map(t => (
              <ActiveTaskCard key={t.id} task={t} agentName={agents.find(a => a.id === t.agentId)?.name ?? 'Agent'} now={now} onComplete={() => completeTask(t)} />
            ))}
          </div>

          <div className="panel results-panel">
            <div className="panel-title"><h2>Completed Results</h2><span>{doneTasks.length} complete</span></div>
            {doneTasks.length === 0 ? <p className="muted">No completed results yet</p> : [...doneTasks]
              .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
              .slice(0, 6).map(t => <CompletedTaskCard key={t.id} task={t} agentName={agents.find(a => a.id === t.agentId)?.name ?? 'Agent'} />)}
          </div>
        </aside>
      </main>
    </div>
  );
}

function ActiveTaskCard({task, agentName, now, onComplete}: {task: Task; agentName: string; now: number; onComplete: () => void;}) {
  const remaining = getRemainingSeconds(task, now);
  const progress = getProgressPercent(task, now);
  const isKai = task.agentId === 'implement';
  const isLeo = task.agentId === 'developer';
  return (
    <div className="task-card">
      <div className="task-top"><span className={`task-phase ${task.phase ?? 'queued'}`}>{friendlyPhase(task.phase)}</span><span className="task-agent">{agentName}</span></div>
      <div className="task-meta">{task.provider && <span className="task-provider">{task.provider}</span>}{task.freeOnly && <span className="free-badge">FREE ONLY</span>}{isKai && <span className="task-provider">AUTO 4H</span>}{isLeo && <span className="task-provider">DEV</span>}</div>
      <b>{task.title}</b>
      <div className="task-timer">
        <div className="timer-bar"><i style={{width: `${progress}%`}} /></div>
        <div className="timer-line"><span>{task.phase === 'working' ? (isLeo ? 'Coding…' : 'Generating…') : task.phase === 'preparing' ? 'Preparing…' : 'Loading…'}</span><b>{task.phase === 'working' ? `${formatDuration(remaining)} left` : 'In progress'}</b></div>
      </div>
      <div className="task-bottom"><span>{timeAgo(task.createdAt)}</span>{!isKai && <button onClick={onComplete}>✓ Complete</button>}</div>
    </div>
  );
}

function CompletedTaskCard({task, agentName}: {task: Task; agentName: string}) {
  return (
    <div className="result-card">
      <div className="result-top"><span className="result-status">COMPLETE</span><span className="task-agent">{agentName}</span></div>
      <div className="task-meta">{task.provider && <span className="task-provider">{task.provider}</span>}{task.freeOnly && <span className="free-badge">FREE ONLY</span>}</div>
      <b>{task.title}</b><p className="result-msg">{task.resultMessage ?? 'Complete — task finished.'}</p>
      <div className="task-bottom"><span>{task.completedAt ? `Completed ${timeAgo(task.completedAt)}` : 'Completed'}</span></div>
      {task.nextRunAt && <p className="result-msg">Next Kai refresh: {formatCountdown(task.nextRunAt)}</p>}
      {task.driveUrl && <a className="result-link" href={task.driveUrl} target="_blank" rel="noreferrer">Open Video in Google Drive</a>}
    </div>
  );
}

function friendlyState(state: string) { if (state === 'assigned-task') return 'assigned'; if (state === 'working-task') return 'working'; return state; }
function friendlyPhase(phase?: string) { if (phase === 'free-check') return 'Free Check'; if (phase === 'received') return 'Received'; if (phase === 'preparing') return 'Preparing'; if (phase === 'working') return 'Working'; if (phase === 'completed') return 'Completed'; return 'Queued'; }
function timeAgo(value: string) { const s = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (s < 60) return `${s}s ago`; const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`; return `${Math.floor(m / 60)}h ago`; }
function getRemainingSeconds(task: Task, now: number) { if (!task.startedAt || !task.durationSec) return task.durationSec ?? 0; const elapsed = Math.floor((now - new Date(task.startedAt).getTime()) / 1000); return Math.max(0, task.durationSec - elapsed); }
function getProgressPercent(task: Task, now: number) { if (!task.durationSec) return task.phase === 'working' ? 65 : task.phase === 'preparing' ? 35 : 12; if (!task.startedAt) return task.phase === 'preparing' ? 28 : task.phase === 'free-check' ? 8 : task.phase === 'received' ? 16 : 4; const elapsed = Math.max(0, Math.floor((now - new Date(task.startedAt).getTime()) / 1000)); return Math.max(4, Math.min(100, Math.round((elapsed / task.durationSec) * 100))); }
function formatCountdown(value: string) { const diff = Math.max(0, new Date(value).getTime() - Date.now()); const totalMinutes = Math.floor(diff / 60000); const hours = Math.floor(totalMinutes / 60); const minutes = totalMinutes % 60; return `${hours}h ${minutes}m`; }
function formatDuration(value: number) { const m = Math.floor(value / 60).toString(); const s = (value % 60).toString().padStart(2, '0'); return `${m}:${s}`; }
function Room({x, y, w, h, title, cls}: {x: number; y: number; w: number; h: number; title: string; cls: string}) { return <div className={`room ${cls}`} style={{left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`}}><span>{title}</span></div>; }
function Desk({x, y}: {x: number; y: number}) { return <div className="desk" style={{left: `${x}%`, top: `${y}%`}}><div className="monitor">▣</div><div className="chair">◉</div></div>; }
function TaskLights({completed}: {completed: number}) { const pct = Math.round((completed / TASK_TARGET) * 100); return <div className="task-progress"><div className="task-lights" aria-label={`${completed} of ${TASK_TARGET} tasks completed`}>{Array.from({length: TASK_TARGET}, (_, i) => <i key={i} className={i < completed ? 'on' : 'off'} />)}</div><span>{completed}/{TASK_TARGET} task <b>{pct}%</b></span></div>; }
function MiniProgress({completed}: {completed: number}) { return <div className="mini-progress"><div>{Array.from({length: TASK_TARGET}, (_, i) => <i key={i} className={i < completed ? 'on' : 'off'} />)}</div><span>{completed}/{TASK_TARGET} task</span></div>; }
function AgentSprite({agent, completed}: {agent: Agent; completed: number}) {
  const p = agent.destination ?? agent.position;
  const initial = agent.name[0];
  const bubble = agent.state === 'assigned-task' ? 'Task received…' : agent.state === 'preparing' ? 'Preparing…' : agent.state === 'working-task' ? (agent.id === 'developer' ? 'Coding…' : 'Working on task…') : agent.currentTask ?? agent.state;
  const developerStyle = agent.id === 'developer' ? {background: '#ffb86b'} : undefined;
  return <div className={`agent state-${agent.state}`} title={`${agent.role} • ${agent.state}`} style={{left: `${p.x}%`, top: `${p.y}%`}}><div className="bubble">{bubble}</div><div className={`avatar ${agent.id}`} style={developerStyle}>{initial}</div><small>{agent.name}</small>{agent.id !== 'manager' && <TaskLights completed={completed} />}</div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

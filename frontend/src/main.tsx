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
  videoUrl?: string;
  generationTimeSec?: number;
  resultMessage?: string;
  recurringEveryHours?: number;
  nextRunAt?: string;
  sourceTaskId?: string;
  blocker?: string;
  providerJobId?: string;
};

const API_BASE = (import.meta.env.VITE_API_URL || 'https://ai-agents-office-api.onrender.com').replace(/\/$/, '');
const API = API_BASE + '/api';
const TYPING_TOOL_URL = 'https://typing-tool-pu0o.onrender.com';
const PATCH_PORTAL_URL = `${import.meta.env.BASE_URL || '/'}patch-analysis/?v=20261007-4`;
const AUTH_TOKEN_KEY = 'ai-office-auth-token-v1';
function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (token) headers.set('Authorization', 'Bearer ' + token);
  return fetch(input, {...init, headers});
}
const TASK_TARGET = 12;
const STORAGE_KEY = 'ai-agents-office-tasks-v3';
const GOOGLE_DRIVE_PLACEHOLDER = 'https://drive.google.com/drive/folders/1SDKs0stvoeIkYIhEcP5znRq7-tSyaEpl';
const KAI_REFRESH_HOURS = 4;
const KAI_REFRESH_MS = KAI_REFRESH_HOURS * 60 * 60 * 1000;
const IT_COMEDY_LAST_KEY = 'kai-last-it-comedy';
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 18;
const KAI_FREE_VIDEO_AVAILABLE = true;
const KAI_PROVIDER_PENDING = 'No active provider job. Start or retry Kai to use Hugging Face ZeroGPU LTX Video Fast.';

const fallbackAgents: Agent[] = [
  {id: 'manager', name: 'Alex', role: 'Manager', state: 'working', position: {x: 13, y: 18}, home: {x: 13, y: 18}},
  {id: 'sysadmin', name: 'Sam', role: 'Senior System Administrator', state: 'working', position: {x: 20, y: 43}, home: {x: 20, y: 43}},
  {id: 'security', name: 'Mina', role: 'Senior Security', state: 'working', position: {x: 42, y: 43}, home: {x: 42, y: 43}},
  {id: 'cloud', name: 'Noah', role: 'Senior Cloud Operator', state: 'working', position: {x: 65, y: 43}, home: {x: 65, y: 43}},
  {id: 'qa', name: 'Lina', role: 'Senior Q/A', state: 'working', position: {x: 28, y: 59}, home: {x: 28, y: 59}},
  {id: 'implement', name: 'Kai', role: 'Senior Implement', state: 'working', position: {x: 51, y: 59}, home: {x: 51, y: 59}},
  {id: 'developer', name: 'Leo', role: 'Senior Developer', state: 'working', position: {x: 75, y: 59}, home: {x: 75, y: 59}}
];

const agentSkills: Record<string, string[]> = {
  manager: ['Management', 'Researcher', 'Task Assignment', 'Prioritization', 'Blocker Resolution'],
  sysadmin: ['Windows', 'Active Directory', 'Microsoft 365', 'Troubleshooting', 'PowerShell'],
  security: ['Security', 'IAM', 'Access Review', 'Graylog', 'Compliance'],
  cloud: ['Cloud', 'Azure', 'Infrastructure', 'Networking', 'Deployment'],
  qa: ['Q/A', 'Testing', 'Validation', 'UAT', 'Quality Review', 'Typing Tool QA', 'API Testing', 'Regression Testing', 'Responsive Testing'],
  implement: ['Implementation', 'Video', 'Comedy Cartoon', 'Hugging Face ZeroGPU LTX Video Fast', 'PixVerse Free', 'Runway Free/Trial', 'Google Drive', 'Automation'],
  developer: ['React', 'TypeScript', 'Python', 'Java', 'GitHub', 'Portfolio']
};

const kaiVideoTemplates = [
  {name: 'Funny Cartoon', prompt: 'Create a short funny cartoon video optimized for free ZeroGPU generation. A cute office worker spills coffee on the desk, looks shocked, then pretends nothing happened while coworkers stare. Bright colorful 2D cartoon style, exaggerated facial expressions, playful movement, humorous tone, smooth animation, vertical 9:16.'},
  {name: 'IT Comedy', prompt: 'Create a fresh short funny IT cartoon video optimized for free ZeroGPU generation with a new office technology mishap. Bright colorful 2D cartoon style, exaggerated reactions, playful comedy, smooth animation, vertical 9:16.'},
  {name: 'Security Joke', prompt: 'Create a short funny cartoon video of a cybersecurity analyst celebrating that the system is secure, then 99 warning alerts suddenly appear on the monitor. Funny timing, exaggerated facial expression, colorful cartoon office, vertical 9:16.'},
  {name: 'Short Promo', prompt: 'Create a short vertical animated promo video with energetic motion, clean modern graphics, short punchy scenes, upbeat mood, and a strong final hero shot. Format 9:16 for Shorts and Reels.'}
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
  return `Create a short funny cartoon video optimized for free ZeroGPU generation. ${itComedyIdeas[index]} Bright colorful 2D cartoon style, exaggerated facial expressions, playful movement, humorous timing, smooth animation, vertical 9:16.`;
}

function normalizeKaiTask(t: Task): Task {
  if (t.agentId !== 'implement') return t;
  const phase=String(t.phase || '');
  const hasRealProviderState = Boolean(t.providerJobId) || ['starting','generating','completed','provider-error'].includes(phase) || t.provider === 'Hugging Face ZeroGPU LTX Video Fast';
  if (hasRealProviderState) return {...t, freeOnly: true};
  return {...t, provider:'Hugging Face ZeroGPU LTX Video Fast', freeOnly:true, phase:'provider-error', blocker:t.blocker || 'Legacy Free Video Router task detected. It is not actively generating. Retry Kai to start LTX.', resultMessage:t.resultMessage || 'Waiting stopped — no provider job was started for this old task.'};
}

function loadLocalTasks(): Task[] {
  try {
    const parsed: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return parsed.map(normalizeKaiTask);
  } catch { return []; }
}

function bestAgentForTask(title: string) {
  const q = title.toLowerCase();
  if (/portfolio|react|typescript|python|java|code|developer|github|website|web/.test(q)) return 'developer';
  if (/video|cartoon|comedy|pixverse|leonardo|runway|reel|short|promo/.test(q)) return 'implement';
  if (/security|iam|access|graylog|audit|compliance|vulnerability/.test(q)) return 'security';
  if (/cloud|azure|network|infrastructure|deploy|server/.test(q)) return 'cloud';
  if (/test|uat|qa|quality|validate|verification/.test(q)) return 'qa';
  return 'sysadmin';
}

function App() {
  const [agents, setAgents] = useState<Agent[]>(fallbackAgents);
  const [tasks, setTasks] = useState<Task[]>(loadLocalTasks);
  const [selected, setSelected] = useState('sysadmin');
  const [taskTitle, setTaskTitle] = useState('');
  const [notice, setNotice] = useState('');
  const [clearingCompleted, setClearingCompleted] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showTypingTool, setShowTypingTool] = useState(false);

  const refresh = async () => {
    try {
      const [a, t] = await Promise.all([authFetch(`${API}/agents`), authFetch(`${API}/tasks`)]);
      if (a.ok) {
        const data = await a.json();
        if (Array.isArray(data) && data.length) {
          const hasLeo = data.some((x: Agent) => x.id === 'developer');
          setAgents(hasLeo ? data : [...data, fallbackAgents.find(x => x.id === 'developer')!]);
        }
      }
      if (t.ok) {
        const data = await t.json();
        if (Array.isArray(data)) setTasks(data.map((t: Task) => normalizeKaiTask(t)));
      }
    } catch {}
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setTasks(prev => prev.map(t => {
      const wasFakeKaiComplete = t.agentId === 'implement' && t.status === 'done' && t.driveUrl === GOOGLE_DRIVE_PLACEHOLDER;
      if (!wasFakeKaiComplete) return t;
      return {
        ...t,
        status: 'active',
        phase: 'free-check',
        completedAt: undefined,
        driveUrl: undefined,
        resultMessage: undefined,
        nextRunAt: undefined,
        startedAt: undefined,
        blocker: undefined
      };
    }));
    if (!KAI_FREE_VIDEO_AVAILABLE) {
      const kai = fallbackAgents.find(a => a.id === 'implement');
      if (kai) setAgents(prev => prev.map(a => a.id === 'implement' ? {...a, state: 'blocked', destination: {x: 85, y: 18}} : a));
    }
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

  useEffect(() => {
    const date = new Date(now);
    const hour = date.getHours();
    const minute = date.getMinutes();
    const inWorkHours = hour >= WORK_START_HOUR && hour < WORK_END_HOUR;
    const isLunch = hour === 12;
    const isSnack = (hour === 10 && minute < 15) || (hour === 15 && minute < 15);
    setAgents(prev => prev.map(a => {
      if (a.id === 'manager' || a.currentTask || (a.id === 'implement' && !KAI_FREE_VIDEO_AVAILABLE)) return a;
      if (!inWorkHours) {
        if (a.state !== 'off-duty') return {...a, state: 'off-duty', destination: {x: 13, y: 79}};
        return a;
      }
      if (isLunch) {
        if (a.state !== 'lunch') return {...a, state: 'lunch', destination: {x: 75, y: 80}};
        return a;
      }
      if (isSnack) {
        if (a.state !== 'snack') return {...a, state: 'snack', destination: {x: 33, y: 81}};
        return a;
      }
      if (['break','coffee','snack','lunch','off-duty'].includes(a.state)) return {...a, state: 'working', destination: a.home};
      return a;
    }));
  }, [Math.floor(now / 60000)]);

  const call = async () => {
    try {
      const r = await authFetch(`${API}/manager/call/${selected}`, {method: 'POST'});
      if (!r.ok) throw 0;
      await refresh();
    } catch { updateLocal(selected, {state: 'called', destination: {x: 13, y: 15}}); }
  };

  const state = async (s: string) => {
    try {
      const r = await authFetch(`${API}/agents/${selected}/state`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({state: s})
      });
      if (!r.ok) throw 0;
      await refresh();
    } catch {
      const a = agents.find(x => x.id === selected);
      const destination = s === 'break' ? {x: 13, y: 79} : s === 'snack' ? {x: 33, y: 81} : s === 'lunch' ? {x: 75, y: 80} : a?.home;
      updateLocal(selected, {state: s, currentTask: undefined, destination});
    }
  };

  const startLocalTaskMotion = (agentId: string, title: string, taskId: string) => {
    const a = agents.find(x => x.id === agentId);
    if (!a) return;
    if (agentId === 'implement' && !KAI_FREE_VIDEO_AVAILABLE) {
      updateLocal(agentId, {state: 'blocked', currentTask: title, destination: {x: 85, y: 18}});
      patchTask(taskId, {phase: 'queued', blocker: undefined, startedAt: undefined});
      return;
    }
    updateLocal(agentId, {state: 'assigned-task', currentTask: title, destination: {x: 35, y: 18}});
    patchTask(taskId, {phase: agentId === 'implement' ? 'free-check' : 'received'});
    window.setTimeout(() => {
      updateLocal(agentId, {state: 'preparing', currentTask: title, destination: {x: 35, y: 24}});
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
    const kaiBlocked = isKai && !KAI_FREE_VIDEO_AVAILABLE;
    const id = crypto.randomUUID();
    const task: Task = {
      id, agentId, title, status: 'active', phase: isKai ? 'provider-error' : (kaiBlocked ? 'free-check' : 'queued'), createdAt: new Date().toISOString(),
      provider: isKai ? 'Hugging Face ZeroGPU LTX Video Fast' : isLeo ? 'Developer Workspace' : 'Internal Demo',
      freeOnly: isKai,
      durationSec: isKai ? undefined : isLeo ? 45 : 12,
      recurringEveryHours: isKai ? KAI_REFRESH_HOURS : undefined,
      blocker: isKai ? 'Video backend request did not start. Retry Kai to start LTX.' : undefined,
      resultMessage: isKai ? 'No active provider job. Retry generation.' : undefined
    };
    setTasks(prev => [task, ...prev]);
    if (kaiBlocked) {
      updateLocal('implement', {state: 'blocked', currentTask: title, destination: {x: 85, y: 18}});
      setNotice('Kai is ready. Real free video provider integration is still pending.');
    } else {
      startLocalTaskMotion(agentId, title, id);
    }
    return task;
  };

  const startKaiProviderTask = async (title: string) => {
    try {
      const create = await authFetch(`${API}/tasks`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId:'implement',title})});
      if(!create.ok) throw new Error('task create failed');
      const task = await create.json();
      setTasks(prev => [normalizeKaiTask({...task, provider:'Hugging Face ZeroGPU LTX Video Fast', phase:'starting', resultMessage:'Connecting to Hugging Face ZeroGPU...'}), ...prev.filter(t => t.id !== task.id)]);
      const start = await authFetch(`${API}/video/generate`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({taskId:task.id,prompt:title})});
      const data = await start.json().catch(() => ({}));
      if(!start.ok){await refresh();setNotice(data.error || 'Kai free provider unavailable. No paid fallback used.');return;}
      await refresh();
      setNotice(`Kai started a real video with ${data.provider}. Waiting for MP4...`);
      const generationId=String(data.generationId||'');
      if(!generationId) return;
      let checks=0;
      const timer=window.setInterval(async()=>{
        checks+=1;
        try{
          const status=await authFetch(`${API}/video/status/${encodeURIComponent(generationId)}?taskId=${encodeURIComponent(task.id)}`);
          if(status.ok){
            const result=await status.json();
            if(result.status==='done' && result.videoUrl){window.clearInterval(timer);patchTask(task.id,{videoUrl:result.videoUrl,driveUrl:result.driveUrl});await refresh();setNotice(result.driveUrl ? 'Kai completed the task — final MP4 uploaded to Google Drive.' : 'Kai completed the task — final MP4 is ready. Google Drive upload is not configured yet.');return;}
            if(result.status==='failed'){window.clearInterval(timer);patchTask(task.id,{phase:'provider-error',blocker:`Kai video provider error: ${result.error || 'generation failed'}`,resultMessage:`Kai video provider error: ${result.error || 'generation failed'}`});await refresh();setNotice('Kai video generation failed. Error is displayed on the dashboard.');return;}
            const elapsedSec=Number(result.elapsedSec||0);
            const elapsedText=elapsedSec>=3600 ? `${Math.floor(elapsedSec/3600)}h ${Math.floor((elapsedSec%3600)/60)}m` : elapsedSec>=60 ? `${Math.floor(elapsedSec/60)}m ${elapsedSec%60}s` : `${elapsedSec}s`;
            patchTask(task.id, {provider:'Hugging Face ZeroGPU LTX Video Fast', providerJobId:generationId, phase:'generating', startedAt:task.startedAt || new Date().toISOString(), resultMessage:`Hugging Face ZeroGPU is generating the real MP4 — actual elapsed ${elapsedText}. Kai will complete only when the provider returns the MP4.`});
          }
        }catch{}
        if(checks>=720){window.clearInterval(timer);setNotice('Kai has been generating for over 2 hours. The backend continues processing; refresh to check the latest status.');}
      },10000);
    } catch {
      addLocalTask('implement',title);
      setNotice('Video backend unavailable — task kept in FREE ONLY queue.');
    }
  };

  const launchKaiQuickTemplate = async (name: string, fallbackPrompt: string) => {
    const title = name === 'IT Comedy' ? makeItComedyPrompt() : fallbackPrompt;
    setSelected('implement');
    setTaskTitle('');
    await startKaiProviderTask(title);
  };

  const launchLeoTemplate = (name: string, prompt: string) => {
    setSelected('developer');
    addLocalTask('developer', prompt);
    setTaskTitle('');
    setNotice(`Alex assigned ${name} to Leo`);
  };

  const assign = async (forcedAgentId?: string) => {
    if (!taskTitle.trim()) return;
    const title = taskTitle.trim();
    const targetAgent = forcedAgentId ?? selected;

    if (targetAgent === 'implement') {
      setTaskTitle('');
      setSelected(targetAgent);
      await startKaiProviderTask(title);
      return;
    }

    try {
      const r = await authFetch(`${API}/tasks`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({agentId: targetAgent, title})});
      if (!r.ok) throw 0;
      setTaskTitle('');
      await refresh();
    } catch {
      addLocalTask(targetAgent, title);
      setTaskTitle('');
    }
    const name = agents.find(a => a.id === targetAgent)?.name ?? 'Agent';
    setSelected(targetAgent);
    setNotice(`Alex assigned the task to ${name} based on skill match`);
  };

  const alexAutoAssign = () => {
    if (!taskTitle.trim()) return;
    const target = bestAgentForTask(taskTitle.trim());
    assign(target);
  };

  const completeTask = (task: Task, auto = false) => {
    const isKai = task.agentId === 'implement';
    const isLeo = task.agentId === 'developer';

    if (isKai && !task.driveUrl) {
      patchTask(task.id, {status:'active',phase:task.providerJobId ? 'generating' : 'provider-error',blocker:task.providerJobId ? undefined : 'No active provider job. Retry Kai to start LTX.',completedAt:undefined,resultMessage:task.providerJobId ? 'Hugging Face ZeroGPU LTX Video Fast is generating the real MP4...' : KAI_PROVIDER_PENDING,nextRunAt:undefined});
      updateLocal('implement', {state: 'working', currentTask: task.title});
      setNotice(task.providerJobId ? 'Kai is still generating the real MP4.' : 'Kai is not generating. Retry the task to start LTX.');
      return;
    }

    patchTask(task.id, {
      status: 'done', phase: 'completed', completedAt: new Date().toISOString(), blocker: undefined,
      nextRunAt: isKai ? new Date(Date.now() + KAI_REFRESH_MS).toISOString() : undefined,
      resultMessage: isKai
        ? 'Complete — real video file is ready in Google Drive. The next 4-hour cycle can run when free quota is available.'
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
    setNotice(isKai ? 'Complete — real video ready in Google Drive' : isLeo ? 'Leo completed the development task' : auto ? 'Complete — task finished' : 'Task completed — progress updated');
  };

  const toggleBlocker = (task: Task) => {
    const name = agents.find(a => a.id === task.agentId)?.name ?? 'Agent';
    if (task.agentId === 'implement' && !KAI_FREE_VIDEO_AVAILABLE) {
      patchTask(task.id, {blocker: undefined, phase: 'queued'});
      updateLocal(task.agentId, {state: 'working'});
      setNotice('Kai is ready; provider integration is pending, not quota-blocked.');
      return;
    }
    const blocker = task.blocker ? undefined : `${name} needs Alex support / decision to continue this task.`;
    patchTask(task.id, {blocker});
    updateLocal(task.agentId, {state: blocker ? 'blocked' : 'working-task'});
    setNotice(blocker ? `${name} raised a blocker to Alex` : `${name} blocker cleared`);
  };

  useEffect(() => {
    const dueTask = tasks.find(t => t.status !== 'done' && t.phase === 'working' && !t.blocker && getRemainingSeconds(t, now) <= 0);
    if (dueTask) completeTask(dueTask, true);
  }, [tasks, now]);

  useEffect(() => {
    if (!KAI_FREE_VIDEO_AVAILABLE) return;
    const dueRecurring = tasks.find(t => t.agentId === 'implement' && t.status === 'done' && t.nextRunAt &&
      new Date(t.nextRunAt).getTime() <= now &&
      !tasks.some(a => a.status !== 'done' && a.agentId === 'implement' && (a.sourceTaskId === t.id || a.title === t.title)));
    if (!dueRecurring) return;
    const id = crypto.randomUUID();
    const nextTask: Task = {
      id, agentId: 'implement', title: dueRecurring.title, status: 'active', phase: 'queued', createdAt: new Date().toISOString(),
      provider: dueRecurring.provider ?? 'Free Video Router', freeOnly: true, durationSec: dueRecurring.durationSec ?? 24,
      recurringEveryHours: KAI_REFRESH_HOURS, sourceTaskId: dueRecurring.id
    };
    setTasks(prev => prev.map(t => t.id === dueRecurring.id ? {...t, nextRunAt: undefined} : t));
    setTasks(prev => [nextTask, ...prev]);
    startLocalTaskMotion('implement', nextTask.title, id);
    setNotice('Alex refreshed Kai’s video task — new 4-hour cycle started');
  }, [tasks, now]);

  const clearDone = async () => {
    const completed = tasks.filter(t => t.status === 'done');
    if (!completed.length || clearingCompleted) return;
    if (!window.confirm(`Permanently remove ${completed.length} completed results? Active tasks will be preserved.`)) return;
    setClearingCompleted(true);
    try {
      // One atomic server-side operation prevents partial deletions and refresh races.
      const response = await authFetch(`${API}/tasks/completed?expectedCount=${completed.length}`, {method:'DELETE'});
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.error || `HTTP ${response.status}`);
      }
      const result = await response.json();
      setTasks(prev => prev.filter(t => t.status !== 'done'));
      setNotice(`Removed ${result.removedCount} completed records; active tasks preserved.`);
    } catch (error) {
      setNotice(`Could not clear completed results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setClearingCompleted(false);
    }
  };
  const workerAgents = useMemo(() => agents.filter(a => a.id !== 'manager'), [agents]);
  const completedByAgent = useMemo(() => Object.fromEntries(agents.map(a => [a.id, Math.min(TASK_TARGET, tasks.filter(t => t.agentId === a.id && t.status.toLowerCase() === 'done').length)])), [agents, tasks]);
  const activeTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const blockers = activeTasks.filter(t => t.blocker).filter((t,i,arr) => arr.findIndex(x => x.agentId === t.agentId) === i);
  const kaiLatestTask = tasks.find(t => t.agentId === 'implement');
  const kaiProblem = kaiLatestTask && (kaiLatestTask.phase === 'provider-error' || kaiLatestTask.blocker)
    ? (kaiLatestTask.blocker || kaiLatestTask.resultMessage || 'Kai video provider error')
    : '';
  const kaiStatusText = kaiLatestTask
    ? (kaiLatestTask.resultMessage || `Kai status: ${kaiLatestTask.phase || kaiLatestTask.status}`)
    : 'Kai has no video task yet.';

  const selectedPlaceholder = selected === 'implement' ? 'Give Kai a comedy cartoon video task...' : selected === 'developer' ? 'Ask Leo to build or improve your portfolio...' : 'Assign a task...';
  const selectedButton = selected === 'implement' ? 'Send Task to Kai' : selected === 'developer' ? 'Send Task to Leo' : 'Assign Task';

  return (
    <div className="app">
      <header>
        <div><h1>AI AGENTS OFFICE</h1><p>Live multi-agent operations floor</p></div>
        <div className="header-actions"><div className="status"><span className="dot" /> SYSTEM ONLINE</div>{kaiProblem && <div className="toast" style={{background:'#4b1020',border:'1px solid #ff4772',color:'#ffd8e1',maxWidth:'560px'}}>⚠ Kai: {kaiProblem}</div>}{notice && <div className="toast">{notice}</div>}</div>
      </header>

      <main>
        <section className="office-card">
          <div className="office office-v2 office-v3">
            <div className="office-v3-head"><div><span className="office-eyebrow">◈ AI AGENTS OFFICE</span><h2>Virtual Office Workflow</h2><p>From task assignment to delivery · Select an agent to manage their work</p></div><div className="office-v3-online"><i/> {workerAgents.length} specialist agents · {activeTasks.length} unfinished</div></div>
            <div className="office-workflow">{[
              ['01','Assignment','manager'],['02','Development','developer'],['03','Verify & Fix','implement'],['04','Testing','qa'],['05','Support','manager'],['06','Deployment','cloud'],['07','Security','security'],['08','Live System','sysadmin']
            ].map(([number,title,id],i)=><button type="button" key={number} className={`office-flow-step flow-step-${i}`} onClick={()=>setSelected(id)} title={`Focus ${title}`}><span>{number}</span><b>{title}</b></button>)}</div>
            <div className="office-top">
              <div className="office-v2-panel office-manager office-v3-manager">
                <h3>♛ MANAGER OFFICE</h3>
                <p>Assign tasks, review progress, and resolve blockers.</p>
                <div className="manager-avatar office-v3-avatar">👨‍💼</div><div className="manager-beam" aria-hidden="true" />
                <b>Alex · Manager</b>
                <span className="office-live">● Available to coordinate</span>
              </div>
              <div className="office-v2-panel office-board">
                <div className="office-section-title"><h3>▤ TASK BOARD</h3><span>{activeTasks.length} unfinished</span></div>
                <p>Assignments across your AI agent team</p>
                <div className="office-kanban office-v3-kanban">
                  <div><b>TO DO</b><strong>{activeTasks.filter(t=>t.phase==='queued'||(!t.phase&&t.status==='active')).length}</strong></div>
                  <div><b>IN PROGRESS</b><strong>{activeTasks.filter(t=>t.phase==='working'||t.phase==='generating').length}</strong></div>
                  <div><b>BLOCKED</b><strong>{blockers.length}</strong></div>
                  <div><b>COMPLETED</b><strong>{doneTasks.length}</strong></div>
                </div>
                <div className="office-task-preview office-v3-preview">{activeTasks.slice(0,3).map(t=><div key={t.id}><span>{agents.find(a=>a.id===t.agentId)?.name||'Agent'}</span>{t.title}</div>)}{!activeTasks.length&&<p>No pending assignments</p>}</div>
              </div>
            </div>
            <div className="office-v2-panel office-operations">
              <div className="office-section-title"><h3>♧ OPERATIONS FLOOR</h3><span>{workerAgents.length} specialist agents</span></div>
              <p>Agent workstations, current activity, and progress · Click any agent to assign a task</p>
              <div className="office-agent-grid office-v3-team">
                {workerAgents.map(a=><button type="button" className={`office-agent-tile office-v3-agent office-v3-${a.id} ${selected===a.id?"is-selected":""}`} key={a.id} onClick={()=>setSelected(a.id)} title={`Select ${a.name} to assign a task`}>
                  <div className="office-agent-portrait">{({sysadmin:'🧑‍💻',security:'👩‍💻',cloud:'👨‍🔧',qa:'👩‍🔬',implement:'🧑‍🔧',developer:'👨‍💻'} as Record<string,string>)[a.id]||'🤖'}</div>
                  <div className="office-agent-detail"><b>{a.name}</b><small>{a.role}</small><span className="office-live">● {friendlyState(a.state)}</span></div>
                  <MiniProgress completed={completedByAgent[a.id]??0}/>
                  {a.currentTask&&<div className="office-current-task" title={a.currentTask}>{a.currentTask}</div>}
                </button>)}
              </div>
            </div>
            <div className="office-bottom">
              <div className="office-v2-panel office-lounge"><h3>☕ LOUNGE / BREAK · SNACKS</h3><p>Recharge, relax and share ideas.</p><div className="office-lounge-art">🛋️ <span>☕ 🍪 🍎 🥤</span></div></div>
              <div className="office-v2-panel office-cafeteria"><h3>♨ CAFETERIA / LUNCH · FOOD</h3><p>Lunch break and refreshments.</p><div className="office-lounge-art">🍽️ <span>🍜 🍱 🥗 ☕</span></div></div>
            </div>
          </div>
        </section>

        <aside>
          <div className="panel manager-control">
            <h2>Alex • Manager Control</h2>
            <div className="skill-tags">{agentSkills.manager.map(s => <span key={s}>{s}</span>)}</div>
            <p className="muted">Work schedule: 08:00–18:00 • Snack breaks: 10:00 & 15:00 • Lunch: 12:00–13:00. Idle agents automatically move to the lounge/cafeteria.</p>
            <label>Agent</label>
            <select value={selected} onChange={e => setSelected(e.target.value)}>{workerAgents.map(a => <option key={a.id} value={a.id}>{a.role}</option>)}</select>
            <button onClick={call}>Call to Manager</button>
            <div className="row break-controls"><button className="secondary" onClick={() => state('working')}>Work</button><button className="secondary" onClick={() => state('break')}>Break</button><button className="secondary" onClick={() => state('snack')}>Snack</button><button className="secondary" onClick={() => state('lunch')}>Lunch</button></div>
            <div className="task-compose"><input placeholder={selectedPlaceholder} value={taskTitle} onChange={e => setTaskTitle(e.target.value.slice(0, 240))} onKeyDown={e => { if (e.key === 'Enter') assign(); }} /><span>{taskTitle.length}/240</span></div>
            <button className="assign-btn" disabled={!taskTitle.trim()} onClick={() => assign()}>{selectedButton}</button>
            <button className="secondary" disabled={!taskTitle.trim()} onClick={alexAutoAssign}>Alex Auto-Assign by Skill</button>
            <a href={PATCH_PORTAL_URL} target="_blank" rel="noreferrer" style={{display:'block',marginTop:'10px',padding:'10px 12px',textAlign:'center',border:'1px solid #315878',borderRadius:'8px',background:'#102536',color:'#bfe9ff',textDecoration:'none',fontWeight:700}}>🛡 Open Patch & CVE Analysis Portal ↗</a>
          </div>

          {selected === 'implement' && <div className="panel kai-panel"><div className="kai-title"><h2>Kai Video Studio</h2><span>FREE-ONLY</span></div><div style={{margin:'10px 0',padding:'10px 12px',borderRadius:'8px',border:`1px solid ${kaiProblem ? '#ff4772' : '#2b506b'}`,background:kaiProblem ? '#35121dcc' : '#102536cc',color:kaiProblem ? '#ffd8e1' : '#bfe9ff',fontSize:'12px',lineHeight:1.45}}><b>{kaiProblem ? '⚠ KAI ERROR' : 'KAI LIVE STATUS'}</b><div style={{marginTop:'5px'}}>{kaiProblem || kaiStatusText}</div></div><p className="kai-note">Real provider route: Hugging Face ZeroGPU LTX Video Fast. Longer requests are split into short scenes, merged into one MP4, then uploaded to Google Drive when Drive OAuth is configured. FREE ONLY; no paid fallback. Kai completes only after the final MP4 exists.</p><div className="skill-tags"><span>PixVerse Free</span><span>Hugging Face ZeroGPU</span><span>Runway Free/Trial</span><span>Google Drive</span><span>No Paid Fallback</span></div><label>Quick video templates</label><div className="template-grid">{kaiVideoTemplates.map(t => <button key={t.name} className="template-btn" onClick={() => launchKaiQuickTemplate(t.name, t.prompt)}>{t.name}</button>)}</div></div>}

          {selected === 'developer' && <div className="panel developer-panel"><div className="kai-title"><h2>Leo Developer Studio</h2><span>PORTFOLIO</span></div><p className="kai-note">Alex delegates portfolio development to Leo. Leo focuses on React, TypeScript, responsive UI, GitHub integration, testing handoff to Lina, and deployment preparation.</p><div className="skill-tags"><span>React</span><span>TypeScript</span><span>UI / UX</span><span>GitHub</span><span>GitHub Pages</span><span>Portfolio</span><span>Typing Tool</span></div><button className="assign-btn" style={{marginBottom:'10px'}} onClick={() => setShowTypingTool(true)}>⌨ Open Typing Tool</button><p className="kai-note">Integrated training app: Easy / Medium / Hard, 15 / 30 / 60 seconds, WPM, accuracy, history, leaderboard, levels, and mountain challenges.</p><label>Quick development tasks</label><div className="template-grid">{leoPortfolioTemplates.map(t => <button key={t.name} className="template-btn" onClick={() => launchLeoTemplate(t.name, t.prompt)}>{t.name}</button>)}</div></div>}

          <div className="panel"><div className="panel-title"><h2>Agent Status</h2><span>{activeTasks.length} active</span></div>{workerAgents.map(a => <div className="agent-row" key={a.id}><div className="agent-info"><b>{a.name}</b><span>{a.role}</span><span style={{fontSize:'8px',color:'#6f8ca5'}}>{agentSkills[a.id].join(' • ')}</span><MiniProgress completed={completedByAgent[a.id] ?? 0} /></div><em className={`badge ${a.state}`}>{friendlyState(a.state)}</em></div>)}</div>

          <div className="panel tasks-panel"><div className="panel-title"><h2>Active Tasks</h2><span>{activeTasks.length} running / queued</span></div>{activeTasks.length === 0 ? <p className="muted">No active tasks</p> : activeTasks.map(t => <ActiveTaskCard key={t.id} task={t} agentName={agents.find(a => a.id === t.agentId)?.name ?? 'Agent'} now={now} onComplete={() => completeTask(t)} onBlocker={() => toggleBlocker(t)} />)}</div>

          <div className="panel results-panel"><div className="panel-title"><h2>Completed Results</h2><div className="results-header-actions"><button type="button" className="clear-completed-btn" onClick={clearDone} disabled={clearingCompleted || doneTasks.length === 0}>{clearingCompleted ? "Clearing…" : "🗑 Clear Completed"}</button><span>{doneTasks.length} complete</span></div></div>{doneTasks.length === 0 ? <p className="muted">No completed results yet</p> : [...doneTasks].sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime()).map(t => <CompletedTaskCard key={t.id} task={t} agentName={agents.find(a => a.id === t.agentId)?.name ?? 'Agent'} />)}</div>
        </aside>
      </main>
      {showTypingTool && <div onClick={() => setShowTypingTool(false)} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(2,8,18,.86)',display:'flex',alignItems:'center',justifyContent:'center',padding:'18px'}}><div onClick={e => e.stopPropagation()} style={{width:'min(1500px,96vw)',height:'min(920px,92vh)',background:'#081523',border:'1px solid #294b68',borderRadius:'14px',boxShadow:'0 24px 80px rgba(0,0,0,.55)',overflow:'hidden',display:'flex',flexDirection:'column'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'1px solid #294b68',background:'#0d1d2d'}}><div><b style={{color:'#e9f7ff'}}>⌨ Leo Typing Tool</b><span style={{marginLeft:'10px',fontSize:'11px',color:'#6f8ca5'}}>Integrated training workspace</span></div><div style={{display:'flex',gap:'8px'}}><a href={TYPING_TOOL_URL} target="_blank" rel="noreferrer" style={{padding:'7px 10px',border:'1px solid #315878',borderRadius:'7px',color:'#bfe9ff',textDecoration:'none',fontSize:'11px'}}>Open Full Screen ↗</a><button onClick={() => setShowTypingTool(false)} style={{padding:'7px 11px',background:'#35121d',border:'1px solid #8f3d4b',borderRadius:'7px',color:'#ffd8e1'}}>Close</button></div></div><iframe title="Leo Typing Tool" src={TYPING_TOOL_URL} style={{width:'100%',height:'100%',border:0,background:'#07111c'}} allow="clipboard-read; clipboard-write" /></div></div>}
    </div>
  );
}

function ActiveTaskCard({task, agentName, now, onComplete, onBlocker}: {task: Task; agentName: string; now: number; onComplete: () => void; onBlocker: () => void;}) {
  const remaining = getRemainingSeconds(task, now);
  const progress = getProgressPercent(task, now);
  const isKai = task.agentId === 'implement';
  const isLeo = task.agentId === 'developer';
  return <div className="task-card"><div className="task-top"><span className={`task-phase ${task.phase ?? 'queued'}`}>{task.blocker ? 'Blocked' : friendlyPhase(task.phase)}</span><span className="task-agent">{agentName}</span></div><div className="task-meta">{task.provider && <span className="task-provider">{task.provider}</span>}{task.freeOnly && <span className="free-badge">FREE ONLY</span>}{isKai && <span className="task-provider">REAL FILE REQUIRED</span>}{isLeo && <span className="task-provider">DEV</span>}</div><b>{task.title}</b>{task.blocker && <p className="result-msg" style={{color:'#ff9eaa'}}>⚠ {task.blocker}</p>}<div className="task-timer"><div className="timer-bar"><i style={{width: `${task.blocker ? 8 : progress}%`}} /></div><div className="timer-line"><span>{task.blocker ? 'Blocked — waiting for Alex…' : isKai ? (task.phase === 'starting' ? 'Connecting to ZeroGPU…' : task.phase === 'generating' ? 'ZeroGPU is generating the real MP4…' : task.phase === 'provider-error' ? 'Provider error — see exact reason above.' : 'Ready to start LTX video generation.') : task.phase === 'working' ? (isLeo ? 'Coding…' : 'Generating…') : task.phase === 'preparing' ? 'Preparing…' : 'Loading…'}</span><b>{task.blocker ? 'BLOCKED' : isKai ? (task.phase === 'generating' ? 'GENERATING' : task.phase === 'starting' ? 'CONNECTING' : task.phase === 'provider-error' ? 'ERROR' : 'READY') : task.phase === 'working' ? `${formatDuration(remaining)} left` : 'In progress'}</b></div></div><div className="task-bottom"><span>{timeAgo(task.createdAt)}</span><div style={{display:'flex',gap:'5px'}}><button onClick={onBlocker} style={{background:task.blocker?'#3c5b32':'#5a2832',borderColor:task.blocker?'#60834e':'#8f3d4b'}}>{task.blocker ? '✓ Clear Blocker' : isKai ? (task.phase === 'generating' ? 'Generating…' : task.phase === 'starting' ? 'Connecting…' : task.phase === 'provider-error' ? 'Retry Provider' : 'Retry Required') : '⚠ Raise Blocker'}</button>{!isKai && <button onClick={onComplete}>✓ Complete</button>}</div></div></div>;
}

function CompletedTaskCard({task, agentName}: {task: Task; agentName: string}) { return <div className="result-card"><div className="result-top"><span className="result-status">COMPLETE</span><span className="task-agent">{agentName}</span></div><div className="task-meta">{task.provider && <span className="task-provider">{task.provider}</span>}{task.freeOnly && <span className="free-badge">FREE ONLY</span>}</div><b>{task.title}</b><p className="result-msg">{task.resultMessage ?? 'Complete — task finished.'}</p><p className="result-duration-native">⏱ Time spent: {taskElapsed(task)}</p><div className="task-bottom"><span>{task.completedAt ? `Completed ${timeAgo(task.completedAt)}` : 'Completed'}</span></div>{task.nextRunAt && <p className="result-msg">Next Kai refresh: {formatCountdown(task.nextRunAt)}</p>}{task.videoUrl && <a className="result-link" href={task.videoUrl} target="_blank" rel="noreferrer">Open Final MP4</a>}{task.driveUrl && <a className="result-link" href={task.driveUrl} target="_blank" rel="noreferrer">Open Video in Google Drive</a>}</div>; }

function friendlyState(state: string) { if (state === 'assigned-task') return 'assigned'; if (state === 'working-task') return 'working'; if (state === 'off-duty') return 'resting'; if (state === 'snack') return 'snack break'; return state; }
function friendlyPhase(phase?: string) { if (phase === 'starting') return 'Connecting'; if (phase === 'generating') return 'Generating'; if (phase === 'merging') return 'Merging'; if (phase === 'uploading') return 'Uploading'; if (phase === 'provider-error') return 'Retry Provider'; if (phase === 'free-check') return 'Free Check'; if (phase === 'received') return 'Received'; if (phase === 'preparing') return 'Preparing'; if (phase === 'working') return 'Working'; if (phase === 'completed') return 'Completed'; return 'Queued'; }
function timeAgo(value: string) { const s = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (s < 60) return `${s}s ago`; const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`; return `${Math.floor(m / 60)}h ago`; }
function getRemainingSeconds(task: Task, now: number) { if (!task.startedAt || !task.durationSec) return task.durationSec ?? 0; const elapsed = Math.floor((now - new Date(task.startedAt).getTime()) / 1000); return Math.max(0, task.durationSec - elapsed); }
function getProgressPercent(task: Task, now: number) { if (!task.durationSec) return task.phase === 'working' ? 65 : task.phase === 'preparing' ? 35 : 12; if (!task.startedAt) return task.phase === 'preparing' ? 28 : task.phase === 'free-check' ? 8 : task.phase === 'received' ? 16 : 4; const elapsed = Math.max(0, Math.floor((now - new Date(task.startedAt).getTime()) / 1000)); return Math.max(4, Math.min(100, Math.round((elapsed / task.durationSec) * 100))); }
function taskElapsed(task: Task) { const start = new Date(task.startedAt || task.createdAt).getTime(); const end = new Date(task.completedAt || Date.now()).getTime(); if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 'n/a'; const total=Math.floor((end-start)/1000); const h=Math.floor(total/3600); const min=Math.floor((total%3600)/60); const sec=total%60; return h>0 ? `${h}h ${min}m ${sec}s` : min>0 ? `${min}m ${sec}s` : `${sec}s`; }
function formatCountdown(value: string) { const diff = Math.max(0, new Date(value).getTime() - Date.now()); const totalMinutes = Math.floor(diff / 60000); const hours = Math.floor(totalMinutes / 60); const minutes = totalMinutes % 60; return `${hours}h ${minutes}m`; }
function formatDuration(value: number) { const m = Math.floor(value / 60).toString(); const s = (value % 60).toString().padStart(2, '0'); return `${m}:${s}`; }
function Room({x, y, w, h, title, cls}: {x: number; y: number; w: number; h: number; title: string; cls: string}) { return <div className={`room ${cls}`} style={{left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`}}><span>{title}</span></div>; }
function Desk({x, y}: {x: number; y: number}) { return <div className="desk" style={{left: `${x}%`, top: `${y}%`}}><div className="monitor">▣</div><div className="chair">◉</div></div>; }
function TaskLights({completed}: {completed: number}) { const pct = Math.round((completed / TASK_TARGET) * 100); return <div className="task-progress"><div className="task-lights" aria-label={`${completed} of ${TASK_TARGET} tasks completed`}>{Array.from({length: TASK_TARGET}, (_, i) => <i key={i} className={i < completed ? 'on' : 'off'} />)}</div><span>{completed}/{TASK_TARGET} task <b>{pct}%</b></span></div>; }
function MiniProgress({completed}: {completed: number}) { return <div className="mini-progress"><div>{Array.from({length: TASK_TARGET}, (_, i) => <i key={i} className={i < completed ? 'on' : 'off'} />)}</div><span>{completed}/{TASK_TARGET} task</span></div>; }
function AgentSprite({agent, completed}: {agent: Agent; completed: number}) { const p = agent.destination ?? agent.position; const initial = agent.name[0]; const bubble = agent.state === 'assigned-task' ? 'Task received…' : agent.state === 'preparing' ? 'Preparing…' : agent.state === 'working-task' ? (agent.id === 'developer' ? 'Coding…' : 'Working on task…') : agent.state === 'coffee' ? 'Coffee break ☕' : agent.state === 'snack' ? 'Snack break 🍪🥤' : agent.state === 'lunch' ? 'Lunch 🍜🍱' : agent.state === 'break' ? 'Taking a break 🛋️' : agent.state === 'off-duty' ? 'Resting…' : agent.state === 'blocked' ? (agent.id === 'implement' ? 'Provider error — check dashboard' : 'Blocked — need Alex') : agent.currentTask ?? agent.state; const developerStyle = agent.id === 'developer' ? {background: '#ffb86b'} : undefined; return <div className={`agent state-${agent.state}`} title={`${agent.role} • ${agent.state}`} style={{left: `${p.x}%`, top: `${p.y}%`}}><div className="bubble">{bubble}</div><div className={`avatar ${agent.id}`} style={developerStyle}>{initial}</div><small>{agent.name}</small>{agent.id !== 'manager' && <TaskLights completed={completed} />}</div>; }

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

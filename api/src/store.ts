export const managerPoint = { x: 18, y: 15 };
export const loungePoint = { x: 13, y: 72 };
export const cafeteriaPoint = { x: 75, y: 73 };

export const agents = [
  { id:'manager', name:'Alex', role:'Manager', state:'working', position:{x:18,y:18}, home:{x:18,y:18} },
  { id:'sysadmin', name:'Sam', role:'Senior System Administrator', state:'working', position:{x:20,y:43}, home:{x:20,y:43} },
  { id:'security', name:'Mina', role:'Senior Security', state:'working', position:{x:42,y:43}, home:{x:42,y:43} },
  { id:'cloud', name:'Noah', role:'Senior Cloud Operator', state:'working-task', position:{x:65,y:43}, home:{x:65,y:43}, currentTask:'Evaluate free deployment platforms for frontend, API and Java backend' },
  { id:'qa', name:'Lina', role:'Senior Q/A', state:'working-task', position:{x:33,y:59}, home:{x:33,y:59}, currentTask:'Test frontend, backend and API separation plus marketplace smoke flow' },
  { id:'implement', name:'Kai', role:'Senior Implement', state:'working', position:{x:58,y:59}, home:{x:58,y:59} },
  { id:'developer', name:'Leo', role:'Senior Developer', state:'working-task', position:{x:75,y:59}, home:{x:75,y:59}, currentTask:'Build React marketplace UI matching the approved reference design' }
];

const assignedAt = Date.now();
const leoTitles = [
  'Build React marketplace UI matching the approved reference design',
  'Create product detail page and related asset experience',
  'Implement user sign-up, login, logout and role-based access',
  'Build seller upload form and seller asset management dashboard',
  'Create Java Spring Boot marketplace REST APIs and service layer',
  'Add persistent database model for users, assets, favorites and orders',
  'Connect React frontend to Java APIs and replace demo-only data',
  'Implement favorites, search, filters, sorting and category discovery',
  'Complete shopping cart, checkout and buyer order history',
  'Finish admin moderation, seller review and marketplace management',
  'Run responsive QA, validation, security checks and fix all defects',
  'Deploy frontend and backend, verify production, document handoff and close project'
];

const linaTitles = [
  'Test frontend, backend and API separation plus marketplace smoke flow',
  'Test React marketplace UI on desktop, tablet and mobile',
  'Test product detail, favorites, search, filters and sorting',
  'Test signup, login, logout and buyer/seller/admin role access',
  'Test seller upload, edit, delete and submit-for-review workflow',
  'Test Java backend and REST API endpoints including validation and error handling',
  'Test cart, checkout, order history and persistence',
  'Test admin approval, rejection and marketplace moderation',
  'Run regression testing after Leo fixes defects',
  'Run final production smoke test and confirm release readiness'
];

const noahTitles = [
  'Evaluate free deployment platforms for frontend, API and Java backend',
  'Select a zero-cost deployment architecture and document platform limits',
  'Prepare environment variables, CORS and production configuration',
  'Create or improve CI pipeline for frontend build and deployment',
  'Create or improve CI pipeline for Java backend and REST API',
  'Configure deployment health checks and rollback-safe release steps',
  'Coordinate with Leo during integration and deployment changes',
  'Coordinate with Lina for staging smoke tests and production verification',
  'Deploy frontend, API and backend using approved free services',
  'Verify CI/CD from GitHub commit through production deployment',
  'Resolve deployment/runtime blockers or escalate to Alex when a decision is needed',
  'Complete final deployment handoff with public URLs, health checks and operating notes'
];

const leoTasks = leoTitles.map((title, index) => ({
  id: `leo-marketplace-${index + 1}`,
  title,
  agentId: 'developer',
  status: 'active',
  phase: index === 0 ? 'working' : 'queued',
  provider: 'Developer Workspace',
  freeOnly: false,
  durationSec: 3600,
  createdAt: new Date(assignedAt + index * 1000).toISOString(),
  startedAt: index === 0 ? new Date(assignedAt).toISOString() : undefined,
  resultMessage: index === 0
    ? 'Leo is actively working on the AI Asset Marketplace. Remaining tasks are queued in delivery order.'
    : 'Assigned to Leo and queued. Leo will continue automatically after the previous task is completed.'
}));

const linaTasks = linaTitles.map((title, index) => ({
  id: `lina-marketplace-${index + 1}`,
  title,
  agentId: 'qa',
  status: 'active',
  phase: index === 0 ? 'working' : 'queued',
  provider: 'QA Workspace',
  freeOnly: false,
  durationSec: 2400,
  createdAt: new Date(assignedAt + 100000 + index * 1000).toISOString(),
  startedAt: index === 0 ? new Date(assignedAt).toISOString() : undefined,
  resultMessage: index === 0
    ? 'Lina is actively testing the AI Asset Marketplace. She will report defects for Leo to fix and continue through the QA queue.'
    : 'Assigned to Lina and queued. Lina will continue automatically after the previous QA task is completed.'
}));

const noahTasks = noahTitles.map((title, index) => ({
  id: `noah-marketplace-${index + 1}`,
  title,
  agentId: 'cloud',
  status: 'active',
  phase: index === 0 ? 'working' : 'queued',
  provider: 'Cloud / CI-CD Workspace',
  freeOnly: true,
  durationSec: 2700,
  createdAt: new Date(assignedAt + 200000 + index * 1000).toISOString(),
  startedAt: index === 0 ? new Date(assignedAt).toISOString() : undefined,
  resultMessage: index === 0
    ? 'Noah is actively evaluating free deployment options and owns CI/CD coordination through successful production release.'
    : 'Assigned to Noah and queued. Noah will continue automatically and coordinate deployment with Leo and Lina.'
}));

export const tasks:any[] = [...leoTasks, ...linaTasks, ...noahTasks];

export const startedAt = new Date().toISOString();

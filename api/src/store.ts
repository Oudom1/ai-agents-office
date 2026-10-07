export const managerPoint = { x: 18, y: 15 };
export const loungePoint = { x: 13, y: 72 };
export const cafeteriaPoint = { x: 75, y: 73 };

export const agents = [
  { id:'manager', name:'Alex', role:'Manager', state:'working-task', position:{x:18,y:18}, home:{x:18,y:18}, currentTask:'Coordinate marketplace delivery, blockers and cross-team handoffs' },
  { id:'sysadmin', name:'Sam', role:'Senior System Administrator', state:'working-task', position:{x:20,y:43}, home:{x:20,y:43}, currentTask:'Design marketplace access control using RBAC first and ABAC where needed' },
  { id:'security', name:'Mina', role:'Senior Security', state:'working-task', position:{x:42,y:43}, home:{x:42,y:43}, currentTask:'Review authentication, authorization and monitoring security controls' },
  { id:'cloud', name:'Noah', role:'Senior Cloud Operator', state:'working-task', position:{x:65,y:43}, home:{x:65,y:43}, currentTask:'Find a more reliable hosting/deployment option to keep AI Agents Office smooth and responsive' },
  { id:'qa', name:'Lina', role:'Senior Q/A', state:'working-task', position:{x:33,y:59}, home:{x:33,y:59}, currentTask:'Test live AI Agents Office login, API health and production smoke flow' },
  { id:'implement', name:'Kai', role:'Senior Implement', state:'working', position:{x:58,y:59}, home:{x:58,y:59} },
  { id:'developer', name:'Leo', role:'Senior Developer', state:'working-task', position:{x:75,y:59}, home:{x:75,y:59}, currentTask:'Build React marketplace UI matching the approved reference design' }
];

const assignedAt = Date.now();

const alexTitles = [
  'Coordinate marketplace delivery, blockers and cross-team handoffs',
  'Review blockers raised by Leo, Sam, Lina, Mina and Noah and assign the right owner',
  'Prioritize critical defects and unblock dependencies between development, QA, security and deployment',
  'Review release readiness status across Leo, Sam, Lina, Mina and Noah',
  'Escalate unresolved technical blockers for further review when Alex cannot resolve them',
  'Approve final production go-live after QA, security and deployment checks pass'
];

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
  'Prepare release candidate for Lina, Mina and Noah review'
];

const samTitles = [
  'Design marketplace access control using RBAC first and ABAC where needed',
  'Define Buyer, Seller and Admin roles with least-privilege permissions',
  'Define resource ownership rules for seller assets, profiles, orders and favorites',
  'Document when ABAC is required beyond RBAC for ownerId, account status and resource state',
  'Define access matrix for frontend routes and Java REST API endpoints',
  'Review role assignment, privilege elevation and admin access process',
  'Review logout/session revocation and disabled-account access behavior',
  'Validate access-control implementation with Leo before QA handoff'
];

const linaTitles = [
  'Test live AI Agents Office login, API health and production smoke flow',
  'Test login timeout and backend wake-up recovery behavior',
  'Test refresh, logout and session recovery on the live site',
  'Test frontend, backend and API separation plus marketplace smoke flow',
  'Test React marketplace UI on desktop, tablet and mobile',
  'Test product detail, favorites, search, filters and sorting',
  'Test signup, login, logout and Buyer/Seller/Admin role access',
  'Test RBAC positive and negative authorization scenarios',
  'Test ABAC/resource ownership rules if implemented',
  'Test seller upload, edit, delete and submit-for-review workflow',
  'Run regression testing after fixes',
  'Run final production smoke test and confirm release readiness'
];

const minaTitles = [
  'Review authentication, authorization and monitoring security controls',
  'Review Sam access-control design for least privilege and separation of duties',
  'Test unauthorized, cross-role and privilege-escalation scenarios',
  'Test IDOR/resource ownership risks for seller assets, orders and profiles',
  'Review API validation, CORS, security headers and error exposure',
  'Review secrets, environment variables and repository for credential exposure',
  'Define security audit events for login, failed login, role changes, seller changes, checkout and admin actions',
  'Define monitoring alerts for authentication failures, suspicious access and 4xx/5xx spikes',
  'Coordinate with Noah to integrate application/security logs into monitoring',
  'Run final security verification and approve or block production release'
];

const noahTitles = [
  'Find a more reliable hosting/deployment option to keep AI Agents Office smooth and responsive',
  'Compare Render with alternative low-cost or free hosts for API cold-start time, uptime, region and limits',
  'Check whether frontend, API and monitoring should be split across different providers for better reliability',
  'Recommend the best hosting architecture with a fallback option if the primary API host is slow or unavailable',
  'Design health checks, retry policy, timeout policy and graceful degraded mode for the frontend',
  'Prepare environment variables, CORS and production configuration for the selected host',
  'Create or improve CI pipeline for frontend build and deployment',
  'Create or improve CI pipeline for backend/API deployment',
  'Prepare staging environment while Leo, Sam, Lina and Mina complete validation',
  'Integrate application/security logs, uptime checks and health metrics with Mina',
  'Verify production responsiveness, login speed and recovery after backend sleep/restart',
  'Complete final deployment handoff with primary URL, backup/fallback plan, monitoring and operating notes'
];

const mkTasks = (prefix:string, agentId:string, provider:string, titles:string[], offset:number, durationSec:number) => titles.map((title, index) => ({
  id: `${prefix}-${index + 1}`,
  title,
  agentId,
  status: 'active',
  phase: index === 0 ? 'working' : 'queued',
  provider,
  freeOnly: provider.includes('Cloud'),
  durationSec,
  createdAt: new Date(assignedAt + offset + index * 1000).toISOString(),
  startedAt: index === 0 ? new Date(assignedAt).toISOString() : undefined,
  resultMessage: index === 0 ? `${agentId} is actively working on this project responsibility.` : `Assigned and queued. Continue automatically after the previous task is completed.`
}));

const alexTasks = mkTasks('alex-marketplace','manager','Management Workspace',alexTitles,-50000,1800);
const leoTasks = mkTasks('leo-marketplace','developer','Developer Workspace',leoTitles,0,3600);
const samTasks = mkTasks('sam-marketplace','sysadmin','Access Control Workspace',samTitles,50000,2400);
const linaTasks = mkTasks('lina-marketplace','qa','QA Workspace',linaTitles,100000,2400);
const minaTasks = mkTasks('mina-marketplace','security','Security Review Workspace',minaTitles,150000,2700);
const noahTasks = mkTasks('noah-marketplace','cloud','Cloud / CI-CD Workspace',noahTitles,200000,2700);


const patchPortalTitles: Record<string,string[]> = {
  manager: [
    'Patch Intelligence Portal: coordinate scope, priorities, owners and release gates',
    'Define patch review workflow from intake to analysis, QA, security approval, deployment and closure',
    'Review high/critical CVE patch blockers and make final rollout decision'
  ],
  developer: [
    'Build Patch & CVE Analysis Portal webpage with responsive dashboard and patch-post form',
    'Add KB/CVE/CVSS/product/exploit/reboot/known-issue/risk/recommendation fields',
    'Add search, severity/status filters, local persistence, sample records and per-patch detail analysis'
  ],
  sysadmin: [
    'Define Windows, Microsoft 365, browser, server and application patch assessment fields',
    'Define applicability, prerequisites, supersedence, reboot, rollback and deployment-ring guidance',
    'Review patch operational impact and propose pilot/production rollout plan'
  ],
  security: [
    'Define CVE severity, exploit status, exposure and compensating-control security analysis',
    'Review vulnerability prioritization logic using CVSS, exploitability and affected asset criticality',
    'Security-review each critical patch recommendation before production rollout'
  ],
  qa: [
    'Test Patch & CVE Analysis Portal form validation, filters, persistence and responsive UI',
    'Validate patch records keep correct KB/CVE mappings and status transitions',
    'Run regression and browser testing before release'
  ],
  cloud: [
    'Prepare CI/CD and hosting for Patch & CVE Analysis Portal on the existing AI Agents Office site',
    'Verify GitHub Pages build publishes /patch-analysis/ and API deployment remains healthy',
    'Add uptime/release verification for the patch portal after deployment'
  ],
  implement: [
    'Verify patch-analysis workflow from new post through review, rollout recommendation and closure',
    'Validate deployment-ring sequence: pilot, phased rollout, monitoring and rollback',
    'Prepare implementation checklist for approved patches'
  ]
};

const patchTasks = Object.entries(patchPortalTitles).flatMap(([agentId,titles], groupIndex) =>
  mkTasks('patch-portal-' + agentId, agentId,
    agentId === 'developer' ? 'Developer Workspace' :
    agentId === 'security' ? 'Security Review Workspace' :
    agentId === 'qa' ? 'QA Workspace' :
    agentId === 'cloud' ? 'Cloud / CI-CD Workspace' :
    agentId === 'sysadmin' ? 'Patch Operations Workspace' :
    agentId === 'implement' ? 'Implementation Workspace' : 'Management Workspace',
    titles, 300000 + groupIndex * 50000, agentId === 'developer' ? 3600 : 2400)
);

export const tasks:any[] = [...alexTasks, ...leoTasks, ...samTasks, ...linaTasks, ...minaTasks, ...noahTasks, ...patchTasks];

export const startedAt = new Date().toISOString();

export const managerPoint = { x: 18, y: 15 };
export const loungePoint = { x: 13, y: 72 };
export const cafeteriaPoint = { x: 75, y: 73 };

export const agents = [
  { id:'manager', name:'Alex', role:'Manager', state:'working', position:{x:18,y:18}, home:{x:18,y:18} },
  { id:'sysadmin', name:'Sam', role:'Senior System Administrator', state:'working', position:{x:20,y:43}, home:{x:20,y:43} },
  { id:'security', name:'Mina', role:'Senior Security', state:'working', position:{x:42,y:43}, home:{x:42,y:43} },
  { id:'cloud', name:'Noah', role:'Senior Cloud Operator', state:'working', position:{x:65,y:43}, home:{x:65,y:43} },
  { id:'qa', name:'Lina', role:'Senior Q/A', state:'working', position:{x:33,y:59}, home:{x:33,y:59} },
  { id:'implement', name:'Kai', role:'Senior Implement', state:'blocked', position:{x:58,y:59}, home:{x:58,y:59} },
  { id:'developer', name:'Leo', role:'Senior Developer', state:'working', position:{x:75,y:59}, home:{x:75,y:59} }
];

export const tasks:any[] = [];

export const startedAt = new Date().toISOString();

export type AgentState = 'working' | 'called' | 'walking' | 'talking' | 'assigned-task' | 'break' | 'lunch' | 'idle';

export type AgentRole =
  | 'Manager'
  | 'Senior System Administrator'
  | 'Senior Security'
  | 'Senior Cloud Operator'
  | 'Senior Q/A'
  | 'Senior Implement';

export interface Position { x: number; y: number; }

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  state: AgentState;
  position: Position;
  home: Position;
  destination?: Position;
  currentTask?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  agentId: string;
  status: 'queued' | 'active' | 'done';
  createdAt: string;
}

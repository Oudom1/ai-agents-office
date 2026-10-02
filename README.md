# AI Agents Office

A separated frontend/backend/API starter for a 6-agent pixel office simulator.

## Agents
- Manager
- Senior System Administrator
- Senior Security
- Senior Cloud Operator
- Senior Q/A
- Senior Implement

## Architecture
- `frontend/` React + TypeScript UI with office map and agent controls
- `backend/` WebSocket state service for real-time agent movement/status
- `api/` REST API for agents, tasks and manager actions
- `shared/` shared TypeScript models

## Run
```bash
npm install
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:4000  
WebSocket: ws://localhost:4001

## Core behavior
Agents can transition between working, called, walking, talking, assigned-task, break and lunch states. The Manager can call an agent and assign a task. The frontend visualizes desk positions, manager office, lounge and cafeteria.

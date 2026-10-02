import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ port: 4001 });

wss.on('connection', socket => {
  socket.send(JSON.stringify({ type:'connected', service:'agent-state-ws' }));
  socket.on('message', raw => {
    let msg:any;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(msg));
    }
  });
});

console.log('WebSocket running on ws://localhost:4001');

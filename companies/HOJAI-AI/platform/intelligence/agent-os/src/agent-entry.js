// Sample agent entry point — run by spawnAgent()
// In production, this would be the actual agent implementation

import http from 'http';

const AGENT_ID = process.env.AGENT_ID || 'unknown';
const HEARTBEAT_INTERVAL = 10_000; // 10 seconds

console.log(`[${AGENT_ID}] Agent started, pid=${process.pid}`);

// Send heartbeats to Agent OS
const heartbeatTimer = setInterval(() => {
  const osPort = process.env.AGENT_OS_PORT || '4892';
  const req = http.get(`http://localhost:${osPort}/api/agents/${AGENT_ID}/heartbeat`, (res) => {
    // heartbeat recorded
  });
  req.on('error', () => {}); // ignore errors, OS may not be running
}, HEARTBEAT_INTERVAL);

// Listen for stdin commands
process.stdin.on('data', (data) => {
  const cmd = data.toString().trim();
  console.log(`[${AGENT_ID}] Received: ${cmd}`);
  if (cmd === 'STOP') {
    console.log(`[${AGENT_ID}] Shutting down gracefully`);
    clearInterval(heartbeatTimer);
    process.exit(0);
  }
  // Process other commands...
  process.stdout.write(`ACK: ${cmd}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[${AGENT_ID}] SIGTERM received`);
  clearInterval(heartbeatTimer);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`[${AGENT_ID}] SIGINT received`);
  clearInterval(heartbeatTimer);
  process.exit(0);
});
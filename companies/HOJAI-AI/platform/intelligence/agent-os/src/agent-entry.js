// Sample agent entry point — run by spawnAgent()
import http from 'http';

const AGENT_ID = process.env.AGENT_ID || 'unknown';
const HEARTBEAT_INTERVAL = 10_000;

console.log(`[${AGENT_ID}] Agent started, pid=${process.pid}`);

const heartbeatTimer = setInterval(() => {
  const osPort = process.env.AGENT_OS_PORT || '4892';
  http.get(`http://localhost:${osPort}/api/agents/${AGENT_ID}/heartbeat`).on('error', () => {});
}, HEARTBEAT_INTERVAL);

process.stdin.on('data', (data) => {
  const cmd = data.toString().trim();
  console.log(`[${AGENT_ID}] Received: ${cmd}`);
  if (cmd === 'STOP') { clearInterval(heartbeatTimer); process.exit(0); }
  process.stdout.write(`ACK: ${cmd}\n`);
});

process.on('SIGTERM', () => { clearInterval(heartbeatTimer); process.exit(0); });
process.on('SIGINT', () => { clearInterval(heartbeatTimer); process.exit(0); });

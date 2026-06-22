// HOJAI CLI (4170) — command surface + server-side command registry
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4170;
const SERVICE = 'hojai-cli';

const commands = new Map(); // command name -> { name, description, args, examples }
const runs = new Map();     // runId -> { id, command, args, output, exit_code, ts }

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const cmds = [
    { name: 'init', description: 'Initialize a new HOJAI AI project', args: ['name', 'template?'], examples: ['hojai init my-app', 'hojai init my-app --template=restaurant'] },
    { name: 'deploy', description: 'Deploy to HOJAI AI cloud', args: ['environment?'], examples: ['hojai deploy --env=staging'] },
    { name: 'status', description: 'Show service status', args: ['service?'], examples: ['hojai status', 'hojai status sales-os'] },
    { name: 'logs', description: 'Tail service logs', args: ['service', '--tail?'], examples: ['hojai logs sales-os --tail=100'] },
    { name: 'twins', description: 'List digital twins', args: ['--type?'], examples: ['hojai twins', 'hojai twins --type=customer'] },
    { name: 'policies', description: 'List or evaluate policies', args: ['action', 'name?'], examples: ['hojai policies list', 'hojai policies eval rate-limit-api'] }
  ];
  cmds.forEach(c => { const id = uuid(); commands.set(id, { id, ...c }); });
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', commands: commands.size, runs: runs.size })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.get('/api/commands', (_q, r) => r.json(ok({ commands: [...commands.values()], count: commands.size })));
app.get('/api/commands/:name', (req, res) => {
  const c = [...commands.values()].find(c => c.name === req.params.name);
  if (!c) return res.status(404).json(fail('not found'));
  res.json(ok({ command: c }));
});

// Run a command (server-side execution, returns mocked output)
app.post('/api/run', (req, res) => {
  const { command, args } = req.body || {};
  if (!command) return res.status(400).json(fail('command required'));
  const cmd = [...commands.values()].find(c => c.name === command);
  if (!cmd) return res.status(404).json(fail('unknown command'));
  const id = uuid();
  const output = {
    id, command, args: args || [], ts: new Date().toISOString(),
    stdout: `Mock execution of '${command}' with args ${JSON.stringify(args || [])}`,
    exit_code: 0
  };
  runs.set(id, output);
  res.status(201).json(ok({ run: output }));
});

app.get('/api/runs', (_q, r) => r.json(ok({ runs: [...runs.values()].slice(-50), count: runs.size })));

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
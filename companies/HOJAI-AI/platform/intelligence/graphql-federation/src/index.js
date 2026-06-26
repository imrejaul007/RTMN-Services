import helmet from 'helmet';
import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { graphql, buildSchema } from 'graphql';
import cors from 'cors';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use(helmet());

const schema = buildSchema(`
  type Query {
    hello: String
    status: String
    services: [Service]
  }
  type Service {
    id: String
    name: String
    status: String
    port: Int
  }
`);

const root = {
  hello: () => 'RTMN GraphQL Federation Gateway',
  status: () => 'operational',
  services: () => [
    { id: '1', name: 'Sales OS', status: 'active', port: 5055 },
    { id: '2', name: 'Marketing OS', status: 'active', port: 5500 },
    { id: '3', name: 'Customer Success', status: 'active', port: 4050 }
  ]
};

app.get('/graphql', (req, res) => {
  const query = req.query.q || '{ hello }';
  graphql({ schema, source: query, rootValue: root }).then(result => res.json(result));
});

app.post('/graphql', requireAuth, (req, res) => {
  graphql({ schema, source: req.body.query, rootValue: root, variableValues: req.body.variables })
    .then(result => res.json(result));
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'GraphQL', port: PORT }));

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

export default app;

// Skip auto-listen in test mode
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => console.log('GraphQL Federation running on port ' + PORT));
  installGracefulShutdown(server);
}

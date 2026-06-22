import helmet from 'helmet';
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { graphql, buildSchema } = require('graphql');
const cors = require('cors');
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

app.post('/graphql',requireAuth,  (req, res) => {
  graphql({ schema, source: req.body.query, rootValue: root, variableValues: req.body.variables }).then(result => res.json(result));
});

app.get('/health', (r, res) => res.json({ status: 'healthy', service: 'GraphQL', port: PORT }));
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


const server = app.listen(PORT, () => console.log('GraphQL Federation running on port ' + PORT));
installGracefulShutdown(server);

const express = require('express');
const cors = require('cors');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Schema for unified RTMN API
const schema = buildSchema(`
  type Service {
    id: String
    name: String
    status: String
    industry: String
    capabilities: [String]
  }

  type Query {
    services(status: String, industry: String): [Service]
    service(id: String!): Service
    health: String
  }

  type Mutation {
    registerService(name: String!, industry: String, capabilities: [String]): Service
  }
`);

// Root resolver
const root = {
  services: () => {
    // Fetch from Integration Connector
    const http = require('http');
    return new Promise((resolve) => {
      http.get('http://localhost:4399/api/services', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            // Ensure all services have required fields
            const services = (parsed.services || []).map((s, i) => ({
              id: s.id || `svc-${i}`,
              name: s.name || 'unknown',
              status: s.status || 'active',
              industry: s.industry || 'general',
              capabilities: s.capabilities || []
            }));
            resolve(services);
          } catch (e) {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    });
  },
  service: ({ id }) => ({ id, name: 'Service', status: 'unknown' }),
  health: () => 'REZ GraphQL Federation Gateway is running',
  registerService: ({ name, industry, capabilities }) => {
    return { id: Date.now().toString(), name, status: 'registered', industry, capabilities };
  }
};

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'REZ-graphql-federation',
    port: PORT,
    graphqlEndpoint: `http://localhost:${PORT}/graphql`
  });
});

// GraphQL endpoint
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true
}));

app.listen(PORT, () => {
  console.log(`REZ GraphQL Federation Gateway running on port ${PORT}`);
  console.log(`GraphiQL IDE: http://localhost:${PORT}/graphql`);
});

module.exports = app;
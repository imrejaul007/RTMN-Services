import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import connectorRoutes from './routes/connector';
import logger from './utils/logger';

const app: Application = express();
const PORT = process.env.PORT || 4399;

// SUTAR OS service URLs (HOJAI-AI platform) — top-level wiring for RTMN Hub.
// Direct service URLs let the Hub reach a SUTAR service without going through
// the SUTAR gateway (4140). The gateway remains the recommended path for
// capability-based routing — see /api/sutar/capabilities below.
const SUTAR_SERVICES: Record<string, string> = {
  'sutar-gateway':          process.env.SUTAR_GATEWAY_URL           || 'http://localhost:4140',
  'sutar-agent-teaming':    process.env.SUTAR_AGENT_TEAMING_URL     || 'http://localhost:4853',
  'sutar-agent-network':    process.env.SUTAR_AGENT_NETWORK_URL     || 'http://localhost:4155',
  'sutar-agent-reputation': process.env.SUTAR_AGENT_REPUTATION_URL  || 'http://localhost:4820',
  'sutar-decision-engine':  process.env.SUTAR_DECISION_URL          || 'http://localhost:4240',
  'sutar-contract-os':      process.env.SUTAR_CONTRACT_URL          || 'http://localhost:4190',
  'sutar-negotiation':      process.env.SUTAR_NEGOTIATION_URL       || 'http://localhost:4191',
  'sutar-wallet-service':   process.env.SUTAR_WALLET_URL            || 'http://localhost:4840',
  'sutar-economy-os':       process.env.SUTAR_ECONOMY_URL           || 'http://localhost:4251',
  'sutar-trust-network':    process.env.SUTAR_TRUST_NETWORK_URL     || 'http://localhost:4252',
  'sutar-dispute':          process.env.SUTAR_DISPUTE_URL           || 'http://localhost:4847',
  'sutar-marketplace':      process.env.SUTAR_MARKETPLACE_URL       || 'http://localhost:4250',
  'sutar-twin-os':          process.env.SUTAR_TWIN_OS_URL           || 'http://localhost:4142',
  'sutar-goal-os':          process.env.SUTAR_GOAL_OS_URL           || 'http://localhost:4242',
  'sutar-monitoring':       process.env.SUTAR_MONITORING_URL        || 'http://localhost:3100'
};

// Nexha Commerce Network service URLs — Phase C of the 10-week roadmap.
// Nexha services live in `companies/Nexha/services/`. The nexha-gateway (5002)
// already proxies all internal traffic — the Hub routes below let cross-language
// callers (do-app mobile, SUTAR agents) reach any Nexha service without going
// through the gateway.
const NEXHA_SERVICES: Record<string, string> = {
  'nexha-gateway':           process.env.NEXHA_GATEWAY_URL          || 'http://localhost:5002',
  'distribution-os':         process.env.NEXHA_DISTRIBUTION_URL     || 'http://localhost:4300',
  'franchise-os':            process.env.NEXHA_FRANCHISE_URL        || 'http://localhost:4310',
  'procurement-os':          process.env.NEXHA_PROCUREMENT_URL      || 'http://localhost:4320',
  'manufacturing-os':        process.env.NEXHA_MANUFACTURING_URL     || 'http://localhost:4330',
  'trade-finance':           process.env.NEXHA_TRADE_FINANCE_URL    || 'http://localhost:4340',
  'intelligence-layer':      process.env.NEXHA_INTELLIGENCE_URL     || 'http://localhost:4350',
  'ecosystem-connector':     process.env.NEXHA_ECOSYSTEM_URL        || 'http://localhost:4399'
};

app.use(cors());
app.use(express.json());

app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'REZ-ecosystem-connector', port: PORT });
});

// SUTAR OS top-level routing — exposes the autonomous-economic layer at the
// RTMN Hub. Two paths:
//   1) /api/sutar/<service>/<path>  — direct proxy to a specific SUTAR service
//   2) /api/sutar/capabilities      — capability → service mapping (mirrors
//                                     sutar-gateway's CAPABILITY_MAP)
app.get('/api/sutar/capabilities', (_req: Request, res: Response) => {
  const capabilities = {
    'team-formation':          ['agentTeaming'],
    'leader-election':         ['agentTeaming'],
    'task-dag':                ['agentTeaming'],
    'multi-agent-workflow':    ['agentTeaming', 'agentOrchestration'],
    'wallet':                  ['agentWallets'],
    'payment':                 ['agentWallets', 'agentContracts'],
    'reputation':              ['agentReputation', 'trustNetwork'],
    'dispute':                 ['disputeResolution'],
    'negotiation':             ['acpProtocol', 'negotiationEngine'],
    'merchant-discovery':      ['acnNetwork', 'agentMarketplace'],
    'agent-registry':          ['acnNetwork'],
    'analytics':               ['agentAnalytics'],
    'contract':                ['sutarContracts'],
    'identity':                ['agentId', 'identityOS'],
    'memory':                  ['memoryBridge']
  };
  res.json({ capabilities, services: SUTAR_SERVICES });
});

app.use('/api/sutar/:service', (req: Request, res: Response) => {
  const { service } = req.params;
  const target = SUTAR_SERVICES[service as string];
  if (!target) {
    return res.status(404).json({
      error: `Unknown SUTAR service: ${service}`,
      available: Object.keys(SUTAR_SERVICES)
    });
  }

  // Reconstruct the upstream URL: strip /api/sutar/<service> and forward the
  // rest verbatim (path + query string).
  const upstreamPath = req.originalUrl.replace(`/api/sutar/${service}`, '') || '/';
  const url = new URL(target + upstreamPath);

  // Build headers — pass through but strip Host so the upstream sees its own.
  const headers: http.OutgoingHttpHeaders = { ...req.headers, host: url.host };
  const hasBody = !['GET', 'HEAD'].includes(req.method);

  const proxyReq = http.request(
    {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: req.method,
      headers
    },
    proxyRes => {
      res.status(proxyRes.statusCode || 502);
      for (const [k, v] of Object.entries(proxyRes.headers)) {
        if (v !== undefined) res.setHeader(k, v as string | string[]);
      }
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', err => {
    logger.error(`SUTAR proxy error (${service} → ${target}): ${err.message}`);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Upstream unavailable',
        service: service,
        upstream: target,
        details: err.message
      });
    }
  });

  if (hasBody) req.pipe(proxyReq);
  else proxyReq.end();
});

app.use('/api', connectorRoutes);

// Nexha Commerce Network — top-level routing at the RTMN Hub.
// Mirrors the SUTAR block above: /api/nexha/capabilities (service map) and
// /api/nexha/<service>/<path> (direct HTTP proxy to any of the 8 Nexha
// services reachable via the Hub).
app.get('/api/nexha/capabilities', (_req: Request, res: Response) => {
  const capabilities = {
    'supplier-registry':      ['procurement-os'],
    'warehouse-network':      ['nexha-gateway'], // stub until Phase C.5 ships
    'logistics':              ['distribution-os'],
    'banking':                ['trade-finance'],
    'orchestrator':           ['ecosystem-connector'],
    'franchise':              ['franchise-os'],
    'manufacturing':          ['manufacturing-os'],
    'demand-forecast':        ['intelligence-layer']
  };
  res.json({ capabilities, services: NEXHA_SERVICES });
});

app.use('/api/nexha/:service', (req: Request, res: Response) => {
  const { service } = req.params;
  const target = NEXHA_SERVICES[service as string];
  if (!target) {
    return res.status(404).json({
      error: `Unknown Nexha service: ${service}`,
      available: Object.keys(NEXHA_SERVICES)
    });
  }

  const upstreamPath = req.originalUrl.replace(`/api/nexha/${service}`, '') || '/';
  const url = new URL(target + upstreamPath);

  const headers: http.OutgoingHttpHeaders = { ...req.headers, host: url.host };
  const hasBody = !['GET', 'HEAD'].includes(req.method);

  const proxyReq = http.request(
    {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: req.method,
      headers
    },
    proxyRes => {
      res.status(proxyRes.statusCode || 502);
      for (const [k, v] of Object.entries(proxyRes.headers)) {
        if (v !== undefined) res.setHeader(k, v as string | string[]);
      }
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', err => {
    logger.error(`Nexha proxy error (${service} → ${target}): ${err.message}`);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Upstream unavailable',
        service: service,
        upstream: target,
        details: err.message
      });
    }
  });

  if (hasBody) req.pipe(proxyReq);
  else proxyReq.end();
});

app.use((err: Error, req: Request, res: Response, _next: unknown) => {
  logger.error('Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  logger.info(`REZ Ecosystem Connector running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`SUTAR OS routes: http://localhost:${PORT}/api/sutar/<service>`);
  logger.info(`Nexha routes: http://localhost:${PORT}/api/nexha/<service>`);
});

export default app;

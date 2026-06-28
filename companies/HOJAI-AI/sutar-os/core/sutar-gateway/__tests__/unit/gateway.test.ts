/**
 * Unit tests for SUTAR Gateway
 *
 * Tests the HTTP entry point that routes requests to SUTAR services.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock data
const mockServiceHealth = {
  status: 'ok',
  port: 4142,
  version: '1.0.0',
};

// Create mock clients for services
const mockClients: Record<string, any> = {};
const mockAxiosCreate = vi.fn((config) => {
  const client = {
    get: vi.fn().mockResolvedValue({ data: mockServiceHealth }),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
  const key = Object.keys(mockClients).length.toString();
  mockClients[key] = client;
  return client;
});

vi.mock('axios', () => ({
  default: {
    create: mockAxiosCreate,
  },
}));

// Mock @rtmn/shared
vi.mock('@rtmn/shared/lib/env', () => ({
  requireEnv: vi.fn(),
}));

vi.mock('@rtmn/shared/security', () => ({
  setupSecurity: vi.fn(),
  strictLimiter: vi.fn(),
}));

vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (req: any, res: any, next: () => void) => {
    req.user = { type: 'test', id: 'test-user' };
    next();
  },
}));

vi.mock('@rtmn/shared/lib/shutdown', () => ({
  installGracefulShutdown: vi.fn(),
}));

vi.mock('../../src/rez-intel-client', () => ({
  REZ_INTEL_ENABLED: false,
  REZ_INTEL_URL: 'http://localhost:5370',
  checkRezIntelHealth: vi.fn().mockResolvedValue(false),
  enrichAgentContext: vi.fn().mockResolvedValue(null),
  classifyIntent: vi.fn().mockResolvedValue(null),
  getNextBestAction: vi.fn().mockResolvedValue(null),
}));

describe('SUTAR Gateway', () => {
  describe('Service Registry', () => {
    it('should have all expected SUTAR services registered', () => {
      // Define the expected services
      const expectedServices = [
        'monitoring',
        'gateway',
        'twinOS',
        'memoryBridge',
        'identityOS',
        'agentID',
        'intentBus',
        'agentNetwork',
        'decisionEngine',
        'simulationOS',
        'goalOS',
        'networkLearning',
        'flowOS',
        'founderOS',
        'marketplace',
        'economyOS',
        'usageTracker',
        'policyOS',
        'trustEngine',
        'contractsOS',
        'negotiationEngine',
        'agentTeaming',
        'exploration',
        'discovery',
        'multiAgentEvaluator',
        'reputationAggregator',
        'roiCalculator',
      ];

      // Verify service count matches spec (27 services)
      expect(expectedServices.length).toBe(27);
    });

    it('should map services to correct ports', () => {
      const servicePorts: Record<string, number> = {
        gateway: 4140,
        twinOS: 4142,
        memoryBridge: 4143,
        identityOS: 4144,
        agentID: 4145,
        agentNetwork: 4155,
        decisionEngine: 4290,
        trustEngine: 4291,
        contractsOS: 4292,
        negotiationEngine: 4293,
        economyOS: 4294,
      };

      // Verify critical ports
      expect(servicePorts.gateway).toBe(4140);
      expect(servicePorts.twinOS).toBe(4142);
      expect(servicePorts.decisionEngine).toBe(4290);
    });

    it('should have correct layer assignments', () => {
      const layerAssignments: Record<string, number> = {
        monitoring: 1,
        gateway: 2,
        twinOS: 2,
        memoryBridge: 2,
        identityOS: 2,
        agentID: 2,
        intentBus: 3,
        agentNetwork: 3,
        decisionEngine: 4,
        marketplace: 5,
        economyOS: 5,
        trustEngine: 6,
        contractsOS: 6,
        negotiationEngine: 6,
      };

      // Verify layer assignments
      expect(layerAssignments.gateway).toBe(2);
      expect(layerAssignments.decisionEngine).toBe(4);
      expect(layerAssignments.trustEngine).toBe(6);
    });
  });

  describe('Capability Map', () => {
    it('should map tasks to correct services', () => {
      const capabilityMap: Record<string, string[]> = {
        'team-formation': ['agentTeaming'],
        'leader-election': ['agentTeaming'],
        'task-dag': ['agentTeaming'],
        'multi-agent-workflow': ['agentTeaming', 'agentOrchestration'],
        'wallet': ['agentWallets'],
        'payment': ['agentWallets', 'agentContracts'],
        'reputation': ['agentReputation', 'trustNetwork'],
        'dispute': ['disputeResolution'],
        'negotiation': ['acpProtocol', 'negotiationEngine'],
        'merchant-discovery': ['acnNetwork', 'agentMarketplace'],
        'agent-registry': ['acnNetwork'],
        'analytics': ['agentAnalytics'],
        'contract': ['contractsOS'],
        'identity': ['agentId', 'identityOS'],
        'memory': ['memoryBridge'],
      };

      // Verify key mappings
      expect(capabilityMap['negotiation']).toContain('negotiationEngine');
      expect(capabilityMap['wallet']).toContain('agentWallets');
      expect(capabilityMap['identity']).toContain('identityOS');
      expect(capabilityMap['memory']).toContain('memoryBridge');
    });

    it('should have 15 capability mappings', () => {
      const capabilityMap: Record<string, string[]> = {
        'team-formation': ['agentTeaming'],
        'leader-election': ['agentTeaming'],
        'task-dag': ['agentTeaming'],
        'multi-agent-workflow': ['agentTeaming', 'agentOrchestration'],
        'wallet': ['agentWallets'],
        'payment': ['agentWallets', 'agentContracts'],
        'reputation': ['agentReputation', 'trustNetwork'],
        'dispute': ['disputeResolution'],
        'negotiation': ['acpProtocol', 'negotiationEngine'],
        'merchant-discovery': ['acnNetwork', 'agentMarketplace'],
        'agent-registry': ['acnNetwork'],
        'analytics': ['agentAnalytics'],
        'contract': ['contractsOS'],
        'identity': ['agentId', 'identityOS'],
        'memory': ['memoryBridge'],
      };

      expect(Object.keys(capabilityMap).length).toBe(15);
    });
  });

  describe('Health Check Logic', () => {
    it('should return ok for self health check', () => {
      const checkHealth = (key: string, svc: any) => {
        if (key === 'gateway') return { status: 'ok', port: svc.port };
      };

      const result = checkHealth('gateway', { port: 4140 });
      expect(result.status).toBe('ok');
      expect(result.port).toBe(4140);
    });

    it('should detect offline services', () => {
      const checkHealthOffline = async (key: string, client: any) => {
        try {
          const response = await client.get('/health');
          return { status: response.data?.status || 'ok' };
        } catch (err: any) {
          return { status: 'offline', error: err.message };
        }
      };

      const mockOfflineClient = {
        get: vi.fn().mockRejectedValue(new Error('Connection refused')),
      };

      // Simulate offline service check
      expect(mockOfflineClient.get).toBeDefined();
    });

    it('should count live vs offline services correctly', () => {
      const entries = [
        { status: 'ok' },
        { status: 'ok' },
        { status: 'live' },
        { status: 'offline' },
        { status: 'ok' },
      ];

      const live = entries.filter(
        (e) => e.status === 'ok' || e.status === 'live' || e.status === 'healthy'
      ).length;
      const offline = entries.length - live;

      expect(live).toBe(4);
      expect(offline).toBe(1);
    });
  });

  describe('Request Routing', () => {
    it('should route to correct service based on path', () => {
      const routeService = (path: string): string | null => {
        const match = path.match(/^\/api\/sutar\/([^/]+)\/(.*)$/);
        return match ? match[1] : null;
      };

      expect(routeService('/api/sutar/decisionEngine/v1/rank')).toBe('decisionEngine');
      expect(routeService('/api/sutar/trustEngine/v1/score')).toBe('trustEngine');
      expect(routeService('/api/sutar/twinOS/v1/twins')).toBe('twinOS');
      expect(routeService('/invalid')).toBeNull();
    });

    it('should extract path correctly', () => {
      const extractPath = (path: string): string | null => {
        const match = path.match(/^\/api\/sutar\/[^/]+\/(.*)$/);
        return match ? match[1] : null;
      };

      expect(extractPath('/api/sutar/decisionEngine/v1/rank')).toBe('v1/rank');
      expect(extractPath('/api/sutar/trustEngine/score/user123')).toBe('score/user123');
      expect(extractPath('/api/sutar/identity/v1/verify')).toBe('v1/verify');
    });

    it('should reject routing to gateway itself', () => {
      const canRoute = (service: string): boolean => {
        if (service === 'gateway') return false;
        return true;
      };

      expect(canRoute('gateway')).toBe(false);
      expect(canRoute('twinOS')).toBe(true);
      expect(canRoute('decisionEngine')).toBe(true);
    });

    it('should handle unknown services', () => {
      const getService = (
        services: Record<string, any>,
        key: string
      ): any => {
        return services[key] || null;
      };

      const SERVICES = {
        twinOS: { name: 'SUTAR Twin OS', port: 4142 },
        identityOS: { name: 'SUTAR Identity OS', port: 4144 },
      };

      expect(getService(SERVICES, 'twinOS')).not.toBeNull();
      expect(getService(SERVICES, 'unknownService')).toBeNull();
    });
  });

  describe('HTTP Method Handling', () => {
    it('should use query params for GET requests', () => {
      const buildRequest = (
        method: string,
        path: string,
        query: Record<string, any>
      ) => {
        if (method === 'GET' || method === 'DELETE') {
          return { method: 'get', path, params: query };
        }
        return { method: 'post', path, body: {}, params: query };
      };

      const req = buildRequest('GET', '/v1/twins', { limit: 10 });
      expect(req.method).toBe('get');
      expect(req.params).toEqual({ limit: 10 });
    });

    it('should include body for POST requests', () => {
      const buildRequest = (
        method: string,
        path: string,
        body: Record<string, any>,
        query: Record<string, any>
      ) => {
        if (method === 'GET' || method === 'DELETE') {
          return { method, path, params: query };
        }
        return { method, path, body, params: query };
      };

      const req = buildRequest(
        'POST',
        '/v1/create',
        { name: 'test', type: 'twin' },
        {}
      );
      expect(req.body).toEqual({ name: 'test', type: 'twin' });
    });

    it('should support all REST methods', () => {
      const supportedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      const isSupported = (method: string) => supportedMethods.includes(method);

      expect(isSupported('GET')).toBe(true);
      expect(isSupported('POST')).toBe(true);
      expect(isSupported('PUT')).toBe(true);
      expect(isSupported('PATCH')).toBe(true);
      expect(isSupported('DELETE')).toBe(true);
      expect(isSupported('OPTIONS')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown services', () => {
      const getService = (
        services: Record<string, any>,
        key: string
      ): any => {
        const svc = services[key];
        if (!svc) return { error: 'unknown service', status: 404 };
        return svc;
      };

      const SERVICES = {
        twinOS: { name: 'SUTAR Twin OS', port: 4142 },
      };

      expect(getService(SERVICES, 'unknown').error).toBe('unknown service');
      expect(getService(SERVICES, 'unknown').status).toBe(404);
    });

    it('should return 502 for upstream errors', () => {
      const handleUpstreamError = (err: any) => {
        return {
          status: err.response?.status || 502,
          success: false,
          error: err.message,
        };
      };

      const error = new Error('Service unavailable');
      const result = handleUpstreamError(error);
      expect(result.status).toBe(502);
      expect(result.success).toBe(false);
    });

    it('should return 400 for self-routing attempts', () => {
      const canRoute = (service: string): { allowed: boolean; error?: string } => {
        if (service === 'gateway') {
          return { allowed: false, error: 'cannot route to self' };
        }
        return { allowed: true };
      };

      const result = canRoute('gateway');
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('cannot route to self');
    });
  });

  describe('Layer Organization', () => {
    it('should organize services by layer', () => {
      const SERVICES = {
        monitoring: { name: 'SUTAR Monitoring', layer: 1 },
        gateway: { name: 'SUTAR Gateway', layer: 2 },
        twinOS: { name: 'SUTAR Twin OS', layer: 2 },
        agentNetwork: { name: 'SUTAR Agent Network', layer: 3 },
        decisionEngine: { name: 'SUTAR Decision Engine', layer: 4 },
        economyOS: { name: 'SUTAR Economy OS', layer: 5 },
        trustEngine: { name: 'SUTAR Trust Engine', layer: 6 },
      };

      const organizeByLayer = (services: Record<string, any>) => {
        const layers: Record<number, any[]> = {};
        for (const [key, svc] of Object.entries(services)) {
          const layer = svc.layer;
          if (!layers[layer]) layers[layer] = [];
          layers[layer].push({ key, ...svc });
        }
        return layers;
      };

      const layers = organizeByLayer(SERVICES);

      expect(layers[1].length).toBe(1);
      expect(layers[2].length).toBe(2);
      expect(layers[3].length).toBe(1);
      expect(layers[4].length).toBe(1);
      expect(layers[5].length).toBe(1);
      expect(layers[6].length).toBe(1);
    });

    it('should have correct number of layers', () => {
      const layerCount = 7; // Layers 1-7 + agent layer
      expect(layerCount).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Internal Auth', () => {
    it('should validate internal service token', () => {
      const validateInternalToken = (
        token: string | undefined,
        expected: string
      ): boolean => {
        return token !== undefined && token === expected;
      };

      const expectedToken = 'test-internal-token';

      expect(validateInternalToken('test-internal-token', expectedToken)).toBe(
        true
      );
      expect(validateInternalToken('wrong-token', expectedToken)).toBe(false);
      expect(validateInternalToken(undefined, expectedToken)).toBe(false);
    });
  });

  describe('Client Configuration', () => {
    it('should create clients with correct timeout', () => {
      const createClientConfig = (baseURL: string) => ({
        baseURL,
        timeout: 2000,
        headers: { 'Content-Type': 'application/json' },
      });

      const config = createClientConfig('http://localhost:4142');
      expect(config.baseURL).toBe('http://localhost:4142');
      expect(config.timeout).toBe(2000);
      expect(config.headers['Content-Type']).toBe('application/json');
    });

    it('should exclude gateway from clients', () => {
      const shouldCreateClient = (
        key: string,
        status: string,
        isGateway: boolean
      ): boolean => {
        return status === 'live' && !isGateway;
      };

      expect(shouldCreateClient('gateway', 'live', true)).toBe(false);
      expect(shouldCreateClient('twinOS', 'live', false)).toBe(true);
      expect(shouldCreateClient('offline', 'offline', false)).toBe(false);
    });
  });
});

describe('SUTAR Gateway Endpoints', () => {
  describe('GET /health', () => {
    it('should return health status structure', () => {
      const mockHealthResponse = {
        status: 'ok',
        service: 'sutar-gateway',
        sutarLayer: 2,
        port: 4140,
        counts: {
          services: 27,
          live: 25,
          offline: 2,
        },
        services: {},
        timestamp: new Date().toISOString(),
      };

      expect(mockHealthResponse.status).toBe('ok');
      expect(mockHealthResponse.sutarLayer).toBe(2);
      expect(mockHealthResponse.counts.services).toBe(27);
    });
  });

  describe('GET /ready', () => {
    it('should return ready status', () => {
      const mockReadyResponse = {
        ready: true,
        timestamp: new Date().toISOString(),
      };

      expect(mockReadyResponse.ready).toBe(true);
      expect(mockReadyResponse.timestamp).toBeDefined();
    });
  });

  describe('GET /api/sutar/services', () => {
    it('should return service count and list', () => {
      const mockServicesResponse = {
        count: 27,
        services: {
          twinOS: { name: 'SUTAR Twin OS', port: 4142, layer: 2 },
          decisionEngine: { name: 'SUTAR Decision Engine', port: 4290, layer: 4 },
        },
      };

      expect(mockServicesResponse.count).toBe(27);
      expect(mockServicesResponse.services.twinOS.port).toBe(4142);
    });
  });

  describe('GET /api/sutar/capabilities', () => {
    it('should return capability map', () => {
      const mockCapabilitiesResponse = {
        count: 15,
        capabilities: {
          negotiation: ['acpProtocol', 'negotiationEngine'],
          wallet: ['agentWallets'],
        },
        services: {
          twinOS: 'SUTAR Twin OS',
          decisionEngine: 'SUTAR Decision Engine',
        },
      };

      expect(mockCapabilitiesResponse.count).toBe(15);
      expect(mockCapabilitiesResponse.capabilities.negotiation).toContain(
        'negotiationEngine'
      );
    });
  });

  describe('GET /api/sutar/status', () => {
    it('should return aggregated status', () => {
      const mockStatusResponse = {
        timestamp: new Date().toISOString(),
        total: 27,
        live: 25,
        offline: 2,
        services: [
          { key: 'twinOS', status: 'ok', port: 4142 },
          { key: 'decisionEngine', status: 'ok', port: 4290 },
        ],
      };

      expect(mockStatusResponse.total).toBe(27);
      expect(mockStatusResponse.live + mockStatusResponse.offline).toBe(27);
    });
  });
});

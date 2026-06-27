/**
 * HOJAI MemorySDK Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MemorySDK', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should create SDK with default config', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(memory).toBeDefined();
      expect(memory.memory).toBeDefined();
      expect(memory.intelligence).toBeDefined();
      expect(memory.truth).toBeDefined();
    });

    it('should create SDK with custom baseUrl', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS({
        baseUrl: 'http://custom-host:5000',
      });

      expect(memory).toBeDefined();
    });

    it('should create SDK with apiKey', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS({
        apiKey: 'test-key-123',
      });

      expect(memory).toBeDefined();
    });
  });

  describe('MemoryOS Core', () => {
    it('should have memory client', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(memory.memory).toBeDefined();
      expect(typeof memory.memory.store).toBe('function');
      expect(typeof memory.memory.search).toBe('function');
      expect(typeof memory.memory.get).toBe('function');
      expect(typeof memory.memory.delete).toBe('function');
    });

    it('should have confidence client', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(memory.confidence).toBeDefined();
      expect(typeof memory.confidence.getConfidence).toBe('function');
    });

    it('should have context client', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(memory.context).toBeDefined();
      expect(typeof memory.context.composeContext).toBe('function');
    });
  });

  describe('Intelligence Services', () => {
    it('should have intelligence client', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(memory.intelligence).toBeDefined();
      expect(typeof memory.intelligence.remember).toBe('function');
      expect(typeof memory.intelligence.forget).toBe('function');
      expect(typeof memory.intelligence.compress).toBe('function');
      expect(typeof memory.intelligence.merge).toBe('function');
      expect(typeof memory.intelligence.checkContradictions).toBe('function');
    });
  });

  describe('Enterprise Services', () => {
    it('should have relationships client', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(memory.relationships).toBeDefined();
      expect(typeof memory.relationships.createRelationship).toBe('function');
      expect(typeof memory.relationships.getRelationships).toBe('function');
      expect(typeof memory.relationships.findPath).toBe('function');
      expect(typeof memory.relationships.detectCommunities).toBe('function');
    });

    it('should have governance client', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(memory.governance).toBeDefined();
      expect(typeof memory.governance.registerOwnership).toBe('function');
      expect(typeof memory.governance.grantConsent).toBe('function');
      expect(typeof memory.governance.verifyConsent).toBe('function');
      expect(typeof memory.governance.deleteAllData).toBe('function');
      expect(typeof memory.governance.exportAllData).toBe('function');
    });

    it('should have forgetting client', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(memory.forgetting).toBeDefined();
      expect(typeof memory.forgetting.schedule).toBe('function');
      expect(typeof memory.forgetting.undo).toBe('function');
      expect(typeof memory.forgetting.getPolicies).toBe('function');
      expect(typeof memory.forgetting.setPolicy).toBe('function');
    });

    it('should have portability client', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(memory.portability).toBeDefined();
      expect(typeof memory.portability.createExport).toBe('function');
      expect(typeof memory.portability.getExportStatus).toBe('function');
      expect(typeof memory.portability.downloadExport).toBe('function');
    });
  });

  describe('Truth Services', () => {
    it('should have truth client', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(memory.truth).toBeDefined();
      expect(typeof memory.truth.registerSource).toBe('function');
      expect(typeof memory.truth.addStatement).toBe('function');
      expect(typeof memory.truth.verify).toBe('function');
      expect(typeof memory.truth.getTruthScore).toBe('function');
      expect(typeof memory.truth.checkContradiction).toBe('function');
    });
  });

  describe('Multimodal Services', () => {
    it('should have multimodal client', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(memory.multimodal).toBeDefined();
      expect(typeof memory.multimodal.uploadAsset).toBe('function');
      expect(typeof memory.multimodal.extractContent).toBe('function');
      expect(typeof memory.multimodal.search).toBe('function');
      expect(typeof memory.multimodal.getAsset).toBe('function');
    });
  });

  describe('Federation Services', () => {
    it('should have federation client', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(memory.federation).toBeDefined();
      expect(typeof memory.federation.createFederation).toBe('function');
      expect(typeof memory.federation.addMember).toBe('function');
      expect(typeof memory.federation.shareMemory).toBe('function');
      expect(typeof memory.federation.queryShared).toBe('function');
      expect(typeof memory.federation.createSync).toBe('function');
    });
  });

  describe('Quick Actions', () => {
    it('should have remember shortcut', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(typeof memory.remember).toBe('function');
    });

    it('should have recall shortcut', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(typeof memory.recall).toBe('function');
    });

    it('should have verify shortcut', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(typeof memory.verify).toBe('function');
    });

    it('should have getContext shortcut', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(typeof memory.getContext).toBe('function');
    });

    it('should have deleteUserData shortcut', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(typeof memory.deleteUserData).toBe('function');
    });

    it('should have exportUserData shortcut', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(typeof memory.exportUserData).toBe('function');
    });

    it('should have healthCheck shortcut', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      expect(typeof memory.healthCheck).toBe('function');
    });
  });

  describe('Service Ports Configuration', () => {
    it('should have correct ports for all services', async () => {
      const { MemoryOS } = await import('../../src/index');

      const memory = new MemoryOS();

      // Access private property for testing
      const ports = (memory as any).servicePorts;

      expect(ports.memory).toBe(4703);
      expect(ports.confidence).toBe(4152);
      expect(ports.context).toBe(4793);
      expect(ports.intelligence).toBe(4786);
      expect(ports.relationships).toBe(4790);
      expect(ports.governance).toBe(4791);
      expect(ports.forgetting).toBe(4792);
      expect(ports.truth).toBe(4801);
      expect(ports.multimodal).toBe(4802);
      expect(ports.federation).toBe(4803);
    });
  });
});

describe('MemoryOSClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should store memory', async () => {
    mockedAxios.create = vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ data: { id: 'mem_123' } }),
      post: vi.fn().mockResolvedValue({ data: { id: 'mem_123' } }),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: { response: { use: vi.fn() } },
    });

    const { MemoryOSClient } = await import('../../src/index');
    const client = new MemoryOSClient({ baseUrl: 'http://localhost:4703' });

    const result = await client.store({
      userId: 'user_1',
      content: 'Remember this meeting',
    });

    expect(result.success).toBe(true);
  });

  it('should search memories', async () => {
    mockedAxios.create = vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({
        data: { memories: [{ id: 'mem_1', content: 'test' }] },
      }),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: { response: { use: vi.fn() } },
    });

    const { MemoryOSClient } = await import('../../src/index');
    const client = new MemoryOSClient({ baseUrl: 'http://localhost:4703' });

    const result = await client.search({
      query: 'meeting',
      userId: 'user_1',
    });

    expect(result.success).toBe(true);
    expect(result.data.memories).toBeDefined();
  });
});

describe('MemoryGovernanceClient', () => {
  it('should have GDPR methods', async () => {
    const { MemoryGovernanceClient } = await import('../../src/index');

    const client = new MemoryGovernanceClient({ baseUrl: 'http://localhost:4791' });

    expect(typeof client.deleteAllData).toBe('function');
    expect(typeof client.exportAllData).toBe('function');
    expect(typeof client.grantConsent).toBe('function');
    expect(typeof client.verifyConsent).toBe('function');
  });
});

describe('MemoryTruthClient', () => {
  it('should have truth verification methods', async () => {
    const { MemoryTruthClient } = await import('../../src/index');

    const client = new MemoryTruthClient({ baseUrl: 'http://localhost:4801' });

    expect(typeof client.verify).toBe('function');
    expect(typeof client.getTruthScore).toBe('function');
    expect(typeof client.checkContradiction).toBe('function');
    expect(typeof client.registerSource).toBe('function');
    expect(typeof client.addStatement).toBe('function');
  });
});

describe('MemoryFederationClient', () => {
  it('should have federation methods', async () => {
    const { MemoryFederationClient } = await import('../../src/index');

    const client = new MemoryFederationClient({ baseUrl: 'http://localhost:4803' });

    expect(typeof client.createFederation).toBe('function');
    expect(typeof client.shareMemory).toBe('function');
    expect(typeof client.queryShared).toBe('function');
    expect(typeof client.createSync).toBe('function');
  });
});

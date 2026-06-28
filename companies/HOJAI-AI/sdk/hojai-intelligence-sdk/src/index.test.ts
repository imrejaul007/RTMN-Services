/**
 * Intelligence SDK Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntelligenceSDK } from './index';

describe('IntelligenceSDK', () => {
  let sdk: IntelligenceSDK;

  describe('Gateway Mode', () => {
    beforeEach(() => {
      sdk = new IntelligenceSDK({
        gatewayUrl: 'http://localhost:4750',
        apiKey: 'test-token'
      });
    });

    it('should initialize in gateway mode', () => {
      expect(sdk).toBeDefined();
    });

    it('should have ai service', () => {
      expect(sdk.ai).toBeDefined();
      expect(sdk.ai.analyze).toBeDefined();
      expect(sdk.ai.intent).toBeDefined();
      expect(sdk.ai.sentiment).toBeDefined();
    });

    it('should have intent service', () => {
      expect(sdk.intent).toBeDefined();
      expect(sdk.intent.detect).toBeDefined();
    });

    it('should have reasoning service', () => {
      expect(sdk.reasoning).toBeDefined();
      expect(sdk.reasoning.analyze).toBeDefined();
    });

    it('should have predictive service', () => {
      expect(sdk.predictive).toBeDefined();
      expect(sdk.predictive.forecast).toBeDefined();
    });

    it('should have risk service', () => {
      expect(sdk.risk).toBeDefined();
      expect(sdk.risk.fraudScore).toBeDefined();
    });

    it('should have decision service', () => {
      expect(sdk.decision).toBeDefined();
      expect(sdk.decision.recommend).toBeDefined();
    });

    it('should have personalization service', () => {
      expect(sdk.personalization).toBeDefined();
      expect(sdk.personalization.getProfile).toBeDefined();
      expect(sdk.personalization.track).toBeDefined();
    });

    it('should have knowledge service', () => {
      expect(sdk.knowledge).toBeDefined();
      expect(sdk.knowledge.search).toBeDefined();
      expect(sdk.knowledge.getAsset).toBeDefined();
    });

    it('should have events service', () => {
      expect(sdk.events).toBeDefined();
      expect(sdk.events.publish).toBeDefined();
      expect(sdk.events.subscribe).toBeDefined();
    });

    it('should have planning service', () => {
      expect(sdk.planning).toBeDefined();
      expect(sdk.planning.createFromGoal).toBeDefined();
      expect(sdk.planning.execute).toBeDefined();
    });

    it('should have agents service', () => {
      expect(sdk.agents).toBeDefined();
      expect(sdk.agents.create).toBeDefined();
      expect(sdk.agents.execute).toBeDefined();
    });

    it('should have reflection service', () => {
      expect(sdk.reflection).toBeDefined();
      expect(sdk.reflection.score).toBeDefined();
    });

    it('should have proactive service', () => {
      expect(sdk.proactive).toBeDefined();
      expect(sdk.proactive.suggest).toBeDefined();
    });

    it('should support batch processing', () => {
      expect(sdk.batch).toBeDefined();
      expect(typeof sdk.batch).toBe('function');
    });
  });

  describe('Direct Mode', () => {
    beforeEach(() => {
      sdk = new IntelligenceSDK({
        services: {
          aiIntelligence: 'http://localhost:4881',
          intentEngine: 'http://localhost:4786'
        }
      });
    });

    it('should initialize in direct mode', () => {
      expect(sdk).toBeDefined();
    });

    it('should have configured services', () => {
      expect(sdk.ai).toBeDefined();
      expect(sdk.intent).toBeDefined();
    });
  });
});

describe('SDK Methods', () => {
  let sdk: IntelligenceSDK;

  beforeEach(() => {
    sdk = new IntelligenceSDK({
      gatewayUrl: 'http://localhost:4750'
    });
  });

  describe('AI Intelligence', () => {
    it('should have analyze method', () => {
      expect(typeof sdk.ai.analyze).toBe('function');
    });

    it('should have intent method', () => {
      expect(typeof sdk.ai.intent).toBe('function');
    });

    it('should have sentiment method', () => {
      expect(typeof sdk.ai.sentiment).toBe('function');
    });

    it('should have fraud method', () => {
      expect(typeof sdk.ai.fraud).toBe('function');
    });
  });

  describe('Intent Engine', () => {
    it('should have detect method', () => {
      expect(typeof sdk.intent.detect).toBe('function');
    });

    it('should have batch method', () => {
      expect(typeof sdk.intent.batch).toBe('function');
    });
  });

  describe('Reasoning Engine', () => {
    it('should have analyze method', () => {
      expect(typeof sdk.reasoning.analyze).toBe('function');
    });
  });

  describe('Predictive Intelligence', () => {
    it('should have forecast method', () => {
      expect(typeof sdk.predictive.forecast).toBe('function');
    });

    it('should have anomaly method', () => {
      expect(typeof sdk.predictive.anomaly).toBe('function');
    });
  });

  describe('Risk Intelligence', () => {
    it('should have fraudScore method', () => {
      expect(typeof sdk.risk.fraudScore).toBe('function');
    });

    it('should have churnScore method', () => {
      expect(typeof sdk.risk.churnScore).toBe('function');
    });
  });

  describe('Decision Intelligence', () => {
    it('should have recommend method', () => {
      expect(typeof sdk.decision.recommend).toBe('function');
    });

    it('should have nba method', () => {
      expect(typeof sdk.decision.nba).toBe('function');
    });
  });

  describe('Personalization', () => {
    it('should have getProfile method', () => {
      expect(typeof sdk.personalization.getProfile).toBe('function');
    });

    it('should have track method', () => {
      expect(typeof sdk.personalization.track).toBe('function');
    });
  });

  describe('Knowledge', () => {
    it('should have search method', () => {
      expect(typeof sdk.knowledge.search).toBe('function');
    });

    it('should have getAsset method', () => {
      expect(typeof sdk.knowledge.getAsset).toBe('function');
    });

    it('should have createAsset method', () => {
      expect(typeof sdk.knowledge.createAsset).toBe('function');
    });
  });

  describe('Events', () => {
    it('should have publish method', () => {
      expect(typeof sdk.events.publish).toBe('function');
    });

    it('should have subscribe method', () => {
      expect(typeof sdk.events.subscribe).toBe('function');
    });
  });

  describe('Planning', () => {
    it('should have createFromGoal method', () => {
      expect(typeof sdk.planning.createFromGoal).toBe('function');
    });

    it('should have execute method', () => {
      expect(typeof sdk.planning.execute).toBe('function');
    });
  });

  describe('Agents', () => {
    it('should have create method', () => {
      expect(typeof sdk.agents.create).toBe('function');
    });

    it('should have execute method', () => {
      expect(typeof sdk.agents.execute).toBe('function');
    });
  });
});

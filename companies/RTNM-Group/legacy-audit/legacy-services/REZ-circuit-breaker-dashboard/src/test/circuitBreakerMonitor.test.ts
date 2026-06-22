import { CircuitState, ServiceCategory, CircuitBreaker } from '../types';
import winston from 'winston';

// Mock Redis
const mockRedis = {
  hmset: jest.fn().mockResolvedValue('OK'),
  expire: jest.fn().mockResolvedValue(1),
  hgetall: jest.fn().mockResolvedValue({}),
  keys: jest.fn().mockResolvedValue([]),
  lpush: jest.fn().mockResolvedValue(1),
  ltrim: jest.fn().mockResolvedValue('OK'),
  quit: jest.fn().mockResolvedValue('OK')
};

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

describe('CircuitBreakerMonitor', () => {
  let CircuitBreakerMonitor: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      const module = require('../services/circuitBreakerMonitor');
      CircuitBreakerMonitor = module.CircuitBreakerMonitor;
    });
  });

  describe('Circuit State Management', () => {
    it('should initialize with default circuits', () => {
      const monitor = new CircuitBreakerMonitor(mockRedis as any, mockLogger as any);
      const circuits = monitor.getAllCircuits();

      expect(circuits.length).toBeGreaterThan(0);
      expect(circuits.every((c: CircuitBreaker) => c.state === CircuitState.CLOSED)).toBe(true);
    });

    it('should record success and update counts', async () => {
      const monitor = new CircuitBreakerMonitor(mockRedis as any, mockLogger as any);
      const circuitName = monitor.getAllCircuits()[0].name;

      await monitor.recordSuccess(circuitName, 100);

      const circuit = monitor.getCircuit(circuitName);
      expect(circuit?.successfulRequests).toBe(1);
      expect(circuit?.totalRequests).toBe(1);
    });

    it('should record failure and update counts', async () => {
      const monitor = new CircuitBreakerMonitor(mockRedis as any, mockLogger as any);
      const circuitName = monitor.getAllCircuits()[0].name;

      await monitor.recordFailure(circuitName, 'TIMEOUT', 'Request timed out', 5000);

      const circuit = monitor.getCircuit(circuitName);
      expect(circuit?.failedRequests).toBe(1);
      expect(circuit?.totalRequests).toBe(1);
      expect(circuit?.lastFailure).toBeDefined();
    });

    it('should transition to OPEN after reaching failure threshold', async () => {
      const monitor = new CircuitBreakerMonitor(mockRedis as any, mockLogger as any);
      const circuitName = monitor.getAllCircuits()[0].name;
      const circuit = monitor.getCircuit(circuitName)!;

      // Record failures up to threshold
      for (let i = 0; i < circuit.config.failureThreshold; i++) {
        await monitor.recordFailure(circuitName, 'ERROR', 'Test error', 100);
      }

      const updatedCircuit = monitor.getCircuit(circuitName);
      expect(updatedCircuit?.state).toBe(CircuitState.OPEN);
      expect(updatedCircuit?.openedAt).toBeDefined();
    });

    it('should transition to CLOSED after success threshold in HALF_OPEN', async () => {
      const monitor = new CircuitBreakerMonitor(mockRedis as any, mockLogger as any);
      const circuitName = monitor.getAllCircuits()[0].name;

      // Force to HALF_OPEN first
      await monitor.forceState(circuitName, CircuitState.HALF_OPEN);

      // Record successes
      for (let i = 0; i < 3; i++) {
        await monitor.recordSuccess(circuitName, 100);
      }

      const circuit = monitor.getCircuit(circuitName);
      expect(circuit?.state).toBe(CircuitState.CLOSED);
    });

    it('should return to OPEN on failure in HALF_OPEN state', async () => {
      const monitor = new CircuitBreakerMonitor(mockRedis as any, mockLogger as any);
      const circuitName = monitor.getAllCircuits()[0].name;

      // Force to HALF_OPEN
      await monitor.forceState(circuitName, CircuitState.HALF_OPEN);

      // Record a failure
      await monitor.recordFailure(circuitName, 'ERROR', 'Test error', 100);

      const circuit = monitor.getCircuit(circuitName);
      expect(circuit?.state).toBe(CircuitState.OPEN);
    });
  });

  describe('Circuit Filtering', () => {
    it('should filter circuits by state', () => {
      const monitor = new CircuitBreakerMonitor(mockRedis as any, mockLogger as any);

      const closedCircuits = monitor.getCircuitsByState(CircuitState.CLOSED);
      const openCircuits = monitor.getCircuitsByState(CircuitState.OPEN);
      const halfOpenCircuits = monitor.getCircuitsByState(CircuitState.HALF_OPEN);

      expect(closedCircuits.length).toBeGreaterThan(0);
      expect(openCircuits.length).toBe(0);
      expect(halfOpenCircuits.length).toBe(0);
    });

    it('should filter circuits by category', () => {
      const monitor = new CircuitBreakerMonitor(mockRedis as any, mockLogger as any);

      const rabtulCircuits = monitor.getCircuitsByCategory(ServiceCategory.RABTUL);
      const rtnmCircuits = monitor.getCircuitsByCategory(ServiceCategory.RTNM_GROUP);

      expect(rabtulCircuits.length).toBeGreaterThan(0);
      expect(rabtulCircuits.every((c: CircuitBreaker) => c.category === ServiceCategory.RABTUL)).toBe(true);
      expect(rtnmCircuits.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should calculate correct statistics', async () => {
      const monitor = new CircuitBreakerMonitor(mockRedis as any, mockLogger as any);
      const circuitName = monitor.getAllCircuits()[0].name;

      // Add some activity
      await monitor.recordSuccess(circuitName, 100);
      await monitor.recordSuccess(circuitName, 100);
      await monitor.recordFailure(circuitName, 'ERROR', 'Test', 100);

      const stats = monitor.getStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.totalRequests).toBe(3);
      expect(stats.totalSuccesses).toBe(2);
      expect(stats.totalFailures).toBe(1);
      expect(stats.failureRate).toBeGreaterThan(0);
    });
  });

  describe('Manual Interventions', () => {
    it('should force circuit state', async () => {
      const monitor = new CircuitBreakerMonitor(mockRedis as any, mockLogger as any);
      const circuitName = monitor.getAllCircuits()[0].name;

      const result = await monitor.forceState(circuitName, CircuitState.OPEN);

      expect(result).toBe(true);
      const circuit = monitor.getCircuit(circuitName);
      expect(circuit?.state).toBe(CircuitState.OPEN);
    });

    it('should reset counters', async () => {
      const monitor = new CircuitBreakerMonitor(mockRedis as any, mockLogger as any);
      const circuitName = monitor.getAllCircuits()[0].name;

      // Add some activity
      await monitor.recordSuccess(circuitName, 100);
      await monitor.recordFailure(circuitName, 'ERROR', 'Test', 100);

      // Reset counters
      const result = await monitor.resetCounters(circuitName);

      expect(result).toBe(true);
      const circuit = monitor.getCircuit(circuitName);
      expect(circuit?.totalRequests).toBe(0);
      expect(circuit?.failedRequests).toBe(0);
      expect(circuit?.successfulRequests).toBe(0);
    });
  });

  describe('Failure Records', () => {
    it('should record and retrieve failure records', async () => {
      const monitor = new CircuitBreakerMonitor(mockRedis as any, mockLogger as any);
      const circuitName = monitor.getAllCircuits()[0].name;

      await monitor.recordFailure(circuitName, 'TIMEOUT', 'Request timed out', 5000);
      await monitor.recordFailure(circuitName, 'ERROR', 'Connection refused', 100);

      const failures = monitor.getFailureRecords(circuitName, 10);

      expect(failures.length).toBe(2);
      expect(failures[0].errorType).toBe('ERROR');
      expect(failures[1].errorType).toBe('TIMEOUT');
    });

    it('should get all recent failures across circuits', () => {
      const monitor = new CircuitBreakerMonitor(mockRedis as any, mockLogger as any);

      const allFailures = monitor.getAllRecentFailures(100);

      expect(Array.isArray(allFailures)).toBe(true);
    });
  });
});

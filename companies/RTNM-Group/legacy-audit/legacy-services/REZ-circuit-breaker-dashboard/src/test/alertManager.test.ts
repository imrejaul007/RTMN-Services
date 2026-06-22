import { ServiceCategory, AlertEvent } from '../types';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

describe('AlertManager', () => {
  let AlertManager: any;
  let alertManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      const module = require('../services/alertManager');
      AlertManager = module.AlertManager;
    });
    alertManager = new AlertManager(mockLogger as any);
  });

  describe('Alert Configuration', () => {
    it('should have default configuration', () => {
      const configs = alertManager.getAllConfigs();

      expect(configs.length).toBeGreaterThan(0);
      expect(configs.find((c: any) => c.id === 'default')).toBeDefined();
    });

    it('should create new configuration', () => {
      const config = alertManager.configureAlert('test-config', {
        enabled: true,
        channels: { email: true, slack: false, webhook: false },
        thresholds: { failureRatePercent: 50, responseTimeMs: 2000, consecutiveFailures: 3 },
        severity: 'high'
      });

      expect(config).not.toBeNull();
      expect(config?.id).toBe('test-config');
      expect(config?.enabled).toBe(true);
      expect(config?.severity).toBe('high');
    });

    it('should update existing configuration', () => {
      alertManager.configureAlert('default', { enabled: false });

      const config = alertManager.getConfig('default');
      expect(config?.enabled).toBe(false);
    });

    it('should delete custom configurations', () => {
      alertManager.configureAlert('temp-config', { enabled: true });
      const deleted = alertManager.deleteConfig('temp-config');

      expect(deleted).toBe(true);
      expect(alertManager.getConfig('temp-config')).toBeUndefined();
    });

    it('should not delete default configuration', () => {
      const deleted = alertManager.deleteConfig('default');

      expect(deleted).toBe(false);
    });
  });

  describe('Alert Creation', () => {
    it('should create alert event', async () => {
      const alert = await alertManager.createAlert(
        'payment-service',
        ServiceCategory.RABTUL,
        'circuit_open',
        'critical',
        'Circuit breaker opened for payment-service',
        { consecutiveFailures: 5 }
      );

      expect(alert).not.toBeNull();
      expect(alert?.serviceName).toBe('payment-service');
      expect(alert?.type).toBe('circuit_open');
      expect(alert?.severity).toBe('critical');
      expect(alert?.acknowledged).toBe(false);
    });

    it('should deduplicate similar alerts', async () => {
      // Create first alert
      const alert1 = await alertManager.createAlert(
        'test-service',
        ServiceCategory.RABTUL,
        'circuit_open',
        'high',
        'Test alert',
        {}
      );

      // Create duplicate immediately
      const alert2 = await alertManager.createAlert(
        'test-service',
        ServiceCategory.RABTUL,
        'circuit_open',
        'high',
        'Test alert',
        {}
      );

      expect(alert1).not.toBeNull();
      expect(alert2).toBeNull(); // Deduplicated
    });
  });

  describe('Alert Retrieval', () => {
    beforeEach(async () => {
      // Create some alerts
      await alertManager.createAlert('service-1', ServiceCategory.RABTUL, 'circuit_open', 'high', 'Alert 1', {});
      await alertManager.createAlert('service-2', ServiceCategory.REZ_MEDIA, 'high_failure_rate', 'critical', 'Alert 2', {});
      await alertManager.createAlert('service-1', ServiceCategory.RABTUL, 'slow_response', 'medium', 'Alert 3', {});
    });

    it('should retrieve alerts by service', () => {
      const alerts = alertManager.getAlerts('service-1', 10);

      expect(alerts.length).toBe(2);
      expect(alerts.every((a: AlertEvent) => a.serviceName === 'service-1')).toBe(true);
    });

    it('should retrieve unacknowledged alerts', () => {
      const alerts = alertManager.getUnacknowledgedAlerts(10);

      expect(alerts.length).toBe(3);
      expect(alerts.every((a: AlertEvent) => !a.acknowledged)).toBe(true);
    });

    it('should get alert statistics', () => {
      const stats = alertManager.getStats();

      expect(stats.totalAlerts).toBe(3);
      expect(stats.unacknowledgedAlerts).toBe(3);
      expect(stats.alertsBySeverity.high).toBe(1);
      expect(stats.alertsBySeverity.critical).toBe(1);
      expect(stats.alertsBySeverity.medium).toBe(1);
    });
  });

  describe('Alert Acknowledgment', () => {
    it('should acknowledge alert', async () => {
      const alert = await alertManager.createAlert(
        'test-service',
        ServiceCategory.RABTUL,
        'circuit_open',
        'high',
        'Test alert',
        {}
      );

      const acknowledged = alertManager.acknowledgeAlert(alert!.id, 'test-user');

      expect(acknowledged).toBe(true);
      const alerts = alertManager.getAlerts('test-service');
      expect(alerts[0].acknowledged).toBe(true);
      expect(alerts[0].acknowledgedBy).toBe('test-user');
    });

    it('should acknowledge all alerts for service', async () => {
      await alertManager.createAlert('test-service', ServiceCategory.RABTUL, 'alert1', 'high', 'Alert 1', {});
      await alertManager.createAlert('test-service', ServiceCategory.RABTUL, 'alert2', 'medium', 'Alert 2', {});

      const count = alertManager.acknowledgeAllAlerts('test-service', 'admin');

      expect(count).toBe(2);
      const alerts = alertManager.getAlerts('test-service');
      expect(alerts.every((a: AlertEvent) => a.acknowledged)).toBe(true);
    });

    it('should return false for non-existent alert', () => {
      const result = alertManager.acknowledgeAlert('non-existent-id', 'user');

      expect(result).toBe(false);
    });
  });

  describe('Alert Cleanup', () => {
    it('should delete old alerts', async () => {
      // Create old alert manually
      (alertManager as any).alerts.set('old-service', [
        {
          id: 'old-alert',
          timestamp: new Date(Date.now() - 200 * 60 * 60 * 1000), // 200 hours ago
          serviceName: 'old-service',
          category: ServiceCategory.RABTUL,
          type: 'circuit_open',
          severity: 'high' as const,
          message: 'Old alert',
          details: {},
          acknowledged: false
        }
      ]);

      const deleted = alertManager.deleteOldAlerts(168); // 168 hours = 1 week

      expect(deleted).toBe(1);
      expect((alertManager as any).alerts.get('old-service')).toBeUndefined();
    });
  });
});

import { describe, it, expect, vi } from 'vitest';

vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (_req: any, _res: any, next: () => void) => next(),
}));

interface Device {
  id: string; name: string; type: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  location: string; metadata: Record<string, string>;
  lastSeen: string; firmware: string; battery?: number;
}

interface DeviceCommand {
  id: string; deviceId: string; command: string;
  params: Record<string, unknown>;
  status: 'pending' | 'sent' | 'acknowledged' | 'failed';
  createdAt: string; completedAt?: string; result?: unknown;
}

interface Telemetry {
  deviceId: string; timestamp: string;
  metrics: Record<string, number>;
  location?: { lat: number; lng: number };
}

function commandStatusAllowed(from: DeviceCommand['status'], to: DeviceCommand['status']): boolean {
  const transitions: Record<string, string[]> = {
    pending: ['sent'], sent: ['acknowledged', 'failed'],
    acknowledged: [], failed: [],
  };
  return transitions[from]?.includes(to) ?? false;
}

function aggregateTelemetry(telemetry: Telemetry[], windowMs: number): { avg: Record<string, number>; count: number } {
  const cutoff = new Date(Date.now() - windowMs);
  const filtered = telemetry.filter(t => new Date(t.timestamp) >= cutoff);
  const avg: Record<string, number> = {};
  const metricNames = new Set<string>();
  for (const t of filtered) {
    for (const k of Object.keys(t.metrics)) {
      metricNames.add(k);
    }
  }
  for (const metric of metricNames) {
    const values: number[] = [];
    for (const t of filtered) {
      if (t.metrics[metric] !== undefined) {
        values.push(t.metrics[metric]);
      }
    }
    avg[metric] = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
  }
  return { avg, count: filtered.length };
}

describe('PhysicalWorldOS — Device Lifecycle', () => {
  it('defaults to offline status', () => {
    const device: Device = { id: '1', name: 'Test', type: 'sensor', status: 'offline', location: '', metadata: {}, lastSeen: '', firmware: '1.0.0' };
    expect(device.status).toBe('offline');
  });

  it('defaults firmware to 1.0.0', () => {
    const device: Device = { id: '1', name: 'Test', type: 'sensor', status: 'offline', location: '', metadata: {}, lastSeen: '', firmware: '1.0.0' };
    expect(device.firmware).toBe('1.0.0');
  });

  it('supports all device statuses', () => {
    const statuses: Device['status'][] = ['online', 'offline', 'error', 'maintenance'];
    for (const s of statuses) {
      const device: Device = { id: '1', name: 'Test', type: 'sensor', status: s, location: '', metadata: {}, lastSeen: '', firmware: '1.0.0' };
      expect(device.status).toBe(s);
    }
  });
});

describe('PhysicalWorldOS — Command Status Transitions', () => {
  it('pending to sent is valid', () => {
    expect(commandStatusAllowed('pending', 'sent')).toBe(true);
  });

  it('sent to acknowledged is valid', () => {
    expect(commandStatusAllowed('sent', 'acknowledged')).toBe(true);
  });

  it('sent to failed is valid', () => {
    expect(commandStatusAllowed('sent', 'failed')).toBe(true);
  });

  it('acknowledged is terminal', () => {
    expect(commandStatusAllowed('acknowledged', 'pending')).toBe(false);
    expect(commandStatusAllowed('acknowledged', 'sent')).toBe(false);
  });

  it('failed is terminal', () => {
    expect(commandStatusAllowed('failed', 'acknowledged')).toBe(false);
  });
});

describe('PhysicalWorldOS — Telemetry', () => {
  it('aggregates metrics correctly', () => {
    const now = new Date().toISOString();
    const data: Telemetry[] = [
      { deviceId: 'd1', timestamp: now, metrics: { temperature: 25, humidity: 60 } },
      { deviceId: 'd1', timestamp: now, metrics: { temperature: 30, humidity: 65 } },
    ];
    const result = aggregateTelemetry(data, 3600000);
    expect(result.avg['temperature']).toBe(27.5);
    expect(result.avg['humidity']).toBe(62.5);
    expect(result.count).toBe(2);
  });

  it('handles empty telemetry', () => {
    const result = aggregateTelemetry([], 3600000);
    expect(result.count).toBe(0);
    expect(Object.keys(result.avg)).toHaveLength(0);
  });

  it('filters by time window', () => {
    const now = new Date();
    const old = new Date(now.getTime() - 7200000).toISOString();
    const recent = now.toISOString();
    const data: Telemetry[] = [
      { deviceId: 'd1', timestamp: old, metrics: { temp: 10 } },
      { deviceId: 'd1', timestamp: recent, metrics: { temp: 20 } },
    ];
    const result = aggregateTelemetry(data, 3600000);
    expect(result.count).toBe(1);
    expect(result.avg['temp']).toBe(20);
  });
});

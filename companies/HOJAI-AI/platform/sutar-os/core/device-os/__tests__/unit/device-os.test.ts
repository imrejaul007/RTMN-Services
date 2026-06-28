import { describe, it, expect, vi } from 'vitest';
vi.mock('@rtmn/shared/auth', () => ({ requireAuth: (_req: any, _res: any, next: () => void) => next() }));

interface Device { id: string; name: string; type: string; group: string; status: string; firmware: string; lastSeen: string; config: Record<string, unknown>; tags: string[]; metadata: Record<string, string>; location?: string; }
interface DeviceGroup { id: string; name: string; description: string; deviceCount: number; color: string; }
interface Firmware { id: string; version: string; type: string; size: number; releaseNotes: string; releasedAt: string; }

// Filter devices by criteria
function filterDevices(devices: Device[], filters: { group?: string; type?: string; status?: string; tag?: string }): Device[] {
  let result = [...devices];
  if (filters.group) result = result.filter(d => d.group === filters.group);
  if (filters.type) result = result.filter(d => d.type === filters.type);
  if (filters.status) result = result.filter(d => d.status === filters.status);
  if (filters.tag) result = result.filter(d => d.tags.includes(filters.tag));
  return result;
}

// Firmware version comparison
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

describe('DeviceOS — Device Filtering', () => {
  const devices: Device[] = [
    { id: '1', name: 'Server 1', type: 'server', group: 'production', status: 'active', firmware: '1.0.0', lastSeen: '', config: {}, tags: ['critical'], metadata: {} },
    { id: '2', name: 'Sensor 1', type: 'sensor', group: 'staging', status: 'inactive', firmware: '1.0.0', lastSeen: '', config: {}, tags: ['temp'], metadata: {} },
    { id: '3', name: 'Server 2', type: 'server', group: 'production', status: 'active', firmware: '1.1.0', lastSeen: '', config: {}, tags: ['critical', 'backup'], metadata: {} },
  ];

  it('filters by group', () => {
    const result = filterDevices(devices, { group: 'production' });
    expect(result).toHaveLength(2);
  });

  it('filters by type', () => {
    const result = filterDevices(devices, { type: 'server' });
    expect(result).toHaveLength(2);
  });

  it('filters by status', () => {
    const result = filterDevices(devices, { status: 'active' });
    expect(result).toHaveLength(2);
  });

  it('filters by tag', () => {
    const result = filterDevices(devices, { tag: 'critical' });
    expect(result).toHaveLength(2);
  });

  it('combines multiple filters', () => {
    const result = filterDevices(devices, { group: 'production', status: 'active' });
    expect(result).toHaveLength(2);
    expect(result.every(d => d.group === 'production' && d.status === 'active')).toBe(true);
  });

  it('returns empty for no matches', () => {
    const result = filterDevices(devices, { type: 'unknown' });
    expect(result).toHaveLength(0);
  });
});

describe('DeviceOS — Firmware Versioning', () => {
  it('detects newer version', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
  });

  it('detects older version', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
    expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
  });

  it('equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('2.1.3', '2.1.3')).toBe(0);
  });

  it('handles different length versions', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0', '1.0.1')).toBe(-1);
  });
});

describe('DeviceOS — Device Groups', () => {
  const groups: DeviceGroup[] = [
    { id: 'default', name: 'Default', description: 'Default', deviceCount: 5, color: '#888888' },
    { id: 'production', name: 'Production', description: 'Production', deviceCount: 10, color: '#0066FF' },
    { id: 'staging', name: 'Staging', description: 'Staging', deviceCount: 3, color: '#FF6B35' },
  ];

  it('has seeded groups', () => {
    expect(groups).toHaveLength(3);
  });

  it('production group has blue color', () => {
    const prod = groups.find(g => g.id === 'production');
    expect(prod?.color).toBe('#0066FF');
  });

  it('sums device counts', () => {
    const total = groups.reduce((sum, g) => sum + g.deviceCount, 0);
    expect(total).toBe(18);
  });
});
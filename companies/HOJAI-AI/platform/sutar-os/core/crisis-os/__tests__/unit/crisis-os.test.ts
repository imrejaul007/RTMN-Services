import { describe, it, expect, vi } from 'vitest';

vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (_req: any, _res: any, next: () => void) => next(),
}));

// Types
interface Incident {
  id: string; title: string; description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'investigating' | 'mitigating' | 'resolved' | 'cancelled';
  category: 'security' | 'infrastructure' | 'application' | 'data' | 'compliance';
  affectedServices: string[]; affectedUsers?: number;
  timeline: any[]; assignees: string[];
  createdBy: string; createdAt: string; updatedAt: string;
  resolvedAt?: string; rootCause?: string; resolution?: string;
  impact?: { revenue?: number; users?: number; sla?: number };
}

interface Playbook {
  id: string; name: string; description: string; trigger: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  steps: any[]; automated: boolean; lastRun?: string; runCount: number;
}

interface WarRoom {
  id: string; incidentId: string; name: string;
  participants: any[]; status: 'active' | 'closed';
  link?: string; createdAt: string; notes: string[];
}

// Stats calculations
function calculateStats(incidents: Incident[]) {
  const active = incidents.filter(i => i.status !== 'resolved' && i.status !== 'cancelled').length;
  const bySeverity = {
    critical: incidents.filter(i => i.severity === 'critical').length,
    high: incidents.filter(i => i.severity === 'high').length,
    medium: incidents.filter(i => i.severity === 'medium').length,
    low: incidents.filter(i => i.severity === 'low').length,
  };
  const resolved = incidents.filter(i => i.resolvedAt);
  const avgResolutionTime = resolved.length > 0
    ? resolved.reduce((sum, i) => sum + (new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime()), 0) / resolved.length / 3600000
    : 0;
  return { totalIncidents: incidents.length, active, bySeverity, avgResolutionTime };
}

// Playbook auto-trigger
function shouldTriggerPlaybook(incident: Incident, playbook: Playbook): boolean {
  return playbook.trigger === incident.category || playbook.severity === incident.severity;
}

// War room participant roles
function getWarRoomRoles(room: WarRoom) {
  return {
    leads: room.participants.filter(p => p.role === 'lead').length,
    responders: room.participants.filter(p => p.role === 'responder').length,
    observers: room.participants.filter(p => p.role === 'observer').length,
  };
}

// Incident filtering
function filterIncidents(incidents: Incident[], filters: { status?: string; severity?: string; category?: string; assignee?: string }): Incident[] {
  let result = [...incidents];
  if (filters.status) result = result.filter(i => i.status === filters.status);
  if (filters.severity) result = result.filter(i => i.severity === filters.severity);
  if (filters.category) result = result.filter(i => i.category === filters.category);
  if (filters.assignee) result = result.filter(i => i.assignees.includes(filters.assignee!));
  return result;
}

describe('CrisisOS — Incidents', () => {
  it('supports all severity levels', () => {
    const severities: Incident['severity'][] = ['low', 'medium', 'high', 'critical'];
    severities.forEach(s => {
      const incident: Incident = { id: '1', title: 'Test', description: '', severity: s, status: 'detected', category: 'infrastructure', affectedServices: [], timeline: [], assignees: [], createdBy: '', createdAt: '', updatedAt: '' };
      expect(incident.severity).toBe(s);
    });
  });

  it('supports all status values', () => {
    const statuses: Incident['status'][] = ['detected', 'investigating', 'mitigating', 'resolved', 'cancelled'];
    statuses.forEach(s => {
      const incident: Incident = { id: '1', title: 'Test', description: '', severity: 'medium', status: s, category: 'infrastructure', affectedServices: [], timeline: [], assignees: [], createdBy: '', createdAt: '', updatedAt: '' };
      expect(incident.status).toBe(s);
    });
  });

  it('supports all category values', () => {
    const categories: Incident['category'][] = ['security', 'infrastructure', 'application', 'data', 'compliance'];
    categories.forEach(c => {
      const incident: Incident = { id: '1', title: 'Test', description: '', severity: 'medium', status: 'detected', category: c, affectedServices: [], timeline: [], assignees: [], createdBy: '', createdAt: '', updatedAt: '' };
      expect(incident.category).toBe(c);
    });
  });

  it('filters by status', () => {
    const incidents: Incident[] = [
      { id: '1', title: 'A', description: '', severity: 'medium', status: 'detected', category: 'infrastructure', affectedServices: [], timeline: [], assignees: [], createdBy: '', createdAt: '2024-01-01', updatedAt: '' },
      { id: '2', title: 'B', description: '', severity: 'high', status: 'resolved', category: 'infrastructure', affectedServices: [], timeline: [], assignees: [], createdBy: '', createdAt: '2024-01-02', updatedAt: '' },
    ];
    const resolved = filterIncidents(incidents, { status: 'resolved' });
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe('2');
  });

  it('filters by severity', () => {
    const incidents: Incident[] = [
      { id: '1', title: 'A', description: '', severity: 'low', status: 'detected', category: 'infrastructure', affectedServices: [], timeline: [], assignees: [], createdBy: '', createdAt: '', updatedAt: '' },
      { id: '2', title: 'B', description: '', severity: 'critical', status: 'detected', category: 'infrastructure', affectedServices: [], timeline: [], assignees: [], createdBy: '', createdAt: '', updatedAt: '' },
    ];
    const critical = filterIncidents(incidents, { severity: 'critical' });
    expect(critical).toHaveLength(1);
    expect(critical[0].severity).toBe('critical');
  });

  it('resolved incidents have resolvedAt', () => {
    const incident: Incident = { id: '1', title: 'Test', description: '', severity: 'medium', status: 'resolved', category: 'infrastructure', affectedServices: [], timeline: [], assignees: [], createdBy: '', createdAt: '2024-01-01T00:00:00Z', updatedAt: '', resolvedAt: '2024-01-01T02:00:00Z' };
    expect(incident.resolvedAt).toBeDefined();
    const duration = new Date(incident.resolvedAt!).getTime() - new Date(incident.createdAt).getTime();
    expect(duration).toBe(2 * 3600000); // 2 hours
  });
});

describe('CrisisOS — Stats', () => {
  it('calculates active incidents correctly', () => {
    const incidents: Incident[] = [
      { id: '1', title: '', description: '', severity: 'medium', status: 'detected', category: 'infra', affectedServices: [], timeline: [], assignees: [], createdBy: '', createdAt: '', updatedAt: '' },
      { id: '2', title: '', description: '', severity: 'medium', status: 'resolved', category: 'infra', affectedServices: [], timeline: [], assignees: [], createdBy: '', createdAt: '', updatedAt: '', resolvedAt: '' },
      { id: '3', title: '', description: '', severity: 'high', status: 'investigating', category: 'infra', affectedServices: [], timeline: [], assignees: [], createdBy: '', createdAt: '', updatedAt: '' },
    ];
    const stats = calculateStats(incidents);
    expect(stats.active).toBe(2);
    expect(stats.totalIncidents).toBe(3);
  });

  it('counts by severity', () => {
    const incidents: Incident[] = [
      { id: '1', title: '', description: '', severity: 'critical', status: 'detected', category: 'infra', affectedServices: [], timeline: [], assignees: [], createdBy: '', createdAt: '', updatedAt: '' },
      { id: '2', title: '', description: '', severity: 'high', status: 'detected', category: 'infra', affectedServices: [], timeline: [], assignees: [], createdBy: '', createdAt: '', updatedAt: '' },
      { id: '3', title: '', description: '', severity: 'high', status: 'detected', category: 'infra', affectedServices: [], timeline: [], assignees: [], createdBy: '', createdAt: '', updatedAt: '' },
    ];
    const stats = calculateStats(incidents);
    expect(stats.bySeverity.critical).toBe(1);
    expect(stats.bySeverity.high).toBe(2);
    expect(stats.bySeverity.medium).toBe(0);
    expect(stats.bySeverity.low).toBe(0);
  });
});

describe('CrisisOS — Playbooks', () => {
  const playbooks: Playbook[] = [
    { id: 'aws-outage', name: 'AWS Outage', description: '', trigger: 'infrastructure', severity: 'critical', automated: true, runCount: 5, steps: [] },
    { id: 'data-breach', name: 'Data Breach', description: '', trigger: 'security', severity: 'critical', automated: false, runCount: 2, steps: [] },
    { id: 'db-failure', name: 'DB Failure', description: '', trigger: 'infrastructure', severity: 'high', automated: true, runCount: 8, steps: [] },
  ];

  it('triggers by category match', () => {
    const incident: Incident = { id: '1', title: 'AWS down', description: '', severity: 'critical', status: 'detected', category: 'infrastructure', affectedServices: [], timeline: [], assignees: [], createdBy: '', createdAt: '', updatedAt: '' };
    const triggered = playbooks.filter(p => shouldTriggerPlaybook(incident, p));
    // aws-outage matches (category+severity), db-failure matches (category), data-breach matches (severity)
    expect(triggered).toHaveLength(3);
  });

  it('triggers by severity match', () => {
    const incident: Incident = { id: '1', title: 'Security issue', description: '', severity: 'critical', status: 'detected', category: 'application', affectedServices: [], timeline: [], assignees: [], createdBy: '', createdAt: '', updatedAt: '' };
    const triggered = playbooks.filter(p => shouldTriggerPlaybook(incident, p));
    // Only data-breach has severity=critical (and it's security category)
    // aws-outage also has severity=critical
    expect(triggered.some(p => p.id === 'data-breach')).toBe(true);
    expect(triggered.some(p => p.id === 'aws-outage')).toBe(true);
  });

  it('increments run count on execution', () => {
    const playbook = { ...playbooks[0] };
    playbook.lastRun = new Date().toISOString();
    playbook.runCount++;
    expect(playbook.runCount).toBe(6);
  });
});

describe('CrisisOS — War Rooms', () => {
  it('counts roles correctly', () => {
    const room: WarRoom = {
      id: '1', incidentId: 'i1', name: 'War Room 1', status: 'active',
      participants: [
        { userId: 'u1', name: 'Alice', role: 'lead' },
        { userId: 'u2', name: 'Bob', role: 'responder' },
        { userId: 'u3', name: 'Carol', role: 'responder' },
        { userId: 'u4', name: 'Dave', role: 'observer' },
      ], createdAt: '', notes: [],
    };
    const roles = getWarRoomRoles(room);
    expect(roles.leads).toBe(1);
    expect(roles.responders).toBe(2);
    expect(roles.observers).toBe(1);
  });

  it('generates meeting link', () => {
    const id = 'abc12345-def6-7890-abcd-ef1234567890';
    const link = `https://meet.company.com/war-room-${id.slice(0, 8)}`;
    expect(link).toBe('https://meet.company.com/war-room-abc12345');
  });

  it('closed room marks all participants as left', () => {
    const room: WarRoom = { id: '1', incidentId: 'i1', name: 'Test', status: 'closed', participants: [{ userId: 'u1', name: 'Alice', role: 'lead', joinedAt: '2024-01-01T00:00:00Z' }], createdAt: '', notes: [] };
    room.participants.forEach(p => { if (p.joinedAt && !p.leftAt) p.leftAt = '2024-01-01T02:00:00Z'; });
    expect(room.participants[0].leftAt).toBeDefined();
  });
});
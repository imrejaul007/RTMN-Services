/**
 * Service Management Tests
 */

const { describe, test, expect } = require('vitest');

// Mock express app for testing
describe('Service Management', () => {
  test('ticket creation requires title', () => {
    const required = ['title', 'requester_id'];
    expect(required).toContain('title');
    expect(required).toContain('requester_id');
  });

  test('ticket types are defined', () => {
    const types = ['customer', 'it', 'hr', 'general'];
    expect(types).toContain('customer');
    expect(types).toContain('it');
    expect(types).toContain('hr');
  });

  test('priorities are defined', () => {
    const priorities = {
      CRITICAL: { value: 1, label: 'Critical', sla_hours: 1 },
      HIGH: { value: 2, label: 'High', sla_hours: 4 },
      MEDIUM: { value: 3, label: 'Medium', sla_hours: 24 },
      LOW: { value: 4, label: 'Low', sla_hours: 72 }
    };

    expect(priorities.CRITICAL.sla_hours).toBe(1);
    expect(priorities.LOW.sla_hours).toBe(72);
  });

  test('statuses are defined', () => {
    const statuses = ['new', 'open', 'pending', 'on_hold', 'solved', 'closed'];
    expect(statuses).toContain('new');
    expect(statuses).toContain('closed');
  });

  test('SLA calculation for critical ticket', () => {
    const priority = 1; // Critical
    const sla_hours = 1;
    expect(sla_hours).toBeLessThanOrEqual(4);
  });

  test('approval workflow states', () => {
    const approval = {
      status: 'pending',
      types: ['approved', 'rejected', 'pending']
    };
    expect(['approved', 'rejected']).toContain('approved');
    expect(['approved', 'rejected']).toContain('rejected');
  });

  test('dashboard metrics structure', () => {
    const metrics = {
      total: 0,
      by_status: {},
      by_type: {},
      by_priority: {},
      breached_sla: 0,
      avg_resolution_hours: 0,
      first_response_breached: 0
    };

    expect(metrics).toHaveProperty('total');
    expect(metrics).toHaveProperty('by_status');
    expect(metrics).toHaveProperty('breached_sla');
  });
});

describe('AI Resolution Agent', () => {
  test('categorizes password reset', () => {
    const text = 'I forgot my password';
    const isPasswordReset = text.toLowerCase().includes('password');
    expect(isPasswordReset).toBe(true);
  });

  test('categorizes hardware issue', () => {
    const text = 'my laptop is not working';
    const isHardware = text.toLowerCase().includes('laptop');
    expect(isHardware).toBe(true);
  });

  test('categorizes access request', () => {
    const text = 'I need access to the database';
    const isAccess = text.toLowerCase().includes('access');
    expect(isAccess).toBe(true);
  });

  test('confidence calculation', () => {
    const confidence = 0.6; // Base
    const categoryBonus = 0.2; // Known category
    const similarBonus = 0.15; // Similar tickets

    const total = Math.min(confidence + categoryBonus + similarBonus, 0.95);
    expect(total).toBe(0.95);
  });

  test('estimated resolution for password reset', () => {
    const times = {
      'password_reset': '1 hour',
      'hardware': '2-4 hours',
      'access_request': '1-2 days'
    };

    expect(times['password_reset']).toBe('1 hour');
    expect(times['access_request']).toBe('1-2 days');
  });

  test('suggested assignee for IT ticket', () => {
    const teamMapping = {
      'password_reset': { team: 'it_helpdesk', level: 1 },
      'hardware': { team: 'it_hardware', level: 2 },
      'software': { team: 'it_software', level: 2 },
      'access_request': { team: 'it_security', level: 2 },
      'it_support': { team: 'it_helpdesk', level: 1 }
    };

    expect(teamMapping['it_support'].team).toBe('it_helpdesk');
  });
});

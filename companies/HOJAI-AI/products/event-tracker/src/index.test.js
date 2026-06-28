/**
 * Unit tests for Event Tracker
 */
import { describe, it, expect } from 'vitest';

function validateEvent(event) {
  if (!event || typeof event !== 'object') return { valid: false, error: 'Invalid event' };
  if (!event.type) return { valid: false, error: 'Missing event type' };
  if (!event.timestamp) return { valid: false, error: 'Missing timestamp' };
  return { valid: true };
}

function normalizeEvent(event) {
  return {
    type: event.type?.toLowerCase().replace(/\s+/g, '_'),
    timestamp: event.timestamp || new Date().toISOString(),
    properties: event.properties || {},
    visitorId: event.visitorId || event.sessionId || null
  };
}

function groupEvents(events, groupBy) {
  const groups = {};
  for (const event of events) {
    const key = groupBy === 'type' ? event.type : event.timestamp?.split('T')[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
  }
  return groups;
}

describe('Event Tracker', () => {
  it('should validate complete events', () => {
    const event = { type: 'page_view', timestamp: new Date().toISOString() };
    expect(validateEvent(event).valid).toBe(true);
  });

  it('should reject events without type', () => {
    const event = { timestamp: new Date().toISOString() };
    expect(validateEvent(event).valid).toBe(false);
  });

  it('should reject null events', () => {
    expect(validateEvent(null).valid).toBe(false);
  });

  it('should normalize events', () => {
    const event = { type: 'Page View', visitorId: 'v123' };
    const normalized = normalizeEvent(event);
    expect(normalized.type).toBe('page_view');
    expect(normalized.visitorId).toBe('v123');
  });

  it('should add timestamp if missing', () => {
    const event = { type: 'click' };
    const normalized = normalizeEvent(event);
    expect(normalized.timestamp).toBeDefined();
  });

  it('should group events by type', () => {
    const events = [
      { type: 'page_view', timestamp: '2024-01-01T10:00:00Z' },
      { type: 'page_view', timestamp: '2024-01-01T11:00:00Z' },
      { type: 'click', timestamp: '2024-01-01T12:00:00Z' }
    ];
    const groups = groupEvents(events, 'type');
    expect(groups['page_view'].length).toBe(2);
    expect(groups['click'].length).toBe(1);
  });

  it('should group events by date', () => {
    const events = [
      { type: 'a', timestamp: '2024-01-01T10:00:00Z' },
      { type: 'b', timestamp: '2024-01-01T11:00:00Z' },
      { type: 'c', timestamp: '2024-01-02T10:00:00Z' }
    ];
    const groups = groupEvents(events, 'date');
    expect(groups['2024-01-01'].length).toBe(2);
    expect(groups['2024-01-02'].length).toBe(1);
  });
});

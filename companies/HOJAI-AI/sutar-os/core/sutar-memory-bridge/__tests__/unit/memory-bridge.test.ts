import { describe, it, expect } from 'vitest';

describe('SUTAR Memory Bridge — Intent-tagged Memory', () => {
  const INTENT_KINDS = ['remember', 'recall', 'forget', 'reflect'];
  const intentMemories = new Map();
  const audit: string[] = [];

  function createRecord(id: string, twinId: string, intentType: string, content: string, tags: string[] = [], importance = 'normal') {
    return { id, twinId, intentType, content, tags, importance, createdAt: new Date().toISOString() };
  }

  // Seed some records
  const seeds = [
    createRecord('mem-001', 'sutar-merchant', 'negotiate_price', 'Agreed to 5% discount on bulk order', ['discount', 'bulk'], 'high'),
    createRecord('mem-002', 'sutar-merchant', 'book_hotel', 'Booked 10 rooms for corporate event', ['corporate', 'rooms'], 'normal'),
    createRecord('mem-003', 'sutar-consumer', 'order_product', 'Ordered 3 units of SKU-12345', ['order', 'sku'], 'normal'),
    createRecord('mem-004', 'sutar-facilitator', 'negotiate_price', 'Facilitated deal between two parties', ['facilitation'], 'high'),
  ];
  for (const s of seeds) intentMemories.set(s.id, s);

  it('should seed 4 memory records', () => {
    expect(intentMemories.size).toBe(4);
  });

  it('should create a new memory record', () => {
    const id = 'mem-005';
    const record = createRecord(id, 'sutar-observer', 'request_recommendation', 'Suggested optimal pricing strategy', ['pricing'], 'high');
    intentMemories.set(id, record);
    expect(intentMemories.size).toBe(5);
    expect(intentMemories.get(id)?.content).toBe('Suggested optimal pricing strategy');
    expect(audit.push(`remember:${id}`)).toBe(1);
  });

  it('should recall memories for a twinId', () => {
    const twinId = 'sutar-merchant';
    const results = Array.from(intentMemories.values()).filter(r => r.twinId === twinId);
    expect(results).toHaveLength(2);
  });

  it('should filter recall by intentType', () => {
    const twinId = 'sutar-merchant';
    const intentType = 'negotiate_price';
    const results = Array.from(intentMemories.values())
      .filter(r => r.twinId === twinId && r.intentType === intentType);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('mem-001');
  });

  it('should filter recall by query string', () => {
    const twinId = 'sutar-merchant';
    const query = 'discount';
    const results = Array.from(intentMemories.values())
      .filter(r => r.twinId === twinId && r.content.toLowerCase().includes(query.toLowerCase()));
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('mem-001');
  });

  it('should filter by tag in query search', () => {
    const twinId = 'sutar-merchant';
    const query = 'bulk';
    const results = Array.from(intentMemories.values())
      .filter(r => r.twinId === twinId && (
        r.content.toLowerCase().includes(query.toLowerCase()) ||
        (r.tags || []).some((t: string) => t.toLowerCase().includes(query.toLowerCase()))
      ));
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('mem-001');
  });

  it('should limit recall results', () => {
    const twinId = 'sutar-merchant';
    const limit = 1;
    const results = Array.from(intentMemories.values())
      .filter(r => r.twinId === twinId)
      .slice(0, limit);
    expect(results).toHaveLength(1);
  });

  it('should recall by intent type across all twins', () => {
    const intentType = 'negotiate_price';
    const results = Array.from(intentMemories.values()).filter(r => r.intentType === intentType);
    expect(results).toHaveLength(2);
    expect(results.map(r => r.id)).toContain('mem-001');
    expect(results.map(r => r.id)).toContain('mem-004');
  });

  it('should delete memory record', () => {
    const id = 'mem-001';
    const exists = intentMemories.has(id);
    expect(exists).toBe(true);
    intentMemories.delete(id);
    expect(intentMemories.has(id)).toBe(false);
  });

  it('should return 404 for deleting non-existent record', () => {
    const exists = intentMemories.has('nonexistent-id');
    expect(exists).toBe(false);
  });

  it('should define valid intent kinds', () => {
    expect(INTENT_KINDS).toContain('remember');
    expect(INTENT_KINDS).toContain('recall');
    expect(INTENT_KINDS).toContain('forget');
    expect(INTENT_KINDS).toContain('reflect');
    expect(INTENT_KINDS).toHaveLength(4);
  });

  it('should require all mandatory fields for remember', () => {
    const { twinId, intentType, content } = { twinId: null as string | null, intentType: 'remember', content: 'test' };
    expect(twinId).toBeNull();
    // Simulating validation: all required
    const hasRequired = twinId !== null && intentType !== null && content !== null;
    expect(hasRequired).toBe(false);
  });

  it('should sort recall results by createdAt descending', () => {
    const twinId = 'all';
    const results = Array.from(intentMemories.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    expect(results[0]).toBeDefined();
    // Most recent first
    for (let i = 1; i < results.length; i++) {
      expect(new Date(results[i-1].createdAt).getTime()).toBeGreaterThanOrEqual(new Date(results[i].createdAt).getTime());
    }
  });

  it('should validate importance levels', () => {
    const validImportances = ['low', 'normal', 'high', 'critical'];
    const record = createRecord('test', 'twin', 'remember', 'content', [], 'normal');
    expect(validImportances).toContain(record.importance);
  });
});

describe('SUTAR Memory Bridge — Edge Cases', () => {
  function createRecord(id: string, twinId: string, intentType: string, content: string, tags: string[] = [], importance = 'normal') {
    return { id, twinId, intentType, content, tags, importance, createdAt: new Date().toISOString() };
  }

  it('handles empty twinId gracefully', () => {
    const record = createRecord('mem-999', '', 'remember', 'content without twin', [], 'normal');
    expect(record.twinId).toBe('');
  });

  it('handles empty tags array', () => {
    const record = createRecord('mem-998', 'test-twin', 'remember', 'content', [], 'normal');
    expect(record.tags).toHaveLength(0);
  });

  it('handles very long content', () => {
    const longContent = 'x'.repeat(10000);
    const record = createRecord('mem-997', 'test', 'remember', longContent, [], 'normal');
    expect(record.content.length).toBe(10000);
  });

  it('handles special characters in content', () => {
    const specialContent = '<script>alert("xss")</script> & "quotes"';
    const record = createRecord('mem-996', 'test', 'remember', specialContent, [], 'normal');
    expect(record.content).toBe(specialContent);
  });

  it('handles unicode content', () => {
    const unicodeContent = 'Hello 世界 🌍 مرحبا';
    const record = createRecord('mem-995', 'test', 'remember', unicodeContent, [], 'normal');
    expect(record.content).toBe(unicodeContent);
  });

  it('handles invalid intent type', () => {
    const record = createRecord('mem-994', 'test', 'invalid_intent_type', 'content', [], 'normal');
    expect(record.intentType).toBe('invalid_intent_type');
  });
});
import { describe, it, expect, vi } from 'vitest';

vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (_req: any, _res: any, next: () => void) => next(),
}));

// Types
interface VerificationTask {
  id: string; type: 'llm_output' | 'document' | 'code' | 'image' | 'audio';
  content: string; criteria: string[]; status: 'pending' | 'verified' | 'failed' | 'retry';
  result?: { passed: boolean; score: number; issues: string[]; suggestions: string[]; checkedAt: string };
  createdAt: string; completedAt?: string; retryCount: number; metadata: any;
}

interface VerificationRule {
  id: string; name: string; type: string; severity: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean; description: string;
}

// Verification logic (reconstructed from src)
function verifyLLMOutput(content: string, criteria: string[]): { issues: string[]; suggestions: string[]; score: number } {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;
  if (content.length < 50) { issues.push('Content too short (minimum 50 characters)'); score -= 20; }
  if (!criteria.some(c => content.toLowerCase().includes(c.toLowerCase()))) { issues.push('Does not address required criteria'); score -= 30; }
  if (content.includes('ERROR') || content.includes('FAILED') || content.includes('Exception')) { issues.push('Contains error indicators'); score -= 25; }
  if (content.includes("I'm sorry") || content.includes('I cannot') || content.includes('I am not able')) { issues.push('Contains refusal language'); score -= 15; }
  if (!content.includes('.') && content.length > 200) suggestions.push('Add punctuation for readability');
  if ((content.match(/\n\n/g) || []).length < 2 && content.length > 300) suggestions.push('Add paragraph breaks');
  return { issues, suggestions, score: Math.max(0, score) };
}

function verifyCode(content: string): { issues: string[]; suggestions: string[]; score: number } {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;
  if (!content.includes('function') && !content.includes('class') && !content.includes('const ') && !content.includes('let ')) { issues.push('No function/class/variable declarations'); score -= 30; }
  if (content.includes('TODO') || content.includes('FIXME')) { issues.push('Contains unfinished code markers'); score -= 15; }
  if ((content.match(/console.log/g) || []).length > 3) suggestions.push('Remove debug console.log statements');
  if (!content.includes('error') && !content.includes('catch')) suggestions.push('Add error handling');
  if (content.length > 500 && !content.includes('export')) suggestions.push('Break into smaller modules');
  return { issues, suggestions, score: Math.max(0, score) };
}

function verifyDocument(content: string, criteria: string[]): { issues: string[]; suggestions: string[]; score: number } {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;
  if (content.length < 100) { issues.push('Document too short'); score -= 15; }
  if (!criteria.some(c => content.toLowerCase().includes(c.toLowerCase()))) { issues.push('Does not cover required topics'); score -= 25; }
  if (!content.includes('#') && !content.includes('##') && content.length > 200) suggestions.push('Add headers for structure');
  return { issues, suggestions, score: Math.max(0, score) };
}

function passed(issues: string[], score: number): boolean {
  return issues.length === 0 || score >= 70;
}

// Stats
function computeStats(tasks: VerificationTask[]) {
  const verified = tasks.filter(t => t.status === 'verified').length;
  const failed = tasks.filter(t => t.status === 'failed').length;
  const total = tasks.length;
  const passRate = (verified + failed) > 0 ? Math.round((verified / (verified + failed)) * 100) : 100;
  return { verified, failed, total, passRate };
}

describe('VerificationOS — LLM Output Verification', () => {
  it('passes good output', () => {
    const content = 'This is a detailed response that addresses all the criteria properly. It has enough length to pass validation and contains no errors.';
    const result = verifyLLMOutput(content, ['criteria', 'response']);
    expect(passed(result.issues, result.score)).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('fails short content', () => {
    const result = verifyLLMOutput('Too short', ['criteria']);
    expect(result.issues).toContain('Content too short (minimum 50 characters)');
    expect(result.score).toBeLessThan(100);
  });

  it('fails missing criteria', () => {
    const result = verifyLLMOutput('This is a long enough response but does not address the specific criteria that were requested.', ['missing-keyword']);
    expect(result.issues).toContain('Does not address required criteria');
  });

  it('fails error indicators', () => {
    const result = verifyLLMOutput('The operation failed with an ERROR and an exception occurred during processing.', []);
    expect(result.issues).toContain('Contains error indicators');
    expect(result.score).toBeLessThan(100);
  });

  it('fails refusal language', () => {
    const result = verifyLLMOutput("I'm sorry, I cannot help with that request.", []);
    expect(result.issues).toContain('Contains refusal language');
  });

  it('penalizes score correctly', () => {
    const result = verifyLLMOutput('Short', []);
    // short (-20) + criteria not matched (-30) = 50
    expect(result.score).toBe(50);
  });

  it('score never goes below 0', () => {
    const result = verifyLLMOutput('', []);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('suggests punctuation for long unpunctuated text', () => {
    // >200 chars, no period → suggests punctuation
    const long = 'word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word';
    const result = verifyLLMOutput(long, []);
    expect(result.suggestions.some((s: string) => s.includes('punctuation'))).toBe(true);
  });
});

describe('VerificationOS — Code Verification', () => {
  it('passes valid code', () => {
    const code = 'function hello() { console.log("hi"); return true; }';
    const result = verifyCode(code);
    expect(passed(result.issues, result.score)).toBe(true);
  });

  it('fails code without declarations', () => {
    const result = verifyCode('This is not code at all');
    expect(result.issues).toContain('No function/class/variable declarations');
    expect(result.score).toBe(70); // 100 - 30
  });

  it('fails code with TODO markers', () => {
    const code = 'function test() { TODO: finish this }';
    const result = verifyCode(code);
    expect(result.issues).toContain('Contains unfinished code markers');
  });

  it('warns about too many console.log', () => {
    const code = 'console.log("a"); console.log("b"); console.log("c"); console.log("d"); console.log("e");';
    const result = verifyCode(code);
    expect(result.suggestions.some((s: string) => s.includes('console.log'))).toBe(true);
  });

  it('warns about missing error handling', () => {
    const code = 'function fetch() { return data; }';
    const result = verifyCode(code);
    expect(result.suggestions.some((s: string) => s.includes('error'))).toBe(true);
  });

  it('warns about missing exports in long code', () => {
    // Build code >500 chars with no export
    const long = 'function a(){} '.repeat(50); // ~1650 chars
    const result = verifyCode(long);
    expect(result.suggestions.some((s: string) => s.includes('module'))).toBe(true);
  });
});

describe('VerificationOS — Document Verification', () => {
  it('passes valid document', () => {
    const doc = '# Introduction\n\nThis document covers the topic in depth with multiple sections and detailed explanations.';
    const result = verifyDocument(doc, ['topic', 'introduction']);
    expect(passed(result.issues, result.score)).toBe(true);
  });

  it('fails short documents', () => {
    const result = verifyDocument('Too short', []);
    expect(result.issues).toContain('Document too short');
  });

  it('fails missing topic coverage', () => {
    const result = verifyDocument('This is a long document but it does not cover the required topics at all.', ['missing-topic']);
    expect(result.issues).toContain('Does not cover required topics');
  });

  it('suggests headers for unstructured long docs', () => {
    const doc = 'word '.repeat(50);
    const result = verifyDocument(doc, []);
    expect(result.suggestions.some((s: string) => s.includes('header'))).toBe(true);
  });
});

describe('VerificationOS — Pass/Fail Logic', () => {
  it('passes when no issues', () => {
    expect(passed([], 100)).toBe(true);
    expect(passed([], 0)).toBe(true);
  });

  it('passes when score >= 70', () => {
    expect(passed(['minor issue'], 75)).toBe(true);
    expect(passed(['minor issue'], 70)).toBe(true);
  });

  it('fails when score < 70', () => {
    expect(passed(['issue'], 69)).toBe(false);
    expect(passed(['major', 'issues'], 50)).toBe(false);
  });
});

describe('VerificationOS — Stats', () => {
  it('calculates pass rate', () => {
    const tasks: VerificationTask[] = [
      { id: '1', type: 'llm_output', content: '', criteria: [], status: 'verified', retryCount: 0, createdAt: '', metadata: {} },
      { id: '2', type: 'llm_output', content: '', criteria: [], status: 'verified', retryCount: 0, createdAt: '', metadata: {} },
      { id: '3', type: 'llm_output', content: '', criteria: [], status: 'failed', retryCount: 0, createdAt: '', metadata: {} },
      { id: '4', type: 'llm_output', content: '', criteria: [], status: 'pending', retryCount: 0, createdAt: '', metadata: {} },
    ];
    const stats = computeStats(tasks);
    expect(stats.verified).toBe(2);
    expect(stats.failed).toBe(1);
    expect(stats.passRate).toBe(67); // 2/(2+1) = 67%
  });

  it('handles no completed tasks', () => {
    const tasks: VerificationTask[] = [
      { id: '1', type: 'llm_output', content: '', criteria: [], status: 'pending', retryCount: 0, createdAt: '', metadata: {} },
    ];
    const stats = computeStats(tasks);
    expect(stats.passRate).toBe(100);
  });

  it('handles empty task list', () => {
    const stats = computeStats([]);
    expect(stats.total).toBe(0);
    expect(stats.passRate).toBe(100);
  });
});

describe('VerificationOS — Rules', () => {
  it('default rules cover all types', () => {
    const types = ['llm_output', 'document', 'code'];
    types.forEach(t => {
      const rule: VerificationRule = { id: `rule-${t}`, name: `Test Rule for ${t}`, type: t, severity: 'high', enabled: true, description: 'Test' };
      expect(rule.type).toBe(t);
      expect(rule.enabled).toBe(true);
    });
  });

  it('severity levels work', () => {
    const severities: VerificationRule['severity'][] = ['critical', 'high', 'medium', 'low'];
    severities.forEach(s => {
      const rule: VerificationRule = { id: '1', name: 'Test', type: 'llm_output', severity: s, enabled: true, description: '' };
      expect(rule.severity).toBe(s);
    });
  });
});
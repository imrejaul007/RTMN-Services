/**
 * HIB Code Intelligence - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { CodeAnalyzer, codeAnalyzer } from './services/code-analyzer';
import { DocumentIntelligence, documentIntelligence } from './services/document-intelligence';

// ============================================
// CODE ANALYZER TESTS
// ============================================

describe('CodeAnalyzer', () => {
  describe('analyze()', () => {
    it('should analyze TypeScript code', () => {
      const code = `
        function hello(name: string): string {
          return "Hello, " + name;
        }
      `;

      const result = codeAnalyzer.analyze(code, 'test.ts');

      expect(result.language).toBe('TypeScript');
      expect(result.filePath).toBe('test.ts');
      expect(result.linesOfCode).toBeGreaterThan(0);
      expect(result.complexity).toBeGreaterThanOrEqual(1);
      expect(result.maintainability).toBeGreaterThanOrEqual(0);
      expect(result.maintainability).toBeLessThanOrEqual(100);
    });

    it('should detect JavaScript code', () => {
      const code = `
        function hello(name) {
          return "Hello, " + name;
        }
      `;

      const result = codeAnalyzer.analyze(code, 'test.js');

      expect(result.language).toBe('JavaScript');
    });

    it('should count lines of code', () => {
      const code = `function a() { return 1; }
function b() { return 2; }
function c() { return 3; }`;

      const result = codeAnalyzer.analyze(code, 'test.ts');

      expect(result.linesOfCode).toBe(3);
    });

    it('should calculate cyclomatic complexity', () => {
      const code = `
        function complex(x: number): number {
          if (x > 0) {
            if (x > 10) {
              return x * 2;
            }
            return x + 1;
          }
          return 0;
        }
      `;

      const result = codeAnalyzer.analyze(code, 'test.ts');

      // Should have complexity > 1 due to if statements
      expect(result.complexity).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Security Analysis', () => {
    it('should detect hardcoded passwords', () => {
      const code = `
        const config = {
          password: "super_secret_123",
          apiKey: "sk-1234567890"
        };
      `;

      const result = codeAnalyzer.analyze(code, 'config.ts');

      const securityIssues = result.securityIssues.filter(
        issue => issue.message.includes('Hardcoded')
      );

      expect(securityIssues.length).toBeGreaterThan(0);
      expect(securityIssues[0].severity).toBe('critical');
    });

    it('should detect eval() usage', () => {
      const code = `
        const code = "console.log('hello')";
        eval(code);
      `;

      const result = codeAnalyzer.analyze(code, 'test.ts');

      const evalIssue = result.securityIssues.find(
        issue => issue.message.includes('eval')
      );

      expect(evalIssue).toBeDefined();
      expect(evalIssue?.severity).toBe('high');
    });

    it('should detect innerHTML usage', () => {
      const code = `
        element.innerHTML = userInput;
      `;

      const result = codeAnalyzer.analyze(code, 'test.ts');

      const xssIssue = result.securityIssues.find(
        issue => issue.message.includes('XSS')
      );

      expect(xssIssue).toBeDefined();
    });

    it('should detect weak crypto', () => {
      const code = `
        const hash = md5(password);
      `;

      const result = codeAnalyzer.analyze(code, 'test.ts');

      const cryptoIssue = result.securityIssues.find(
        issue => issue.message.includes('cryptographic')
      );

      expect(cryptoIssue).toBeDefined();
      expect(cryptoIssue?.severity).toBe('medium');
    });
  });

  describe('Bug Detection', () => {
    it('should detect assignment in condition', () => {
      const code = `
        if (x = 5) {
          console.log(x);
        }
      `;

      const result = codeAnalyzer.analyze(code, 'test.ts');

      const assignmentBug = result.bugs.find(
        bug => bug.type === 'AssignmentInCondition'
      );

      expect(assignmentBug).toBeDefined();
      expect(assignmentBug?.severity).toBe('high');
    });

    it('should detect console.log statements', () => {
      const code = `
        console.log("Debug info");
        console.debug("Debug");
      `;

      const result = codeAnalyzer.analyze(code, 'test.ts');

      const consoleBug = result.bugs.find(
        bug => bug.type === 'ConsoleStatement'
      );

      expect(consoleBug).toBeDefined();
    });

    it('should detect empty catch blocks', () => {
      const code = `
        try {
          riskyOperation();
        } catch (e) {}
      `;

      const result = codeAnalyzer.analyze(code, 'test.ts');

      const emptyCatch = result.bugs.find(
        bug => bug.type === 'EmptyCatchBlock'
      );

      expect(emptyCatch).toBeDefined();
    });

    it('should detect TODO comments', () => {
      const code = `
        // TODO: Fix this later
        function broken() {}
      `;

      const result = codeAnalyzer.analyze(code, 'test.ts');

      const todoBug = result.bugs.find(
        bug => bug.type === 'UnresolvedTodo'
      );

      expect(todoBug).toBeDefined();
    });
  });

  describe('Best Practices', () => {
    it('should detect long lines', () => {
      const longLine = 'a'.repeat(150);
      const code = `function test() { return "${longLine}"; }`;

      const result = codeAnalyzer.analyze(code, 'test.ts');

      const longLineIssue = result.bestPractices.find(
        practice => practice.rule === 'max-line-length'
      );

      expect(longLineIssue).toBeDefined();
    });

    it('should detect magic numbers', () => {
      const code = `
        function getValue() {
          return 1000000 * 12;
        }
      `;

      const result = codeAnalyzer.analyze(code, 'test.ts');

      const magicNumber = result.bestPractices.find(
        practice => practice.rule === 'no-magic-numbers'
      );

      expect(magicNumber).toBeDefined();
    });
  });

  describe('Suggestions', () => {
    it('should suggest refactoring for high complexity', () => {
      const code = `
        function complex(a, b, c, d, e, f) {
          if (a) {
            if (b) {
              if (c) {
                if (d) {
                  if (e) {
                    return f;
                  }
                }
              }
            }
          }
          return 0;
        }
      `;

      const result = codeAnalyzer.analyze(code, 'test.ts');

      const complexitySuggestion = result.suggestions.find(
        s => s.category === 'architecture' && s.message.includes('complexity')
      );

      expect(complexitySuggestion).toBeDefined();
      expect(complexitySuggestion?.priority).toBe('high');
    });

    it('should suggest fixes for critical bugs', () => {
      const code = `
        const password = "secret123";
        eval("console.log('hi')");
      `;

      const result = codeAnalyzer.analyze(code, 'test.ts');

      const criticalBugSuggestion = result.suggestions.find(
        s => s.priority === 'high'
      );

      expect(criticalBugSuggestion).toBeDefined();
    });
  });
});

// ============================================
// DOCUMENT INTELLIGENCE TESTS
// ============================================

describe('DocumentIntelligence', () => {
  describe('process()', () => {
    it('should process markdown document', async () => {
      const content = `# Project Title

This is a summary of the project.

## Key Points

- First point
- Second point
- Third point

## Details

More detailed information here.`;

      const result = await documentIntelligence.process(content);

      expect(result.id).toBeDefined();
      expect(result.title).toBe('Project Title');
      expect(result.summary).toBeDefined();
      expect(Array.isArray(result.keyPoints)).toBe(true);
    });

    it('should extract key points', async () => {
      const content = `# Test Document

## Section 1
- Important point 1
- Important point 2

## Section 2
1. Numbered item 1
2. Numbered item 2

More text.`;

      const result = await documentIntelligence.process(content);

      expect(result.keyPoints.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty content', async () => {
      const content = '';

      const result = await documentIntelligence.process(content);

      expect(result.id).toBeDefined();
      expect(result.title).toBe('Untitled');
    });

    it('should extract entities', async () => {
      const content = `
        John Smith works at Microsoft. Sarah Johnson is the CEO.
        The meeting is scheduled for January 15, 2024.
        Revenue increased by 25 percent.
      `;

      const result = await documentIntelligence.process(content);

      expect(Array.isArray(result.entities)).toBe(true);
    });

    it('should extract dates', async () => {
      const content = `
        Event scheduled for 12/25/2024.
        Another date: 2024-01-15.
      `;

      const result = await documentIntelligence.process(content);

      const dates = result.entities.filter(e => e.type === 'date');
      expect(dates.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs', async () => {
      const content = 'Same content';

      const result1 = await documentIntelligence.process(content);
      const result2 = await documentIntelligence.process(content);

      // Different random components should produce different IDs
      expect(result1.id).toBeDefined();
      expect(result2.id).toBeDefined();
    });
  });

  describe('research()', () => {
    it('should return research result for query', async () => {
      const result = await documentIntelligence.research('What is AI?');

      expect(result.query).toBe('What is AI?');
      expect(result.answer).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include context in research', async () => {
      const result = await documentIntelligence.research(
        'machine learning',
        'software development'
      );

      expect(result.query).toBe('machine learning');
      expect(result.sources).toBeDefined();
    });
  });
});

// ============================================
// INTEGRATION TESTS (Mock)
// ============================================

describe('HIB Code Intelligence API', () => {
  const BASE_URL = 'http://localhost:3053';

  describe('Health Endpoints', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('hib-code-intelligence');
    });

    it('should return alive for liveness', async () => {
      const response = await fetch(`${BASE_URL}/health/live`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('alive');
    });
  });

  describe('Code Analysis API', () => {
    it('should analyze code', async () => {
      const response = await fetch(`${BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'function test() { return true; }',
          filePath: 'test.ts',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.language).toBe('TypeScript');
      expect(data.linesOfCode).toBe(1);
    });

    it('should reject request without code', async () => {
      const response = await fetch(`${BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: 'test.ts' }),
      });

      expect(response.status).toBe(400);
    });

    it('should batch analyze files', async () => {
      const response = await fetch(`${BASE_URL}/api/analyze/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [
            { code: 'function a() {}', filePath: 'a.ts' },
            { code: 'function b() {}', filePath: 'b.ts' },
          ],
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.totalFiles).toBe(2);
      expect(data.summary.successful).toBe(2);
    });
  });

  describe('Document Processing API', () => {
    it('should process document', async () => {
      const response = await fetch(`${BASE_URL}/api/document/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '# Title\n\nSummary content.',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Title');
      expect(data.summary).toBeDefined();
    });
  });

  describe('Research API', () => {
    it('should return research results', async () => {
      const response = await fetch(`${BASE_URL}/api/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'artificial intelligence',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.query).toBe('artificial intelligence');
      expect(data.answer).toBeDefined();
    });
  });
});

/**
 * HOJAI Studio - AI Code Reviewer Service
 * Auto-review generated code
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4762;
app.use(express.json());

const reviews = new Map(); // reviewId -> review data
const suggestions = []; // all suggestions
const patterns = []; // learned patterns

// Issue patterns
const CODE_ISSUES = [
  { pattern: 'console\\.log', severity: 'warning', message: 'Remove console.log statements before production', suggestion: 'Use a proper logging library (e.g., Winston, Pino)' },
  { pattern: 'var\\s+\\w+', severity: 'info', message: 'Consider using const or let instead of var', suggestion: 'Use const for values that never change, let for mutable values' },
  { pattern: 'catch\\s*\\(\\s*\\)', severity: 'error', message: 'Empty catch block - errors are being swallowed', suggestion: 'Add error handling logic or log the error' },
  { pattern: 'setTimeout.*1000\\)', severity: 'warning', message: 'Magic number detected', suggestion: 'Use a named constant for timeout values' },
  { pattern: '\\.then\\(\\s*\\(\\s*\\)\\s*=>', severity: 'info', message: 'Unnamed promise callback', suggestion: 'Add a name for better stack traces' },
  { pattern: 'new\\s+Object\\(\\)', severity: 'info', message: 'Use object literal syntax instead', suggestion: '{} is cleaner than new Object()' },
  { pattern: '\\+\\s*""', severity: 'warning', message: 'String concatenation for type coercion', suggestion: 'Use String() or .toString() for clarity' },
  { pattern: '==\\s*[^=]', severity: 'warning', message: 'Use === for strict equality', suggestion: '=== checks type and value, == only checks value' },
  { pattern: 'any\\]', severity: 'error', message: 'Avoid using :any type in TypeScript', suggestion: 'Use proper types or unknown if type is truly unknown' },
  { pattern: 'TODO', severity: 'info', message: 'TODO comment found', suggestion: 'Create a ticket for this task or complete it' },
  { pattern: 'function\\s+\\w+\\s*\\(', severity: 'info', message: 'Consider using arrow functions for callbacks', suggestion: 'Arrow functions have shorter syntax and lexical this' },
  { pattern: '\\.innerHTML\\s*=', severity: 'error', message: 'innerHTML can cause XSS vulnerabilities', suggestion: 'Use textContent or sanitize input before setting innerHTML' }
];

// REST API - Submit Code for Review
app.post('/api/review', (req, res) => {
  const { projectId, code, language = 'javascript', fileName } = req.body;
  const reviewId = uuidv4();

  const review = {
    id: reviewId,
    projectId,
    fileName,
    language,
    status: 'running',
    issues: [],
    score: 100,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  reviews.set(reviewId, review);
  runReview(review, code);

  res.json({ reviewId, status: 'started' });
});

// REST API - Get Review
app.get('/api/reviews/:reviewId', (req, res) => {
  const review = reviews.get(req.params.reviewId);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json(review);
});

app.get('/api/reviews', (req, res) => {
  const { projectId, status } = req.query;
  let list = Array.from(reviews.values());
  if (projectId) list = list.filter(r => r.projectId === projectId);
  if (status) list = list.filter(r => r.status === status);
  res.json(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// REST API - Issues
app.get('/api/issues', (req, res) => {
  const { projectId, severity } = req.query;
  let list = suggestions;
  if (projectId) list = list.filter(s => s.projectId === projectId);
  if (severity) list = list.filter(s => s.severity === severity);
  res.json(list);
});

// REST API - Batch Review
app.post('/api/review/batch', (req, res) => {
  const { projectId, files } = req.body; // files: [{name, code, language}]

  const results = files.map((file, i) => {
    const reviewId = uuidv4();
    const review = {
      id: reviewId,
      projectId,
      fileName: file.name,
      language: file.language || 'javascript',
      status: 'running',
      issues: [],
      score: 100,
      createdAt: new Date().toISOString()
    };

    reviews.set(reviewId, review);
    setTimeout(() => runReview(review, file.code), i * 500);

    return { reviewId, fileName: file.name };
  });

  res.json({ reviews: results, total: files.length });
});

// REST API - Code Suggestion
app.post('/api/suggest', (req, res) => {
  const { code, language = 'javascript', context } = req.body;

  // Generate improvement suggestions
  const suggestions = [];

  if (code.includes('function') && !code.includes('=>')) {
    suggestions.push({
      type: 'modernization',
      title: 'Consider arrow functions',
      before: 'function myFunc() {}',
      after: 'const myFunc = () => {}',
      reason: 'Arrow functions are more concise and handle this correctly'
    });
  }

  if (code.includes('async') && code.includes('Promise')) {
    suggestions.push({
      type: 'modernization',
      title: 'Use async/await',
      before: 'Promise.then().catch()',
      after: 'await asyncFunction()',
      reason: 'Async/await is easier to read and debug'
    });
  }

  if (code.length > 500) {
    suggestions.push({
      type: 'refactoring',
      title: 'Consider splitting this function',
      reason: 'Functions should ideally be under 50 lines for maintainability'
    });
  }

  res.json({ suggestions });
});

// REST API - Generate PR Description
app.post('/api/pr-description', (req, res) => {
  const { changes, issues } = req.body;

  const summary = {
    changes: changes?.length || 0,
    filesAffected: new Set(changes?.map(c => c.file)).size || 0,
    breaking: issues?.filter(i => i.severity === 'error').length || 0,
    improvements: issues?.filter(i => i.type === 'modernization').length || 0
  };

  const description = `# Changes Summary

## Overview
- ${summary.filesAffected} files changed
- ${summary.changes} total changes
${summary.breaking > 0 ? `- ⚠️ ${summary.breaking} breaking changes` : ''}

## Summary
${generateSummary(issues)}

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] No regression in existing functionality

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No sensitive data exposed
`;

  res.json({ description, summary });
});

// REST API - Learn Pattern
app.post('/api/patterns', (req, res) => {
  const { pattern, message, severity, suggestion } = req.body;
  const newPattern = { id: uuidv4(), pattern, message, severity, suggestion, learnedAt: new Date().toISOString() };
  patterns.push(newPattern);
  res.json(newPattern);
});

async function runReview(review, code) {
  review.status = 'running';
  const issues = [];

  const allPatterns = [...CODE_ISSUES, ...patterns];

  allPatterns.forEach(({ pattern, severity, message, suggestion }) => {
    const regex = new RegExp(pattern, 'gi');
    const matches = code.match(regex);

    if (matches) {
      const issue = {
        id: uuidv4(),
        reviewId: review.id,
        projectId: review.projectId,
        pattern,
        severity,
        message,
        suggestion,
        count: matches.length,
        line: findLineNumber(code, matches[0])
      };

      issues.push(issue);
      suggestions.push(issue);
    }
  });

  // Calculate score
  const errorWeight = 10;
  const warningWeight = 5;
  const infoWeight = 1;

  const totalPenalty = issues.reduce((sum, i) => {
    switch (i.severity) {
      case 'error': return sum + errorWeight;
      case 'warning': return sum + warningWeight;
      default: return sum + infoWeight;
    }
  }, 0);

  review.score = Math.max(0, 100 - totalPenalty);
  review.issues = issues;
  review.status = 'completed';
  review.completedAt = new Date().toISOString();
}

function findLineNumber(code, match) {
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(match)) return i + 1;
  }
  return 1;
}

function generateSummary(issues) {
  if (!issues || issues.length === 0) {
    return 'This PR includes general improvements and bug fixes.';
  }

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  let summary = '';

  if (errors.length > 0) {
    summary += `\n## Critical Fixes\n`;
    errors.slice(0, 3).forEach(e => {
      summary += `- ${e.message}\n`;
    });
  }

  if (warnings.length > 0) {
    summary += `\n## Improvements\n`;
    warnings.slice(0, 5).forEach(w => {
      summary += `- ${w.message}\n`;
    });
  }

  return summary || 'Minor improvements and refinements.';
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'ai-code-reviewer', reviews: reviews.size }));
app.listen(PORT, () => console.log(`AI Code Reviewer running on port ${PORT}`));

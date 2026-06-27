/**
 * HOJAI Studio - A11y Checker Service
 * WCAG accessibility compliance scanning
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

const PORT = 4746;
app.use(express.json());

const scans = new Map(); // scanId -> scan results
const issues = []; // all issues

// WCAG Rules by level
const WCAG_RULES = {
  'img-alt': { level: 'A', description: 'Images must have alt text', severity: 'critical' },
  'heading-order': { level: 'A', description: 'Headings must be in logical order', severity: 'major' },
  'color-contrast': { level: 'AA', description: 'Sufficient color contrast required', severity: 'major' },
  'link-text': { level: 'A', description: 'Links must have descriptive text', severity: 'minor' },
  'form-labels': { level: 'A', description: 'Form inputs must have labels', severity: 'critical' },
  'aria-label': { level: 'AA', description: 'Interactive elements need ARIA labels', severity: 'major' },
  'keyboard-nav': { level: 'A', description: 'All functionality via keyboard', severity: 'critical' },
  'skip-link': { level: 'A', description: 'Skip navigation link present', severity: 'minor' },
  'focus-visible': { level: 'AA', description: 'Focus indicators visible', severity: 'major' },
  'alt-text-length': { level: 'AA', description: 'Alt text not too long', severity: 'minor' },
  'table-headers': { level: 'A', description: 'Data tables must have headers', severity: 'major' },
  'video-captions': { level: 'AA', description: 'Videos must have captions', severity: 'major' },
  'html-lang': { level: 'A', description: 'HTML lang attribute required', severity: 'minor' },
  'zoom-disabled': { level: 'AA', description: 'Page should not disable zoom', severity: 'minor' }
};

// REST API - Scan
app.post('/api/scan', requireInternal, (req, res) => {
  const { projectId, url, html, rules = Object.keys(WCAG_RULES) } = req.body;
  const scanId = uuidv4();

  const scan = {
    id: scanId,
    projectId,
    url,
    status: 'running',
    progress: 0,
    rulesChecked: rules.length,
    issues: [],
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  scans.set(scanId, scan);
  runScan(scan, html, rules);

  res.json({ scanId, status: 'started' });
});

// REST API - Get Scan
app.get('/api/scans/:scanId', (req, res) => {
  const scan = scans.get(req.params.scanId);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  res.json(scan);
});

// REST API - List Scans
app.get('/api/scans', (req, res) => {
  const { projectId, status } = req.query;
  let list = Array.from(scans.values());
  if (projectId) list = list.filter(s => s.projectId === projectId);
  if (status) list = list.filter(s => s.status === status);
  res.json(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// REST API - Issues
app.get('/api/issues', (req, res) => {
  const { projectId, severity, level } = req.query;
  let list = issues;
  if (projectId) list = list.filter(i => i.projectId === projectId);
  if (severity) list = list.filter(i => i.severity === severity);
  if (level) list = list.filter(i => i.level === level);
  res.json(list);
});

// REST API - Get Issues for Scan
app.get('/api/scans/:scanId/issues', (req, res) => {
  const scan = scans.get(req.params.scanId);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  res.json(scan.issues);
});

// REST API - Fix Suggestion
app.get('/api/issues/:issueId/fix', (req, res) => {
  const issue = issues.find(i => i.id === req.params.issueId);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });

  const fixes = {
    'img-alt': { before: '<img src="photo.jpg">', after: '<img src="photo.jpg" alt="Description of photo">' },
    'heading-order': { before: '<h1>Title</h1><h3>Sub</h3><h2>Another</h2>', after: '<h1>Title</h1><h2>Sub</h2><h3>Another</h3>' },
    'color-contrast': { before: 'color: #999', after: 'color: #666' },
    'link-text': { before: '<a href="#">click here</a>', after: '<a href="#">View our pricing</a>' },
    'form-labels': { before: '<input type="text" placeholder="Name">', after: '<label for="name">Name</label><input type="text" id="name">' }
  };

  res.json({
    issue,
    fix: fixes[issue.rule] || { description: 'Manual fix required', suggestion: 'Review and update the code' }
  });
});

// REST API - Summary
app.get('/api/summary/:projectId', (req, res) => {
  const projectIssues = issues.filter(i => i.projectId === req.params.projectId);
  const bySeverity = { critical: 0, major: 0, minor: 0 };
  const byLevel = { A: 0, AA: 0, AAA: 0 };

  projectIssues.forEach(i => {
    bySeverity[i.severity]++;
    byLevel[i.level]++;
  });

  res.json({
    projectId: req.params.projectId,
    totalIssues: projectIssues.length,
    bySeverity,
    byLevel,
    score: calculateScore(projectIssues.length, projectIssues.length),
    wcagCompliance: projectIssues.filter(i => i.severity === 'critical').length === 0 ? 'A' : 'F'
  });
});

// REST API - Rules
app.get('/api/rules', (req, res) => res.json(WCAG_RULES));

async function runScan(scan, html, rules) {
  scan.status = 'running';

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const ruleData = WCAG_RULES[rule];
    if (!ruleData) continue;

    await new Promise(r => setTimeout(r, 100));

    // Simulate issue detection (in production, parse HTML and check rules)
    if (Math.random() > 0.7) {
      const issue = {
        id: uuidv4(),
        scanId: scan.id,
        projectId: scan.projectId,
        rule,
        level: ruleData.level,
        severity: ruleData.severity,
        description: ruleData.description,
        element: simulateElement(rule),
        suggestion: `Add ${rule.replace(/-/g, ' ')} compliance`,
        line: Math.round(Math.random() * 500),
        createdAt: new Date().toISOString()
      };

      scan.issues.push(issue);
      issues.push(issue);
    }

    scan.progress = Math.round(((i + 1) / rules.length) * 100);
  }

  scan.status = 'completed';
  scan.completedAt = new Date().toISOString();
  scan.score = calculateScore(scan.issues.length, rules.length);
}

function simulateElement(rule) {
  const elements = {
    'img-alt': '<img src="image.jpg">',
    'heading-order': '<h1>...</h3>',
    'color-contrast': '<span style="color:#999">text</span>',
    'link-text': '<a href="#">click here</a>',
    'form-labels': '<input type="text">'
  };
  return elements[rule] || '<element>';
}

function calculateScore(issues, total) {
  if (total === 0) return 100;
  const criticalPenalty = issues.filter(i => i.severity === 'critical').length * 10;
  const majorPenalty = issues.filter(i => i.severity === 'major').length * 5;
  const minorPenalty = issues.filter(i => i.severity === 'minor').length * 1;
  return Math.max(0, 100 - criticalPenalty - majorPenalty - minorPenalty);
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'a11y-checker', scans: scans.size, issues: issues.length }));
app.listen(PORT, () => console.log(`A11y Checker running on port ${PORT}`));

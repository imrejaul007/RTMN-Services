import { Router } from 'express';
import { readJson } from '../store.js';

const router = Router();

// GET /api/workflows/:id/export
router.get('/workflows/:id/export', (req, res) => {
  const wf = readJson('workflows').find(w => w.id === req.params.id);
  if (!wf) return res.status(404).json({ error: 'workflow not found' });

  const format = req.query.format || 'json';

  if (format === 'json') {
    return res.json(wf);
  }

  if (format === 'code') {
    const code = generateJS(wf);
    res.setHeader('Content-Type', 'text/javascript');
    return res.send(code);
  }

  if (format === 'yaml') {
    const yaml = generateYAML(wf);
    res.setHeader('Content-Type', 'text/yaml');
    return res.send(yaml);
  }

  res.status(400).json({ error: 'unknown format, use json|code|yaml' });
});

function generateJS(wf) {
  const nodeHandlers = wf.nodes.map(n => {
    const data = JSON.stringify(n.data || {});
    return `  // ${n.type} node: ${n.id}
  executor.registerNode('${n.id}', '${n.type}', ${data}, async (input) => {
    // TODO: implement ${n.type} handler
    return { type: '${n.type}', result: 'TODO' };
  });`;
  }).join('\n');

  const edges = wf.edges.map(e => `  executor.addEdge('${e.source}', '${e.target}');`).join('\n');

  return `// Auto-generated workflow: ${wf.name}
// Generated: ${new Date().toISOString()}
// Version: ${wf.version}

import { WorkflowExecutor } from '@hojai/ai-studio';

const executor = new WorkflowExecutor();

${nodeHandlers}

${edges}

export default executor;
`;
}

function generateYAML(wf) {
  let yaml = `# Workflow: ${wf.name}\n`;
  yaml += `# Version: ${wf.version}\n`;
  yaml += `# Generated: ${new Date().toISOString()}\n\n`;
  yaml += `name: ${wf.name}\n`;
  yaml += `description: ${wf.description || ''}\n`;
  yaml += `version: ${wf.version}\n\n`;
  yaml += `nodes:\n`;
  for (const n of wf.nodes) {
    yaml += `  - id: ${n.id}\n`;
    yaml += `    type: ${n.type}\n`;
    if (n.data) yaml += `    data: ${JSON.stringify(n.data)}\n`;
  }
  yaml += `\nedges:\n`;
  for (const e of wf.edges) {
    yaml += `  - source: ${e.source}\n`;
    yaml += `    target: ${e.target}\n`;
  }
  return yaml;
}

export default router;

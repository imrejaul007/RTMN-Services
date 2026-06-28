import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4600;
app.use(express.json());

const projects = new Map();
const components = [
  { type: 'button', label: 'Button', props: ['label', 'onClick', 'variant', 'size'] },
  { type: 'input', label: 'Input', props: ['placeholder', 'type', 'value', 'onChange'] },
  { type: 'text', label: 'Text', props: ['content', 'variant', 'align'] },
  { type: 'image', label: 'Image', props: ['src', 'alt', 'width', 'height'] },
  { type: 'card', label: 'Card', props: ['title', 'content', 'actions'] },
  { type: 'container', label: 'Container', props: ['children', 'direction', 'gap'] },
  { type: 'list', label: 'List', props: ['items', 'renderItem'] },
  { type: 'form', label: 'Form', props: ['fields', 'onSubmit'] },
  { type: 'modal', label: 'Modal', props: ['isOpen', 'onClose', 'title', 'content'] },
  { type: 'nav', label: 'Navigation', props: ['links', 'logo'] }
];

app.get('/api/components', (req, res) => res.json({ components }));
app.get('/api/projects', (req, res) => res.json({ projects: Array.from(projects.values()) }));
app.post('/api/projects', (req, res) => {
  const { name, description } = req.body;
  const project = { id: uuidv4(), name, description, elements: [], createdAt: new Date().toISOString() };
  projects.set(project.id, project);
  res.json(project);
});
app.get('/api/projects/:id', (req, res) => {
  const project = projects.get(req.params.id);
  project ? res.json(project) : res.status(404).json({ error: 'Not found' });
});
app.put('/api/projects/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  Object.assign(project, req.body);
  res.json(project);
});
app.post('/api/projects/:id/export', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json({ code: generateCode(project), format: 'html' });
});

function generateCode(project) {
  return `<!DOCTYPE html>
<html>
<head><title>${project.name}</title></head>
<body>
  ${project.elements.map(el => `<div id="${el.id}">${el.type} element</div>`).join('\n  ')}
</body>
</html>`;
}

app.listen(PORT, () => console.log(`Visual Builder running on port ${PORT}`));
export default app;
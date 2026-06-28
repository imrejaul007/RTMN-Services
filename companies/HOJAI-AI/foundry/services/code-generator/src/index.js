import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4610;
app.use(express.json());

const TEMPLATES = {
  api: { name: 'REST API', template: "import express from 'express';\nconst app = express();\napp.use(express.json());\n\napp.get('/api/{{route}}', (req, res) => {\n  res.json({ message: 'Hello' });\n});\n\nexport default app;" },
  component: { name: 'React Component', template: "export function {{name}}(props) {\n  return <div>{{name}} Component</div>;\n}" },
  service: { name: 'Microservice', template: "export class {{name}}Service {\n  async run(data) {\n    return { success: true, data };\n  }\n}" },
  agent: { name: 'AI Agent', template: "export const {{name}}Agent = {\n  name: '{{name}}',\n  async run({ input, context }) {\n    return { response: 'Processed: ' + input };\n  }\n};" }
};

app.get('/api/templates', (req, res) => res.json({ templates: TEMPLATES }));
app.post('/api/generate', (req, res) => {
  const { type, name, params = {} } = req.body;
  const template = TEMPLATES[type];
  if (!template) return res.status(400).json({ error: 'Unknown template type' });
  
  let code = template.template;
  for (const [key, value] of Object.entries(params)) {
    code = code.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  code = code.replace(/\{\{\w+\}\}/g, name || 'Unnamed');
  
  res.json({ id: uuidv4(), type, name, code, generatedAt: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`Code Generator running on port ${PORT}`));
export default app;

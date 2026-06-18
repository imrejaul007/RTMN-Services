const express = require('express');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = 4895;
app.use(express.json());

const tickets = new Map();
const articles = new Map([
  ['art-1', { id: 'art-1', title: 'How to reset password', category: 'account', helpful: 85 }],
  ['art-2', { id: 'art-2', title: 'Billing FAQ', category: 'billing', helpful: 72 }]
]);

app.post('/api/analyze', (req, res) => {
  const { message } = req.body;
  const suggestions = ['Check knowledge base', 'Create ticket', 'Escalate'];
  res.json({ id: uuidv4(), message, suggestions, intent: 'support', confidence: 0.92 });
});

app.post('/api/summarize', (req, res) => {
  const { ticketId, conversation } = req.body;
  res.json({ ticketId, summary: 'Customer reported issue with...', priority: 'medium', category: 'technical' });
});

app.get('/api/articles', (req, res) => res.json({ articles: Array.from(articles.values()) }));
app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'support-copilot', port: PORT }));
app.listen(PORT, () => console.log('Support Copilot running on ' + PORT));

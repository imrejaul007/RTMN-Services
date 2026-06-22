const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 4878;

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage
const bots = new Map();
const intents = new Map();
const conversations = new Map();

// Initialize sample bots
const sampleBots = [
  { id: 'bot-1', name: 'Sales Bot', description: 'Handles sales inquiries', language: 'en-US', personality: { tone: 'professional', style: 'helpful' }, channels: ['web', 'api'], status: 'active', intents: ['greeting', 'product-info', 'pricing', 'demo-request'] },
  { id: 'bot-2', name: 'Support Bot', description: 'Customer support and tickets', language: 'en-US', personality: { tone: 'friendly', style: 'empathetic' }, channels: ['web', 'chat', 'whatsapp'], status: 'active', intents: ['greeting', 'support-request', 'faq', 'escalation'] },
  { id: 'bot-3', name: 'HR Bot', description: 'HR inquiries and policies', language: 'en-US', personality: { tone: 'professional', style: 'clear' }, channels: ['slack', 'teams'], status: 'active', intents: ['greeting', 'leave-request', 'policy-info', 'benefits'] }
];
sampleBots.forEach(b => bots.set(b.id, b));

// Initialize sample intents
const sampleIntents = [
  { id: 'intent-1', name: 'greeting', patterns: ['hello', 'hi', 'hey', 'good morning'], responses: ['Hello! How can I help you today?', 'Hi there! What can I assist you with?'], confidence: 0.95 },
  { id: 'intent-2', name: 'product-info', patterns: ['tell me about', 'what is', 'features'], responses: ['Our product offers...', 'Here are the key features...'], confidence: 0.88 },
  { id: 'intent-3', name: 'pricing', patterns: ['how much', 'cost', 'price', 'plans'], responses: ['Our pricing starts at...', 'We offer flexible plans...'], confidence: 0.90 },
  { id: 'intent-4', name: 'support-request', patterns: ['help', 'support', 'issue', 'problem'], responses: ['I understand you need help. Let me assist.', 'I\'m here to help!'], confidence: 0.92 }
];
sampleIntents.forEach(i => intents.set(i.id, i));

// Get all bots
app.get('/api/bots', (req, res) => {
  const result = Array.from(bots.values());
  res.json({ bots: result, total: result.length });
});

// Get bot
app.get('/api/bots/:id', (req, res) => {
  const bot = bots.get(req.params.id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  res.json(bot);
});

// Create bot
app.post('/api/bots', (req, res) => {
  const { name, description, language, channels, intents: intentList } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const bot = { id: `bot-${uuidv4().slice(0, 8)}`, name, description: description || '', language: language || 'en-US', personality: { tone: 'friendly', style: 'helpful' }, channels: channels || ['web'], status: 'active', intents: intentList || [], createdAt: new Date().toISOString() };
  bots.set(bot.id, bot);
  res.status(201).json(bot);
});

// Process message
app.post('/api/chat', (req, res) => {
  const { botId, message, userId } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  
  const bot = botId ? bots.get(botId) : bots.values().next().value;
  const messageLower = message.toLowerCase();
  
  let matchedIntent = null;
  intents.forEach(intent => {
    if (!matchedIntent) {
      for (const pattern of intent.patterns) {
        if (messageLower.includes(pattern.toLowerCase())) {
          matchedIntent = intent;
          break;
        }
      }
    }
  });
  
  const response = {
    id: `resp-${uuidv4().slice(0, 8)}`,
    botId: bot?.id,
    botName: bot?.name || 'Unknown',
    userMessage: message,
    intent: matchedIntent?.name || 'unknown',
    confidence: matchedIntent?.confidence || 0,
    response: matchedIntent ? matchedIntent.responses[Math.floor(Math.random() * matchedIntent.responses.length)] : 'I\'m not sure I understand. Could you rephrase that?',
    timestamp: new Date().toISOString()
  };
  
  const convId = userId || 'anonymous';
  if (!conversations.has(convId)) conversations.set(convId, []);
  conversations.get(convId).push({ userMessage: message, botResponse: response.response, intent: response.intent, timestamp: response.timestamp });
  
  res.json(response);
});

// Get conversations
app.get('/api/conversations', (req, res) => {
  const result = [];
  conversations.forEach((messages, id) => result.push({ userId: id, messages: messages.slice(-10) }));
  res.json({ conversations: result });
});

// Get all intents
app.get('/api/intents', (req, res) => {
  res.json({ intents: Array.from(intents.values()) });
});

// Create intent
app.post('/api/intents', (req, res) => {
  const { name, patterns, responses, confidence } = req.body;
  if (!name || !patterns || !responses) return res.status(400).json({ error: 'Name, patterns, responses required' });
  const intent = { id: `intent-${uuidv4().slice(0, 8)}`, name, patterns, responses, confidence: confidence || 0.8 };
  intents.set(intent.id, intent);
  res.status(201).json(intent);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'smart-chatbot', port: PORT, bots: bots.size, intents: intents.size });
});

app.listen(PORT, () => console.log('Smart Chatbot running on port ' + PORT));

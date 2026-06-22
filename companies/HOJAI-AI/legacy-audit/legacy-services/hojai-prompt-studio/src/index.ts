/**
 * HOJAI Prompt Studio
 * Centralized prompt management - Vellum equivalent
 * Port: 4590
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4590;

app.use(express.json({ limit: "10kb" }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ============================================
// TYPES
// ============================================

interface Prompt {
  id: string;
  name: string;
  description: string;
  category: 'support' | 'sales' | 'restaurant' | 'salon' | 'clinic' | 'hotel' | 'generic';
  versions: PromptVersion[];
  currentVersion: number;
  tags: string[];
  variables: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface PromptVersion {
  id: string;
  version: number;
  content: string;
  model: 'gpt-4' | 'gpt-3.5' | 'claude-3' | 'claude-3-haiku';
  variables: Variable[];
  testCases: TestCase[];
  performance?: {
    avgLatency: number;
    avgTokens: number;
    successRate: number;
  };
  createdAt: Date;
  createdBy: string;
}

interface Variable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  defaultValue?: string;
  description?: string;
}

interface TestCase {
  id: string;
  name: string;
  input: Record<string, unknown>;
  expectedOutput?: string;
  actualOutput?: string;
  score?: number;
  passed?: boolean;
  runAt?: Date;
}

interface PromptComparison {
  id: string;
  promptId: string;
  versionA: number;
  versionB: number;
  testResultsA: TestCase[];
  testResultsB: TestCase[];
  winner: 'A' | 'B' | 'tie';
  improvement: number;
}

const prompts = new Map();
const comparisons = new Map();

// Seed demo prompts
function seed() {
  const demoPrompts: Prompt[] = [
    {
      id: 'p1',
      name: 'Restaurant Welcome',
      description: 'Welcome message for restaurant customers',
      category: 'restaurant',
      currentVersion: 2,
      tags: ['welcome', 'restaurant', 'greeting'],
      variables: [
        { name: 'customerName', type: 'string', required: true, description: 'Customer name' },
        { name: 'restaurantName', type: 'string', required: true },
      ],
      metadata: { useCount: 15420, successRate: 0.94 },
      versions: [
        {
          id: 'v1-1',
          version: 1,
          content: 'Hello {customerName}, welcome to {restaurantName}!',
          model: 'gpt-3.5',
          variables: [],
          testCases: [],
          createdAt: new Date('2026-01-15'),
          createdBy: 'admin'
        },
        {
          id: 'v1-2',
          version: 2,
          content: 'Hey {customerName}! 👋 Welcome to {restaurantName}. We\'re excited to serve you today! 🍽️',
          model: 'gpt-4',
          variables: [],
          testCases: [],
          performance: { avgLatency: 1.2, avgTokens: 45, successRate: 0.96 },
          createdAt: new Date('2026-02-01'),
          createdBy: 'admin'
        }
      ],
      createdAt: new Date('2026-01-15'),
      updatedAt: new Date('2026-02-01')
    },
    {
      id: 'p2',
      name: 'Support Ticket Response',
      description: 'AI response for support tickets',
      category: 'support',
      currentVersion: 3,
      tags: ['support', 'ticket', 'ai-response'],
      variables: [
        { name: 'ticketType', type: 'string', required: true },
        { name: 'customerName', type: 'string', required: true },
      ],
      metadata: { useCount: 45230, successRate: 0.89 },
      versions: [
        {
          id: 'v2-3',
          version: 3,
          content: 'Hi {customerName}, I understand your {ticketType} concern. Let me help you right away.',
          model: 'gpt-4',
          variables: [],
          testCases: [],
          performance: { avgLatency: 1.5, avgTokens: 62, successRate: 0.91 },
          createdAt: new Date('2026-03-01'),
          createdBy: 'admin'
        }
      ],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-03-01')
    },
    {
      id: 'p3',
      name: 'Salon Booking Confirmation',
      description: 'Booking confirmation for salon',
      category: 'salon',
      currentVersion: 1,
      tags: ['booking', 'salon', 'confirmation'],
      variables: [
        { name: 'serviceName', type: 'string', required: true },
        { name: 'dateTime', type: 'string', required: true },
        { name: 'customerName', type: 'string', required: true },
      ],
      metadata: { useCount: 8920, successRate: 0.97 },
      versions: [
        {
          id: 'v3-1',
          version: 1,
          content: 'Your {serviceName} appointment is confirmed for {dateTime}, {customerName}! See you soon! 💇‍♀️',
          model: 'gpt-4',
          variables: [],
          testCases: [],
          performance: { avgLatency: 1.1, avgTokens: 38, successRate: 0.97 },
          createdAt: new Date('2026-04-01'),
          createdBy: 'admin'
        }
      ],
      createdAt: new Date('2026-04-01'),
      updatedAt: new Date('2026-04-01')
    }
  ];

  demoPrompts.forEach(p => prompts.set(p.id, p));
  console.log(`HOJAI Prompt Studio seeded ${demoPrompts.length} prompts`);
}

// ============================================
// ENDPOINTS
// ============================================

app.get('/health', (_, res) => res.json({
  service: 'hojai-prompt-studio',
  status: 'healthy',
  port: PORT,
  tagline: 'Centralized prompt management'
}));

// List all prompts
app.get('/api/prompts', (req, res) => {
  const { category, tag, search } = req.query;
  let result = Array.from(prompts.values());

  if (category) result = result.filter(p => p.category === category);
  if (tag) result = result.filter(p => p.tags.includes(tag as string));
  if (search) {
    const s = (search as string).toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(s) ||
      p.description.toLowerCase().includes(s)
    );
  }

  res.json({ success: true, data: result });
});

// Get prompt
app.get('/api/prompts/:id', (req, res) => {
  const prompt = prompts.get(req.params.id);
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
  res.json({ success: true, data: prompt });
});

// Create prompt
app.post('/api/prompts', (req, res) => {
  const { name, description, category, tags, content, model, variables } = req.body;

  const prompt: Prompt = {
    id: uuidv4().slice(0, 8),
    name,
    description,
    category: category || 'generic',
    versions: [{
      id: uuidv4().slice(0, 8),
      version: 1,
      content,
      model: model || 'gpt-4',
      variables: variables || [],
      testCases: [],
      createdAt: new Date(),
      createdBy: 'admin'
    }],
    currentVersion: 1,
    tags: tags || [],
    variables: variables || [],
    metadata: { useCount: 0, successRate: 0 },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  prompts.set(prompt.id, prompt);
  res.status(201).json({ success: true, data: prompt });
});

// Update prompt (new version)
app.put('/api/prompts/:id', (req, res) => {
  const prompt = prompts.get(req.params.id);
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

  const { content, model, variables, tags } = req.body;
  const newVersion = prompt.currentVersion + 1;

  const version: PromptVersion = {
    id: uuidv4().slice(0, 8),
    version: newVersion,
    content,
    model: model || 'gpt-4',
    variables: variables || [],
    testCases: [],
    createdAt: new Date(),
    createdBy: 'admin'
  };

  prompt.versions.push(version);
  prompt.currentVersion = newVersion;
  prompt.updatedAt = new Date();
  if (tags) prompt.tags = tags;

  prompts.set(prompt.id, prompt);
  res.json({ success: true, data: prompt });
});

// Test prompt
app.post('/api/prompts/:id/test', (req, res) => {
  const prompt = prompts.get(req.params.id);
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

  const { input } = req.body;
  const currentVer = prompt.versions.find(v => v.version === prompt.currentVersion);

  if (!currentVer) return res.status(500).json({ error: 'No current version' });

  // Simulate LLM call
  let content = currentVer.content;
  Object.entries(input).forEach(([key, value]) => {
    content = content.replace(new RegExp(`{${key}}`, 'g'), String(value));
  });

  const testResult = {
    promptId: prompt.id,
    version: prompt.currentVersion,
    input,
    output: content,
    latency: Math.random() * 2 + 0.5,
    tokens: Math.round(content.length / 4),
    timestamp: new Date()
  };

  res.json({ success: true, data: testResult });
});

// Add test case
app.post('/api/prompts/:id/test-cases', (req, res) => {
  const prompt = prompts.get(req.params.id);
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

  const { name, input, expectedOutput } = req.body;
  const currentVer = prompt.versions.find(v => v.version === prompt.currentVersion);

  if (!currentVer) return res.status(500).json({ error: 'No current version' });

  const testCase: TestCase = {
    id: uuidv4().slice(0, 8),
    name,
    input,
    expectedOutput,
    runAt: new Date()
  };

  currentVer.testCases.push(testCase);
  prompts.set(prompt.id, prompt);

  res.status(201).json({ success: true, data: testCase });
});

// Run test cases
app.post('/api/prompts/:id/run-tests', (req, res) => {
  const prompt = prompts.get(req.params.id);
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

  const currentVer = prompt.versions.find(v => v.version === prompt.currentVersion);
  if (!currentVer) return res.status(500).json({ error: 'No current version' });

  const results = currentVer.testCases.map(tc => {
    let output = currentVer.content;
    Object.entries(tc.input).forEach(([key, value]) => {
      output = output.replace(new RegExp(`{${key}}`, 'g'), String(value));
    });

    const passed = tc.expectedOutput ? output === tc.expectedOutput : null;
    const score = passed !== null ? (passed ? 1 : 0) : null;

    return {
      ...tc,
      actualOutput: output,
      passed,
      score,
      runAt: new Date()
    };
  });

  const passedCount = results.filter(r => r.passed === true).length;
  const avgScore = results.filter(r => r.score !== null)
    .reduce((sum, r) => sum + (r.score || 0), 0) / results.length;

  res.json({
    success: true,
    data: {
      results,
      summary: {
        total: results.length,
        passed: passedCount,
        failed: results.length - passedCount,
        avgScore: Math.round(avgScore * 100) / 100
      }
    }
  });
});

// Compare versions
app.post('/api/prompts/:id/compare', (req, res) => {
  const prompt = prompts.get(req.params.id);
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

  const { versionA, versionB } = req.body;

  const verA = prompt.versions.find(v => v.version === versionA);
  const verB = prompt.versions.find(v => v.version === versionB);

  if (!verA || !verB) return res.status(400).json({ error: 'Version not found' });

  // Run tests on both
  const resultsA = verA.testCases.map(tc => {
    let output = verA.content;
    Object.entries(tc.input).forEach(([key, value]) => {
      output = output.replace(new RegExp(`{${key}}`, 'g'), String(value));
    });
    return { ...tc, actualOutput: output, passed: tc.expectedOutput ? output === tc.expectedOutput : null };
  });

  const resultsB = verB.testCases.map(tc => {
    let output = verB.content;
    Object.entries(tc.input).forEach(([key, value]) => {
      output = output.replace(new RegExp(`{${key}}`, 'g'), String(value));
    });
    return { ...tc, actualOutput: output, passed: tc.expectedOutput ? output === tc.expectedOutput : null };
  });

  const scoreA = resultsA.filter(r => r.passed).length / resultsA.length;
  const scoreB = resultsB.filter(r => r.passed).length / resultsB.length;

  const comparison: PromptComparison = {
    id: uuidv4().slice(0, 8),
    promptId: prompt.id,
    versionA,
    versionB,
    testResultsA: resultsA,
    testResultsB: resultsB,
    winner: scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'tie',
    improvement: Math.round(Math.abs(scoreA - scoreB) * 100)
  };

  comparisons.set(comparison.id, comparison);

  res.json({ success: true, data: comparison });
});

// Deploy to production
app.post('/api/prompts/:id/deploy', (req, res) => {
  const prompt = prompts.get(req.params.id);
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

  res.json({
    success: true,
    data: {
      promptId: prompt.id,
      version: prompt.currentVersion,
      status: 'deployed',
      deployedAt: new Date(),
      endpoint: `/prompts/${prompt.id}/execute`
    }
  });
});

// Get categories
app.get('/api/categories', (_, res) => {
  const categories = [...new Set(Array.from(prompts.values()).map(p => p.category))];
  res.json({ success: true, data: categories });
});

// Get analytics
app.get('/api/analytics', (_, res) => {
  const allPrompts = Array.from(prompts.values());
  const totalUseCount = allPrompts.reduce((sum, p) => sum + (p.metadata.useCount || 0), 0);
  const avgSuccessRate = allPrompts.reduce((sum, p) => sum + (p.metadata.successRate || 0), 0) / allPrompts.length;

  res.json({
    success: true,
    data: {
      totalPrompts: allPrompts.length,
      totalVersions: allPrompts.reduce((sum, p) => sum + p.versions.length, 0),
      totalUseCount,
      avgSuccessRate: Math.round(avgSuccessRate * 100) / 100,
      byCategory: allPrompts.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    }
  });
});

seed();
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   HOJAI PROMPT STUDIO                     ║
║   Centralized Prompt Management           ║
║   Port: ${PORT}                             ║
║                                           ║
║   Features:                               ║
║   • Version control                       ║
║   • A/B testing                          ║
║   • Test cases                           ║
║   • Deploy to production                  ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;

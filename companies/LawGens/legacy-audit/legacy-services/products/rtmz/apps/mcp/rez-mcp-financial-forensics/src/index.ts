import { Server } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const PORT = parseInt(process.env.PORT || '3131');
const app = express();
app.use(express.json());

interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category?: string;
  party?: string;
}

interface Analysis {
  id: string;
  transactions: Transaction[];
  anomalies: Anomaly[];
  createdAt: Date;
}

interface Anomaly {
  id: string;
  type: 'unusual_amount' | 'unusual_timing' | 'pattern_break' | 'suspicious_party';
  severity: 'high' | 'medium' | 'low';
  description: string;
  transactionIds: string[];
}

const analyses = new Map<string, Analysis>();

// Analyze invoices
app.post('/analyze/invoices', (req, res) => {
  try {
    const { invoices } = req.body;
    if (!invoices) return res.status(400).json({ error: 'invoices required' });

    const analysisId = uuidv4();
    const anomalies: Anomaly[] = [];
    let totalAmount = 0;

    invoices.forEach((inv: any, i: number) => {
      totalAmount += inv.amount || 0;
      // Check for unusual amounts
      if (inv.amount > 100000) {
        anomalies.push({ id: uuidv4(), type: 'unusual_amount', severity: 'high', description: `High invoice amount: ${inv.amount}`, transactionIds: [String(i)] });
      }
    });

    const analysis: Analysis = {
      id: analysisId,
      transactions: invoices.map((inv: any) => ({ id: uuidv4(), date: inv.date, amount: inv.amount || 0, description: inv.description || '', category: 'invoice' })),
      anomalies,
      createdAt: new Date()
    };

    analyses.set(analysisId, analysis);
    res.json({ success: true, analysisId, anomalyCount: anomalies.length, totalAmount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Detect anomalies
app.post('/detect/anomalies', (req, res) => {
  try {
    const { transactions } = req.body;
    if (!transactions) return res.status(400).json({ error: 'transactions required' });

    const anomalies: Anomaly[] = [];
    let avgAmount = 0;

    // Calculate average
    const amounts = transactions.map((t: any) => t.amount || 0);
    avgAmount = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;

    transactions.forEach((t: any, i: number) => {
      const amount = t.amount || 0;
      // Unusual amount
      if (amount > avgAmount * 3) {
        anomalies.push({ id: uuidv4(), type: 'unusual_amount', severity: 'high', description: `Transaction ${i} is ${(amount/avgAmount).toFixed(1)}x average`, transactionIds: [String(i)] });
      }
      // Weekend transaction
      const date = new Date(t.date);
      if (date.getDay() === 0 || date.getDay() === 6) {
        anomalies.push({ id: uuidv4(), type: 'unusual_timing', severity: 'low', description: `Weekend transaction detected`, transactionIds: [String(i)] });
      }
    });

    res.json({ anomalyCount: anomalies.length, anomalies });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Correlate financial with communications
app.post('/correlate', (req, res) => {
  try {
    const { financial, communications } = req.body;

    const correlations: any[] = [];
    // Simple correlation based on dates
    financial?.forEach((f: any) => {
      const fDate = new Date(f.date).toDateString();
      const relatedComms = communications?.filter((c: any) => new Date(c.date).toDateString() === fDate);
      if (relatedComms?.length) {
        correlations.push({ financial: f, communications: relatedComms, strength: 'high' });
      }
    });

    res.json({ correlationCount: correlations.length, correlations });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate financial report
app.get('/analysis/:id/report', (req, res) => {
  const analysis = analyses.get(req.params.id);
  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });

  const totalAmount = analysis.transactions.reduce((sum, t) => sum + t.amount, 0);
  const avgAmount = totalAmount / analysis.transactions.length;

  res.json({
    reportType: 'Financial Forensics Analysis',
    generatedAt: new Date().toISOString(),
    summary: {
      totalTransactions: analysis.transactions.length,
      totalAmount,
      averageAmount: avgAmount,
      anomalyCount: analysis.anomalies.length
    },
    highSeverityAnomalies: analysis.anomalies.filter(a => a.severity === 'high'),
    recommendations: analysis.anomalies.length > 0 ? ['Review high-severity anomalies', 'Verify unusual transactions', 'Cross-check with communications'] : ['No anomalies detected']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', analysisCount: analyses.size });
});

// MCP Server
const server = new Server({ name: 'rez-mcp-financial-forensics', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: 'analyze_invoices', description: 'Analyze invoice patterns', inputSchema: { type: 'object', properties: { invoices: { type: 'array' } } } },
    { name: 'detect_anomalies', description: 'Detect unusual transactions', inputSchema: { type: 'object', properties: { transactions: { type: 'array' } } } },
    { name: 'correlate_financial', description: 'Correlate financial with communications', inputSchema: { type: 'object', properties: { financial: { type: 'array' }, communications: { type: 'array' } } } },
    { name: 'generate_financial_report', description: 'Generate financial analysis report', inputSchema: { type: 'object', properties: { analysisId: { type: 'string' } } } }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case 'analyze_invoices':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP POST /analyze/invoices' }) })] };
      case 'detect_anomalies':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP POST /detect/anomalies' }) })] };
      case 'correlate_financial':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP POST /correlate' }) })] };
      case 'generate_financial_report':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP GET /analysis/{id}/report' }) })] };
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

if (process.env.TRANSPORT === 'http') {
  app.listen(PORT, () => console.log(`Financial Forensics MCP on port ${PORT}`));
} else {
  server.connect();
  console.error('Financial Forensics MCP running');
}
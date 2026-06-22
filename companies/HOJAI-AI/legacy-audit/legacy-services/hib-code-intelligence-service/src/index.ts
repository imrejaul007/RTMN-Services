/**
 * HIB Code Intelligence Service
 * Port: 3053
 *
 * Provides:
 * - Code Analysis (quality, complexity, bugs, security)
 * - Code Refactoring suggestions
 * - Document Intelligence (summarization, entity extraction)
 * - Research Assistant
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import pino from 'pino';
import { codeAnalyzer } from './services/code-analyzer';
import { documentIntelligence } from './services/document-intelligence';

// ============================================
// LOGGING SETUP
// ============================================

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

// ============================================
// EXPRESS APP SETUP
// ============================================

const app = express();
const PORT = parseInt(process.env.PORT || '3053', 10);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'Incoming request');
  next();
});

// ============================================
// DATABASE CONNECTIONS
// ============================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hib-code-intelligence';
mongoose.connect(MONGODB_URI)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => logger.error({ err }, 'MongoDB connection failed'));

// ============================================
// MONGOOSE SCHEMAS
// ============================================

// Analysis History Schema
const AnalysisSchema = new mongoose.Schema({
  filePath: String,
  language: String,
  linesOfCode: Number,
  complexity: Number,
  maintainability: Number,
  bugCount: Number,
  securityIssueCount: Number,
  analysis: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });
AnalysisSchema.index({ filePath: 1 });
AnalysisSchema.index({ createdAt: -1 });
const Analysis = mongoose.model('Analysis', AnalysisSchema);

// ============================================
// HEALTH ENDPOINTS
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hib-code-intelligence',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1;
    if (mongoStatus) {
      res.json({ status: 'ready', mongo: mongoStatus });
    } else {
      res.status(503).json({ status: 'not ready', mongo: mongoStatus });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: String(error) });
  }
});

// ============================================
// CODE ANALYSIS API
// ============================================

// Analyze code
app.post('/api/analyze', async (req, res) => {
  try {
    const { code, filePath, options = {} } = req.body;

    if (!code || !filePath) {
      return res.status(400).json({ error: 'code and filePath are required' });
    }

    const analysis = codeAnalyzer.analyze(code, filePath, options);

    // Store analysis in database
    const analysisDoc = new Analysis({
      filePath,
      language: analysis.language,
      linesOfCode: analysis.linesOfCode,
      complexity: analysis.complexity,
      maintainability: analysis.maintainability,
      bugCount: analysis.bugs.length,
      securityIssueCount: analysis.securityIssues.length,
      analysis,
    });
    await analysisDoc.save();

    logger.info({
      filePath,
      language: analysis.language,
      linesOfCode: analysis.linesOfCode,
      complexity: analysis.complexity,
      bugs: analysis.bugs.length,
      securityIssues: analysis.securityIssues.length,
    }, 'Code analysis completed');

    res.json(analysis);
  } catch (error) {
    logger.error({ error }, 'Code analysis failed');
    res.status(500).json({ error: 'Code analysis failed' });
  }
});

// Analyze multiple files
app.post('/api/analyze/batch', async (req, res) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'files array is required' });
    }

    const results = files.map(file => {
      try {
        return { success: true, ...codeAnalyzer.analyze(file.code, file.filePath, file.options) };
      } catch (error) {
        return { success: false, filePath: file.filePath, error: String(error) };
      }
    });

    // Summary statistics
    const successful = results.filter((r: any) => r.success);
    const failed = results.filter((r: any) => !r.success);
    const summary = {
      totalFiles: results.length,
      successful: successful.length,
      failed: failed.length,
      totalLinesOfCode: successful.reduce((sum: number, r: any) => sum + (r.linesOfCode || 0), 0),
      avgComplexity: successful.length > 0 ? successful.reduce((sum: number, r: any) => sum + (r.complexity || 0), 0) / successful.length : 0,
      totalBugs: successful.reduce((sum: number, r: any) => sum + (r.bugs?.length || 0), 0),
      totalSecurityIssues: successful.reduce((sum: number, r: any) => sum + (r.securityIssues?.length || 0), 0),
    };

    logger.info({ summary }, 'Batch analysis completed');

    res.json({ results, summary });
  } catch (error) {
    logger.error({ error }, 'Batch analysis failed');
    res.status(500).json({ error: 'Batch analysis failed' });
  }
});

// Get analysis history
app.get('/api/analyses', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const analyses = await Analysis.find()
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .select('-analysis')
      .lean();

    res.json({
      count: analyses.length,
      analyses,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get analysis history');
    res.status(500).json({ error: 'Failed to get analysis history' });
  }
});

// Get specific analysis
app.get('/api/analyses/:id', async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id).lean();

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(analysis);
  } catch (error) {
    logger.error({ error }, 'Failed to get analysis');
    res.status(500).json({ error: 'Failed to get analysis' });
  }
});

// ============================================
// CODE REFACTORING API
// ============================================

// Get refactoring suggestions
app.post('/api/refactor', async (req, res) => {
  try {
    const { code, filePath, type } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'code is required' });
    }

    // Analyze the code first
    const analysis = codeAnalyzer.analyze(code, filePath || 'refactor.ts');

    const refactoringChanges = [];

    // Suggest refactoring based on bugs
    if (analysis.bugs.length > 0) {
      refactoringChanges.push({
        type: 'fix_bugs',
        description: `Fix ${analysis.bugs.length} identified bug(s)`,
        priority: analysis.bugs.some(b => b.severity === 'critical') ? 'high' : 'medium',
        bugs: analysis.bugs,
      });
    }

    // Suggest refactoring based on complexity
    if (analysis.complexity > 10) {
      refactoringChanges.push({
        type: 'reduce_complexity',
        description: `Reduce cyclomatic complexity from ${analysis.complexity} to below 10`,
        priority: 'high',
        suggestion: 'Break down complex functions into smaller, more focused functions',
      });
    }

    // Suggest refactoring based on maintainability
    if (analysis.maintainability < 70) {
      refactoringChanges.push({
        type: 'improve_maintainability',
        description: `Improve maintainability from ${analysis.maintainability} to above 70`,
        priority: 'medium',
        suggestion: 'Add comments, improve naming, reduce coupling',
      });
    }

    // Suggest refactoring based on security issues
    if (analysis.securityIssues.length > 0) {
      refactoringChanges.push({
        type: 'fix_security',
        description: `Address ${analysis.securityIssues.length} security issue(s)`,
        priority: 'critical',
        securityIssues: analysis.securityIssues,
      });
    }

    res.json({
      refactoringChanges,
      analysis: {
        complexity: analysis.complexity,
        maintainability: analysis.maintainability,
        bugCount: analysis.bugs.length,
        securityIssueCount: analysis.securityIssues.length,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Refactoring analysis failed');
    res.status(500).json({ error: 'Refactoring analysis failed' });
  }
});

// ============================================
// DOCUMENT INTELLIGENCE API
// ============================================

// Process document
app.post('/api/document/process', async (req, res) => {
  try {
    const { content, options = {} } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const summary = await documentIntelligence.process(content, options);

    logger.info({
      title: summary.title,
      keyPointsCount: summary.keyPoints.length,
      entitiesCount: summary.entities.length,
    }, 'Document processed');

    res.json(summary);
  } catch (error) {
    logger.error({ error }, 'Document processing failed');
    res.status(500).json({ error: 'Document processing failed' });
  }
});

// Research query
app.post('/api/research', async (req, res) => {
  try {
    const { query, context } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const result = await documentIntelligence.research(query, context);

    logger.info({ query, confidence: result.confidence }, 'Research completed');

    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Research failed');
    res.status(500).json({ error: 'Research failed' });
  }
});

// ============================================
// STATISTICS API
// ============================================

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await Analysis.aggregate([
      {
        $group: {
          _id: null,
          totalAnalyses: { $sum: 1 },
          avgComplexity: { $avg: '$complexity' },
          avgMaintainability: { $avg: '$maintainability' },
          totalBugs: { $sum: '$bugCount' },
          totalSecurityIssues: { $sum: '$securityIssueCount' },
          avgLinesOfCode: { $avg: '$linesOfCode' },
        },
      },
    ]);

    // Get language distribution
    const languageStats = await Analysis.aggregate([
      { $group: { _id: '$language', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      overview: stats[0] || {
        totalAnalyses: 0,
        avgComplexity: 0,
        avgMaintainability: 0,
        totalBugs: 0,
        totalSecurityIssues: 0,
        avgLinesOfCode: 0,
      },
      languageDistribution: languageStats,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get statistics');
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🔍 HIB Code Intelligence (${PORT})                  ║
║                                                       ║
║   Services:                                           ║
║   - Code Analysis (quality, bugs, security)          ║
║   - Code Refactoring suggestions                     ║
║   - Document Intelligence                            ║
║   - Research Assistant                               ║
║                                                       ║
║   Endpoints:                                          ║
║   POST /api/analyze     - Analyze code               ║
║   POST /api/refactor    - Get refactoring tips       ║
║   POST /api/document    - Process documents          ║
║   POST /api/research    - Research queries           ║
║   GET  /api/stats       - Get statistics             ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;

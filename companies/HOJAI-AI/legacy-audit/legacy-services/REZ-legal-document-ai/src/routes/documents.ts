import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { DocumentModel, IDocument } from '../models/Document';
import { DocumentAnalysisModel, IDocumentAnalysis } from '../models/DocumentAnalysis';
import { RiskReportModel } from '../models/RiskReport';
import { extractText } from '../utils/textExtractor';
import { validateFile, parseDocumentTitle, detectDocumentType } from '../utils/documentParser';
import { analyzeDocument } from '../services/analyzerService';
import { extractClauses } from '../services/clauseExtractor';
import { generateRiskReport } from '../services/riskScorer';
import { generateSummary } from '../services/summarizer';
import { compareClauseToStandard, searchStandardClauses } from '../services/ragService';
import { mapToComplianceFrameworks } from '../services/complianceMapper';
import { AuthenticatedRequest, requireTenant } from '../middleware/tenant';
import logger from '../utils/logger';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const tenantId = (req as AuthenticatedRequest).tenant?.tenantId || 'default';
    const date = new Date();
    const destPath = path.join(uploadDir, tenantId, String(date.getFullYear()), String(date.getMonth() + 1).padStart(2, '0'));

    fs.mkdirSync(destPath, { recursive: true });
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

/**
 * POST /documents/upload
 * Upload and process a legal document
 */
router.post('/upload', requireTenant, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenant!.tenantId;
    const userId = req.tenant!.userId;

    // Validate file
    const validation = validateFile(req.file!);
    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        error: 'File validation failed',
        details: validation.validationErrors
      });
      return;
    }

    // Create document record
    const documentId = validation.documentId;
    const title = req.body.title || parseDocumentTitle(validation.fileName);

    const document = new DocumentModel({
      documentId,
      tenantId,
      userId,
      title,
      description: req.body.description || '',
      type: validation.documentType,
      status: 'uploaded',
      filePath: validation.uploadPath,
      metadata: {
        fileName: validation.fileName,
        fileSize: validation.fileSize,
        fileType: validation.fileType,
        mimeType: validation.mimeType,
        uploadedAt: new Date(),
        tags: req.body.tags ? JSON.parse(req.body.tags) : []
      }
    });

    await document.save();

    logger.info('Document uploaded', { documentId, tenantId, fileName: validation.fileName });

    res.status(201).json({
      success: true,
      document: {
        documentId: document.documentId,
        title: document.title,
        type: document.type,
        status: document.status,
        metadata: document.metadata
      }
    });
  } catch (error) {
    logger.error('Document upload failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to upload document',
      message: (error as Error).message
    });
  }
});

/**
 * POST /documents/:id/analyze
 * Analyze a document (extract text, clauses, risk, compliance)
 */
router.post('/:id/analyze', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.tenantId;

    // Find document
    const document = await DocumentModel.findOne({ documentId: id, tenantId });
    if (!document) {
      res.status(404).json({
        success: false,
        error: 'Document not found'
      });
      return;
    }

    // Update status
    document.status = 'analyzing';
    await document.save();

    // Extract text
    const extractedText = await extractText(document.filePath);

    // Update document with extracted text
    document.extractedText = extractedText.text;
    document.metadata.processedAt = new Date();
    document.metadata.wordCount = extractedText.wordCount;
    document.metadata.charCount = extractedText.charCount;
    document.metadata.pageCount = extractedText.pageCount;
    document.metadata.language = extractedText.metadata.extractionMethod;
    await document.save();

    // Detect document type from content
    document.type = detectDocumentType(extractedText.text, document.metadata.fileName);
    await document.save();

    // Analyze document
    const analysis = await analyzeDocument({
      documentId: document.documentId,
      content: extractedText.text,
      tenantId,
      userId: document.userId
    });

    // Save analysis
    const analysisDoc = new DocumentAnalysisModel({
      ...analysis,
      analyzedAt: new Date()
    });
    await analysisDoc.save();

    // Update document with analysis
    document.analysisId = analysisDoc.documentId;
    document.metadata.analyzedAt = new Date();
    document.status = 'completed';
    await document.save();

    // Generate risk report
    const riskReport = await generateRiskReport({
      documentId: document.documentId,
      tenantId,
      clauses: analysis.clauses,
      content: extractedText.text
    });

    // Save risk report
    const riskReportDoc = new RiskReportModel(riskReport);
    await riskReportDoc.save();

    // Update document with risk report
    document.riskReportId = riskReportDoc.reportId;
    await document.save();

    logger.info('Document analysis completed', {
      documentId: document.documentId,
      tenantId,
      clauseCount: analysis.clauses.length,
      riskScore: analysis.riskScore
    });

    res.json({
      success: true,
      document: {
        documentId: document.documentId,
        title: document.title,
        status: document.status,
        analysisId: document.analysisId,
        riskReportId: document.riskReportId
      },
      analysis,
      riskReport: {
        reportId: riskReport.reportId,
        overallRiskScore: riskReport.overallRiskScore,
        riskLevel: riskReport.riskLevel,
        summary: riskReport.summary
      }
    });
  } catch (error) {
    logger.error('Document analysis failed', { documentId: req.params.id, error });

    // Update document status to failed
    await DocumentModel.updateOne(
      { documentId: req.params.id },
      { status: 'failed', lastError: (error as Error).message }
    );

    res.status(500).json({
      success: false,
      error: 'Document analysis failed',
      message: (error as Error).message
    });
  }
});

/**
 * GET /documents
 * List all documents for the tenant
 */
router.get('/', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenant!.tenantId;
    const {
      page = '1',
      limit = '20',
      status,
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: Record<string, unknown> = { tenantId };

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [documents, total] = await Promise.all([
      DocumentModel.find(query)
        .select('-extractedText')
        .sort({ [sortBy as string]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean(),
      DocumentModel.countDocuments(query)
    ]);

    res.json({
      success: true,
      documents,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Failed to list documents', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to list documents'
    });
  }
});

/**
 * GET /documents/:id
 * Get document details
 */
router.get('/:id', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.tenantId;

    const document = await DocumentModel.findOne({ documentId: id, tenantId }).lean();

    if (!document) {
      res.status(404).json({
        success: false,
        error: 'Document not found'
      });
      return;
    }

    res.json({
      success: true,
      document
    });
  } catch (error) {
    logger.error('Failed to get document', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get document'
    });
  }
});

/**
 * GET /documents/:id/clauses
 * Get extracted clauses for a document
 */
router.get('/:id/clauses', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.tenantId;
    const { type, risk } = req.query;

    const document = await DocumentModel.findOne({ documentId: id, tenantId });
    if (!document) {
      res.status(404).json({
        success: false,
        error: 'Document not found'
      });
      return;
    }

    const analysis = await DocumentAnalysisModel.findOne({ documentId: id });
    if (!analysis) {
      res.status(404).json({
        success: false,
        error: 'Document has not been analyzed yet'
      });
      return;
    }

    let clauses = analysis.clauses;

    // Filter by type
    if (type) {
      clauses = clauses.filter(c => c.type === type);
    }

    // Filter by risk level
    if (risk) {
      clauses = clauses.filter(c => c.risk === risk);
    }

    res.json({
      success: true,
      documentId: id,
      clauseCount: clauses.length,
      clauses,
      metadata: analysis.clauses.length > 0 ? {
        totalClauses: analysis.clauses.length,
        analyzedAt: analysis.analyzedAt,
        confidence: analysis.confidence
      } : null
    });
  } catch (error) {
    logger.error('Failed to get clauses', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get clauses'
    });
  }
});

/**
 * GET /documents/:id/risk-report
 * Get risk assessment report
 */
router.get('/:id/risk-report', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.tenantId;

    const document = await DocumentModel.findOne({ documentId: id, tenantId });
    if (!document) {
      res.status(404).json({
        success: false,
        error: 'Document not found'
      });
      return;
    }

    const riskReport = await RiskReportModel.findOne({ documentId: id, tenantId }).lean();

    if (!riskReport) {
      res.status(404).json({
        success: false,
        error: 'Risk report not generated yet'
      });
      return;
    }

    res.json({
      success: true,
      riskReport
    });
  } catch (error) {
    logger.error('Failed to get risk report', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get risk report'
    });
  }
});

/**
 * POST /documents/:id/compare
 * Compare document clauses against standard library
 */
router.post('/:id/compare', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.tenantId;
    const { clauseId, clauseType } = req.body;

    const document = await DocumentModel.findOne({ documentId: id, tenantId });
    if (!document) {
      res.status(404).json({
        success: false,
        error: 'Document not found'
      });
      return;
    }

    const analysis = await DocumentAnalysisModel.findOne({ documentId: id });
    if (!analysis) {
      res.status(404).json({
        success: false,
        error: 'Document has not been analyzed yet'
      });
      return;
    }

    // Find the clause to compare
    const clause = clauseId
      ? analysis.clauses.find(c => c.id === clauseId)
      : analysis.clauses[0];

    if (!clause) {
      res.status(404).json({
        success: false,
        error: 'Clause not found'
      });
      return;
    }

    // Compare against standard clause
    const comparison = await compareClauseToStandard(clause, {
      tenantId,
      clauseType: clauseType || clause.type
    });

    // Also search for similar clauses
    const similarClauses = await searchStandardClauses({
      query: clause.content,
      tenantId,
      clauseType: clause.type,
      limit: 3
    });

    res.json({
      success: true,
      documentId: id,
      clause: {
        id: clause.id,
        type: clause.type,
        title: clause.title,
        risk: clause.risk
      },
      comparison,
      similarClauses: similarClauses.matches
    });
  } catch (error) {
    logger.error('Clause comparison failed', { error });
    res.status(500).json({
      success: false,
      error: 'Clause comparison failed',
      message: (error as Error).message
    });
  }
});

/**
 * POST /documents/:id/compliance
 * Check compliance against frameworks
 */
router.post('/:id/compliance', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.tenantId;
    const { frameworks } = req.body;

    const document = await DocumentModel.findOne({ documentId: id, tenantId });
    if (!document) {
      res.status(404).json({
        success: false,
        error: 'Document not found'
      });
      return;
    }

    const analysis = await DocumentAnalysisModel.findOne({ documentId: id });
    if (!analysis) {
      res.status(404).json({
        success: false,
        error: 'Document has not been analyzed yet'
      });
      return;
    }

    const complianceResults = await mapToComplianceFrameworks(
      analysis.clauses,
      frameworks || ['GDPR', 'SOC2', 'ISO27001']
    );

    res.json({
      success: true,
      documentId: id,
      complianceResults
    });
  } catch (error) {
    logger.error('Compliance check failed', { error });
    res.status(500).json({
      success: false,
      error: 'Compliance check failed',
      message: (error as Error).message
    });
  }
});

/**
 * POST /documents/:id/qa
 * Ask questions about the document
 */
router.post('/:id/qa', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.tenantId;
    const { question, maxTokens = 500 } = req.body;

    if (!question) {
      res.status(400).json({
        success: false,
        error: 'Question is required'
      });
      return;
    }

    const document = await DocumentModel.findOne({ documentId: id, tenantId });
    if (!document) {
      res.status(404).json({
        success: false,
        error: 'Document not found'
      });
      return;
    }

    if (!document.extractedText) {
      res.status(400).json({
        success: false,
        error: 'Document has not been processed yet'
      });
      return;
    }

    // Use RAG to answer the question
    const analysis = await DocumentAnalysisModel.findOne({ documentId: id });
    const context = document.extractedText.substring(0, 10000);

    const answerPrompt = `Based on the following legal document, answer the question. If the answer is not in the document, say so.

Document excerpt:
${context}

${analysis ? `\nExtracted clauses:\n${analysis.clauses.map(c => `${c.type}: ${c.title}`).join('\n')}` : ''}

Question: ${question}

Provide a clear, accurate answer based on the document.`;

    // Call Claude for Q&A
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    });

    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: parseInt(maxTokens as string),
      messages: [{ role: 'user', content: answerPrompt }]
    });

    const textContent = response.content[0];
    const answer = textContent.type === 'text' ? textContent.text : 'Unable to generate answer';

    logger.info('Question answered', { documentId: id, tenantId, questionLength: question.length });

    res.json({
      success: true,
      documentId: id,
      question,
      answer,
      sources: analysis ? {
        clauses: analysis.clauses.length,
        confidence: analysis.confidence
      } : null
    });
  } catch (error) {
    logger.error('Q&A failed', { error });
    res.status(500).json({
      success: false,
      error: 'Question answering failed',
      message: (error as Error).message
    });
  }
});

/**
 * POST /documents/:id/summarize
 * Generate document summary
 */
router.post('/:id/summarize', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.tenantId;
    const { type = 'detailed', focus } = req.body;

    const document = await DocumentModel.findOne({ documentId: id, tenantId });
    if (!document) {
      res.status(404).json({
        success: false,
        error: 'Document not found'
      });
      return;
    }

    if (!document.extractedText) {
      res.status(400).json({
        success: false,
        error: 'Document has not been processed yet'
      });
      return;
    }

    const summary = await generateSummary({
      documentId: document.documentId,
      content: document.extractedText,
      type,
      focus,
      tenantId
    });

    logger.info('Summary generated', { documentId: id, tenantId, type });

    res.json({
      success: true,
      documentId: id,
      summary
    });
  } catch (error) {
    logger.error('Summary generation failed', { error });
    res.status(500).json({
      success: false,
      error: 'Summary generation failed',
      message: (error as Error).message
    });
  }
});

/**
 * DELETE /documents/:id
 * Delete a document
 */
router.delete('/:id', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.tenantId;

    const document = await DocumentModel.findOneAndDelete({ documentId: id, tenantId });

    if (!document) {
      res.status(404).json({
        success: false,
        error: 'Document not found'
      });
      return;
    }

    // Clean up files
    if (document.filePath && fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Clean up analysis and risk reports
    await DocumentAnalysisModel.deleteMany({ documentId: id });
    await RiskReportModel.deleteMany({ documentId: id, tenantId });

    logger.info('Document deleted', { documentId: id, tenantId });

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    logger.error('Document deletion failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to delete document'
    });
  }
});

export default router;

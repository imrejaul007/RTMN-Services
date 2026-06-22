import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { DocumentModel } from '../models/Document';
import { DocumentAnalysisModel } from '../models/DocumentAnalysis';
import { AuthenticatedRequest, requireTenant } from '../middleware/tenant';
import logger from '../utils/logger';

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

/**
 * POST /qa/ask
 * Ask a general question about legal documents (requires document context)
 */
router.post('/ask', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenant!.tenantId;
    const { documentId, question, maxTokens = 1000 } = req.body;

    if (!documentId || !question) {
      res.status(400).json({
        success: false,
        error: 'Document ID and question are required'
      });
      return;
    }

    // Find document
    const document = await DocumentModel.findOne({ documentId, tenantId });
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

    // Get analysis for additional context
    const analysis = await DocumentAnalysisModel.findOne({ documentId });

    // Build context from document and analysis
    const context = buildDocumentContext(document.extractedText, analysis);

    // Generate answer
    const answer = await generateAnswer(question, context);

    logger.info('Question answered', {
      documentId,
      tenantId,
      questionLength: question.length,
      answerLength: answer.answer.length
    });

    res.json({
      success: true,
      documentId,
      question,
      answer: answer.answer,
      sources: answer.sources,
      confidence: answer.confidence
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
 * POST /qa/compare
 * Compare two documents or clauses
 */
router.post('/compare', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenant!.tenantId;
    const { documentId1, documentId2, question } = req.body;

    if (!documentId1 || !documentId2) {
      res.status(400).json({
        success: false,
        error: 'Two document IDs are required'
      });
      return;
    }

    // Find both documents
    const [doc1, doc2] = await Promise.all([
      DocumentModel.findOne({ documentId: documentId1, tenantId }),
      DocumentModel.findOne({ documentId: documentId2, tenantId })
    ]);

    if (!doc1 || !doc2) {
      res.status(404).json({
        success: false,
        error: 'One or both documents not found'
      });
      return;
    }

    if (!doc1.extractedText || !doc2.extractedText) {
      res.status(400).json({
        success: false,
        error: 'One or both documents have not been processed'
      });
      return;
    }

    // Generate comparison
    const comparisonPrompt = `Compare the following two legal documents.

Document 1: ${doc1.title}
${doc1.extractedText.substring(0, 5000)}

Document 2: ${doc2.title}
${doc2.extractedText.substring(0, 5000)}

${question ? `Focus on: ${question}` : 'Provide a comprehensive comparison including key differences in terms, obligations, and risk profiles.'}

Return a JSON object with:
{
  "summary": "Overall comparison summary",
  "keyDifferences": ["List of key differences"],
  "similarities": ["List of similarities"],
  "riskComparison": {
    "document1Risk": "low|medium|high",
    "document2Risk": "low|medium|high",
    "comparison": "Analysis"
  },
  "recommendation": "Which document is more favorable and why"
}`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: comparisonPrompt }]
    });

    const textContent = response.content[0];
    const comparison = textContent.type === 'text' ? parseJsonResponse(textContent.text) : {};

    res.json({
      success: true,
      documents: {
        document1: { id: doc1.documentId, title: doc1.title },
        document2: { id: doc2.documentId, title: doc2.title }
      },
      comparison
    });
  } catch (error) {
    logger.error('Document comparison failed', { error });
    res.status(500).json({
      success: false,
      error: 'Document comparison failed',
      message: (error as Error).message
    });
  }
});

/**
 * POST /qa/extract
 * Extract specific information from document
 */
router.post('/extract', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenant!.tenantId;
    const { documentId, extractionType } = req.body;

    if (!documentId || !extractionType) {
      res.status(400).json({
        success: false,
        error: 'Document ID and extraction type are required'
      });
      return;
    }

    const document = await DocumentModel.findOne({ documentId, tenantId });
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

    // Define extraction prompts based on type
    const extractionPrompts: Record<string, string> = {
      parties: 'Extract all parties mentioned in this document (companies, individuals, organizations). Return as JSON array.',
      dates: 'Extract all significant dates mentioned (effective date, termination, notice periods, milestones). Return as JSON array with date and context.',
      amounts: 'Extract all monetary amounts, fees, penalties mentioned. Return as JSON array with amount, currency, and context.',
      obligations: 'Extract all obligations for each party. Return as JSON array with party, obligation type, and description.',
      risks: 'Identify all risks mentioned in this document. Return as JSON array with risk description and affected party.',
      clauses: 'List all clauses/sections with their titles and brief descriptions. Return as JSON array.'
    };

    const prompt = extractionPrompts[extractionType];
    if (!prompt) {
      res.status(400).json({
        success: false,
        error: `Invalid extraction type. Available: ${Object.keys(extractionPrompts).join(', ')}`
      });
      return;
    }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `${prompt}

Document:
${document.extractedText.substring(0, 8000)}

Return ONLY the JSON.`
        }
      ]
    });

    const textContent = response.content[0];
    const extracted = textContent.type === 'text' ? parseJsonResponse(textContent.text) : [];

    res.json({
      success: true,
      documentId,
      extractionType,
      extracted
    });
  } catch (error) {
    logger.error('Extraction failed', { error });
    res.status(500).json({
      success: false,
      error: 'Information extraction failed',
      message: (error as Error).message
    });
  }
});

/**
 * POST /qa/summarize
 * Generate quick summary
 */
router.post('/summarize', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenant!.tenantId;
    const { documentId, format = 'paragraph' } = req.body;

    if (!documentId) {
      res.status(400).json({
        success: false,
        error: 'Document ID is required'
      });
      return;
    }

    const document = await DocumentModel.findOne({ documentId, tenantId });
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

    const analysis = await DocumentAnalysisModel.findOne({ documentId });

    const formatInstructions = {
      paragraph: 'Provide a 2-3 paragraph summary.',
      bullet: 'Provide a bulleted list of key points.',
      tl_dr: 'Provide a very brief TL;DR summary in 2-3 sentences.',
      key_terms: 'List only the most important terms and definitions.'
    };

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Summarize this legal document.
${formatInstructions[format as keyof typeof formatInstructions] || formatInstructions.paragraph}

Document: ${document.title}
${document.extractedText.substring(0, 6000)}`
        }
      ]
    });

    const textContent = response.content[0];
    const summary = textContent.type === 'text' ? textContent.text : 'Summary not available';

    res.json({
      success: true,
      documentId,
      format,
      summary,
      wordCount: document.metadata.wordCount
    });
  } catch (error) {
    logger.error('Quick summary failed', { error });
    res.status(500).json({
      success: false,
      error: 'Summary generation failed',
      message: (error as Error).message
    });
  }
});

/**
 * POST /qa/analyze-risk
 * Quick risk analysis
 */
router.post('/analyze-risk', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenant!.tenantId;
    const { documentId } = req.body;

    if (!documentId) {
      res.status(400).json({
        success: false,
        error: 'Document ID is required'
      });
      return;
    }

    const document = await DocumentModel.findOne({ documentId, tenantId });
    if (!document) {
      res.status(404).json({
        success: false,
        error: 'Document not found'
      });
      return;
    }

    const analysis = await DocumentAnalysisModel.findOne({ documentId });
    if (!analysis) {
      res.status(400).json({
        success: false,
        error: 'Document has not been analyzed yet'
      });
      return;
    }

    // Quick risk summary from existing analysis
    const highRiskClauses = analysis.clauses.filter(c => c.risk === 'high');
    const mediumRiskClauses = analysis.clauses.filter(c => c.risk === 'medium');
    const lowRiskClauses = analysis.clauses.filter(c => c.risk === 'low');

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `Analyze the risk profile of this document based on the following information:

Overall Risk Score: ${analysis.riskScore}/100

High Risk Clauses (${highRiskClauses.length}):
${highRiskClauses.slice(0, 5).map(c => `- ${c.title}: ${c.riskFactors.join(', ')}`).join('\n') || 'None'}

Medium Risk Clauses (${mediumRiskClauses.length}):
${mediumRiskClauses.slice(0, 3).map(c => `- ${c.title}`).join('\n') || 'None'}

Key Risk Factors:
${analysis.clauses.flatMap(c => c.riskFactors).slice(0, 10).join('\n') || 'Standard terms'}

Provide a JSON response:
{
  "overallAssessment": "Brief risk assessment",
  "topRisks": ["Top 3 risks with explanations"],
  "riskMitigation": ["Recommendations for risk mitigation"],
  "riskLevel": "minimal|low|moderate|high|critical"
}`
        }
      ]
    });

    const textContent = response.content[0];
    const riskAnalysis = textContent.type === 'text' ? parseJsonResponse(textContent.text) : {};

    res.json({
      success: true,
      documentId,
      quickRiskAnalysis: {
        riskScore: analysis.riskScore,
        clauseDistribution: {
          high: highRiskClauses.length,
          medium: mediumRiskClauses.length,
          low: lowRiskClauses.length
        },
        ...riskAnalysis
      }
    });
  } catch (error) {
    logger.error('Risk analysis failed', { error });
    res.status(500).json({
      success: false,
      error: 'Risk analysis failed',
      message: (error as Error).message
    });
  }
});

/**
 * Helper functions
 */

function buildDocumentContext(text: string, analysis: any): string {
  let context = text.substring(0, 10000);

  if (analysis) {
    context += '\n\n--- Extracted Clauses ---\n';
    context += analysis.clauses
      .map((c: any) => `[${c.type}] ${c.title}: ${c.content.substring(0, 200)}`)
      .join('\n\n');

    context += '\n\n--- Key Entities ---\n';
    if (analysis.entities?.parties) {
      context += `Parties: ${analysis.entities.parties.join(', ')}\n`;
    }
    if (analysis.entities?.dates) {
      context += `Dates: ${analysis.entities.dates.join(', ')}\n`;
    }
    if (analysis.entities?.jurisdictions) {
      context += `Jurisdictions: ${analysis.entities.jurisdictions.join(', ')}\n`;
    }
  }

  return context;
}

async function generateAnswer(question: string, context: string): Promise<{
  answer: string;
  sources: { clauses: number; confidence: number };
  confidence: number;
}> {
  const prompt = `Based on the following document context, answer the question. If the answer cannot be determined from the context, say so.

Context:
${context}

Question: ${question}

Return as JSON:
{
  "answer": "Your answer here",
  "confidence": 0.8,
  "sources": ["Relevant section or clause references if applicable"]
}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });

    const textContent = response.content[0];
    if (textContent.type !== 'text') {
      return {
        answer: 'Unable to generate answer',
        sources: { clauses: 0, confidence: 0 },
        confidence: 0
      };
    }

    const parsed = parseJsonResponse(textContent.text);

    return {
      answer: parsed.answer || textContent.text,
      sources: {
        clauses: (parsed.sources || []).length,
        confidence: parsed.confidence || 0.7
      },
      confidence: parsed.confidence || 0.7
    };
  } catch (error) {
    logger.error('Answer generation failed', { error });
    return {
      answer: 'An error occurred while generating the answer.',
      sources: { clauses: 0, confidence: 0 },
      confidence: 0
    };
  }
}

function parseJsonResponse(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // Return raw text if JSON parsing fails
  }
  return {};
}

export default router;

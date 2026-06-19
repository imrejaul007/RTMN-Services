/**
 * HOJAI Intelligence - Knowledge Retrieval Agent
 * Retrieves relevant knowledge, documents, and insights
 */

import { RetrievalResult } from '../types';

// Mock knowledge base - in production, this would connect to a vector database
const KNOWLEDGE_BASE: Array<{
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  relevance: number;
  source: string;
}> = [
  {
    id: 'kb-001',
    category: 'billing',
    title: 'Refund Policy',
    content: 'Customers are eligible for a full refund within 30 days of purchase. Partial refunds are available within 60 days. After 60 days, no refunds are issued. Refunds are processed within 5-7 business days.',
    keywords: ['refund', 'money back', 'return', 'policy', '30 days', '60 days'],
    relevance: 0.9,
    source: 'policy-document',
  },
  {
    id: 'kb-002',
    category: 'technical',
    title: 'Password Reset Process',
    content: 'To reset password: 1) Go to login page, 2) Click "Forgot Password", 3) Enter email address, 4) Check inbox for reset link, 5) Click link and set new password. Link expires in 24 hours.',
    keywords: ['password', 'reset', 'forgot', 'login', 'access', 'account'],
    relevance: 0.85,
    source: 'help-center',
  },
  {
    id: 'kb-003',
    category: 'billing',
    title: 'Payment Methods Accepted',
    content: 'We accept all major credit cards (Visa, MasterCard, Amex), debit cards, UPI, net banking, and select digital wallets. Corporate customers can request invoice-based billing.',
    keywords: ['payment', 'credit card', 'debit card', 'upi', 'banking', 'wallet'],
    relevance: 0.8,
    source: 'billing-faq',
  },
  {
    id: 'kb-004',
    category: 'technical',
    title: 'App Installation Guide',
    content: 'Supported platforms: iOS 14+, Android 10+. Download from App Store or Play Store. Minimum 500MB storage required. For enterprise deployment, contact your IT administrator.',
    keywords: ['app', 'install', 'download', 'ios', 'android', 'mobile'],
    relevance: 0.75,
    source: 'technical-docs',
  },
  {
    id: 'kb-005',
    category: 'account',
    title: 'Account Upgrade Options',
    content: 'Standard Plan: Core features. Premium Plan (+$20/mo): Priority support, advanced analytics, unlimited projects. Enterprise Plan (Custom): Dedicated account manager, SSO, custom integrations.',
    keywords: ['upgrade', 'plan', 'premium', 'enterprise', 'subscription'],
    relevance: 0.85,
    source: 'pricing-page',
  },
  {
    id: 'kb-006',
    category: 'shipping',
    title: 'Order Tracking Information',
    content: 'Orders typically ship within 24 hours. Standard delivery: 5-7 business days. Express delivery: 2-3 business days. Track your order using the tracking number in your confirmation email.',
    keywords: ['order', 'tracking', 'delivery', 'shipping', 'shipment', 'arrival'],
    relevance: 0.8,
    source: 'shipping-policy',
  },
  {
    id: 'kb-007',
    category: 'complaint',
    title: 'Escalation Process',
    content: 'For unresolved complaints: 1) Request supervisor intervention, 2) Submit formal complaint via portal, 3) Contact customer relations team, 4) Escalate to management if needed within 48 hours.',
    keywords: ['escalate', 'supervisor', 'management', 'complaint', 'unresolved'],
    relevance: 0.9,
    source: 'sop-document',
  },
  {
    id: 'kb-008',
    category: 'technical',
    title: 'Common Error Codes',
    content: 'Error 401: Authentication failed - check credentials. Error 403: Access denied - verify permissions. Error 404: Resource not found - check URL. Error 500: Server error - retry later.',
    keywords: ['error', 'code', 'failed', 'problem', 'issue', 'troubleshoot'],
    relevance: 0.85,
    source: 'technical-docs',
  },
];

// Knowledge graph concepts
const KNOWLEDGE_GRAPH: Record<string, { relationships: string[]; concepts: string[] }> = {
  'refund': {
    relationships: ['leads_to', 'requires', 'governed_by'],
    concepts: ['payment', 'policy', 'time_limit', 'approval'],
  },
  'technical_support': {
    relationships: ['involves', 'diagnoses', 'resolves'],
    concepts: ['issue', 'troubleshooting', 'escalation', 'resolution'],
  },
  'billing': {
    relationships: ['includes', 'processes', 'validates'],
    concepts: ['payment', 'invoice', 'subscription', 'charges'],
  },
  'account': {
    relationships: ['contains', 'manages', 'secures'],
    concepts: ['credentials', 'profile', 'settings', 'permissions'],
  },
};

export class RetrievalAgent {
  /**
   * Retrieve relevant knowledge for a query
   */
  async retrieve(
    query: string,
    context?: {
      category?: string;
      customerTier?: string;
      previousIssues?: string[];
    }
  ): Promise<RetrievalResult> {
    const normalizedQuery = query.toLowerCase();

    // Score and rank documents
    const scoredDocs = KNOWLEDGE_BASE.map(doc => ({
      ...doc,
      relevanceScore: this.calculateRelevance(normalizedQuery, doc, context),
    }))
      .filter(doc => doc.relevanceScore > 0.2)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Extract relevant documents
    const relevantDocuments = scoredDocs.slice(0, 5).map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      relevance: Math.round(doc.relevanceScore * 100) / 100,
      source: doc.source,
    }));

    // Extract knowledge graph insights
    const knowledgeGraphInsights = this.extractInsights(normalizedQuery);

    // Generate context summary
    const contextSummary = this.generateSummary(relevantDocuments, query);

    return {
      relevantDocuments,
      knowledgeGraphInsights,
      contextSummary,
    };
  }

  /**
   * Calculate relevance score for a document
   */
  private calculateRelevance(
    query: string,
    doc: typeof KNOWLEDGE_BASE[0],
    context?: { category?: string; customerTier?: string; previousIssues?: string[] }
  ): number {
    let score = 0;

    // Keyword matching
    const queryWords = query.split(/\s+/);
    for (const word of queryWords) {
      if (word.length < 3) continue;

      // Title match (highest weight)
      if (doc.title.toLowerCase().includes(word)) {
        score += 0.3;
      }

      // Content match
      if (doc.content.toLowerCase().includes(word)) {
        score += 0.15;
      }

      // Keyword match
      for (const keyword of doc.keywords) {
        if (keyword.toLowerCase().includes(word) || word.includes(keyword.toLowerCase())) {
          score += 0.2;
        }
      }
    }

    // Category context boost
    if (context?.category && doc.category === context.category) {
      score *= 1.3;
    }

    // Previous issues - reduce if already seen
    if (context?.previousIssues) {
      for (const issue of context.previousIssues) {
        if (doc.content.toLowerCase().includes(issue.toLowerCase())) {
          score *= 0.8;
        }
      }
    }

    // Base relevance from document
    score += doc.relevance * 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Extract knowledge graph insights
   */
  private extractInsights(query: string): Array<{ concept: string; relationships: string[]; confidence: number }> {
    const insights: Array<{ concept: string; relationships: string[]; confidence: number }> = [];

    for (const [concept, config] of Object.entries(KNOWLEDGE_GRAPH)) {
      if (query.includes(concept) || concept.includes(query.split(' ')[0])) {
        insights.push({
          concept,
          relationships: config.relationships,
          confidence: 0.85,
        });
      }
    }

    return insights.slice(0, 3);
  }

  /**
   * Generate summary from retrieved documents
   */
  private generateSummary(documents: RetrievalResult['relevantDocuments'], query: string): string {
    if (documents.length === 0) {
      return 'No relevant documents found for this query.';
    }

    const primaryDoc = documents[0];
    const categories = [...new Set(documents.map(d => d.source))];

    return `Based on ${documents.length} relevant document(s) from ${categories.join(', ')}: ${primaryDoc.title}. ${primaryDoc.content.slice(0, 150)}...`;
  }

  /**
   * Search for similar past cases
   */
  async findSimilarCases(
    currentIssue: string,
    caseHistory: Array<{ summary: string; resolution: string }>
  ): Promise<Array<{ case: string; resolution: string; similarity: number }>> {
    const currentWords = currentIssue.toLowerCase().split(/\s+/);

    return caseHistory
      .map(caseItem => {
        const caseWords = caseItem.summary.toLowerCase().split(/\s+/);
        const intersection = currentWords.filter(w =>
          caseWords.some(cw => cw.includes(w) || w.includes(cw))
        );
        const similarity = intersection.length / Math.max(currentWords.length, caseWords.length);

        return {
          case: caseItem.summary,
          resolution: caseItem.resolution,
          similarity: Math.round(similarity * 100) / 100,
        };
      })
      .filter(c => c.similarity > 0.2)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  }
}

export const retrievalAgent = new RetrievalAgent();

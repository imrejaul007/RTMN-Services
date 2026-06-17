import { Resolution } from '../models/Resolution';
import winston from 'winston';
import axios from 'axios';

export interface KBResult {
  resolved: boolean;
  articleId?: string;
  title?: string;
  solution?: string;
  steps?: string[];
  confidence?: number;
  source?: string;
}

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  solution?: string;
  steps?: string[];
  confidence?: number;
  resolutionRate?: number;
  viewCount?: number;
}

export class KnowledgeResolver {
  private logger: winston.Logger;
  private knowledgeBaseUrl: string;
  private cache: Map<string, KBResult>;
  private cacheExpiry: number = 1000 * 60 * 15; // 15 minutes

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.knowledgeBaseUrl = process.env.KNOWLEDGE_BASE_URL || 'http://localhost:4703';
    this.cache = new Map();
  }

  async resolveFromKB(resolution: Resolution): Promise<KBResult> {
    this.logger.info(`Searching Knowledge Base for ticket: ${resolution.ticketId}`);

    // Check cache first
    const cacheKey = `${resolution.category}:${resolution.title.substring(0, 50)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.confidence! < this.cacheExpiry) {
      this.logger.info(`Cache hit for: ${cacheKey}`);
      return cached;
    }

    try {
      // Build search query
      const searchQuery = this.buildSearchQuery(resolution);

      // Try to search Knowledge Base service
      const kbArticle = await this.searchKnowledgeBase(searchQuery, resolution);

      if (kbArticle) {
        const result: KBResult = {
          resolved: true,
          articleId: kbArticle.id,
          title: kbArticle.title,
          solution: kbArticle.solution || kbArticle.content,
          steps: kbArticle.steps || [],
          confidence: kbArticle.confidence || 0.8,
          source: 'knowledge_base'
        };

        // Cache the result
        this.cache.set(cacheKey, result);
        return result;
      }

      // Fallback: Use local KB simulation
      return this.searchLocalKB(resolution);
    } catch (error: any) {
      this.logger.warn(`Knowledge Base search failed: ${error.message}`);
      return this.searchLocalKB(resolution);
    }
  }

  private buildSearchQuery(resolution: Resolution): string {
    const parts: string[] = [resolution.title];

    if (resolution.category) {
      parts.push(resolution.category);
    }

    // Extract key terms from description
    const descWords = resolution.description
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4)
      .slice(0, 10);

    parts.push(...descWords);

    return parts.join(' ');
  }

  private async searchKnowledgeBase(
    query: string,
    resolution: Resolution
  ): Promise<KnowledgeArticle | null> {
    try {
      // Call Knowledge Base service (MemoryOS or dedicated KB)
      const response = await axios.post(
        `${this.knowledgeBaseUrl}/api/search`,
        {
          query,
          category: resolution.category,
          limit: 5
        },
        { timeout: 3000 }
      );

      if (response.data && response.data.results && response.data.results.length > 0) {
        const bestMatch = response.data.results[0];
        return {
          id: bestMatch.id,
          title: bestMatch.title,
          content: bestMatch.content || bestMatch.solution,
          category: bestMatch.category,
          keywords: bestMatch.keywords || [],
          solution: bestMatch.solution,
          steps: bestMatch.steps,
          confidence: bestMatch.confidence || 0.8
        };
      }
    } catch (error: any) {
      // Service unavailable, will use local KB
      this.logger.debug(`KB service unavailable: ${error.message}`);
    }

    return null;
  }

  private searchLocalKB(resolution: Resolution): KBResult {
    this.logger.info(`Searching local KB for ticket: ${resolution.ticketId}`);

    // Local knowledge base for common issues
    const localKB: KnowledgeArticle[] = [
      {
        id: 'kb-001',
        title: 'How to reset password',
        content: 'Guide for password reset process',
        category: 'account',
        keywords: ['password', 'reset', 'forgot', 'login', 'account'],
        solution: 'Please follow these steps to reset your password: 1) Go to the login page, 2) Click "Forgot Password", 3) Enter your email, 4) Check your email for reset link, 5) Create new password.',
        steps: [
          'Navigate to login page',
          'Click "Forgot Password" link',
          'Enter registered email address',
          'Check inbox for password reset email',
          'Click the reset link in email',
          'Create and confirm new password'
        ],
        confidence: 0.9
      },
      {
        id: 'kb-002',
        title: 'Payment failed troubleshooting',
        content: 'Steps to resolve payment issues',
        category: 'billing',
        keywords: ['payment', 'failed', 'card', 'transaction', 'charge'],
        solution: 'Payment can fail due to various reasons. Please verify your payment method and try again.',
        steps: [
          'Check if card is valid and not expired',
          'Verify billing address matches card',
          'Ensure sufficient funds are available',
          'Try alternate payment method',
          'Contact bank if issues persist'
        ],
        confidence: 0.85
      },
      {
        id: 'kb-003',
        title: 'Service outage notifications',
        content: 'What to do during service outages',
        category: 'technical',
        keywords: ['down', 'outage', 'not working', 'error', 'unavailable', 'service'],
        solution: 'We apologize for the inconvenience. Our team is aware of the issue and working to resolve it.',
        steps: [
          'Check our status page for current incidents',
          'Subscribe to status updates',
          'Try refreshing the page',
          'Clear browser cache and cookies',
          'Try accessing from different browser/device'
        ],
        confidence: 0.8
      },
      {
        id: 'kb-004',
        title: 'Subscription cancellation',
        content: 'How to cancel your subscription',
        category: 'billing',
        keywords: ['cancel', 'subscription', 'stop', 'end', 'unsubscribe'],
        solution: 'You can cancel your subscription from account settings. Your access will continue until the end of the current billing period.',
        steps: [
          'Log in to your account',
          'Go to Settings > Subscription',
          'Click "Cancel Subscription"',
          'Confirm cancellation',
          'Review cancellation terms'
        ],
        confidence: 0.95
      },
      {
        id: 'kb-005',
        title: 'Refund request process',
        content: 'How to request a refund',
        category: 'billing',
        keywords: ['refund', 'money back', 'return', 'reimbursement'],
        solution: 'Refund requests are typically processed within 5-7 business days.',
        steps: [
          'Go to Order History',
          'Select the order for refund',
          'Click "Request Refund"',
          'Provide reason for refund',
          'Submit request and await confirmation'
        ],
        confidence: 0.92
      },
      {
        id: 'kb-006',
        title: 'Account verification',
        content: 'Verify your account email or phone',
        category: 'account',
        keywords: ['verify', 'confirm', 'email', 'phone', 'validation'],
        solution: 'Verification email has been sent. Please check your inbox and click the verification link.',
        steps: [
          'Check your email inbox',
          'Look for verification email',
          'Click the verification link',
          'If not received, check spam folder',
          'Request new verification if needed'
        ],
        confidence: 0.88
      }
    ];

    // Search local KB
    const searchText = `${resolution.title} ${resolution.description} ${resolution.category}`.toLowerCase();

    let bestMatch: KnowledgeArticle | null = null;
    let bestScore = 0;

    localKB.forEach(article => {
      let score = 0;

      // Category match
      if (resolution.category.toLowerCase().includes(article.category.toLowerCase()) ||
          article.category.toLowerCase().includes(resolution.category.toLowerCase())) {
        score += 3;
      }

      // Keyword matching
      article.keywords.forEach(keyword => {
        if (searchText.includes(keyword.toLowerCase())) {
          score += 2;
        }
      });

      // Title match
      if (resolution.title.toLowerCase().includes(article.title.toLowerCase().split(' ')[0])) {
        score += 4;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = article;
      }
    });

    if (bestMatch && bestScore >= 2) {
      const result: KBResult = {
        resolved: true,
        articleId: bestMatch.id,
        title: bestMatch.title,
        solution: bestMatch.solution,
        steps: bestMatch.steps,
        confidence: Math.min(0.95, bestMatch.confidence! * (bestScore / 10)),
        source: 'local_kb'
      };

      this.cache.set(`${resolution.category}:${resolution.title.substring(0, 50)}`, result);
      return result;
    }

    return { resolved: false };
  }

  // Index a new article into the KB
  async indexArticle(article: Omit<KnowledgeArticle, 'id'>): Promise<KnowledgeArticle> {
    const newArticle: KnowledgeArticle = {
      id: `kb-${Date.now()}`,
      ...article
    };

    this.logger.info(`Indexed new KB article: ${newArticle.id}`);
    return newArticle;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Knowledge Base cache cleared');
  }
}

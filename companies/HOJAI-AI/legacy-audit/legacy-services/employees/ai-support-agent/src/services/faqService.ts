/**
 * HOJAI AI Support Agent - FAQ Engine Service
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Intelligent FAQ management with search, relevance scoring, and user feedback
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger.js';
import type {
  FAQItem,
  FAQCategory,
  FAQSearchResult,
  CreateFAQInput,
  FAQSearchInputType,
} from '../types.js';

const logger = createLogger('faq-service');

// In-memory FAQ storage
const faqs = new Map<string, FAQItem>();

/**
 * Seed default FAQs
 */
const DEFAULT_FAQS: CreateFAQInput[] = [
  // Getting Started
  {
    question: 'How do I create an account?',
    answer: 'To create an account, click the "Sign Up" button on our homepage. Enter your email address, create a password, and complete your profile. You can also sign up using Google or Apple authentication for faster access.',
    category: 'getting-started',
    tags: ['account', 'signup', 'registration'],
  },
  {
    question: 'How do I reset my password?',
    answer: 'Click "Forgot Password" on the login page. Enter your email address and we\'ll send you a password reset link. The link expires in 24 hours. If you don\'t receive the email, check your spam folder or contact support.',
    category: 'getting-started',
    tags: ['password', 'reset', 'login', 'account'],
  },
  {
    question: 'How do I verify my email?',
    answer: 'After signing up, check your inbox for a verification email. Click the verification link in the email. If the link has expired, go to Settings > Account > Resend Verification Email.',
    category: 'getting-started',
    tags: ['email', 'verification', 'account'],
  },

  // Billing
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express), debit cards, UPI, net banking, and digital wallets (Google Pay, Apple Pay, PhonePe, Paytm). Enterprise customers can pay via bank transfer or check.',
    category: 'billing',
    tags: ['payment', 'credit card', 'upi', 'wallet'],
  },
  {
    question: 'How do I update my billing information?',
    answer: 'Go to Settings > Billing > Payment Methods. Click "Add Payment Method" to add a new card or payment option. To remove a payment method, click the trash icon next to it. You cannot remove your primary payment method if you have an active subscription.',
    category: 'billing',
    tags: ['billing', 'payment', 'credit card', 'update'],
  },
  {
    question: 'Where can I find my invoices?',
    answer: 'Navigate to Settings > Billing > Invoice History. All your invoices are listed chronologically. Click any invoice to view details or download a PDF. You can also have invoices emailed to you automatically.',
    category: 'billing',
    tags: ['invoice', 'billing', 'receipt', 'pdf'],
  },

  // Technical
  {
    question: 'The app is not loading properly. What should I do?',
    answer: 'First, try refreshing the page or restarting the app. Clear your browser cache: Chrome (Ctrl+Shift+Delete), Firefox (Ctrl+Shift+Del), Safari (Cmd+Shift+Delete). Make sure you\'re using a supported browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+). If the issue persists, contact technical support.',
    category: 'technical',
    tags: ['error', 'loading', 'browser', 'cache'],
  },
  {
    question: 'How do I enable two-factor authentication?',
    answer: 'Go to Settings > Security > Two-Factor Authentication. Click "Enable 2FA" and choose your preferred method: authenticator app (recommended), SMS, or email. Follow the setup instructions and save your backup codes in a secure location.',
    category: 'technical',
    tags: ['2fa', 'security', 'authentication', 'login'],
  },
  {
    question: 'Why am I experiencing slow performance?',
    answer: 'Slow performance can be caused by: 1) Outdated browser or app version - update to the latest version. 2) Too many browser tabs open. 3) Poor internet connection. 4) Large file uploads. 5) Browser extensions conflicting. Try clearing cache, disabling extensions, or using incognito mode.',
    category: 'technical',
    tags: ['performance', 'slow', 'speed', 'loading'],
  },

  // Account
  {
    question: 'How do I change my email address?',
    answer: 'Go to Settings > Account > Email. Enter your new email address and your current password. We\'ll send a verification link to your new email. Your old email will remain active until the new email is verified.',
    category: 'account',
    tags: ['email', 'change', 'account', 'update'],
  },
  {
    question: 'How do I delete my account?',
    answer: 'Go to Settings > Account > Delete Account. Review the information about what will be deleted. Enter your password to confirm. Note: Account deletion is permanent and cannot be undone. Your data will be removed within 30 days as per our privacy policy.',
    category: 'account',
    tags: ['delete', 'account', 'deactivate', 'privacy'],
  },
  {
    question: 'How do I update my profile picture?',
    answer: 'Go to Settings > Profile. Click on your current profile picture or the camera icon. Upload a new image (JPG, PNG, or GIF, max 5MB). Crop and adjust as needed, then click Save. For best results, use a square image at least 200x200 pixels.',
    category: 'account',
    tags: ['profile', 'picture', 'avatar', 'photo'],
  },

  // Products
  {
    question: 'How do I purchase a subscription?',
    answer: 'Visit our Pricing page to compare plans. Select a plan that suits your needs and click "Subscribe". Choose your billing cycle (monthly or annual) and complete payment. Your subscription activates immediately after successful payment.',
    category: 'products',
    tags: ['subscription', 'pricing', 'purchase', 'plan'],
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer: 'Yes! Go to Settings > Billing > Current Plan. Click "Change Plan". Select your new plan. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your current billing cycle to avoid service interruption.',
    category: 'products',
    tags: ['upgrade', 'downgrade', 'plan', 'subscription'],
  },
  {
    question: 'Do you offer a free trial?',
    answer: 'Yes! All new accounts get a 14-day free trial with full access to all features. No credit card required to start. At the end of your trial, choose a plan or your account will automatically convert to our free tier.',
    category: 'products',
    tags: ['trial', 'free', 'demo', 'subscription'],
  },

  // Shipping
  {
    question: 'How long does shipping take?',
    answer: 'Standard shipping takes 5-7 business days within India. Express shipping takes 2-3 business days. International shipping takes 10-15 business days depending on the destination. Orders are processed within 1-2 business days.',
    category: 'shipping',
    tags: ['shipping', 'delivery', 'time', 'days'],
  },
  {
    question: 'Can I track my order?',
    answer: 'Yes! Once your order ships, you\'ll receive a tracking number via email and SMS. Use this number on our Tracking page or the carrier\'s website. You can also track your order in real-time from your Account > Orders section.',
    category: 'shipping',
    tags: ['tracking', 'order', 'shipping', 'delivery'],
  },
  {
    question: 'What are the shipping charges?',
    answer: 'Shipping charges vary by location and order value. Orders above Rs. 499 qualify for free standard shipping. Standard shipping for orders below Rs. 499 is Rs. 49. Express shipping is available at Rs. 99 for all orders.',
    category: 'shipping',
    tags: ['shipping', 'charges', 'cost', 'fee'],
  },

  // Returns
  {
    question: 'What is your return policy?',
    answer: 'We offer a 30-day return policy for most items. Products must be unused and in original packaging with all tags attached. Some categories like intimates, personalized items, and perishable goods cannot be returned. Visit our Returns Center to initiate a return.',
    category: 'returns',
    tags: ['return', 'refund', 'policy', 'exchange'],
  },
  {
    question: 'How do I initiate a return?',
    answer: 'Go to Account > Orders > View Order. Click "Return Item" next to the item you want to return. Select a return reason and choose your preferred return method (pickup or drop-off). Print the return label and schedule a pickup or drop off at a nearby location.',
    category: 'returns',
    tags: ['return', 'initiate', 'process', 'order'],
  },
  {
    question: 'How long do refunds take?',
    answer: 'After we receive and inspect your return (1-3 business days), refunds are processed within 5-7 business days. The refund will be credited to your original payment method. Bank transfers may take an additional 2-5 business days to appear in your account.',
    category: 'returns',
    tags: ['refund', 'return', 'time', 'processing'],
  },

  // Warranty
  {
    question: 'How do I check my warranty status?',
    answer: 'Go to Account > My Products > Warranty Status. Enter your product serial number or order ID to check warranty coverage. You can also scan your product QR code for instant warranty verification.',
    category: 'warranty',
    tags: ['warranty', 'check', 'status', 'coverage'],
  },
  {
    question: 'What does my warranty cover?',
    answer: 'Our standard warranty covers manufacturing defects in materials and workmanship for the specified warranty period. This includes: mechanical failures, electrical defects, and material flaws. The warranty does NOT cover damage from misuse, accidents, normal wear, or unauthorized modifications.',
    category: 'warranty',
    tags: ['warranty', 'coverage', 'defect', 'repair'],
  },
  {
    question: 'How do I file a warranty claim?',
    answer: 'To file a warranty claim: 1) Go to Account > Warranty Claims > New Claim. 2) Enter your product serial number and purchase information. 3) Describe the issue and upload photos/videos if available. 4) Submit and note your claim reference number. Our team will review within 2 business days.',
    category: 'warranty',
    tags: ['warranty', 'claim', 'file', 'repair'],
  },

  // General
  {
    question: 'How can I contact customer support?',
    answer: 'You can reach our support team through: 1) Live chat on our website (available 24/7). 2) Email at support@example.com (response within 24 hours). 3) Phone: 1800-XXX-XXXX (Mon-Sat, 9am-6pm IST). 4) WhatsApp: +91XXXXXXXXXX.',
    category: 'general',
    tags: ['support', 'contact', 'help', 'phone', 'email'],
  },
  {
    question: 'How do I submit feedback or suggestions?',
    answer: 'We love hearing from you! Submit feedback through: 1) The Feedback form in Settings > Feedback. 2) Our community forum at community.example.com. 3) Email us at feedback@example.com. Our product team reviews all submissions and updates are shared in our monthly changelog.',
    category: 'general',
    tags: ['feedback', 'suggestion', 'idea', 'feature'],
  },
  {
    question: 'Where can I find the latest updates and announcements?',
    answer: 'Stay updated through: 1) Our blog at blog.example.com. 2) Release notes in Settings > About > What\'s New. 3) Email newsletters (manage preferences in Settings > Notifications). 4) Social media: Twitter, LinkedIn, Facebook.',
    category: 'general',
    tags: ['updates', 'announcements', 'news', 'blog'],
  },
];

/**
 * Initialize default FAQs
 */
function initializeFAQs(): void {
  for (const faqInput of DEFAULT_FAQS) {
    const id = uuidv4();
    const faq: FAQItem = {
      id,
      question: faqInput.question,
      answer: faqInput.answer,
      category: faqInput.category,
      tags: faqInput.tags || [],
      helpful: Math.floor(Math.random() * 100),
      notHelpful: Math.floor(Math.random() * 20),
      views: Math.floor(Math.random() * 1000),
      relatedFAQs: faqInput.relatedFAQs,
      metadata: faqInput.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    faqs.set(id, faq);
  }
  logger.info('faqs_initialized', { count: faqs.size });
}

// Initialize on module load
initializeFAQs();

/**
 * Calculate relevance score between query and FAQ
 */
function calculateRelevanceScore(query: string, faq: FAQItem): { score: number; matchedTerms: string[] } {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const questionTerms = faq.question.toLowerCase().split(/\s+/);
  const answerTerms = faq.answer.toLowerCase().split(/\s+/);
  const allTerms = [...faq.tags.map(t => t.toLowerCase()), ...faq.category.split('-')];

  let score = 0;
  const matchedTerms: string[] = [];

  // Exact phrase match in question (highest weight)
  if (faq.question.toLowerCase().includes(query.toLowerCase())) {
    score += 100;
  }

  // Term matching
  for (const queryTerm of queryTerms) {
    // Question match (high weight)
    for (const questionTerm of questionTerms) {
      if (questionTerm.includes(queryTerm) || queryTerm.includes(questionTerm)) {
        score += 20;
        matchedTerms.push(queryTerm);
      }
    }

    // Answer match (medium weight)
    for (const answerTerm of answerTerms) {
      if (answerTerm.includes(queryTerm) || queryTerm.includes(answerTerm)) {
        score += 5;
      }
    }

    // Tag match (medium weight)
    for (const tagTerm of allTerms) {
      if (tagTerm.includes(queryTerm) || queryTerm.includes(tagTerm)) {
        score += 10;
        matchedTerms.push(queryTerm);
      }
    }
  }

  // Boost by popularity (helpful ratio)
  const totalVotes = faq.helpful + faq.notHelpful;
  if (totalVotes > 0) {
    const helpfulRatio = faq.helpful / totalVotes;
    score *= (0.8 + helpfulRatio * 0.4); // 0.8 to 1.2 multiplier
  }

  return { score, matchedTerms: [...new Set(matchedTerms)] };
}

/**
 * Create a new FAQ
 */
export async function createFAQ(input: CreateFAQInput): Promise<FAQItem> {
  logger.info('create_faq', { category: input.category });

  const id = uuidv4();
  const faq: FAQItem = {
    id,
    question: input.question,
    answer: input.answer,
    category: input.category,
    tags: input.tags || [],
    helpful: 0,
    notHelpful: 0,
    views: 0,
    relatedFAQs: input.relatedFAQs,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  faqs.set(id, faq);
  logger.info('faq_created', { faqId: id });

  return faq;
}

/**
 * Get FAQ by ID
 */
export async function getFAQById(faqId: string): Promise<FAQItem | null> {
  return faqs.get(faqId) || null;
}

/**
 * Search FAQs
 */
export async function searchFAQs(
  input: FAQSearchInputType
): Promise<FAQSearchResult[]> {
  logger.info('search_faqs', { query: input.query, category: input.category });

  let searchableFAQs = Array.from(faqs.values());

  // Filter by category if specified
  if (input.category) {
    searchableFAQs = searchableFAQs.filter(f => f.category === input.category);
  }

  // Calculate relevance scores
  const results: FAQSearchResult[] = [];
  for (const faq of searchableFAQs) {
    const { score, matchedTerms } = calculateRelevanceScore(input.query, faq);

    if (score > 0) {
      // Generate snippet
      const queryLower = input.query.toLowerCase();
      const answerLower = faq.answer.toLowerCase();
      const queryIndex = answerLower.indexOf(queryLower);

      let snippet: string;
      if (queryIndex >= 0) {
        const start = Math.max(0, queryIndex - 50);
        const end = Math.min(faq.answer.length, queryIndex + input.query.length + 100);
        snippet = (start > 0 ? '...' : '') + faq.answer.slice(start, end) + (end < faq.answer.length ? '...' : '');
      } else {
        snippet = faq.answer.slice(0, 150) + (faq.answer.length > 150 ? '...' : '');
      }

      results.push({
        faq,
        relevanceScore: score,
        matchedTerms,
        snippet,
      });
    }
  }

  // Sort by relevance
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Limit results
  return results.slice(0, input.limit);
}

/**
 * Get FAQs by category
 */
export async function getFAQsByCategory(category: FAQCategory): Promise<FAQItem[]> {
  const categoryFAQs = Array.from(faqs.values()).filter(f => f.category === category);

  // Sort by helpful ratio
  return categoryFAQs.sort((a, b) => {
    const aRatio = a.helpful / (a.helpful + a.notHelpful + 1);
    const bRatio = b.helpful / (b.helpful + b.notHelpful + 1);
    return bRatio - aRatio;
  });
}

/**
 * Record FAQ feedback
 */
export async function recordFAQFeedback(
  faqId: string,
  helpful: boolean
): Promise<FAQItem | null> {
  const faq = faqs.get(faqId);
  if (!faq) {
    logger.warn('faq_not_found', { faqId });
    return null;
  }

  if (helpful) {
    faq.helpful++;
  } else {
    faq.notHelpful++;
  }

  faq.updatedAt = new Date().toISOString();
  logger.info('faq_feedback_recorded', { faqId, helpful });

  return faq;
}

/**
 * Record FAQ view
 */
export async function recordFAQView(faqId: string): Promise<FAQItem | null> {
  const faq = faqs.get(faqId);
  if (!faq) {
    return null;
  }

  faq.views++;
  faq.updatedAt = new Date().toISOString();

  return faq;
}

/**
 * Update FAQ
 */
export async function updateFAQ(
  faqId: string,
  updates: Partial<Pick<FAQItem, 'question' | 'answer' | 'category' | 'tags'>>
): Promise<FAQItem | null> {
  const faq = faqs.get(faqId);
  if (!faq) {
    logger.warn('faq_not_found', { faqId });
    return null;
  }

  if (updates.question) faq.question = updates.question;
  if (updates.answer) faq.answer = updates.answer;
  if (updates.category) faq.category = updates.category;
  if (updates.tags) faq.tags = updates.tags;
  faq.updatedAt = new Date().toISOString();

  logger.info('faq_updated', { faqId });

  return faq;
}

/**
 * Delete FAQ
 */
export async function deleteFAQ(faqId: string): Promise<boolean> {
  const deleted = faqs.delete(faqId);
  if (deleted) {
    logger.info('faq_deleted', { faqId });
  }
  return deleted;
}

/**
 * Get all FAQ categories with counts
 */
export async function getFAQCategories(): Promise<{ category: FAQCategory; count: number }[]> {
  const categoryCounts = new Map<FAQCategory, number>();

  for (const faq of faqs.values()) {
    const current = categoryCounts.get(faq.category) || 0;
    categoryCounts.set(faq.category, current + 1);
  }

  return Array.from(categoryCounts.entries()).map(([category, count]) => ({
    category,
    count,
  }));
}

/**
 * Get popular FAQs
 */
export async function getPopularFAQs(limit: number = 10): Promise<FAQItem[]> {
  return Array.from(faqs.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

/**
 * Get suggested FAQs based on text
 */
export async function getSuggestedFAQs(
  text: string,
  limit: number = 5
): Promise<FAQSearchResult[]> {
  return searchFAQs({ query: text, limit });
}

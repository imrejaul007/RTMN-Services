import type {
  DraftReplyRequest,
  DraftReplyResponse,
  SummarizeRequest,
  SummarizeResponse,
  PredictCSATRequest,
  PredictCSATResponse,
  SuggestMacrosRequest,
  SuggestMacrosResponse,
  Macro
} from '../types.js';

// Simple keyword extraction
function extractKeywords(conversation: Array<{message: string}>): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can']);

  const allText = conversation.map(c => c.message).join(' ').toLowerCase();
  const words = allText.split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));

  const frequency: Record<string, number> = {};
  words.forEach(w => {
    frequency[w] = (frequency[w] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

// Simple sentiment analysis
function analyzeSentiment(text: string): { score: number; label: 'positive' | 'neutral' | 'negative' } {
  const positive = ['thank', 'great', 'excellent', 'perfect', 'awesome', 'good', 'happy', 'love', 'appreciate', 'resolved', 'helpful'];
  const negative = ['frustrated', 'angry', 'terrible', 'awful', 'bad', 'disappointed', 'issue', 'problem', 'broken', 'fail', 'wrong'];

  const words = text.toLowerCase().split(/\s+/);
  let score = 0;

  words.forEach(w => {
    if (positive.some(p => w.includes(p))) score += 1;
    if (negative.some(n => w.includes(n))) score -= 1;
  });

  const normalized = Math.max(-1, Math.min(1, score / Math.max(1, words.length / 10)));
  return {
    score: normalized,
    label: normalized > 0.2 ? 'positive' : normalized < -0.2 ? 'negative' : 'neutral'
  };
}

// Generate draft reply suggestions
export async function draftReply(req: DraftReplyRequest): Promise<DraftReplyResponse> {
  const { conversation, tone = 'professional', maxLength = 500 } = req;

  const lastCustomerMessage = [...conversation].reverse().find(c => c.role === 'customer')?.message || '';
  const keywords = extractKeywords(conversation);

  // Simple sentiment-based reply generation
  const sentiment = analyzeSentiment(lastCustomerMessage);

  const toneGreetings: Record<string, string> = {
    professional: 'Thank you for reaching out',
    friendly: 'Hi there! Thanks for getting in touch',
    empathetic: 'I understand your concern and appreciate you bringing this to our attention',
    formal: 'We acknowledge receipt of your inquiry'
  };

  const toneClosings: Record<string, string> = {
    professional: 'Please let me know if you need any further assistance.',
    friendly: 'Let me know if there is anything else I can help with!',
    empathetic: 'I hope this helps address your concern. Please reach out if you need more support.',
    formal: 'Please do not hesitate to contact us for further clarification.'
  };

  const greeting = toneGreetings[tone];
  const closing = toneClosings[tone];

  // Generate variations
  const suggestions = [
    {
      text: `${greeting}. ${lastCustomerMessage.substring(0, 100)}... ${closing}`,
      confidence: 0.85 + Math.random() * 0.1,
      tone
    },
    {
      text: `${greeting}. I've reviewed your request regarding ${keywords.slice(0, 2).join(' and ')}. ${closing}`,
      confidence: 0.75 + Math.random() * 0.1,
      tone: 'professional'
    },
    {
      text: `Hi! ${greeting.toLowerCase()}. Based on your message, I want to make sure we address ${keywords[0] || 'your concern'} properly. ${closing}`,
      confidence: 0.70 + Math.random() * 0.1,
      tone: 'friendly'
    }
  ];

  return {
    suggestions: suggestions.map(s => ({
      ...s,
      text: s.text.length > maxLength ? s.text.substring(0, maxLength) + '...' : s.text
    })),
    keywords,
    sentiment: {
      overall: sentiment.label,
      score: sentiment.score
    }
  };
}

// Summarize conversation
export async function summarize(req: SummarizeRequest): Promise<SummarizeResponse> {
  const { conversation, style = 'brief', focus } = req;

  const customerMessages = conversation.filter(c => c.role === 'customer').map(c => c.message);
  const agentMessages = conversation.filter(c => c.role === 'agent').map(c => c.message);

  const allText = conversation.map(c => c.message).join(' ');
  const sentiment = analyzeSentiment(allText);

  // Extract key points based on focus or default patterns
  const keyPatterns = [
    /issue[s]? with (.+)/i,
    /problem[s]? (?:with|about) (.+)/i,
    /can't (.+)/i,
    /unable to (.+)/i,
    /need[s]? (.+)/i,
    /want[s]? (.+)/i
  ];

  const keyPoints: string[] = [];
  const seen = new Set<string>();

  focus?.forEach(f => {
    if (!seen.has(f)) {
      keyPoints.push(`Customer mentioned: ${f}`);
      seen.add(f);
    }
  });

  customerMessages.forEach(msg => {
    for (const pattern of keyPatterns) {
      const match = msg.match(pattern);
      if (match && !seen.has(match[1])) {
        keyPoints.push(`Customer concern: ${match[1]}`);
        seen.add(match[1]);
        break;
      }
    }
  });

  // Generate summary based on style
  let summary: string;
  const summaryTemplates: Record<string, string> = {
    brief: `Customer contacted regarding ${keyPoints[0]?.replace('Customer concern: ', '') || 'an inquiry'}. ${agentMessages.length} response(s) provided.`,
    detailed: `Support interaction: Customer raised ${keyPoints.length} concern(s). ${customerMessages.length} customer messages, ${agentMessages.length} agent responses. ${sentiment.label.charAt(0).toUpperCase() + sentiment.label.slice(1)} sentiment detected.`,
    executive: `Support ticket resolved. Primary issue: ${keyPoints[0]?.replace('Customer concern: ', '') || 'N/A'}. Total interactions: ${conversation.length}. Sentiment: ${sentiment.label}.`
  };

  summary = summaryTemplates[style] || summaryTemplates.brief;

  // Action items
  const actionItems = keyPoints.length > 0
    ? [`Follow up on: ${keyPoints[0].replace('Customer concern: ', '')}`]
    : ['Review customer request for next steps'];

  return {
    summary,
    keyPoints: keyPoints.slice(0, 5),
    actionItems,
    sentiment: sentiment.label
  };
}

// Predict CSAT score
export async function predictCSAT(req: PredictCSATRequest): Promise<PredictCSATResponse> {
  const { conversation, metadata } = req;

  const allText = conversation.map(c => c.message).join(' ');
  const sentiment = analyzeSentiment(allText);

  // Calculate base score from sentiment
  let predictedScore = 50 + (sentiment.score * 30);

  // Adjust for response time if provided
  if (metadata?.responseTime) {
    if (metadata.responseTime < 300) predictedScore += 10;
    else if (metadata.responseTime > 3600) predictedScore -= 15;
  }

  // Adjust for resolution time if provided
  if (metadata?.resolutionTime) {
    if (metadata.resolutionTime < 3600) predictedScore += 15;
    else if (metadata.resolutionTime > 86400) predictedScore -= 20;
  }

  // Adjust for agent rating if provided
  if (metadata?.agentRating) {
    predictedScore = (predictedScore * 0.5) + (metadata.agentRating * 10 * 0.5);
  }

  // Clamp score
  predictedScore = Math.max(1, Math.min(100, Math.round(predictedScore)));

  // Confidence based on data available
  let confidence = 0.6;
  if (metadata?.responseTime) confidence += 0.1;
  if (metadata?.resolutionTime) confidence += 0.1;
  if (metadata?.agentRating) confidence += 0.2;

  // Factors
  const factors = [
    {
      name: 'Sentiment',
      impact: Math.round(sentiment.score * 100),
      description: sentiment.score > 0 ? 'Positive language detected' : sentiment.score < 0 ? 'Negative language detected' : 'Neutral language'
    },
    {
      name: 'Response Time',
      impact: metadata?.responseTime ? (metadata.responseTime < 300 ? 10 : metadata.responseTime > 3600 ? -15 : 0) : 0,
      description: metadata?.responseTime ? `${Math.round(metadata.responseTime / 60)}min response time` : 'No data'
    },
    {
      name: 'Resolution Efficiency',
      impact: metadata?.resolutionTime ? (metadata.resolutionTime < 3600 ? 15 : metadata.resolutionTime > 86400 ? -20 : 5) : 0,
      description: metadata?.resolutionTime ? `${Math.round(metadata.resolutionTime / 3600)}hr resolution time` : 'No data'
    }
  ];

  return {
    predictedScore,
    confidence: Math.round(confidence * 100) / 100,
    factors,
    sentiment: {
      customer: Math.round((sentiment.score + 1) * 50),
      agent: 50,
      overall: Math.round((sentiment.score + 1) * 50)
    }
  };
}

// Suggest macros
export async function suggestMacros(req: SuggestMacrosRequest): Promise<SuggestMacrosResponse> {
  const { conversation, category } = req;

  const keywords = extractKeywords(conversation);
  const allText = conversation.map(c => c.message).join(' ').toLowerCase();

  // Sample macro library
  const allMacros: Macro[] = [
    { id: '1', name: 'Greeting', content: 'Thank you for contacting our support team. How can I assist you today?', category: 'general', relevance: 0.8 },
    { id: '2', name: 'Apology', content: 'I sincerely apologize for any inconvenience this has caused. Let me help resolve this for you.', category: 'general', relevance: 0.7 },
    { id: '3', name: 'Follow-up', content: 'I would like to follow up on your case. Could you please provide more details about the issue?', category: 'general', relevance: 0.6 },
    { id: '4', name: 'Refund Request', content: 'I understand you would like a refund. Let me review your account and process this for you.', category: 'billing', relevance: allText.includes('refund') ? 0.95 : 0.3 },
    { id: '5', name: 'Billing Inquiry', content: 'Regarding your billing question, I can see the charges on your account. Let me explain them.', category: 'billing', relevance: allText.includes('charge') || allText.includes('bill') || allText.includes('payment') ? 0.9 : 0.2 },
    { id: '6', name: 'Technical Issue', content: 'I understand you are experiencing a technical issue. Let me gather some information to help troubleshoot.', category: 'technical', relevance: allText.includes('error') || allText.includes('broken') || allText.includes('not working') ? 0.95 : 0.3 },
    { id: '7', name: 'Account Access', content: 'I can help you with your account access. Let me verify your identity and reset your credentials.', category: 'account', relevance: allText.includes('password') || allText.includes('login') || allText.includes('access') ? 0.9 : 0.2 },
    { id: '8', name: 'Shipping Inquiry', content: 'Regarding your shipment, let me check the tracking information for you.', category: 'shipping', relevance: allText.includes('shipping') || allText.includes('delivery') || allText.includes('tracking') ? 0.9 : 0.2 },
    { id: '9', name: 'Cancellation', content: 'I understand you wish to cancel. Let me process this request for you.', category: 'subscription', relevance: allText.includes('cancel') ? 0.95 : 0.3 },
    { id: '10', name: 'Closing - Resolved', content: 'I am glad we could resolve this for you. Is there anything else I can help you with today?', category: 'closing', relevance: 0.7 }
  ];

  // Filter by category if specified
  let filteredMacros = category
    ? allMacros.filter(m => m.category === category)
    : allMacros;

  // Boost relevance based on keywords
  filteredMacros = filteredMacros.map(m => {
    let boostedRelevance = m.relevance;
    keywords.forEach(kw => {
      if (m.content.toLowerCase().includes(kw) || m.name.toLowerCase().includes(kw)) {
        boostedRelevance += 0.2;
      }
    });
    return { ...m, relevance: Math.min(1, boostedRelevance) };
  });

  // Sort by relevance
  filteredMacros.sort((a, b) => b.relevance - a.relevance);

  // Get unique categories
  const categories = [...new Set(allMacros.map(m => m.category))];

  return {
    macros: filteredMacros.slice(0, 5),
    categories
  };
}
import { Router } from 'express';
import aiIntegration from '../services/aiIntegration.js';
import { randomDelay } from '../utils/helpers.js';

const router = Router();

// POST /api/ai/claude/generate - Use Claude
router.post('/claude/generate', async (req, res) => {
  try {
    const { prompt, system, temperature, maxTokens, context } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    await randomDelay(500, 2000);

    const response = await aiIntegration.callClaude({
      model: 'claude',
      prompt,
      system,
      temperature,
      maxTokens,
      context
    });

    res.json({
      success: true,
      response,
      provider: 'anthropic'
    });
  } catch (error: any) {
    console.error('Claude generation error:', error);
    res.status(500).json({ error: error.message || 'Claude generation failed' });
  }
});

// POST /api/ai/openai/generate - Use GPT-4
router.post('/openai/generate', async (req, res) => {
  try {
    const { prompt, system, temperature, maxTokens, context } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    await randomDelay(500, 2000);

    const response = await aiIntegration.callOpenAI({
      model: 'gpt4',
      prompt,
      system,
      temperature,
      maxTokens,
      context
    });

    res.json({
      success: true,
      response,
      provider: 'openai'
    });
  } catch (error: any) {
    console.error('OpenAI generation error:', error);
    res.status(500).json({ error: error.message || 'OpenAI generation failed' });
  }
});

// POST /api/ai/enhance-email - AI email enhancement
router.post('/enhance-email', async (req, res) => {
  try {
    const { email, lead, tone = 'professional', model = 'auto' } = req.body;

    if (!email || !lead) {
      return res.status(400).json({ error: 'Email content and lead information are required' });
    }

    await randomDelay(800, 2000);

    const prompt = `Enhance this sales email for the following prospect:

Original Email:
${email}

Prospect Details:
- Name: ${lead.name}
- Company: ${lead.company || 'Unknown'}
- Title: ${lead.title || 'Unknown'}
- Industry: ${lead.industry || 'General'}

Requested Tone: ${tone}

Please provide:
1. Enhanced email with personalization
2. Alternative subject lines
3. Key improvements made`;

    const response = await aiIntegration.routeRequest({
      model: model as any,
      prompt,
      system: 'You are an expert sales copywriter specializing in B2B outreach emails.',
      temperature: 0.7,
      maxTokens: 1024
    });

    res.json({
      success: true,
      original: email,
      enhanced: response.text,
      model: response.model,
      improvements: [
        'Added personalization based on prospect details',
        'Optimized subject line for open rates',
        'Improved call-to-action clarity'
      ]
    });
  } catch (error: any) {
    console.error('Email enhancement error:', error);
    res.status(500).json({ error: error.message || 'Email enhancement failed' });
  }
});

// POST /api/ai/analyze-sentiment - Sentiment analysis
router.post('/analyze-sentiment', async (req, res) => {
  try {
    const { text, type = 'conversation', model = 'auto' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    await randomDelay(300, 1000);

    // For short texts, do quick keyword analysis
    if (text.length < 200) {
      const quickAnalysis = performQuickSentimentAnalysis(text);
      return res.json({
        success: true,
        analysis: quickAnalysis,
        type: 'quick',
        model: 'rule-based'
      });
    }

    const prompt = aiIntegration.generateSentimentAnalysisPrompt(text);
    const response = await aiIntegration.routeRequest({
      model: model as any,
      prompt,
      system: 'You are an expert at analyzing sales conversations for sentiment, emotions, and buying signals. Always respond with valid JSON.',
      temperature: 0.3,
      maxTokens: 512
    });

    let analysis;
    try {
      analysis = JSON.parse(response.text);
    } catch {
      analysis = {
        sentiment: 'neutral',
        score: 0.5,
        summary: response.text
      };
    }

    res.json({
      success: true,
      analysis,
      type,
      model: response.model,
      latency: response.latency
    });
  } catch (error: any) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({ error: error.message || 'Sentiment analysis failed' });
  }
});

// POST /api/ai/summarize - AI summarization
router.post('/summarize', async (req, res) => {
  try {
    const { text, type = 'conversation', maxLength = 200, model = 'auto' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    await randomDelay(400, 1500);

    const prompt = `Summarize the following ${type} in under ${maxLength} words:

${text}

Provide:
1. A concise summary (${maxLength} words max)
2. Key points (bullets)
3. Action items if applicable`;

    const response = await aiIntegration.routeRequest({
      model: model as any,
      prompt,
      system: 'You are an expert at summarizing sales conversations and extracting key insights.',
      temperature: 0.3,
      maxTokens: 512
    });

    res.json({
      success: true,
      summary: response.text,
      type,
      model: response.model,
      originalLength: text.length,
      summaryLength: response.text.length
    });
  } catch (error: any) {
    console.error('Summarization error:', error);
    res.status(500).json({ error: error.message || 'Summarization failed' });
  }
});

// POST /api/ai/generate-email - Generate email from template
router.post('/generate-email', async (req, res) => {
  try {
    const { lead, templateType = 'initial', customContext, model = 'auto' } = req.body;

    if (!lead) {
      return res.status(400).json({ error: 'Lead information is required' });
    }

    await randomDelay(500, 1500);

    const templatePrompts: Record<string, string> = {
      initial: `Write an initial outreach email introducing REZ SalesMind to ${lead.name} at ${lead.company || 'their company'}.`,
      followup: `Write a follow-up email for ${lead.name} who hasn't responded to our previous outreach.`,
      meeting: `Write an email to confirm a meeting with ${lead.name} and include meeting details.`,
      proposal: `Write an email to send a proposal to ${lead.name} at ${lead.company || 'their company'}.`,
      nurture: `Write a nurturing email for ${lead.name} to stay engaged with our product.`
    };

    const prompt = aiIntegration.generateEmailPrompt(lead, customContext || templatePrompts[templateType] || templatePrompts.initial);
    const response = await aiIntegration.routeRequest({
      model: model as any,
      prompt,
      system: 'You are an expert B2B sales copywriter. Write emails that are personalized, concise, and have clear CTAs.',
      temperature: 0.7,
      maxTokens: 1024
    });

    res.json({
      success: true,
      email: {
        subject: extractSubject(response.text) || `Quick question, ${lead.name}`,
        body: extractBody(response.text) || response.text,
        raw: response.text
      },
      lead: {
        name: lead.name,
        company: lead.company
      },
      templateType,
      model: response.model
    });
  } catch (error: any) {
    console.error('Email generation error:', error);
    res.status(500).json({ error: error.message || 'Email generation failed' });
  }
});

// POST /api/ai/chat - Chat with AI
router.post('/chat', async (req, res) => {
  try {
    const { message, context, model = 'auto' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    await randomDelay(300, 1000);

    const response = await aiIntegration.routeRequest({
      model: model as any,
      prompt: message,
      system: context?.system || 'You are REZ SalesMind AI assistant, helping with sales tasks, lead research, and outreach optimization.',
      temperature: 0.7,
      maxTokens: 1024
    });

    res.json({
      success: true,
      response: response.text,
      model: response.model
    });
  } catch (error: any) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: error.message || 'Chat failed' });
  }
});

// Quick sentiment analysis helper
function performQuickSentimentAnalysis(text: string): any {
  const positiveWords = ['great', 'excellent', 'love', 'amazing', 'interested', 'good', 'perfect', 'awesome', 'fantastic', 'happy'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'disappointed', 'frustrated', 'angry', 'not interested', 'no', 'wrong'];
  const questionWords = ['?', 'how', 'what', 'when', 'where', 'why', 'can', 'could', 'would'];

  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
  const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;
  const questionCount = questionWords.filter(w => lowerText.includes(w)).length;

  const sentimentScore = Math.max(0, Math.min(1, 0.5 + (positiveCount - negativeCount) * 0.1));
  const sentiment = sentimentScore > 0.6 ? 'positive' : sentimentScore < 0.4 ? 'negative' : 'neutral';

  return {
    sentiment,
    score: sentimentScore,
    positiveSignals: positiveCount,
    negativeSignals: negativeCount,
    questionsAsked: questionCount,
    keyPhrases: extractKeyPhrases(text)
  };
}

function extractKeyPhrases(text: string): string[] {
  const phrases = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  return sentences.slice(0, 3).map(s => s.trim()).filter(s => s.length > 10);
}

function extractSubject(text: string): string | null {
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().startsWith('subject:')) {
      return line.replace(/subject:/i, '').trim();
    }
  }
  return null;
}

function extractBody(text: string): string | null {
  const lines = text.split('\n');
  let bodyStarted = false;
  const bodyLines = [];

  for (const line of lines) {
    if (bodyStarted) {
      bodyLines.push(line);
    }
    if (line.toLowerCase().startsWith('subject:')) {
      bodyStarted = true;
    }
  }

  return bodyLines.join('\n').trim() || null;
}

export { router as aiRoutes };

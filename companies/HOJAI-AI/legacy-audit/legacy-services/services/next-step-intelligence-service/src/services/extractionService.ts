import { v4 as uuidv4 } from 'uuid';
import { StepType, StepPriority, StepStatus, INextStep, IStepSchedule } from '../models/nextStep';
import { logger } from '../utils/logger';

// ============================================
// TYPES
// ============================================

export interface ExtractedStep {
  title: string;
  description?: string;
  stepType?: StepType;
  priority?: StepPriority;
  dueDate?: Date;
  confidence: number;
  reasoning: string;
  extractedFrom?: string;
  rawText?: string;
}

export interface ExtractionResult {
  steps: ExtractedStep[];
  sourceText: string;
  extractionMethod: 'ai' | 'rule_based' | 'hybrid';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface StepContext {
  customerId: string;
  tenantId: string;
  conversationId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  preferredChannels?: string[];
  timezone?: string;
}

// ============================================
// PATTERN MATCHERS FOR RULE-BASED EXTRACTION
// ============================================

const STEP_TYPE_PATTERNS: Record<StepType, RegExp[]> = {
  [StepType.FOLLOWUP]: [
    /follow\s*up/gi,
    /followup/gi,
    /get\s*back\s*to/gi,
    /will\s*reach\s*out/gi,
    /will\s*contact/gi,
    /circle\s*back/gi
  ],
  [StepType.REMINDER]: [
    /remind(er)?/gi,
    /don't\s*forget/gi,
    /remember\s*to/gi,
    /make\s*sure\s*(to)?/gi,
    /don't\s*miss/gi
  ],
  [StepType.APPOINTMENT]: [
    /appointment/gi,
    /schedule[d]?\s*(for|at)?/gi,
    /book(ed)?\s*(appointment)?/gi,
    /slot/gi,
    /visit/gi
  ],
  [StepType.MEDICATION]: [
    /medication/gi,
    /medicine/gi,
    /take\s*(your|the)/gi,
    /dosage/gi,
    /prescription/gi,
    /pill/gi
  ],
  [StepType.TASK]: [
    /task/gi,
    /to\s*do/gi,
    /action\s*item/gi,
    /action\s*required/gi,
    /complete/gi,
    /finish/gi
  ],
  [StepType.MEETING]: [
    /meeting/gi,
    /call\s*(with|at)/gi,
    /conference/gi,
    /sync/gi,
    /standup/gi
  ],
  [StepType.PAYMENT]: [
    /payment/gi,
    /pay(ment)?/gi,
    /invoice/gi,
    /bill/gi,
    /amount\s*due/gi,
    /EMI/gi,
    /installment/gi
  ],
  [StepType.DOCUMENT]: [
    /document/gi,
    /paperwork/gi,
    /form/gi,
    /certificate/gi,
    /KYC/gi,
    /ID\s*proof/gi
  ],
  [StepType.CALL]: [
    /call\s*(me|you|us)/gi,
    /phone\s*(call)?/gi,
    /ring\s*(me|you)/gi,
    /will\s*call/gi,
    /give\s*(me|you)\s*a\s*call/gi
  ],
  [StepType.EMAIL]: [
    /email/gi,
    /send\s*(an?)?\s*(email|mail)/gi,
    /write\s*(to|me)/gi,
    /mail\s*(me|you)/gi,
    /E-mail/gi
  ],
  [StepType.REVIEW]: [
    /review/gi,
    /check\s*(on|out)/gi,
    /evaluate/gi,
    /look\s*(at|into)/gi,
    /assess/gi
  ],
  [StepType.CHECK_IN]: [
    /check[\s-]*in/gi,
    /check[\s-]*up/gi,
    /update/gi,
    /status\s*(update)?/gi,
    /progress\s*(update)?/gi
  ],
  [StepType.DEADLINE]: [
    /deadline/gi,
    /by\s*(end\s*of)?/gi,
    /before\s*(end\s*of)?/gi,
    /due\s*(date)?/gi,
    /last\s*date/gi,
    /expires?\s*(on|at)/gi
  ],
  [StepType.RENEWAL]: [
    /renew(al)?/gi,
    /expir(es|ing)/gi,
    /re[- ]?new/gi,
    /continue/gi,
    /subscription/gi
  ],
  [StepType.FEEDBACK]: [
    /feedback/gi,
    /review\s*(my|our)?/gi,
    /rate/gi,
    /testimonial/gi,
    /survey/gi
  ],
  [StepType.ONBOARDING]: [
    /onboard(ing)?/gi,
    /setup/gi,
    /get\s*started/gi,
    /welcome/gi,
    /initialize/gi
  ],
  [StepType.CUSTOM]: []
};

const PRIORITY_PATTERNS: Array<{ pattern: RegExp; priority: StepPriority }> = [
  { pattern: /urgent(ly)?|asap|immediately|right\s*away/gi, priority: StepPriority.URGENT },
  { pattern: /important|priority|high\s*priority|critical/gi, priority: StepPriority.HIGH },
  { pattern: /when\s*(you|we)\s*(can|get\s*a\s*chance)|whenever\s*(possible|ready)/gi, priority: StepPriority.LOW }
];

const TIME_EXPRESSIONS: Array<{ pattern: RegExp; getValue: (match: RegExpMatchArray) => Date | null }> = [
  {
    pattern: /(\d{1,2})[\s:]*(\d{2})?\s*(am|pm)?/gi,
    getValue: (match) => {
      let hours = parseInt(match[1]);
      const minutes = match[2] ? parseInt(match[2]) : 0;
      const period = match[3]?.toLowerCase();

      if (period === 'pm' && hours < 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;

      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    }
  },
  {
    pattern: /(today|tomorrow|day\s*after\s*tomorrow)/gi,
    getValue: (match) => {
      const date = new Date();
      const phrase = match[1].toLowerCase();

      if (phrase === 'today') return date;
      if (phrase === 'tomorrow') {
        date.setDate(date.getDate() + 1);
        return date;
      }
      if (phrase.includes('day after')) {
        date.setDate(date.getDate() + 2);
        return date;
      }
      return null;
    }
  },
  {
    pattern: /(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
    getValue: (match) => {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.findIndex(d => match[2].toLowerCase().startsWith(d));
      if (targetDay === -1) return null;

      const date = new Date();
      const currentDay = date.getDay();
      let daysUntil = targetDay - currentDay;

      if (match[1]) {
        // "next monday" - go to next week
        daysUntil = daysUntil <= 0 ? daysUntil + 7 : daysUntil;
      } else if (daysUntil <= 0) {
        daysUntil += 7; // If day has passed this week, go to next week
      }

      date.setDate(date.getDate() + daysUntil);
      return date;
    }
  },
  {
    pattern: /(\d+)\s*(day|days|week|weeks|month|months)\s*(later|from\s*now)?/gi,
    getValue: (match) => {
      const amount = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      const date = new Date();

      if (unit.startsWith('day')) date.setDate(date.getDate() + amount);
      else if (unit.startsWith('week')) date.setDate(date.getDate() + amount * 7);
      else if (unit.startsWith('month')) date.setMonth(date.getMonth() + amount);

      return date;
    }
  },
  {
    pattern: /(end\s*of\s*this|end\s*of\s*next|by\s*end\s*of)\s*(week|month)?/gi,
    getValue: (match) => {
      const date = new Date();
      const phrase = match[1].toLowerCase();

      if (phrase.includes('next')) {
        if (match[2]?.toLowerCase() === 'week' || !match[2]) {
          date.setDate(date.getDate() + (7 - date.getDay()));
        } else {
          date.setMonth(date.getMonth() + 1);
          date.setDate(0);
        }
      } else {
        const daysUntilFriday = (5 - date.getDay() + 7) % 7 || 7;
        date.setDate(date.getDate() + daysUntilFriday);
      }

      date.setHours(23, 59, 59, 0);
      return date;
    }
  }
];

// Keywords that indicate a step should be extracted
const ACTION_INDICATORS = [
  /will/gi,
  /should/gi,
  /need(s)?\s+to/gi,
  /have\s+to/gi,
  /must/gi,
  /going\s+to/gi,
  /plan(s)?\s+to/gi,
  /promised?\s+to/gi,
  /agreed?\s+to/gi,
  /let\s+me/gi,
  /I'll/gi,
  /we'll/gi,
  /you'll/gi,
  /don't\s+forget/gi,
  /remember\s+to/gi,
  /make\s+sure/gi,
  /action\s*(required|item|needed)/gi,
  /TODO/gi,
  /TBD/gi,
  /follow\s*up/gi
];

// ============================================
// EXTRACTION SERVICE
// ============================================

export class ExtractionService {
  private openaiApiKey?: string;
  private useAIExtraction: boolean;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.useAIExtraction = !!this.openaiApiKey;
  }

  /**
   * Extract next steps from plain text
   */
  async extractFromText(
    text: string,
    context: StepContext
  ): Promise<ExtractionResult> {
    try {
      logger.info('Extracting steps from text', { customerId: context.customerId, textLength: text.length });

      // Try AI extraction first if available
      if (this.useAIExtraction && text.length > 100) {
        try {
          const aiSteps = await this.extractWithAI(text, context);
          if (aiSteps.length > 0) {
            return aiSteps;
          }
        } catch (error) {
          logger.warn('AI extraction failed, falling back to rule-based', { error });
        }
      }

      // Rule-based extraction
      return this.extractWithRules(text, context, 'rule_based');
    } catch (error) {
      logger.error('Error extracting from text', { error, customerId: context.customerId });
      throw error;
    }
  }

  /**
   * Extract from conversation transcript
   */
  async extractFromTranscript(
    transcript: string,
    context: StepContext
  ): Promise<ExtractionResult> {
    try {
      logger.info('Extracting steps from transcript', { customerId: context.customerId });

      // Transcripts often have speaker labels, clean them up
      const cleanedText = this.cleanTranscript(transcript);

      // Use AI extraction for better context understanding
      if (this.useAIExtraction) {
        try {
          return await this.extractWithAI(cleanedText, context);
        } catch (error) {
          logger.warn('AI extraction failed for transcript', { error });
        }
      }

      return this.extractWithRules(cleanedText, context, 'rule_based');
    } catch (error) {
      logger.error('Error extracting from transcript', { error });
      throw error;
    }
  }

  /**
   * Extract from AI-generated summary
   */
  async extractFromSummary(
    summary: string,
    context: StepContext
  ): Promise<ExtractionResult> {
    try {
      logger.info('Extracting steps from summary', { customerId: context.customerId });

      // Summaries are usually concise, so use hybrid approach
      if (this.useAIExtraction) {
        try {
          return await this.extractWithAI(summary, context);
        } catch (error) {
          logger.warn('AI extraction failed for summary', { error });
        }
      }

      return this.extractWithRules(summary, context, 'hybrid');
    } catch (error) {
      logger.error('Error extracting from summary', { error });
      throw error;
    }
  }

  /**
   * Extract from support issue/ticket
   */
  async extractFromIssue(
    issue: {
      title: string;
      description: string;
      status?: string;
      priority?: string;
      customerId?: string;
      conversation?: string;
    },
    context: StepContext
  ): Promise<ExtractionResult> {
    try {
      logger.info('Extracting steps from issue', { issueId: issue.title });

      const combinedText = `${issue.title}\n\n${issue.description}${issue.conversation ? '\n\nConversation:\n' + issue.conversation : ''}`;

      const contextWithIssue: StepContext = {
        ...context,
        relatedEntityType: 'ticket',
        relatedEntityId: issue.title
      };

      if (this.useAIExtraction) {
        try {
          return await this.extractWithAI(combinedText, contextWithIssue);
        } catch (error) {
          logger.warn('AI extraction failed for issue', { error });
        }
      }

      const result = this.extractWithRules(combinedText, contextWithIssue, 'hybrid');

      // Apply issue priority if available
      if (issue.priority) {
        const issuePriority = this.mapIssuePriority(issue.priority);
        result.steps.forEach(step => {
          if (!step.priority) {
            step.priority = issuePriority;
          }
        });
      }

      return result;
    } catch (error) {
      logger.error('Error extracting from issue', { error });
      throw error;
    }
  }

  /**
   * Detect step type from extracted content
   */
  detectStepType(extracted: ExtractedStep): StepType {
    const title = (extracted.title + ' ' + (extracted.description || '')).toLowerCase();

    let maxMatches = 0;
    let detectedType = StepType.TASK;

    for (const [stepType, patterns] of Object.entries(STEP_TYPE_PATTERNS)) {
      let matches = 0;
      for (const pattern of patterns) {
        if (pattern.test(title)) {
          matches++;
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedType = stepType as StepType;
      }
    }

    return detectedType;
  }

  /**
   * Detect priority from extracted content
   */
  detectPriority(extracted: ExtractedStep): StepPriority {
    const text = (extracted.title + ' ' + (extracted.description || '')).toLowerCase();

    for (const { pattern, priority } of PRIORITY_PATTERNS) {
      if (pattern.test(text)) {
        return priority;
      }
    }

    return StepPriority.MEDIUM; // Default priority
  }

  /**
   * Parse time expressions from text
   */
  parseTimeExpression(text: string): Date | undefined {
    for (const { pattern, getValue } of TIME_EXPRESSIONS) {
      const match = text.match(pattern);
      if (match) {
        const date = getValue(match);
        if (date) return date;
      }
    }
    return undefined;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async extractWithAI(text: string, context: StepContext): Promise<ExtractionResult> {
    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: this.openaiApiKey });

    const systemPrompt = `You are an expert at extracting action items and next steps from conversations or text.

Extract ALL actionable next steps from the provided text. For each step, provide:
1. title: Clear, concise action title (max 100 chars)
2. description: Additional details if available
3. step_type: One of: followup, reminder, appointment, medication, task, meeting, payment, document, call, email, review, check_in, deadline, renewal, feedback, onboarding, custom
4. priority: One of: urgent, high, medium, low
5. due_date: ISO date string if a deadline is mentioned, otherwise null
6. confidence: 0-1 score for how confident you are this is an action item

Rules:
- Extract commitments, promises, and action items from BOTH parties
- Include implied actions (e.g., "I'll send you the details" = action item)
- Be specific about dates/times if mentioned
- If no clear action items exist, return empty array
- Focus on customer-facing actions that need follow-up`;

    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract next steps from:\n\n${text}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    const steps: ExtractedStep[] = Array.isArray(parsed.steps) ? parsed.steps : parsed.action_items || [];

    return {
      steps: steps.map(step => ({
        title: step.title,
        description: step.description,
        stepType: step.step_type ? (step.step_type as StepType) : undefined,
        priority: step.priority ? (step.priority as StepPriority) : undefined,
        dueDate: step.due_date ? new Date(step.due_date) : undefined,
        confidence: step.confidence || 0.8,
        reasoning: 'AI extraction with GPT-4',
        extractedFrom: context.conversationId
      })),
      sourceText: text.substring(0, 500),
      extractionMethod: 'ai',
      timestamp: new Date(),
      metadata: {
        model: 'gpt-4-turbo-preview',
        usage: response.usage
      }
    };
  }

  private extractWithRules(
    text: string,
    context: StepContext,
    method: 'rule_based' | 'hybrid'
  ): ExtractionResult {
    const steps: ExtractedStep[] = [];
    const sentences = this.splitIntoSentences(text);

    for (const sentence of sentences) {
      if (this.containsActionIndicator(sentence)) {
        const extracted = this.extractStepFromSentence(sentence, context);
        if (extracted) {
          steps.push(extracted);
        }
      }
    }

    // For hybrid mode, also look for context clues even without strong action indicators
    if (method === 'hybrid') {
      const contextSteps = this.extractContextualSteps(text, context);
      steps.push(...contextSteps);
    }

    // Deduplicate similar steps
    const uniqueSteps = this.deduplicateSteps(steps);

    return {
      steps: uniqueSteps,
      sourceText: text.substring(0, 500),
      extractionMethod: method,
      timestamp: new Date()
    };
  }

  private containsActionIndicator(text: string): boolean {
    for (const indicator of ACTION_INDICATORS) {
      if (indicator.test(text)) {
        return true;
      }
    }
    return false;
  }

  private extractStepFromSentence(sentence: string, context: StepContext): ExtractedStep | null {
    try {
      const cleanedSentence = sentence.trim();
      if (cleanedSentence.length < 10 || cleanedSentence.length > 500) {
        return null;
      }

      const title = this.cleanSentence(cleanedSentence);
      const stepType = this.detectStepTypeFromText(cleanedSentence);
      const priority = this.detectPriorityFromText(cleanedSentence);
      const dueDate = this.parseTimeExpression(cleanedSentence);

      // Calculate confidence based on various factors
      let confidence = 0.5;
      if (this.containsActionIndicator(cleanedSentence)) confidence += 0.2;
      if (stepType !== StepType.TASK) confidence += 0.1;
      if (dueDate) confidence += 0.15;
      confidence = Math.min(confidence, 0.95);

      return {
        title,
        stepType,
        priority,
        dueDate,
        confidence,
        reasoning: `Rule-based extraction: detected ${stepType} with ${priority} priority`,
        extractedFrom: context.conversationId,
        rawText: sentence
      };
    } catch (error) {
      logger.warn('Error extracting step from sentence', { error, sentence });
      return null;
    }
  }

  private extractContextualSteps(text: string, context: StepContext): ExtractedStep[] {
    const steps: ExtractedStep[] = [];

    // Extract deadline mentions
    const deadlinePattern = /(?:deadline|due\s*date|last\s*date)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)/gi;
    const deadlineMatches = text.matchAll(deadlinePattern);

    for (const match of deadlineMatches) {
      const title = `Follow up on deadline: ${match[1]}`;
      const dueDate = this.parseTimeExpression(match[0]);

      steps.push({
        title,
        stepType: StepType.DEADLINE,
        priority: StepPriority.HIGH,
        dueDate,
        confidence: 0.7,
        reasoning: 'Deadline mentioned in context'
      });
    }

    // Extract appointment/meeting mentions
    const meetingPattern = /(?:meeting|appointment|call)\s*(?:with|on|at|for)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+(?:at|on|at|from)\s+)?(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)?)/gi;
    const meetingMatches = text.matchAll(meetingPattern);

    for (const match of meetingMatches) {
      steps.push({
        title: `Schedule/attend: ${match[0]}`,
        stepType: StepType.MEETING,
        priority: StepPriority.MEDIUM,
        confidence: 0.6,
        reasoning: 'Meeting/appointment mentioned in context'
      });
    }

    return steps;
  }

  private detectStepTypeFromText(text: string): StepType {
    const lowerText = text.toLowerCase();

    for (const [stepType, patterns] of Object.entries(STEP_TYPE_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerText)) {
          return stepType as StepType;
        }
      }
    }

    return StepType.TASK;
  }

  private detectPriorityFromText(text: string): StepPriority {
    const lowerText = text.toLowerCase();

    for (const { pattern, priority } of PRIORITY_PATTERNS) {
      if (pattern.test(lowerText)) {
        return priority;
      }
    }

    return StepPriority.MEDIUM;
  }

  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries but keep the delimiter
    return text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private cleanSentence(sentence: string): string {
    return sentence
      .replace(/^(he|she|they|we|I|you)\s+(will|should|would|can|could|might)\s+/i, '')
      .replace(/^(don't|do\s+not|do\s+not)\s+/i, '')
      .replace(/^(remember\s+to|remind\s+me\s+to|need\s+to|have\s+to|must)\s+/i, '')
      .replace(/^(will|should|would)\s+/i, '')
      .trim()
      .substring(0, 200);
  }

  private cleanTranscript(transcript: string): string {
    return transcript
      // Remove speaker labels like "Agent:", "Customer:", "[Agent]", etc.
      .replace(/^\s*\[?(?:Agent|Customer|User|Support|You|Me)\s*[:\]]?\s*/gim, '')
      // Remove timestamps
      .replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?\s*/gim, '')
      // Remove extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private deduplicateSteps(steps: ExtractedStep[]): ExtractedStep[] {
    const seen = new Map<string, ExtractedStep>();

    for (const step of steps) {
      const key = step.title.toLowerCase().substring(0, 50);
      const existing = seen.get(key);

      if (!existing || step.confidence > existing.confidence) {
        seen.set(key, step);
      }
    }

    return Array.from(seen.values());
  }

  private mapIssuePriority(issuePriority: string): StepPriority {
    const lower = issuePriority.toLowerCase();

    if (lower.includes('critical') || lower.includes('p1') || lower.includes('blocker')) {
      return StepPriority.URGENT;
    }
    if (lower.includes('high') || lower.includes('p2')) {
      return StepPriority.HIGH;
    }
    if (lower.includes('low') || lower.includes('p4')) {
      return StepPriority.LOW;
    }

    return StepPriority.MEDIUM;
  }
}

// Export singleton instance
export const extractionService = new ExtractionService();

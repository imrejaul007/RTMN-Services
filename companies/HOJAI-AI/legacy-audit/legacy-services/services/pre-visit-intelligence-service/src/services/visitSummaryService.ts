import OpenAI from 'openai';
import {
  IVisitSummary,
  IVisitSummaryDocument,
  VisitSummary,
  VisitType,
  QuestionPriority,
  TaskCategory,
  TaskStatus
} from '../models/preVisit';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// KEY POINT EXTRACTION PATTERNS
// ============================================================================

const DIAGNOSIS_PATTERNS = [
  /diagnosed with ([^.]+)/gi,
  /diagnosis[:\s]+([^.!?]+)/gi,
  /found ([^.]+) on (examination|test|scan|imaging)/gi,
  /consistent with ([^.]+)/gi,
  /indicates? ([^.]+)/gi
];

const TREATMENT_PATTERNS = [
  /prescribed? ([^.]+)/gi,
  /started? on ([^.]+)/gi,
  /treatment[:\s]+([^.!?]+)/gi,
  /recommend(?:ed)? ([^.]+)/gi,
  /continue(?:ing)? ([^.]+)/gi
];

const WARNING_PATTERNS = [
  /warning[:\s]+([^.!?]+)/gi,
  /caution[:\s]+([^.!?]+)/gi,
  /important[:\s]+([^.!?]+)/gi,
  /serious[:\s]+([^.!?]+)/gi,
  /stop immediately/gi
];

const INSTRUCTION_PATTERNS = [
  /take ([^.]+) (?:once|twice|three times|four times) daily/gi,
  /dosage[:\s]+([^.!?]+)/gi,
  /follow up in ([^.]+)/gi,
  /avoid ([^.]+)/gi,
  /instruction[:\s]+([^.!?]+)/gi
];

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class VisitSummaryService {
  /**
   * Generate AI-powered visit summary
   */
  async generateVisitSummary(
    visitId: string,
    transcript?: string,
    options?: {
      keyPoints?: string[];
      diagnosis?: string[];
      treatments?: string[];
      instructions?: string[];
      warnings?: string[];
      patientId?: string;
      visitDate?: Date;
      visitType?: VisitType;
      doctorId?: string;
    }
  ): Promise<IVisitSummaryDocument> {
    logger.info('Generating visit summary', { visitId });

    try {
      // Check if summary already exists
      let summary = await VisitSummary.findOne({ visitId });

      if (summary) {
        logger.info('Summary already exists, updating', { visitId });
      }

      // Extract or use provided information
      const extractedData = transcript
        ? await this.extractFromTranscript(transcript)
        : {
            keyPoints: options?.keyPoints || [],
            diagnosis: options?.diagnosis || [],
            treatments: options?.treatments || [],
            instructions: options?.instructions || [],
            warnings: options?.warnings || []
          };

      // Generate action items
      const actionItems = await this.generateActionItems(
        extractedData.treatments,
        extractedData.instructions,
        extractedData.warnings,
        extractedData.diagnosis
      );

      // Determine follow-up recommendation
      const followUp = this.determineFollowUp(extractedData.instructions, extractedData.diagnosis);

      // Create or update summary
      const summaryData: IVisitSummary = {
        visitId,
        patientId: options?.patientId || '',
        visitDate: options?.visitDate || new Date(),
        doctorId: options?.doctorId,
        visitType: options?.visitType || VisitType.OTHER,
        keyPoints: {
          diagnosis: extractedData.diagnosis,
          treatment: extractedData.treatments,
          instructions: extractedData.instructions,
          warnings: extractedData.warnings
        },
        actionItems,
        followUp,
        prescriptions: this.extractPrescriptions(extractedData.instructions),
        testOrders: this.extractTestOrders(transcript || ''),
        referrals: this.extractReferrals(transcript || ''),
        sharedWith: [],
        transcript,
        summary: await this.generateSummaryText(extractedData),
        createdAt: summary?.createdAt || new Date(),
        updatedAt: new Date()
      };

      if (summary) {
        // Update existing
        summary = await VisitSummary.findOneAndUpdate(
          { visitId },
          { $set: summaryData },
          { new: true }
        ) as IVisitSummaryDocument;
      } else {
        // Create new
        summary = new VisitSummary(summaryData);
        await summary.save();
      }

      logger.info('Visit summary generated', { visitId, diagnosis: extractedData.diagnosis.length });

      return summary;
    } catch (error) {
      logger.error('Error generating visit summary', { error, visitId });
      throw error;
    }
  }

  /**
   * Extract key points from transcript
   */
  async extractKeyPoints(transcript: string): Promise<{
    diagnosis: string[];
    treatments: string[];
    instructions: string[];
    warnings: string[];
  }> {
    logger.info('Extracting key points from transcript');

    try {
      const diagnosis: Set<string> = new Set();
      const treatments: Set<string> = new Set();
      const instructions: Set<string> = new Set();
      const warnings: Set<string> = new Set();

      // Extract diagnoses
      for (const pattern of DIAGNOSIS_PATTERNS) {
        const matches = transcript.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            diagnosis.add(match[1].trim());
          }
        }
      }

      // Extract treatments
      for (const pattern of TREATMENT_PATTERNS) {
        const matches = transcript.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            treatments.add(match[1].trim());
          }
        }
      }

      // Extract instructions
      for (const pattern of INSTRUCTION_PATTERNS) {
        const matches = transcript.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            instructions.add(match[1].trim());
          }
        }
      }

      // Extract warnings
      for (const pattern of WARNING_PATTERNS) {
        const matches = transcript.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            warnings.add(match[1].trim());
          }
        }
      }

      return {
        diagnosis: Array.from(diagnosis),
        treatments: Array.from(treatments),
        instructions: Array.from(instructions),
        warnings: Array.from(warnings)
      };
    } catch (error) {
      logger.error('Error extracting key points', { error });
      throw error;
    }
  }

  /**
   * Generate action items from extracted data
   */
  async generateActionItems(
    treatments: string[],
    instructions: string[],
    warnings: string[],
    diagnosis: string[]
  ): Promise<IVisitSummary['actionItems']> {
    const actionItems: IVisitSummary['actionItems'] = [];

    // Generate from treatments
    for (const treatment of treatments) {
      if (treatment.toLowerCase().includes('follow') ||
          treatment.toLowerCase().includes('schedule') ||
          treatment.toLowerCase().includes('appointment')) {
        actionItems.push({
          id: uuidv4(),
          task: `Schedule: ${treatment}`,
          priority: QuestionPriority.HIGH,
          category: TaskCategory.OTHER,
          assignedTo: 'patient',
          status: TaskStatus.PENDING
        });
      }
    }

    // Generate from instructions
    for (const instruction of instructions) {
      // Medication actions
      if (instruction.toLowerCase().includes('take') ||
          instruction.toLowerCase().includes('medication') ||
          instruction.toLowerCase().includes('prescription')) {
        actionItems.push({
          id: uuidv4(),
          task: `Medication: ${instruction}`,
          priority: QuestionPriority.HIGH,
          category: TaskCategory.MEDICATIONS,
          assignedTo: 'patient',
          status: TaskStatus.PENDING
        });
      }

      // Lifestyle instructions
      if (instruction.toLowerCase().includes('exercise') ||
          instruction.toLowerCase().includes('diet') ||
          instruction.toLowerCase().includes('rest')) {
        actionItems.push({
          id: uuidv4(),
          task: `Lifestyle: ${instruction}`,
          priority: QuestionPriority.MEDIUM,
          category: TaskCategory.OTHER,
          assignedTo: 'patient',
          status: TaskStatus.PENDING
        });
      }

      // Follow-up actions
      if (instruction.toLowerCase().includes('follow-up') ||
          instruction.toLowerCase().includes('return')) {
        actionItems.push({
          id: uuidv4(),
          task: `Follow-up: ${instruction}`,
          priority: QuestionPriority.MEDIUM,
          category: TaskCategory.OTHER,
          assignedTo: 'patient',
          status: TaskStatus.PENDING
        });
      }
    }

    // Generate from warnings
    for (const warning of warnings) {
      actionItems.push({
        id: uuidv4(),
        task: `⚠️ IMPORTANT: ${warning}`,
        priority: QuestionPriority.CRITICAL,
        category: TaskCategory.OTHER,
        assignedTo: 'patient',
        status: TaskStatus.PENDING
      });
    }

    // Add general actions based on diagnosis
    if (diagnosis.length > 0) {
      actionItems.push({
        id: uuidv4(),
        task: `Research and understand your diagnosis: ${diagnosis.join(', ')}`,
        priority: QuestionPriority.MEDIUM,
        category: TaskCategory.OTHER,
        assignedTo: 'patient',
        status: TaskStatus.PENDING
      });
    }

    return actionItems;
  }

  /**
   * Extract prescriptions from instructions
   */
  private extractPrescriptions(instructions: string[]): IVisitSummary['prescriptions'] {
    const prescriptions: IVisitSummary['prescriptions'] = [];

    for (const instruction of instructions) {
      // Look for medication patterns
      const medPattern = /([A-Za-z\s]+)\s+(\d+)\s*(mg|mcg|g|ml|units?)\s*(?:(?:once|twice|three times|four times|daily|bid|tid|qid|every|every\s+\d+\s+hours?)\s*)?(?:\(?([^)]+)\)?)?/gi;
      const matches = instruction.matchAll(medPattern);

      for (const match of matches) {
        const medication = match[1]?.trim();
        const dosage = `${match[2]} ${match[3]}`;
        const frequency = match[4] || 'as directed';

        if (medication && !prescriptions.some(p => p.medication.toLowerCase() === medication.toLowerCase())) {
          prescriptions.push({
            medication,
            dosage,
            instructions: frequency,
            duration: undefined
          });
        }
      }
    }

    return prescriptions;
  }

  /**
   * Extract test orders from transcript
   */
  private extractTestOrders(transcript: string): IVisitSummary['testOrders'] {
    const testOrders: IVisitSummary['testOrders'] = [];

    const testPatterns = [
      /order(?:ed)?\s+(?:a\s+)?([A-Za-z\s]+(?:test|scan|lab|x-ray|imaging|panel|screen))/gi,
      /get\s+(?:a\s+)?([A-Za-z\s]+(?:test|scan|lab|x-ray|imaging|panel|screen))/gi,
      /schedule\s+(?:a\s+)?([A-Za-z\s]+(?:test|scan|lab|x-ray|imaging|panel|screen))/gi
    ];

    for (const pattern of testPatterns) {
      const matches = transcript.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const testName = match[1].trim();
          if (!testOrders.some(t => t.testName.toLowerCase().includes(testName.toLowerCase()))) {
            testOrders.push({
              testName,
              reason: 'As discussed with doctor',
              priority: 'routine'
            });
          }
        }
      }
    }

    return testOrders;
  }

  /**
   * Extract referrals from transcript
   */
  private extractReferrals(transcript: string): IVisitSummary['referrals'] {
    const referrals: IVisitSummary['referrals'] = [];

    const referralPattern = /refer(?:red)?\s+(?:you\s+)?to\s+(?:a\s+)?([A-Za-z\s]+(?:specialist|doctor|clinic|center))/gi;
    const matches = transcript.matchAll(referralPattern);

    for (const match of matches) {
      if (match[1]) {
        referrals.push({
          specialist: match[1].trim(),
          reason: 'As recommended by your doctor',
          urgency: 'routine'
        });
      }
    }

    return referrals;
  }

  /**
   * Determine follow-up recommendation
   */
  private determineFollowUp(
    instructions: string[],
    diagnosis: string[]
  ): IVisitSummary['followUp'] {
    let recommended = false;
    let suggestedTimeframe: string | undefined;
    let purpose: string | undefined;

    // Look for follow-up mentions in instructions
    for (const instruction of instructions) {
      const followUpPattern = /follow[\s-]?up\s+(?:in|within|after)\s+(\d+\s*(?:days?|weeks?|months?))/gi;
      const match = instruction.match(followUpPattern);
      if (match && match[1]) {
        recommended = true;
        suggestedTimeframe = match[1];
        purpose = 'Review progress and treatment effectiveness';
        break;
      }
    }

    // Also check for return instructions
    for (const instruction of instructions) {
      if (instruction.toLowerCase().includes('return') &&
          instruction.toLowerCase().includes('if')) {
        recommended = true;
        suggestedTimeframe = suggestedTimeframe || 'As needed';
        purpose = purpose || 'As instructed';
        break;
      }
    }

    // Chronic conditions typically need follow-up
    const chronicKeywords = ['chronic', 'ongoing', 'long-term', 'managed'];
    for (const diag of diagnosis) {
      if (chronicKeywords.some(k => diag.toLowerCase().includes(k))) {
        recommended = true;
        suggestedTimeframe = suggestedTimeframe || '3-6 months';
        purpose = purpose || 'Monitor chronic condition management';
        break;
      }
    }

    return { recommended, suggestedTimeframe, purpose };
  }

  /**
   * Generate human-readable summary text
   */
  private async generateSummaryText(data: {
    diagnosis: string[];
    treatments: string[];
    instructions: string[];
    warnings: string[];
  }): Promise<string> {
    let summary = '';

    // Diagnosis
    if (data.diagnosis.length > 0) {
      summary += `**Diagnosis:** ${data.diagnosis.join(', ')}. `;
    }

    // Treatments
    if (data.treatments.length > 0) {
      summary += `**Treatment Plan:** ${data.treatments.join('. ')}. `;
    }

    // Key instructions
    if (data.instructions.length > 0) {
      summary += `**Important Instructions:** ${data.instructions.slice(0, 3).join('. ')}. `;
    }

    // Warnings
    if (data.warnings.length > 0) {
      summary += `**⚠️ Warnings:** ${data.warnings.join('. ')}. `;
    }

    if (!summary) {
      summary = 'Visit summary details will be added once the visit notes are processed.';
    }

    return summary.trim();
  }

  /**
   * Create visit report
   */
  async createVisitReport(visitId: string): Promise<{
    summary: IVisitSummaryDocument;
    formattedReport: string;
    quickReference: {
      diagnosis: string[];
      medications: string[];
      instructions: string[];
      followUp: string;
    };
  }> {
    const summary = await VisitSummary.findOne({ visitId });

    if (!summary) {
      throw new Error('Visit summary not found');
    }

    // Format medications
    const medications = summary.prescriptions.map(p =>
      `${p.medication} ${p.dosage} - ${p.instructions}`
    );

    // Format instructions
    const instructions = [
      ...summary.keyPoints.instructions,
      ...summary.actionItems.map(a => a.task)
    ];

    // Format follow-up
    let followUp = 'No follow-up scheduled';
    if (summary.followUp.recommended) {
      followUp = summary.followUp.suggestedTimeframe
        ? `Follow-up in ${summary.followUp.suggestedTimeframe}`
        : 'Follow-up recommended';
      if (summary.followUp.purpose) {
        followUp += `: ${summary.followUp.purpose}`;
      }
    }

    const quickReference = {
      diagnosis: summary.keyPoints.diagnosis,
      medications,
      instructions: instructions.slice(0, 5),
      followUp
    };

    // Create formatted report
    const formattedReport = this.formatReport(summary);

    return { summary, formattedReport, quickReference };
  }

  /**
   * Format visit report
   */
  private formatReport(summary: IVisitSummaryDocument): string {
    const lines: string[] = [];

    lines.push('═'.repeat(60));
    lines.push('VISIT SUMMARY REPORT');
    lines.push('═'.repeat(60));
    lines.push('');

    // Visit details
    lines.push(`Date: ${new Date(summary.visitDate).toLocaleDateString()}`);
    lines.push(`Type: ${summary.visitType}`);
    if (summary.doctorId) {
      lines.push(`Provider: ${summary.doctorId}`);
    }
    lines.push('');

    // Diagnosis
    if (summary.keyPoints.diagnosis.length > 0) {
      lines.push('─'.repeat(40));
      lines.push('DIAGNOSIS');
      lines.push('─'.repeat(40));
      for (const diag of summary.keyPoints.diagnosis) {
        lines.push(`• ${diag}`);
      }
      lines.push('');
    }

    // Treatments
    if (summary.keyPoints.treatment.length > 0) {
      lines.push('─'.repeat(40));
      lines.push('TREATMENT PLAN');
      lines.push('─'.repeat(40));
      for (const treatment of summary.keyPoints.treatment) {
        lines.push(`• ${treatment}`);
      }
      lines.push('');
    }

    // Prescriptions
    if (summary.prescriptions.length > 0) {
      lines.push('─'.repeat(40));
      lines.push('PRESCRIPTIONS');
      lines.push('─'.repeat(40));
      for (const rx of summary.prescriptions) {
        lines.push(`• ${rx.medication} ${rx.dosage}`);
        lines.push(`  ${rx.instructions}${rx.duration ? ` for ${rx.duration}` : ''}`);
      }
      lines.push('');
    }

    // Instructions
    if (summary.keyPoints.instructions.length > 0) {
      lines.push('─'.repeat(40));
      lines.push('INSTRUCTIONS');
      lines.push('─'.repeat(40));
      for (const instruction of summary.keyPoints.instructions) {
        lines.push(`• ${instruction}`);
      }
      lines.push('');
    }

    // Warnings
    if (summary.keyPoints.warnings.length > 0) {
      lines.push('─'.repeat(40));
      lines.push('⚠️ WARNINGS');
      lines.push('─'.repeat(40));
      for (const warning of summary.keyPoints.warnings) {
        lines.push(`⚠️ ${warning}`);
      }
      lines.push('');
    }

    // Action items
    if (summary.actionItems.length > 0) {
      lines.push('─'.repeat(40));
      lines.push('ACTION ITEMS');
      lines.push('─'.repeat(40));
      for (const item of summary.actionItems) {
        const priorityIcon = item.priority === 'critical' ? '🔴' :
                            item.priority === 'high' ? '🟠' :
                            item.priority === 'medium' ? '🟡' : '🟢';
        lines.push(`${priorityIcon} ${item.task}`);
      }
      lines.push('');
    }

    // Test orders
    if (summary.testOrders.length > 0) {
      lines.push('─'.repeat(40));
      lines.push('TEST ORDERS');
      lines.push('─'.repeat(40));
      for (const test of summary.testOrders) {
        lines.push(`• ${test.testName}`);
        lines.push(`  Reason: ${test.reason}`);
      }
      lines.push('');
    }

    // Follow-up
    if (summary.followUp.recommended) {
      lines.push('─'.repeat(40));
      lines.push('FOLLOW-UP');
      lines.push('─'.repeat(40));
      lines.push(`Recommendation: ${summary.followUp.suggestedTimeframe || 'As needed'}`);
      if (summary.followUp.purpose) {
        lines.push(`Purpose: ${summary.followUp.purpose}`);
      }
      lines.push('');
    }

    lines.push('═'.repeat(60));
    lines.push('Generated by HOJAI AI Pre-Visit Intelligence Service');
    lines.push('═'.repeat(60));

    return lines.join('\n');
  }

  /**
   * Share visit summary with care circle
   */
  async shareWithCareCircle(
    visitId: string,
    circleId: string,
    permissions: 'view' | 'edit' = 'view'
  ): Promise<IVisitSummaryDocument> {
    logger.info('Sharing visit summary with care circle', { visitId, circleId });

    const summary = await VisitSummary.findOne({ visitId });

    if (!summary) {
      throw new Error('Visit summary not found');
    }

    // Check if already shared
    const existingShare = summary.sharedWith.find(s => s.circleId === circleId);

    if (existingShare) {
      // Update permissions
      existingShare.permissions = permissions;
    } else {
      // Add new share
      summary.sharedWith.push({
        circleId,
        sharedAt: new Date(),
        permissions
      });
    }

    await summary.save();

    logger.info('Visit summary shared', { visitId, circleId, permissions });

    return summary;
  }

  /**
   * Get visit summary
   */
  async getVisitSummary(visitId: string): Promise<IVisitSummaryDocument | null> {
    return VisitSummary.findOne({ visitId });
  }

  /**
   * Get summaries for patient
   */
  async getPatientSummaries(
    patientId: string,
    options?: {
      limit?: number;
      visitType?: VisitType;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<IVisitSummaryDocument[]> {
    const query: Record<string, unknown> = { patientId };

    if (options?.visitType) {
      query.visitType = options.visitType;
    }

    if (options?.startDate || options?.endDate) {
      query.visitDate = {};
      if (options.startDate) {
        (query.visitDate as Record<string, Date>).$gte = options.startDate;
      }
      if (options.endDate) {
        (query.visitDate as Record<string, Date>).$lte = options.endDate;
      }
    }

    let queryBuilder = VisitSummary.find(query).sort({ visitDate: -1 });

    if (options?.limit) {
      queryBuilder = queryBuilder.limit(options.limit);
    }

    return queryBuilder;
  }

  /**
   * Update action item status
   */
  async updateActionItemStatus(
    visitId: string,
    actionItemId: string,
    status: TaskStatus
  ): Promise<IVisitSummaryDocument | null> {
    const summary = await VisitSummary.findOne({ visitId });

    if (!summary) {
      throw new Error('Visit summary not found');
    }

    const actionItem = summary.actionItems.find(a => a.id === actionItemId);

    if (!actionItem) {
      throw new Error('Action item not found');
    }

    actionItem.status = status;

    if (status === TaskStatus.COMPLETED) {
      // Could set completedAt here
    }

    await summary.save();

    return summary;
  }

  /**
   * Generate AI summary using OpenAI
   */
  async generateWithAI(
    transcript: string,
    patientContext?: {
      patientId: string;
      conditions?: string[];
      medications?: string[];
    }
  ): Promise<{
    summary: string;
    keyPoints: {
      diagnosis: string[];
      treatments: string[];
      instructions: string[];
      warnings: string[];
    };
    actionItems: string[];
  }> {
    if (!process.env.OPENAI_API_KEY) {
      // Fall back to rule-based extraction
      const extracted = await this.extractKeyPoints(transcript);
      const actionItems = await this.generateActionItems(
        extracted.treatments,
        extracted.instructions,
        extracted.warnings,
        extracted.diagnosis
      );

      return {
        summary: await this.generateSummaryText(extracted),
        keyPoints: extracted,
        actionItems: actionItems.map(a => a.task)
      };
    }

    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const contextPrompt = patientContext
        ? `Patient context:
           - Conditions: ${patientContext.conditions?.join(', ') || 'None on record'}
           - Medications: ${patientContext.medications?.join(', ') || 'None on record'}
          `
        : '';

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a medical documentation assistant that analyzes doctor visit transcripts.
            Extract and summarize the key information from the transcript.
            Return a JSON object with:
            - summary: A concise 2-3 sentence summary of the visit
            - keyPoints: { diagnosis: [], treatments: [], instructions: [], warnings: [] }
            - actionItems: [] (list of action items for the patient)

            Be accurate and specific. Use medical terminology correctly.
            Warnings should flag anything that needs immediate attention.`
          },
          {
            role: 'user',
            content: `${contextPrompt}

            Visit Transcript:
            ${transcript}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      logger.error('Error generating AI summary', { error });
      // Fall back to rule-based
      const extracted = await this.extractKeyPoints(transcript);
      return {
        summary: await this.generateSummaryText(extracted),
        keyPoints: extracted,
        actionItems: []
      };
    }
  }

  /**
   * Delete visit summary
   */
  async deleteVisitSummary(visitId: string): Promise<boolean> {
    const result = await VisitSummary.deleteOne({ visitId });
    return result.deletedCount > 0;
  }

  /**
   * Get visit statistics for patient
   */
  async getVisitStatistics(patientId: string, days: number = 365): Promise<{
    totalVisits: number;
    byType: Record<string, number>;
    averageActionsPerVisit: number;
    completedActions: number;
    pendingActions: number;
    mostCommonDiagnoses: { diagnosis: string; count: number }[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const summaries = await VisitSummary.find({
      patientId,
      visitDate: { $gte: startDate }
    });

    // Count by type
    const byType: Record<string, number> = {};
    for (const summary of summaries) {
      const type = summary.visitType;
      byType[type] = (byType[type] || 0) + 1;
    }

    // Calculate action statistics
    let totalActions = 0;
    let completedActions = 0;
    let pendingActions = 0;

    for (const summary of summaries) {
      for (const action of summary.actionItems) {
        totalActions++;
        if (action.status === TaskStatus.COMPLETED) {
          completedActions++;
        } else if (action.status === TaskStatus.PENDING || action.status === TaskStatus.IN_PROGRESS) {
          pendingActions++;
        }
      }
    }

    // Most common diagnoses
    const diagnosisCounts: Record<string, number> = {};
    for (const summary of summaries) {
      for (const diagnosis of summary.keyPoints.diagnosis) {
        diagnosisCounts[diagnosis] = (diagnosisCounts[diagnosis] || 0) + 1;
      }
    }

    const mostCommonDiagnoses = Object.entries(diagnosisCounts)
      .map(([diagnosis, count]) => ({ diagnosis, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalVisits: summaries.length,
      byType,
      averageActionsPerVisit: summaries.length > 0 ? totalActions / summaries.length : 0,
      completedActions,
      pendingActions,
      mostCommonDiagnoses
    };
  }
}

// Export singleton instance
export const visitSummaryService = new VisitSummaryService();

import axios, { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { symptomAssessmentService, SymptomInput } from './symptomAssessmentService';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ChatContext {
  sessionId: string;
  profileId?: string;
  previousMessages: ChatMessage[];
  preferences?: Record<string, unknown>;
}

export interface ChatResponse {
  message: ChatMessage;
  context?: ChatContext;
  suggestedActions?: string[];
  followUpQuestions?: string[];
}

export interface ReportExplanation {
  reportId: string;
  profileId: string;
  summary: string;
  keyFindings: KeyFinding[];
  terminology: TermDefinition[];
  recommendations: string[];
  questionsToAskDoctor: string[];
  disclaimer: string;
}

export interface KeyFinding {
  title: string;
  value: string;
  normalRange?: string;
  status: 'normal' | 'abnormal' | 'critical';
  explanation: string;
}

export interface TermDefinition {
  term: string;
  definition: string;
  relevance: string;
}

export interface AppointmentPreparation {
  appointmentId: string;
  profileId: string;
  appointmentDetails: AppointmentDetails;
  visitSummary: string;
  questionsToPrepare: PreparedQuestion[];
  documentsToBring: string[];
  preVisitInstructions: string[];
  medicationList: MedicationInfo[];
  recentChanges: HealthChange[];
}

export interface AppointmentDetails {
  doctorName: string;
  specialty: string;
  dateTime: Date;
  location: string;
  reason: string;
  estimatedDuration: string;
}

export interface PreparedQuestion {
  question: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  isAlreadyAnswered?: boolean;
}

export interface MedicationInfo {
  name: string;
  dosage: string;
  frequency: string;
  purpose?: string;
  notes?: string;
}

export interface HealthChange {
  type: 'symptom' | 'medication' | 'lifestyle' | 'condition';
  description: string;
  date: Date;
  significance: 'high' | 'medium' | 'low';
}

export interface CareHistoryRecall {
  profileId: string;
  topic: string;
  summary: string;
  relevantEntries: HistoryEntry[];
  timeline: TimelineEvent[];
  insights: string[];
  relatedTopics: string[];
}

export interface HistoryEntry {
  id: string;
  type: 'visit' | 'diagnosis' | 'medication' | 'lab_result' | 'note' | 'appointment';
  title: string;
  description: string;
  date: Date;
  source?: string;
  relevance: 'primary' | 'secondary' | 'tangential';
}

export interface TimelineEvent {
  date: Date;
  title: string;
  description: string;
  type: string;
}

export interface CarePlan {
  profileId: string;
  generatedAt: Date;
  overview: string;
  goals: CareGoal[];
  medications: MedicationSchedule[];
  appointments: RecommendedAppointment[];
  lifestyleRecommendations: string[];
  monitoringSchedule: MonitoringItem[];
  warnings: string[];
  disclaimer: string;
}

export interface CareGoal {
  title: string;
  description: string;
  targetDate?: Date;
  milestones: string[];
  status: 'active' | 'completed' | 'paused';
  priority: 'high' | 'medium' | 'low';
}

export interface MedicationSchedule {
  medication: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions: string;
  warnings?: string[];
}

export interface RecommendedAppointment {
  specialty: string;
  reason: string;
  frequency: string;
  nextDue?: Date;
  priority: 'high' | 'medium' | 'low';
}

export interface MonitoringItem {
  parameter: string;
  frequency: string;
  targetRange?: string;
  actionIfOutOfRange: string;
}

// ============================================================================
// Care Agent Service
// ============================================================================

export class CareAgentService {
  private memoryServiceUrl: string;
  private voiceServiceUrl: string;
  private risaCareApiUrl: string;

  constructor() {
    this.memoryServiceUrl = process.env.MEMORY_SERVICE_URL || 'http://localhost:4591';
    this.voiceServiceUrl = process.env.VOICE_SERVICE_URL || 'http://localhost:4590';
    this.risaCareApiUrl = process.env.RISACARE_API_URL || 'http://localhost:4701';
  }

  /**
   * Chat with the care agent
   */
  async chat(
    sessionId: string,
    message: string,
    context?: Partial<ChatContext>
  ): Promise<ChatResponse> {
    const endOperation = logger.startOperation('Chat', { sessionId });

    try {
      // Get chat history from memory service
      const chatHistory = await this.getChatHistory(sessionId);

      // Build context for AI response
      const fullContext: ChatContext = {
        sessionId,
        profileId: context?.profileId,
        previousMessages: chatHistory,
        preferences: context?.preferences,
      };

      // Generate response (mock for now - would integrate with AI in production)
      const responseContent = await this.generateChatResponse(message, fullContext);

      // Create response message
      const responseMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        metadata: {
          sessionId,
          processed: true,
        },
      };

      // Store messages
      await this.storeMessage(sessionId, responseMessage);

      // Generate suggested actions
      const suggestedActions = this.generateSuggestedActions(message, responseContent);

      // Generate follow-up questions
      const followUpQuestions = this.generateFollowUpQuestions(message, responseContent);

      endOperation();

      return {
        message: responseMessage,
        context: fullContext,
        suggestedActions,
        followUpQuestions,
      };
    } catch (error) {
      logger.error('Chat failed', error, { sessionId });
      throw error;
    }
  }

  /**
   * Explain a health report to the patient
   */
  async explainReport(profileId: string, reportId: string): Promise<ReportExplanation> {
    const endOperation = logger.startOperation('ExplainReport', { profileId, reportId });

    try {
      // Try to fetch report from RisaCare
      const report = await this.fetchReport(profileId, reportId);

      // Analyze and explain report
      const explanation = this.analyzeReport(report);

      // Generate key findings
      const keyFindings = this.extractKeyFindings(report);

      // Define medical terminology
      const terminology = this.defineTerminology(report);

      // Generate recommendations
      const recommendations = this.generateReportRecommendations(report);

      // Generate questions to ask doctor
      const questionsToAskDoctor = this.generateDoctorQuestions(report);

      endOperation();

      return {
        reportId,
        profileId,
        summary: explanation,
        keyFindings,
        terminology,
        recommendations,
        questionsToAskDoctor,
        disclaimer: 'This explanation is for educational purposes only. Always consult with your healthcare provider for medical advice.',
      };
    } catch (error) {
      logger.error('Report explanation failed', error, { profileId, reportId });
      throw error;
    }
  }

  /**
   * Assess symptoms and provide guidance
   */
  async assessSymptoms(profileId: string, symptoms: string[]): Promise<{
    assessment: ReturnType<typeof symptomAssessmentService.assessSymptoms> extends Promise<infer T> ? T : never;
    followUp: string;
  }> {
    const endOperation = logger.startOperation('AssessSymptoms', { profileId });

    try {
      const symptomInput: SymptomInput = {
        symptoms,
        duration: 'unknown', // Would come from user input
        severity: 'moderate',
      };

      const assessment = await symptomAssessmentService.assessSymptoms(symptomInput);

      // Generate follow-up message
      let followUp = '';
      switch (assessment.urgencyLevel) {
        case 'emergency':
          followUp = 'Based on your symptoms, we recommend seeking immediate medical attention. Please call emergency services or go to the nearest emergency room.';
          break;
        case 'urgent':
          followUp = 'Your symptoms suggest you should see a healthcare provider soon. Would you like me to help you schedule an appointment?';
          break;
        default:
          followUp = 'Your symptoms appear to be manageable at home, but if they persist or worsen, please consult a healthcare provider.';
      }

      // Log the assessment
      await this.logAssessment(profileId, symptoms, assessment);

      endOperation();

      return {
        assessment,
        followUp,
      };
    } catch (error) {
      logger.error('Symptom assessment failed', error, { profileId });
      throw error;
    }
  }

  /**
   * Prepare for an appointment
   */
  async prepareAppointment(profileId: string, appointmentId: string): Promise<AppointmentPreparation> {
    const endOperation = logger.startOperation('PrepareAppointment', { profileId, appointmentId });

    try {
      // Fetch appointment details
      const appointmentDetails = await this.fetchAppointment(appointmentId);

      // Fetch patient's recent history
      const recentHistory = await this.fetchRecentHistory(profileId);

      // Generate visit summary
      const visitSummary = this.generateVisitSummary(profileId, appointmentDetails, recentHistory);

      // Prepare questions
      const questionsToPrepare = this.prepareQuestions(appointmentDetails, recentHistory);

      // List documents to bring
      const documentsToBring = this.getDocumentsToBring(appointmentDetails);

      // Pre-visit instructions
      const preVisitInstructions = this.getPreVisitInstructions(appointmentDetails);

      // Get medication list
      const medicationList = await this.getMedicationList(profileId);

      // Identify recent changes
      const recentChanges = this.identifyRecentChanges(recentHistory);

      endOperation();

      return {
        appointmentId,
        profileId,
        appointmentDetails,
        visitSummary,
        questionsToPrepare,
        documentsToBring,
        preVisitInstructions,
        medicationList,
        recentChanges,
      };
    } catch (error) {
      logger.error('Appointment preparation failed', error, { profileId, appointmentId });
      throw error;
    }
  }

  /**
   * Recall care history on a specific topic
   */
  async recallHistory(profileId: string, topic: string): Promise<CareHistoryRecall> {
    const endOperation = logger.startOperation('RecallHistory', { profileId, topic });

    try {
      // Fetch all history related to the topic
      const historyEntries = await this.fetchHistoryByTopic(profileId, topic);

      // Build timeline
      const timeline = this.buildTimeline(historyEntries);

      // Generate summary
      const summary = this.generateHistorySummary(topic, historyEntries);

      // Generate insights
      const insights = this.generateInsights(historyEntries, topic);

      // Identify related topics
      const relatedTopics = this.identifyRelatedTopics(historyEntries);

      endOperation();

      return {
        profileId,
        topic,
        summary,
        relevantEntries: historyEntries,
        timeline,
        insights,
        relatedTopics,
      };
    } catch (error) {
      logger.error('History recall failed', error, { profileId, topic });
      throw error;
    }
  }

  /**
   * Generate a comprehensive care plan
   */
  async generateCarePlan(profileId: string): Promise<CarePlan> {
    const endOperation = logger.startOperation('GenerateCarePlan', { profileId });

    try {
      // Fetch patient's complete profile
      const profile = await this.fetchPatientProfile(profileId);

      // Fetch medical history
      const history = await this.fetchFullHistory(profileId);

      // Generate goals based on conditions
      const goals = this.generateCareGoals(profile, history);

      // Generate medication schedule
      const medications = this.generateMedicationSchedule(history);

      // Generate recommended appointments
      const appointments = this.generateRecommendedAppointments(profile, history);

      // Generate lifestyle recommendations
      const lifestyleRecommendations = this.generateLifestyleRecommendations(profile, history);

      // Generate monitoring schedule
      const monitoringSchedule = this.generateMonitoringSchedule(history);

      // Generate warnings
      const warnings = this.generateWarnings(profile, history);

      // Generate overview
      const overview = this.generateCarePlanOverview(profile, goals);

      endOperation();

      return {
        profileId,
        generatedAt: new Date(),
        overview,
        goals,
        medications,
        appointments,
        lifestyleRecommendations,
        monitoringSchedule,
        warnings,
        disclaimer: 'This care plan is generated based on available medical records and should be reviewed by your healthcare provider. It does not replace professional medical advice.',
      };
    } catch (error) {
      logger.error('Care plan generation failed', error, { profileId });
      throw error;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async generateChatResponse(
    message: string,
    context: ChatContext
  ): Promise<string> {
    const lowerMessage = message.toLowerCase();

    // Mock responses based on common intents
    if (lowerMessage.includes('appointment') || lowerMessage.includes('schedule')) {
      return 'I can help you schedule an appointment. Would you like me to find a doctor based on your symptoms or preferences? You can also tell me the type of specialist you need.';
    }

    if (lowerMessage.includes('medication') || lowerMessage.includes('medicine')) {
      return 'I can help you with medication information. Please tell me the name of the medication you\'re asking about, or I can pull up your current medication list from your profile.';
    }

    if (lowerMessage.includes('symptom') || lowerMessage.includes('feeling')) {
      return 'I\'m here to help assess your symptoms. Could you describe what you\'re experiencing? The more details you provide, the better I can assist you. Would you like me to perform a symptom assessment?';
    }

    if (lowerMessage.includes('test') || lowerMessage.includes('result') || lowerMessage.includes('report')) {
      return 'I can help explain your lab results or medical reports. Could you tell me which report you\'d like to understand better?';
    }

    if (lowerMessage.includes('reminder') || lowerMessage.includes('schedule')) {
      return 'I can help you set up medication reminders and appointment notifications. Would you like me to create a reminder for a specific time or event?';
    }

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return 'Hello! I\'m your HOJAI Care Agent. I can help you with:\n\n• Symptom assessment\n• Report explanations\n• Appointment preparation\n• Medication information\n• Care history recall\n• Scheduling reminders\n\nHow can I assist you today?';
    }

    if (lowerMessage.includes('thank')) {
      return 'You\'re welcome! Is there anything else I can help you with today?';
    }

    // Default response with contextual awareness
    if (context.profileId) {
      return 'I understand you have a question. Based on your profile, I can help you with symptom assessment, explain your medical reports, prepare for appointments, or recall your care history. Could you provide more details about what you need?';
    }

    return 'I\'m here to help with your healthcare needs. I can assist with symptom assessment, report explanations, appointment preparation, medication information, and more. What would you like help with today?';
  }

  private async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      const response = await axios.get(`${this.memoryServiceUrl}/memory/${sessionId}/chat`, {
        timeout: 5000,
      });
      return response.data.messages || [];
    } catch (error) {
      // Return empty history if service unavailable
      return [];
    }
  }

  private async storeMessage(sessionId: string, message: ChatMessage): Promise<void> {
    try {
      await axios.post(`${this.memoryServiceUrl}/memory/${sessionId}/chat`, {
        message,
      }, {
        timeout: 5000,
      });
    } catch (error) {
      // Log but don't fail if storage unavailable
      logger.warn('Failed to store chat message', { sessionId, messageId: message.id });
    }
  }

  private generateSuggestedActions(message: string, response: string): string[] {
    const actions: string[] = [];
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('symptom')) {
      actions.push('Start symptom assessment', 'View symptom history');
    }
    if (lowerMessage.includes('appointment')) {
      actions.push('Schedule appointment', 'Prepare for existing appointment');
    }
    if (lowerMessage.includes('medication') || lowerMessage.includes('medicine')) {
      actions.push('View medication list', 'Set medication reminder', 'Refill medication');
    }
    if (lowerMessage.includes('report') || lowerMessage.includes('test')) {
      actions.push('Upload new report', 'View past reports', 'Request explanation');
    }

    if (actions.length === 0) {
      actions.push('Learn more about services', 'Contact support');
    }

    return actions;
  }

  private generateFollowUpQuestions(message: string, response: string): string[] {
    const questions: string[] = [];

    if (response.includes('appointment')) {
      questions.push('What type of specialist do you need?');
      questions.push('Do you have a preferred date or time?');
    }
    if (response.includes('symptom')) {
      questions.push('When did your symptoms start?');
      questions.push('How severe are your symptoms?');
    }
    if (response.includes('medication')) {
      questions.push('Are you experiencing any side effects?');
      questions.push('Do you need a refill?');
    }

    return questions;
  }

  private async fetchReport(profileId: string, reportId: string): Promise<Record<string, unknown>> {
    try {
      const response = await axios.get(`${this.risaCareApiUrl}/reports/${reportId}`, {
        params: { profileId },
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      // Return mock data if service unavailable
      logger.warn('Using mock report data', { profileId, reportId });
      return this.getMockReportData(reportId);
    }
  }

  private getMockReportData(reportId: string): Record<string, unknown> {
    return {
      id: reportId,
      type: 'blood_test',
      date: new Date().toISOString(),
      results: {
        hemoglobin: { value: 14.2, unit: 'g/dL', normalRange: '12.0-16.0' },
        glucose: { value: 95, unit: 'mg/dL', normalRange: '70-100' },
        cholesterol: { value: 210, unit: 'mg/dL', normalRange: '<200' },
        whiteBloodCells: { value: 7500, unit: 'cells/mcL', normalRange: '4500-11000' },
      },
    };
  }

  private analyzeReport(report: Record<string, unknown>): string {
    const results = report.results as Record<string, { value: number; normalRange?: string }> || {};

    let summary = 'Your lab results show the following key findings:\n\n';

    for (const [key, data] of Object.entries(results)) {
      const status = this.checkNormalRange(data.value, data.normalRange);
      const displayName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      summary += `• ${displayName}: ${data.value} (${data.normalRange || 'N/A'}) - ${status}\n`;
    }

    return summary;
  }

  private checkNormalRange(value: number, range?: string): string {
    if (!range) return 'Reference only';
    if (range.startsWith('<')) {
      const max = parseFloat(range.substring(1));
      return value < max ? 'Normal' : 'Above optimal';
    }
    if (range.startsWith('>')) {
      const min = parseFloat(range.substring(1));
      return value > min ? 'Normal' : 'Below optimal';
    }
    const [min, max] = range.split('-').map(v => parseFloat(v.trim()));
    if (value >= min && value <= max) return 'Normal';
    if (value < min) return 'Below normal';
    return 'Above normal';
  }

  private extractKeyFindings(report: Record<string, unknown>): KeyFinding[] {
    const findings: KeyFinding[] = [];
    const results = report.results as Record<string, { value: number; unit: string; normalRange?: string }> || {};

    for (const [key, data] of Object.entries(results)) {
      const displayName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const status = this.checkNormalRange(data.value, data.normalRange);

      findings.push({
        title: displayName,
        value: `${data.value} ${data.unit}`,
        normalRange: data.normalRange,
        status: status === 'Normal' ? 'normal' : status.includes('Above') ? 'abnormal' : 'abnormal',
        explanation: this.generateFindingExplanation(key, data.value, status),
      });
    }

    return findings;
  }

  private generateFindingExplanation(
    parameter: string,
    value: number,
    status: string
  ): string {
    const explanations: Record<string, Record<string, string>> = {
      hemoglobin: {
        Normal: 'Your hemoglobin level is within the healthy range, indicating good oxygen-carrying capacity.',
        'Above normal': 'Elevated hemoglobin may indicate dehydration or other conditions. Consider consulting your doctor.',
        'Below normal': 'Low hemoglobin suggests anemia. Iron-rich foods or supplements may help.',
      },
      glucose: {
        Normal: 'Your blood sugar level is within the normal range.',
        'Above normal': 'Elevated blood glucose may indicate pre-diabetes or diabetes. Further testing may be recommended.',
        'Below normal': 'Low blood sugar (hypoglycemia) can cause dizziness and fatigue.',
      },
      cholesterol: {
        Normal: 'Your cholesterol level is within the recommended range.',
        'Above normal': 'High cholesterol increases heart disease risk. Lifestyle changes may be recommended.',
        'Below normal': 'Very low cholesterol is generally not a concern.',
      },
    };

    return explanations[parameter]?.[status] || `This ${parameter} value is ${status.toLowerCase()}.`;
  }

  private defineTerminology(report: Record<string, unknown>): TermDefinition[] {
    return [
      {
        term: 'Hemoglobin',
        definition: 'A protein in red blood cells that carries oxygen throughout the body.',
        relevance: 'Indicates blood\'s oxygen-carrying capacity',
      },
      {
        term: 'Glucose',
        definition: 'The main type of sugar in the blood, serving as the primary energy source.',
        relevance: 'Indicates blood sugar control',
      },
      {
        term: 'Cholesterol',
        definition: 'A waxy substance found in blood that is necessary for building cells.',
        relevance: 'Related to heart health and cardiovascular risk',
      },
      {
        term: 'White Blood Cells (WBC)',
        definition: 'Blood cells that help fight infection and disease.',
        relevance: 'Indicates immune system status',
      },
    ];
  }

  private generateReportRecommendations(report: Record<string, unknown>): string[] {
    return [
      'Schedule a follow-up appointment to discuss these results with your doctor',
      'Continue maintaining a healthy lifestyle with balanced nutrition',
      'Stay hydrated and get regular exercise',
      'Monitor any symptoms and report concerns to your healthcare provider',
    ];
  }

  private generateDoctorQuestions(report: Record<string, unknown>): string[] {
    return [
      'Are any of these values concerning enough to require treatment?',
      'Should I make any lifestyle changes based on these results?',
      'How often should I have this test repeated?',
      'Are there any additional tests you recommend?',
      'Should I be concerned about any specific values?',
    ];
  }

  private async logAssessment(
    profileId: string,
    symptoms: string[],
    assessment: unknown
  ): Promise<void> {
    try {
      await axios.post(`${this.memoryServiceUrl}/memory/${profileId}/assessments`, {
        symptoms,
        assessment,
        timestamp: new Date().toISOString(),
      }, {
        timeout: 5000,
      });
    } catch (error) {
      logger.warn('Failed to log assessment', { profileId });
    }
  }

  private async fetchAppointment(appointmentId: string): Promise<AppointmentDetails> {
    try {
      const response = await axios.get(`${this.risaCareApiUrl}/appointments/${appointmentId}`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      // Return mock data
      return {
        doctorName: 'Dr. Sarah Johnson',
        specialty: 'General Medicine',
        dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        location: 'HOJAI Health Center, Main Branch',
        reason: 'Annual checkup',
        estimatedDuration: '30 minutes',
      };
    }
  }

  private async fetchRecentHistory(profileId: string): Promise<HistoryEntry[]> {
    try {
      const response = await axios.get(`${this.risaCareApiUrl}/profiles/${profileId}/history`, {
        params: { limit: 10 },
        timeout: 5000,
      });
      return response.data.entries || [];
    } catch (error) {
      return this.getMockHistory();
    }
  }

  private getMockHistory(): HistoryEntry[] {
    return [
      {
        id: '1',
        type: 'visit',
        title: 'Annual Physical Examination',
        description: 'Routine annual checkup with normal findings',
        date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        source: 'HOJAI Health Center',
        relevance: 'primary',
      },
      {
        id: '2',
        type: 'lab_result',
        title: 'Blood Panel Results',
        description: 'All values within normal range',
        date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        source: 'Quest Diagnostics',
        relevance: 'primary',
      },
      {
        id: '3',
        type: 'medication',
        title: 'Vitamin D3 Supplement',
        description: '1000 IU daily for bone health',
        date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        relevance: 'secondary',
      },
    ];
  }

  private generateVisitSummary(
    profileId: string,
    appointment: AppointmentDetails,
    history: HistoryEntry[]
  ): string {
    return `You have an upcoming appointment with ${appointment.doctorName} (${appointment.specialty}) on ${appointment.dateTime.toLocaleDateString()} at ${appointment.dateTime.toLocaleTimeString()}.

Reason for visit: ${appointment.reason}

Your recent health history includes:
${history.slice(0, 3).map(h => `• ${h.title} (${h.date.toLocaleDateString()})`).join('\n')}

This summary should help your doctor understand your health background.`;
  }

  private prepareQuestions(
    appointment: AppointmentDetails,
    history: HistoryEntry[]
  ): PreparedQuestion[] {
    return [
      {
        question: 'Are there any lifestyle changes you recommend based on my recent results?',
        priority: 'high',
        category: 'Treatment',
      },
      {
        question: 'Should I schedule any follow-up tests?',
        priority: 'high',
        category: 'Testing',
      },
      {
        question: 'Are my current medications still appropriate?',
        priority: 'medium',
        category: 'Medication',
      },
      {
        question: 'What symptoms should prompt me to seek immediate care?',
        priority: 'medium',
        category: 'Warning Signs',
      },
      {
        question: 'How often should I have this type of appointment?',
        priority: 'low',
        category: 'Follow-up',
      },
    ];
  }

  private getDocumentsToBring(appointment: AppointmentDetails): string[] {
    return [
      'Photo ID',
      'Insurance card',
      'List of current medications',
      'Previous lab results (if not in system)',
      'List of questions for the doctor',
      'Recent symptoms journal (if applicable)',
    ];
  }

  private getPreVisitInstructions(appointment: AppointmentDetails): string[] {
    return [
      'Fast for 8-12 hours if blood work is scheduled',
      'Bring a list of all current medications and supplements',
      'Arrive 15 minutes early for check-in',
      'Wear comfortable, easily removable clothing',
      'Note any symptoms or changes since your last visit',
    ];
  }

  private async getMedicationList(profileId: string): Promise<MedicationInfo[]> {
    try {
      const response = await axios.get(`${this.risaCareApiUrl}/profiles/${profileId}/medications`, {
        timeout: 5000,
      });
      return response.data.medications || [];
    } catch (error) {
      return [
        {
          name: 'Vitamin D3',
          dosage: '1000 IU',
          frequency: 'Once daily',
          purpose: 'Bone health',
          notes: 'Take with food for better absorption',
        },
        {
          name: 'Multivitamin',
          dosage: '1 tablet',
          frequency: 'Once daily',
          purpose: 'General nutrition',
          notes: 'Take in the morning with water',
        },
      ];
    }
  }

  private identifyRecentChanges(history: HistoryEntry[]): HealthChange[] {
    const changes: HealthChange[] = [];

    for (const entry of history.slice(0, 5)) {
      if (entry.type === 'diagnosis') {
        changes.push({
          type: 'condition',
          description: `New diagnosis: ${entry.title}`,
          date: entry.date,
          significance: 'high',
        });
      }
      if (entry.type === 'medication') {
        changes.push({
          type: 'medication',
          description: `Started: ${entry.title}`,
          date: entry.date,
          significance: 'medium',
        });
      }
    }

    return changes;
  }

  private async fetchHistoryByTopic(profileId: string, topic: string): Promise<HistoryEntry[]> {
    try {
      const response = await axios.get(`${this.risaCareApiUrl}/profiles/${profileId}/history`, {
        params: { topic },
        timeout: 5000,
      });
      return response.data.entries || [];
    } catch (error) {
      return this.getMockHistory();
    }
  }

  private buildTimeline(entries: HistoryEntry[]): TimelineEvent[] {
    return entries.map(entry => ({
      date: entry.date,
      title: entry.title,
      description: entry.description,
      type: entry.type,
    })).sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  private generateHistorySummary(topic: string, entries: HistoryEntry[]): string {
    if (entries.length === 0) {
      return `No history found for "${topic}". This could mean this is a new area of concern or there are no previous records in our system.`;
    }

    return `Based on your care history related to "${topic}", I found ${entries.length} relevant entries spanning from ${entries[entries.length - 1].date.toLocaleDateString()} to ${entries[0].date.toLocaleDateString()}. Your records show ${entries.filter(e => e.relevance === 'primary').length} primary records and ${entries.filter(e => e.relevance === 'secondary').length} related entries.`;
  }

  private generateInsights(entries: HistoryEntry[], topic: string): string[] {
    const insights: string[] = [];

    if (entries.length >= 3) {
      insights.push(`You've had ${entries.length} entries related to ${topic} over time, showing ongoing management of this health area.`);
    }

    const diagnoses = entries.filter(e => e.type === 'diagnosis');
    if (diagnoses.length > 0) {
      insights.push(`Your history includes ${diagnoses.length} diagnosis(es) in this area.`);
    }

    const medications = entries.filter(e => e.type === 'medication');
    if (medications.length > 0) {
      insights.push(`You have ${medications.length} medication(s) on record related to ${topic}.`);
    }

    return insights;
  }

  private identifyRelatedTopics(entries: HistoryEntry[]): string[] {
    const topics = new Set<string>();

    for (const entry of entries) {
      if (entry.type === 'diagnosis') {
        topics.add(entry.title.toLowerCase());
      }
      if (entry.type === 'visit') {
        const specialty = entry.title.match(/\(([^)]+)\)/)?.[1];
        if (specialty) {
          topics.add(specialty.toLowerCase());
        }
      }
    }

    return Array.from(topics).slice(0, 5);
  }

  private async fetchPatientProfile(profileId: string): Promise<Record<string, unknown>> {
    try {
      const response = await axios.get(`${this.risaCareApiUrl}/profiles/${profileId}`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      return {
        id: profileId,
        name: 'Patient',
        age: 35,
        gender: 'not specified',
      };
    }
  }

  private async fetchFullHistory(profileId: string): Promise<HistoryEntry[]> {
    try {
      const response = await axios.get(`${this.risaCareApiUrl}/profiles/${profileId}/history`, {
        params: { limit: 100 },
        timeout: 5000,
      });
      return response.data.entries || [];
    } catch (error) {
      return this.getMockHistory();
    }
  }

  private generateCareGoals(
    profile: Record<string, unknown>,
    history: HistoryEntry[]
  ): CareGoal[] {
    return [
      {
        title: 'Maintain Regular Check-ups',
        description: 'Schedule and attend annual physical examinations and recommended screenings',
        targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        milestones: ['Schedule next appointment', 'Complete annual labs', 'Review results with doctor'],
        status: 'active',
        priority: 'high',
      },
      {
        title: 'Medication Adherence',
        description: 'Take all prescribed medications as directed',
        milestones: ['Set up medication reminders', 'Refill prescriptions on time', 'Report any side effects'],
        status: 'active',
        priority: 'high',
      },
      {
        title: 'Healthy Lifestyle',
        description: 'Maintain a balanced diet, regular exercise, and adequate sleep',
        milestones: ['Exercise 30 min, 5x/week', 'Eat 5 servings of vegetables daily', 'Sleep 7-8 hours nightly'],
        status: 'active',
        priority: 'medium',
      },
    ];
  }

  private generateMedicationSchedule(history: HistoryEntry[]): MedicationSchedule[] {
    return [
      {
        medication: 'Vitamin D3',
        dosage: '1000 IU',
        frequency: 'Once daily',
        duration: 'Ongoing',
        instructions: 'Take with food for better absorption',
        warnings: ['Do not exceed recommended dose', 'Store in cool, dry place'],
      },
      {
        medication: 'Multivitamin',
        dosage: '1 tablet',
        frequency: 'Once daily',
        duration: 'Ongoing',
        instructions: 'Take in the morning with water',
      },
    ];
  }

  private generateRecommendedAppointments(
    profile: Record<string, unknown>,
    history: HistoryEntry[]
  ): RecommendedAppointment[] {
    return [
      {
        specialty: 'Primary Care',
        reason: 'Annual physical examination',
        frequency: 'Yearly',
        nextDue: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        priority: 'high',
      },
      {
        specialty: 'Dental',
        reason: 'Regular dental checkup and cleaning',
        frequency: 'Every 6 months',
        priority: 'medium',
      },
      {
        specialty: 'Ophthalmology',
        reason: 'Eye examination',
        frequency: 'Every 2 years',
        priority: 'low',
      },
    ];
  }

  private generateLifestyleRecommendations(
    profile: Record<string, unknown>,
    history: HistoryEntry[]
  ): string[] {
    return [
      'Maintain a balanced diet rich in fruits, vegetables, and whole grains',
      'Engage in at least 150 minutes of moderate aerobic activity per week',
      'Get 7-9 hours of quality sleep each night',
      'Manage stress through relaxation techniques, meditation, or hobbies',
      'Stay hydrated by drinking 8-10 glasses of water daily',
      'Limit alcohol consumption and avoid tobacco products',
      'Practice good hand hygiene to prevent infections',
      'Stay up to date with recommended vaccinations',
    ];
  }

  private generateMonitoringSchedule(history: HistoryEntry[]): MonitoringItem[] {
    return [
      {
        parameter: 'Blood Pressure',
        frequency: 'At home, 2x/week',
        targetRange: '<120/80 mmHg',
        actionIfOutOfRange: 'Contact doctor if consistently above 140/90',
      },
      {
        parameter: 'Weight',
        frequency: 'Weekly',
        actionIfOutOfRange: 'Discuss significant changes with doctor',
      },
      {
        parameter: 'Blood Glucose',
        frequency: 'As directed by doctor',
        targetRange: 'Fasting: 70-100 mg/dL',
        actionIfOutOfRange: 'Schedule appointment if consistently outside range',
      },
      {
        parameter: 'Cholesterol',
        frequency: 'Annually',
        targetRange: 'Total <200 mg/dL',
        actionIfOutOfRange: 'Follow up with doctor for management plan',
      },
    ];
  }

  private generateWarnings(profile: Record<string, unknown>, history: HistoryEntry[]): string[] {
    return [
      'Contact emergency services (112/911) for chest pain, difficulty breathing, or signs of stroke',
      'Seek immediate care for severe bleeding, high fever (104°F/40°C+), or sudden severe pain',
      'Report any new or worsening symptoms to your healthcare provider',
      'Do not stop taking prescribed medications without consulting your doctor',
      'Keep emergency contacts and medical information readily available',
    ];
  }

  private generateCarePlanOverview(
    profile: Record<string, unknown>,
    goals: CareGoal[]
  ): string {
    return `This personalized care plan is designed to help you maintain and improve your health. It includes ${goals.length} key goals focusing on preventive care, medication management, and lifestyle improvements. Regular follow-ups and monitoring will help ensure you stay on track with your health journey.`;
  }
}

export const careAgentService = new CareAgentService();

/**
 * HR Recruiter Agent - Onboarding Manager Service
 * Complete employee onboarding workflow management
 */

import { v4 as uuidv4 } from 'uuid';
import {
  OnboardingWorkflow,
  OnboardingChecklist,
  OnboardingDocument,
  OnboardingStatus,
  EquipmentRequest,
  TrainingEnrollment,
  OnboardingFeedback,
  Candidate,
  Job,
} from '../types';

interface OnboardingManagerConfig {
  defaultDurationDays: number;
  autoSendDocuments: boolean;
  autoAssignBuddy: boolean;
}

interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
  checklists: Omit<OnboardingChecklist, 'id' | 'completedAt' | 'status'>[];
  documents: Omit<OnboardingDocument, 'id' | 'status' | 'fileUrl' | 'signedAt'>[];
  trainingPrograms: {
    trainingProgramId: string;
    name: string;
    description?: string;
    duration: number;
  }[];
}

export class OnboardingManager {
  private config: OnboardingManagerConfig;
  private templates: Map<string, OnboardingTemplate> = new Map();

  constructor(config?: Partial<OnboardingManagerConfig>) {
    this.config = {
      defaultDurationDays: 30,
      autoSendDocuments: true,
      autoAssignBuddy: true,
      ...config,
    };

    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default onboarding templates
   */
  private initializeDefaultTemplates(): void {
    // Default IT/Software template
    this.templates.set('default_it', {
      id: 'default_it',
      name: 'IT & Software Onboarding',
      description: 'Standard onboarding for IT and software roles',
      checklists: [
        { name: 'IT Account Setup', category: 'task', description: 'Create email, Slack, GitHub accounts', order: 1 },
        { name: 'Hardware Setup', category: 'equipment', description: 'Laptop configuration and software installation', order: 2 },
        { name: 'Security Training', category: 'training', description: 'Complete security awareness training', order: 3 },
        { name: 'Code of Conduct Review', category: 'document', description: 'Read and acknowledge code of conduct', order: 4 },
        { name: 'Team Introduction', category: 'introduction', description: 'Meet with team members', order: 5 },
        { name: 'HR Documentation', category: 'document', description: 'Complete all HR paperwork', order: 6 },
        { name: 'Benefits Enrollment', category: 'task', description: 'Enroll in health insurance and benefits', order: 7 },
        { name: 'First Project Assignment', category: 'task', description: 'Get assigned first project/task', order: 8 },
      ],
      documents: [
        { name: 'Offer Letter', type: 'offer_letter', required: true, dueDate: 'start' },
        { name: 'Employment Contract', type: 'contract', required: true, dueDate: 'day1' },
        { name: 'NDA', type: 'nda', required: true, dueDate: 'day1' },
        { name: 'Tax Forms (W-4/Form 16)', type: 'tax_form', required: true, dueDate: 'day3' },
        { name: 'ID Proof', type: 'id_proof', required: true, dueDate: 'day1' },
        { name: 'Policy Manual Acknowledgment', type: 'policy', required: false, dueDate: 'week1' },
      ],
      trainingPrograms: [
        { trainingProgramId: 'security_basics', name: 'Security Awareness', duration: 2 },
        { trainingProgramId: 'company_overview', name: 'Company Overview', duration: 1 },
        { trainingProgramId: 'team_culture', name: 'Team Culture & Values', duration: 1 },
        { trainingProgramId: 'tools_training', name: 'Tools & Systems Training', duration: 4 },
      ],
    });

    // Sales template
    this.templates.set('default_sales', {
      id: 'default_sales',
      name: 'Sales Onboarding',
      description: 'Standard onboarding for sales roles',
      checklists: [
        { name: 'CRM Training', category: 'training', description: 'Complete CRM system training', order: 1 },
        { name: 'Product Knowledge', category: 'training', description: 'Complete product training modules', order: 2 },
        { name: 'Sales Process Walkthrough', category: 'task', description: 'Review sales playbook with manager', order: 3 },
        { name: 'Shadow Senior Rep', category: 'introduction', description: 'Shadow experienced sales rep', order: 4 },
        { name: 'First Calls Under Supervision', category: 'task', description: 'Make first sales calls with mentor', order: 5 },
      ],
      documents: [
        { name: 'Offer Letter', type: 'offer_letter', required: true, dueDate: 'start' },
        { name: 'Employment Contract', type: 'contract', required: true, dueDate: 'day1' },
        { name: 'NDA', type: 'nda', required: true, dueDate: 'day1' },
        { name: 'ID Proof', type: 'id_proof', required: true, dueDate: 'day1' },
      ],
      trainingPrograms: [
        { trainingProgramId: 'product_training', name: 'Product Training', duration: 8 },
        { trainingProgramId: 'sales_methodology', name: 'Sales Methodology', duration: 4 },
        { trainingProgramId: 'crm_mastery', name: 'CRM Mastery', duration: 3 },
      ],
    });

    // General template
    this.templates.set('default_general', {
      id: 'default_general',
      name: 'General Onboarding',
      description: 'Basic onboarding for any role',
      checklists: [
        { name: 'HR Paperwork', category: 'document', description: 'Complete all HR documentation', order: 1 },
        { name: 'Equipment Setup', category: 'equipment', description: 'Set up workstation', order: 2 },
        { name: 'Team Introduction', category: 'introduction', description: 'Meet team members', order: 3 },
        { name: 'Company Overview', category: 'training', description: 'Complete company overview training', order: 4 },
        { name: 'Role-specific Training', category: 'training', description: 'Complete role-specific training', order: 5 },
      ],
      documents: [
        { name: 'Offer Letter', type: 'offer_letter', required: true, dueDate: 'start' },
        { name: 'Employment Contract', type: 'contract', required: true, dueDate: 'day1' },
        { name: 'NDA', type: 'nda', required: true, dueDate: 'day1' },
        { name: 'ID Proof', type: 'id_proof', required: true, dueDate: 'day1' },
      ],
      trainingPrograms: [
        { trainingProgramId: 'company_overview', name: 'Company Overview', duration: 1 },
        { trainingProgramId: 'compliance', name: 'Compliance Training', duration: 2 },
      ],
    });
  }

  /**
   * Start onboarding workflow
   */
  startOnboarding(
    candidate: Candidate,
    job: Job,
    input: {
      startDate: string;
      targetCompletionDate?: string;
      managerId: string;
      managerName: string;
      buddyId?: string;
      buddyName?: string;
      templateId?: string;
      customChecklists?: {
        name: string;
        category: OnboardingChecklist['category'];
        description: string;
        assigneeId?: string;
        dueDate?: string;
        order: number;
      }[];
    }
  ): OnboardingWorkflow {
    const template = this.getTemplate(input.templateId, job.department);

    // Build checklists
    const checklists = this.buildChecklists(input, template);

    // Build documents
    const documents = this.buildDocuments(input, template);

    // Build training enrollments
    const trainingPrograms = this.buildTrainingEnrollments(input, template);

    // Build equipment requests
    const equipmentRequests = this.buildEquipmentRequests(job);

    const onboarding: OnboardingWorkflow = {
      id: uuidv4(),
      candidateId: candidate.id,
      jobId: job.id,

      status: OnboardingStatus.NOT_STARTED,
      progress: 0,

      templateId: template?.id,
      templateName: template?.name,

      startDate: input.startDate,
      targetCompletionDate: input.targetCompletionDate || this.calculateTargetDate(input.startDate),

      managerId: input.managerId,
      managerName: input.managerName,
      buddyId: input.buddyId,
      buddyName: input.buddyName,

      checklists,
      documents,
      equipmentRequests,
      trainingPrograms,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update initial status based on documents
    this.updateStatus(onboarding);

    return onboarding;
  }

  /**
   * Get appropriate template
   */
  private getTemplate(templateId?: string, department?: string): OnboardingTemplate | undefined {
    if (templateId) {
      return this.templates.get(templateId);
    }

    // Try to match by department
    if (department) {
      const deptLower = department.toLowerCase();
      if (deptLower.includes('it') || deptLower.includes('software') || deptLower.includes('engineering')) {
        return this.templates.get('default_it');
      }
      if (deptLower.includes('sales') || deptLower.includes('business')) {
        return this.templates.get('default_sales');
      }
    }

    return this.templates.get('default_general');
  }

  /**
   * Calculate target completion date
   */
  private calculateTargetDate(startDate: string): string {
    const start = new Date(startDate);
    start.setDate(start.getDate() + this.config.defaultDurationDays);
    return start.toISOString();
  }

  /**
   * Build checklists from template and custom input
   */
  private buildChecklists(
    input: {
      customChecklists?: {
        name: string;
        category: OnboardingChecklist['category'];
        description: string;
        assigneeId?: string;
        dueDate?: string;
        order: number;
      }[];
    },
    template?: OnboardingTemplate
  ): OnboardingChecklist[] {
    const checklists: OnboardingChecklist[] = [];

    // Add template checklists
    if (template) {
      for (const item of template.checklists) {
        checklists.push({
          id: uuidv4(),
          ...item,
          status: 'pending',
        });
      }
    }

    // Add custom checklists
    if (input.customChecklists) {
      for (const item of input.customChecklists) {
        checklists.push({
          id: uuidv4(),
          name: item.name,
          category: item.category,
          description: item.description,
          assigneeId: item.assigneeId,
          dueDate: item.dueDate,
          order: item.order,
          status: 'pending',
        });
      }
    }

    // Sort by order
    return checklists.sort((a, b) => a.order - b.order);
  }

  /**
   * Build documents from template
   */
  private buildDocuments(
    input: {
      startDate: string;
    },
    template?: OnboardingTemplate
  ): OnboardingDocument[] {
    if (!template) return [];

    return template.documents.map(doc => {
      const dueDate = this.calculateDocumentDueDate(doc.dueDate, input.startDate);

      return {
        id: uuidv4(),
        name: doc.name,
        type: doc.type,
        required: doc.required,
        status: this.config.autoSendDocuments && doc.required ? 'sent' : 'pending',
        dueDate,
      };
    });
  }

  /**
   * Calculate document due date based on relative date
   */
  private calculateDocumentDueDate(dueDate?: string, startDate?: string): string | undefined {
    if (!dueDate || !startDate) return undefined;

    const start = new Date(startDate);

    switch (dueDate) {
      case 'start':
        return start.toISOString();
      case 'day1':
        start.setDate(start.getDate() + 1);
        return start.toISOString();
      case 'day3':
        start.setDate(start.getDate() + 3);
        return start.toISOString();
      case 'week1':
        start.setDate(start.getDate() + 7);
        return start.toISOString();
      default:
        return undefined;
    }
  }

  /**
   * Build training enrollments
   */
  private buildTrainingEnrollments(
    input: {
      startDate: string;
    },
    template?: OnboardingTemplate
  ): TrainingEnrollment[] {
    if (!template) return [];

    return template.trainingPrograms.map(program => {
      const deadline = new Date(input.startDate);
      deadline.setDate(deadline.getDate() + 14); // 2 weeks deadline

      return {
        id: uuidv4(),
        trainingProgramId: program.trainingProgramId,
        name: program.name,
        description: program.description,
        duration: program.duration,
        status: 'enrolled',
        progress: 0,
        deadline: deadline.toISOString(),
      };
    });
  }

  /**
   * Build equipment requests based on job
   */
  private buildEquipmentRequests(job: Job): EquipmentRequest[] {
    const requests: EquipmentRequest[] = [];

    // Default equipment for most roles
    requests.push({
      id: uuidv4(),
      category: 'laptop',
      name: 'Company Laptop',
      status: 'requested',
      requestedAt: new Date().toISOString(),
    });

    // Add monitor for desk jobs
    if (job.title.toLowerCase().includes('engineer') ||
        job.title.toLowerCase().includes('developer') ||
        job.title.toLowerCase().includes('designer')) {
      requests.push({
        id: uuidv4(),
        category: 'monitor',
        name: 'External Monitor',
        status: 'requested',
        requestedAt: new Date().toISOString(),
      });
    }

    return requests;
  }

  /**
   * Update onboarding status based on progress
   */
  updateStatus(onboarding: OnboardingWorkflow): void {
    // Calculate progress
    const progress = this.calculateProgress(onboarding);

    // Determine current status
    const status = this.determineStatus(onboarding);

    onboarding.progress = progress;
    onboarding.status = status;
    onboarding.updatedAt = new Date().toISOString();
  }

  /**
   * Calculate onboarding progress
   */
  private calculateProgress(onboarding: OnboardingWorkflow): number {
    const totalItems =
      onboarding.checklists.length +
      onboarding.documents.filter(d => d.required).length +
      onboarding.trainingPrograms.length +
      onboarding.equipmentRequests.length;

    if (totalItems === 0) return 100;

    let completedItems = 0;

    // Count completed checklists
    completedItems += onboarding.checklists.filter(c => c.status === 'completed').length;

    // Count signed documents
    completedItems += onboarding.documents.filter(d => d.status === 'signed').length;

    // Count completed training
    completedItems += onboarding.trainingPrograms.filter(t => t.status === 'completed').length;

    // Count delivered equipment
    completedItems += onboarding.equipmentRequests.filter(e => e.status === 'delivered').length;

    return Math.round((completedItems / totalItems) * 100);
  }

  /**
   * Determine current status
   */
  private determineStatus(onboarding: OnboardingWorkflow): OnboardingStatus {
    const pendingDocuments = onboarding.documents.filter(
      d => d.required && d.status !== 'signed'
    );
    const completedDocuments = onboarding.documents.filter(d => d.status === 'signed');

    const pendingTraining = onboarding.trainingPrograms.filter(
      t => t.status !== 'completed' && t.status !== 'skipped'
    );
    const completedTraining = onboarding.trainingPrograms.filter(
      t => t.status === 'completed' || t.status === 'skipped'
    );

    const pendingEquipment = onboarding.equipmentRequests.filter(
      e => e.status !== 'delivered' && e.status !== 'returned'
    );
    const deliveredEquipment = onboarding.equipmentRequests.filter(
      e => e.status === 'delivered'
    );

    const pendingChecklists = onboarding.checklists.filter(c => c.status !== 'completed');

    // Check completion
    if (pendingDocuments.length === 0 &&
        pendingTraining.length === 0 &&
        pendingEquipment.length === 0 &&
        pendingChecklists.length === 0) {
      return OnboardingStatus.COMPLETED;
    }

    // Check for overdue items
    const now = new Date();

    if (onboarding.documents.some(d => d.dueDate && new Date(d.dueDate) < now && d.status !== 'signed')) {
      return OnboardingStatus.DOCUMENTS_PENDING;
    }

    // Status progression
    if (completedDocuments.length > 0 && pendingDocuments.length > 0) {
      return OnboardingStatus.DOCUMENTS_COMPLETED;
    }

    if (completedTraining.length > 0 && pendingTraining.length > 0) {
      return OnboardingStatus.TRAINING_COMPLETED;
    }

    if (deliveredEquipment.length > 0 && pendingEquipment.length > 0) {
      return OnboardingStatus.EQUIPMENT_PROVIDED;
    }

    // Initial status
    if (pendingDocuments.length > 0) {
      return OnboardingStatus.DOCUMENTS_PENDING;
    }

    if (pendingEquipment.length > 0) {
      return OnboardingStatus.EQUIPMENT_PENDING;
    }

    if (pendingTraining.length > 0) {
      return OnboardingStatus.TRAINING_PENDING;
    }

    return OnboardingStatus.NOT_STARTED;
  }

  /**
   * Complete a checklist item
   */
  completeChecklistItem(
    onboarding: OnboardingWorkflow,
    checklistId: string,
    completedAt?: string
  ): OnboardingChecklist {
    const item = onboarding.checklists.find(c => c.id === checklistId);

    if (!item) {
      throw new Error(`Checklist item not found: ${checklistId}`);
    }

    item.status = 'completed';
    item.completedAt = completedAt || new Date().toISOString();

    this.updateStatus(onboarding);

    return item;
  }

  /**
   * Skip a checklist item
   */
  skipChecklistItem(onboarding: OnboardingWorkflow, checklistId: string): OnboardingChecklist {
    const item = onboarding.checklists.find(c => c.id === checklistId);

    if (!item) {
      throw new Error(`Checklist item not found: ${checklistId}`);
    }

    item.status = 'skipped';
    item.completedAt = new Date().toISOString();

    this.updateStatus(onboarding);

    return item;
  }

  /**
   * Update document status
   */
  updateDocumentStatus(
    onboarding: OnboardingWorkflow,
    documentId: string,
    status: OnboardingDocument['status'],
    fileUrl?: string
  ): OnboardingDocument {
    const document = onboarding.documents.find(d => d.id === documentId);

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    document.status = status;

    if (fileUrl) {
      document.fileUrl = fileUrl;
    }

    if (status === 'signed') {
      document.signedAt = new Date().toISOString();
    }

    this.updateStatus(onboarding);

    return document;
  }

  /**
   * Update equipment status
   */
  updateEquipmentStatus(
    onboarding: OnboardingWorkflow,
    equipmentId: string,
    status: EquipmentRequest['status'],
    trackingNumber?: string
  ): EquipmentRequest {
    const equipment = onboarding.equipmentRequests.find(e => e.id === equipmentId);

    if (!equipment) {
      throw new Error(`Equipment request not found: ${equipmentId}`);
    }

    equipment.status = status;

    if (trackingNumber) {
      equipment.trackingNumber = trackingNumber;
    }

    if (status === 'delivered') {
      equipment.deliveredAt = new Date().toISOString();
    }

    this.updateStatus(onboarding);

    return equipment;
  }

  /**
   * Update training progress
   */
  updateTrainingProgress(
    onboarding: OnboardingWorkflow,
    trainingId: string,
    progress: number,
    status?: TrainingEnrollment['status']
  ): TrainingEnrollment {
    const training = onboarding.trainingPrograms.find(t => t.id === trainingId);

    if (!training) {
      throw new Error(`Training enrollment not found: ${trainingId}`);
    }

    training.progress = Math.min(100, Math.max(0, progress));

    if (status) {
      training.status = status;

      if (status === 'completed') {
        training.completedAt = new Date().toISOString();
      }
    } else if (progress >= 100) {
      training.status = 'completed';
      training.completedAt = new Date().toISOString();
    }

    this.updateStatus(onboarding);

    return training;
  }

  /**
   * Submit onboarding feedback
   */
  submitFeedback(
    onboarding: OnboardingWorkflow,
    feedback: Omit<OnboardingFeedback, 'submittedAt'>
  ): OnboardingFeedback {
    if (!onboarding.feedback) {
      onboarding.feedback = [];
    }

    // Check for duplicate feedback type
    const existing = onboarding.feedback.find(f => f.type === feedback.type);
    if (existing) {
      throw new Error(`Feedback already submitted for: ${feedback.type}`);
    }

    const onboardingFeedback: OnboardingFeedback = {
      ...feedback,
      submittedAt: new Date().toISOString(),
    };

    onboarding.feedback.push(onboardingFeedback);
    onboarding.updatedAt = new Date().toISOString();

    return onboardingFeedback;
  }

  /**
   * Get onboarding summary
   */
  getOnboardingSummary(onboarding: OnboardingWorkflow): {
    progress: number;
    status: OnboardingStatus;
    daysRemaining: number;
    overdueItems: {
      type: string;
      name: string;
      dueDate: string;
    }[];
    upcomingItems: {
      type: string;
      name: string;
      dueDate: string;
    }[];
    completedItems: {
      type: string;
      name: string;
      completedAt: string;
    }[];
    feedbackSummary?: {
      averageSatisfaction: number;
      submittedFeedback: number;
    };
  } {
    const now = new Date();
    const target = onboarding.targetCompletionDate
      ? new Date(onboarding.targetCompletionDate)
      : new Date(onboarding.startDate);

    target.setDate(target.getDate() + this.config.defaultDurationDays);
    const daysRemaining = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Find overdue items
    const overdueItems: { type: string; name: string; dueDate: string }[] = [];

    for (const doc of onboarding.documents) {
      if (doc.dueDate && new Date(doc.dueDate) < now && doc.status !== 'signed') {
        overdueItems.push({ type: 'document', name: doc.name, dueDate: doc.dueDate });
      }
    }

    for (const check of onboarding.checklists) {
      if (check.dueDate && new Date(check.dueDate) < now && check.status !== 'completed') {
        overdueItems.push({ type: 'checklist', name: check.name, dueDate: check.dueDate });
      }
    }

    // Find upcoming items (next 7 days)
    const upcomingItems: { type: string; name: string; dueDate: string }[] = [];
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const doc of onboarding.documents) {
      if (doc.dueDate) {
        const dueDate = new Date(doc.dueDate);
        if (dueDate >= now && dueDate <= weekFromNow && doc.status !== 'signed') {
          upcomingItems.push({ type: 'document', name: doc.name, dueDate: doc.dueDate });
        }
      }
    }

    for (const check of onboarding.checklists) {
      if (check.dueDate) {
        const dueDate = new Date(check.dueDate);
        if (dueDate >= now && dueDate <= weekFromNow && check.status !== 'completed') {
          upcomingItems.push({ type: 'checklist', name: check.name, dueDate: check.dueDate });
        }
      }
    }

    // Find completed items
    const completedItems: { type: string; name: string; completedAt: string }[] = [];

    for (const check of onboarding.checklists) {
      if (check.status === 'completed' && check.completedAt) {
        completedItems.push({ type: 'checklist', name: check.name, completedAt: check.completedAt });
      }
    }

    for (const doc of onboarding.documents) {
      if (doc.status === 'signed' && doc.signedAt) {
        completedItems.push({ type: 'document', name: doc.name, completedAt: doc.signedAt });
      }
    }

    for (const training of onboarding.trainingPrograms) {
      if (training.status === 'completed' && training.completedAt) {
        completedItems.push({ type: 'training', name: training.name, completedAt: training.completedAt });
      }
    }

    // Feedback summary
    let feedbackSummary: { averageSatisfaction: number; submittedFeedback: number } | undefined;

    if (onboarding.feedback && onboarding.feedback.length > 0) {
      const totalSatisfaction = onboarding.feedback.reduce(
        (sum, f) => sum + f.ratings.overallSatisfaction, 0
      );
      feedbackSummary = {
        averageSatisfaction: totalSatisfaction / onboarding.feedback.length,
        submittedFeedback: onboarding.feedback.length,
      };
    }

    return {
      progress: onboarding.progress,
      status: onboarding.status,
      daysRemaining,
      overdueItems,
      upcomingItems,
      completedItems,
      feedbackSummary,
    };
  }

  /**
   * Get checklist by category
   */
  getChecklistsByCategory(
    onboarding: OnboardingWorkflow,
    category?: OnboardingChecklist['category']
  ): OnboardingChecklist[] {
    if (category) {
      return onboarding.checklists.filter(c => c.category === category);
    }
    return onboarding.checklists;
  }

  /**
   * Get pending items count
   */
  getPendingItemsCount(onboarding: OnboardingWorkflow): {
    documents: number;
    checklists: number;
    training: number;
    equipment: number;
    total: number;
  } {
    const documents = onboarding.documents.filter(d => d.required && d.status !== 'signed').length;
    const checklists = onboarding.checklists.filter(c => c.status !== 'completed' && c.status !== 'skipped').length;
    const training = onboarding.trainingPrograms.filter(t => t.status !== 'completed' && t.status !== 'skipped').length;
    const equipment = onboarding.equipmentRequests.filter(e => e.status !== 'delivered' && e.status !== 'returned').length;

    return {
      documents,
      checklists,
      training,
      equipment,
      total: documents + checklists + training + equipment,
    };
  }

  /**
   * Create custom template
   */
  createTemplate(template: Omit<OnboardingTemplate, 'id'>): OnboardingTemplate {
    const newTemplate: OnboardingTemplate = {
      id: uuidv4(),
      ...template,
    };

    this.templates.set(newTemplate.id, newTemplate);

    return newTemplate;
  }

  /**
   * Get all templates
   */
  getTemplates(): OnboardingTemplate[] {
    return Array.from(this.templates.values());
  }
}

export const onboardingManager = new OnboardingManager();

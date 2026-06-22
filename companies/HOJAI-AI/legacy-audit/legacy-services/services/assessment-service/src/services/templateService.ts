import { v4 as uuidv4 } from 'uuid';
import {
  AssessmentTemplate,
  IAssessmentTemplate,
  AssessmentType,
  ITemplateQuestion,
  IScoringConfig,
  IThresholdConfig
} from '../models/assessment';
import { logger } from '../utils/logger';

export interface CreateTemplateInput {
  type: AssessmentType;
  name: string;
  description: string;
  version?: string;
  questions: Omit<ITemplateQuestion, 'questionId'>[];
  scoring: IScoringConfig;
  thresholds: Omit<IThresholdConfig, 'customThresholds'> & {
    customThresholds?: Record<string, { min: number; max: number }>;
  };
  category: string;
  specialty?: string;
  applicableSpecialties?: string[];
  estimatedDuration?: number;
  requiredTraining?: string;
  source?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  questions?: Omit<ITemplateQuestion, 'questionId'>[];
  scoring?: IScoringConfig;
  thresholds?: Partial<IThresholdConfig>;
  isActive?: boolean;
  estimatedDuration?: number;
  requiredTraining?: string;
  applicableSpecialties?: string[];
}

class TemplateService {
  /**
   * Get template by assessment type
   */
  async getTemplate(type: AssessmentType): Promise<IAssessmentTemplate | null> {
    const template = await AssessmentTemplate.findOne({
      type,
      isActive: true
    }).lean();

    return template as IAssessmentTemplate | null;
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string): Promise<IAssessmentTemplate | null> {
    const template = await AssessmentTemplate.findOne({ templateId }).lean();
    return template as IAssessmentTemplate | null;
  }

  /**
   * Get all templates
   */
  async getAllTemplates(options?: {
    category?: string;
    isActive?: boolean;
    specialty?: string;
    limit?: number;
    skip?: number;
  }): Promise<{
    templates: IAssessmentTemplate[];
    total: number;
    hasMore: boolean;
  }> {
    const query: Record<string, unknown> = {};

    if (options?.category) {
      query.category = options.category;
    }

    if (options?.isActive !== undefined) {
      query.isActive = options.isActive;
    }

    if (options?.specialty) {
      query.$or = [
        { specialty: options.specialty },
        { applicableSpecialties: options.specialty }
      ];
    }

    const limit = options?.limit || 50;
    const skip = options?.skip || 0;

    const [templates, total] = await Promise.all([
      AssessmentTemplate.find(query)
        .sort({ category: 1, type: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AssessmentTemplate.countDocuments(query)
    ]);

    return {
      templates: templates as IAssessmentTemplate[],
      total,
      hasMore: skip + templates.length < total
    };
  }

  /**
   * Create a new template
   */
  async createTemplate(input: CreateTemplateInput): Promise<IAssessmentTemplate> {
    const { v4: uuid } = { v4: uuidv4 };

    // Check if template already exists for this type and version
    const existingTemplate = await AssessmentTemplate.findOne({
      type: input.type,
      version: input.version || '1.0.0'
    });

    if (existingTemplate) {
      throw new Error(
        `Template for type ${input.type} version ${input.version} already exists`
      );
    }

    // Process questions with generated IDs
    const questions: ITemplateQuestion[] = input.questions.map((q, index) => ({
      ...q,
      questionId: `Q-${uuid()}-${index + 1}`,
      order: q.order ?? index + 1
    }));

    const templateId = `TMPL-${uuid()}`;

    const template = new AssessmentTemplate({
      templateId,
      type: input.type,
      name: input.name,
      description: input.description,
      version: input.version || '1.0.0',
      isActive: true,
      questions,
      scoring: input.scoring,
      thresholds: {
        ...input.thresholds,
        customThresholds: input.thresholds.customThresholds || {}
      },
      category: input.category,
      specialty: input.specialty,
      applicableSpecialties: input.applicableSpecialties || [],
      estimatedDuration: input.estimatedDuration || 15,
      requiredTraining: input.requiredTraining,
      source: input.source,
      requiredFields: ['patientId', 'assessorId', 'responses'],
      optionalFields: ['notes', 'department', 'facilityId']
    });

    await template.save();

    logger.info(`Template created: ${templateId}`, {
      type: input.type,
      name: input.name,
      questionCount: questions.length
    });

    return template;
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    updates: UpdateTemplateInput
  ): Promise<IAssessmentTemplate> {
    const template = await AssessmentTemplate.findOne({ templateId });

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Update fields
    if (updates.name !== undefined) {
      template.name = updates.name;
    }

    if (updates.description !== undefined) {
      template.description = updates.description;
    }

    if (updates.questions !== undefined) {
      const { v4: uuid } = { v4: uuidv4 };
      template.questions = updates.questions.map((q, index) => ({
        ...q,
        questionId: q.questionId || `Q-${uuid()}-${index + 1}`,
        order: q.order ?? index + 1
      }));
    }

    if (updates.scoring !== undefined) {
      template.scoring = updates.scoring;
    }

    if (updates.thresholds !== undefined) {
      template.thresholds = {
        ...template.thresholds,
        ...updates.thresholds
      };
    }

    if (updates.isActive !== undefined) {
      template.isActive = updates.isActive;
    }

    if (updates.estimatedDuration !== undefined) {
      template.estimatedDuration = updates.estimatedDuration;
    }

    if (updates.requiredTraining !== undefined) {
      template.requiredTraining = updates.requiredTraining;
    }

    if (updates.applicableSpecialties !== undefined) {
      template.applicableSpecialties = updates.applicableSpecialties;
    }

    await template.save();

    logger.info(`Template updated: ${templateId}`, {
      updatedFields: Object.keys(updates)
    });

    return template;
  }

  /**
   * Deactivate a template (soft delete)
   */
  async deactivateTemplate(templateId: string): Promise<void> {
    const template = await AssessmentTemplate.findOne({ templateId });

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    template.isActive = false;
    await template.save();

    logger.info(`Template deactivated: ${templateId}`);
  }

  /**
   * Create a new version of a template
   */
  async createTemplateVersion(
    templateId: string,
    newVersion: string,
    updates: UpdateTemplateInput
  ): Promise<IAssessmentTemplate> {
    const existingTemplate = await AssessmentTemplate.findOne({ templateId });

    if (!existingTemplate) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Deactivate current version
    existingTemplate.isActive = false;
    await existingTemplate.save();

    // Create new version
    return this.createTemplate({
      type: existingTemplate.type,
      name: updates.name || existingTemplate.name,
      description: updates.description || existingTemplate.description,
      version: newVersion,
      questions: updates.questions || existingTemplate.questions as ITemplateQuestion[],
      scoring: updates.scoring || existingTemplate.scoring,
      thresholds: updates.thresholds || {
        low: existingTemplate.thresholds.low,
        medium: existingTemplate.thresholds.medium,
        high: existingTemplate.thresholds.high,
        veryHigh: existingTemplate.thresholds.veryHigh
      },
      category: existingTemplate.category,
      specialty: existingTemplate.specialty,
      estimatedDuration: updates.estimatedDuration || existingTemplate.estimatedDuration,
      requiredTraining: updates.requiredTraining || existingTemplate.requiredTraining
    });
  }

  /**
   * Validate responses against template
   */
  async validateResponses(
    type: AssessmentType,
    responses: { questionId: string; answer: unknown }[]
  ): Promise<{
    valid: boolean;
    errors: string[];
    missingRequired: string[];
  }> {
    const template = await this.getTemplate(type);

    if (!template) {
      return {
        valid: false,
        errors: [`No template found for type: ${type}`],
        missingRequired: []
      };
    }

    const errors: string[] = [];
    const missingRequired: string[] = [];

    // Check for required questions
    const requiredQuestions = template.questions.filter((q) => q.required);
    const responseQuestionIds = responses.map((r) => r.questionId);

    for (const question of requiredQuestions) {
      if (!responseQuestionIds.includes(question.questionId)) {
        missingRequired.push(question.questionId);
        errors.push(`Required question not answered: ${question.questionText}`);
      }
    }

    // Validate answer types
    for (const response of responses) {
      const question = template.questions.find(
        (q) => q.questionId === response.questionId
      );

      if (!question) {
        errors.push(`Unknown question ID: ${response.questionId}`);
        continue;
      }

      // Type validation
      if (question.questionType === 'single' && question.options) {
        const validValues = question.options.map((opt) => opt.value);
        if (!validValues.includes(response.answer as string | number)) {
          errors.push(
            `Invalid answer for question "${question.questionText}": ${response.answer}`
          );
        }
      }

      if (question.questionType === 'multiple') {
        if (!Array.isArray(response.answer)) {
          errors.push(
            `Expected array answer for multiple-choice question "${question.questionText}"`
          );
        } else if (question.options) {
          const validValues = question.options.map((opt) => opt.value);
          for (const answer of response.answer) {
            if (!validValues.includes(answer as string | number)) {
              errors.push(`Invalid option "${answer}" in question "${question.questionText}"`);
            }
          }
        }
      }

      if (question.questionType === 'scale' || question.questionType === 'numeric') {
        if (typeof response.answer !== 'number') {
          errors.push(`Expected numeric answer for question "${question.questionText}"`);
        } else {
          if (question.minValue !== undefined && response.answer < question.minValue) {
            errors.push(
              `Answer ${response.answer} is below minimum ${question.minValue} for question "${question.questionText}"`
            );
          }
          if (question.maxValue !== undefined && response.answer > question.maxValue) {
            errors.push(
              `Answer ${response.answer} is above maximum ${question.maxValue} for question "${question.questionText}"`
            );
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      missingRequired
    };
  }

  /**
   * Get template categories
   */
  async getCategories(): Promise<string[]> {
    const categories = await AssessmentTemplate.distinct('category', { isActive: true });
    return categories;
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<IAssessmentTemplate[]> {
    const templates = await AssessmentTemplate.find({
      category,
      isActive: true
    })
      .sort({ type: 1 })
      .lean();

    return templates as IAssessmentTemplate[];
  }

  /**
   * Initialize default templates
   */
  async initializeDefaultTemplates(): Promise<void> {
    const existingTemplates = await AssessmentTemplate.countDocuments();
    if (existingTemplates > 0) {
      logger.info('Default templates already exist, skipping initialization');
      return;
    }

    logger.info('Initializing default assessment templates...');

    // Create MUST template
    await this.createTemplate({
      type: AssessmentType.MUST,
      name: 'Malnutrition Universal Screening Tool',
      description:
        'MUST is a five-step screening tool for adults in hospitals, community and care homes. It identifies adults who are malnourished or at risk of malnutrition.',
      version: '1.0.0',
      category: 'Nutrition',
      estimatedDuration: 5,
      source: 'BAPEN (British Association for Parenteral and Enteral Nutrition)',
      questions: [
        {
          questionId: 'MUST-001',
          questionText: 'BMI score (kg/m²)',
          helpText: 'Calculate BMI = weight(kg) / height(m)²',
          category: 'Step 1',
          order: 1,
          questionType: 'numeric',
          minValue: 10,
          maxValue: 60,
          unit: 'kg/m²',
          scoringType: 'lookup',
          scoringValues: {
            '>20': 0,
            '18.5-20': 1,
            '<18.5': 2
          },
          required: true
        },
        {
          questionId: 'MUST-002',
          questionText: 'Weight loss score (%)',
          helpText: 'Unplanned weight loss in past 3-6 months',
          category: 'Step 2',
          order: 2,
          questionType: 'scale',
          minValue: 0,
          maxValue: 20,
          unit: '%',
          scoringType: 'lookup',
          scoringValues: {
            '<5': 0,
            '5-10': 1,
            '>10': 2
          },
          required: true
        },
        {
          questionId: 'MUST-003',
          questionText: 'Acute disease effect',
          helpText: 'Is the patient acutely ill and there has been or is likely to be no nutritional intake for >5 days?',
          category: 'Step 3',
          order: 3,
          questionType: 'single',
          options: [
            { value: 'yes', label: 'Yes', score: 2 },
            { value: 'no', label: 'No', score: 0 }
          ],
          scoringType: 'lookup',
          required: true
        }
      ],
      scoring: {
        method: 'sum'
      },
      thresholds: {
        low: 1,
        medium: 2,
        high: 2
      }
    });

    // Create Braden Scale template
    await this.createTemplate({
      type: AssessmentType.Braden,
      name: 'Braden Scale for Pressure Ulcer Risk',
      description:
        'The Braden Scale is a tool used to assess the risk of pressure ulcer development. It evaluates six factors: sensory perception, moisture, activity, mobility, nutrition, and friction/shear.',
      version: '1.0.0',
      category: 'Skin Integrity',
      estimatedDuration: 10,
      source: 'Braden & Bergstrom (1987)',
      questions: [
        {
          questionId: 'BRADEN-001',
          questionText: 'Sensory perception',
          helpText: 'Ability to respond meaningfully to pressure-related discomfort',
          category: 'Physical Functioning',
          order: 1,
          questionType: 'single',
          options: [
            { value: 1, label: 'Completely limited', score: 1 },
            { value: 2, label: 'Very limited', score: 2 },
            { value: 3, label: 'Slightly limited', score: 3 },
            { value: 4, label: 'No impairment', score: 4 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'BRADEN-002',
          questionText: 'Moisture',
          helpText: 'Degree to which skin is exposed to moisture',
          category: 'Physical Functioning',
          order: 2,
          questionType: 'single',
          options: [
            { value: 1, label: 'Constantly moist', score: 1 },
            { value: 2, label: 'Very moist', score: 2 },
            { value: 3, label: 'Occasionally moist', score: 3 },
            { value: 4, label: 'Rarely moist', score: 4 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'BRADEN-003',
          questionText: 'Activity',
          helpText: 'Physical activity level',
          category: 'Physical Functioning',
          order: 3,
          questionType: 'single',
          options: [
            { value: 1, label: 'Bedfast', score: 1 },
            { value: 2, label: 'Chairfast', score: 2 },
            { value: 3, label: 'Walks occasionally', score: 3 },
            { value: 4, label: 'Walks frequently', score: 4 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'BRADEN-004',
          questionText: 'Mobility',
          helpText: 'Ability to change and control body position',
          category: 'Physical Functioning',
          order: 4,
          questionType: 'single',
          options: [
            { value: 1, label: 'Completely immobile', score: 1 },
            { value: 2, label: 'Very limited', score: 2 },
            { value: 3, label: 'Slightly limited', score: 3 },
            { value: 4, label: 'No limitations', score: 4 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'BRADEN-005',
          questionText: 'Nutrition',
          helpText: 'Usual food intake pattern',
          category: 'Physical Functioning',
          order: 5,
          questionType: 'single',
          options: [
            { value: 1, label: 'Very poor', score: 1 },
            { value: 2, label: 'Probably inadequate', score: 2 },
            { value: 3, label: 'Adequate', score: 3 },
            { value: 4, label: 'Excellent', score: 4 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'BRADEN-006',
          questionText: 'Friction and shear',
          helpText: 'Ability to move in bed and chair',
          category: 'Physical Functioning',
          order: 6,
          questionType: 'single',
          options: [
            { value: 1, label: 'Problem', score: 1 },
            { value: 2, label: 'Potential problem', score: 2 },
            { value: 3, label: 'No apparent problem', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        }
      ],
      scoring: {
        method: 'sum'
      },
      thresholds: {
        low: 15,
        medium: 13,
        high: 9,
        veryHigh: 6
      }
    });

    // Create PHQ-9 template
    await this.createTemplate({
      type: AssessmentType.PHQ9,
      name: 'Patient Health Questionnaire-9',
      description:
        'PHQ-9 is a validated instrument used by healthcare professionals to diagnose and monitor depression. It assesses the presence and severity of depressive symptoms over the past two weeks.',
      version: '1.0.0',
      category: 'Mental Health',
      estimatedDuration: 5,
      source: 'Kroenke, Spitzer & Williams (2001)',
      questions: [
        {
          questionId: 'PHQ9-001',
          questionText: 'Little interest or pleasure in doing things',
          helpText: 'Over the last 2 weeks, how often have you been bothered by this?',
          category: 'Depression Symptoms',
          order: 1,
          questionType: 'single',
          options: [
            { value: 0, label: 'Not at all', score: 0 },
            { value: 1, label: 'Several days', score: 1 },
            { value: 2, label: 'More than half the days', score: 2 },
            { value: 3, label: 'Nearly every day', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'PHQ9-002',
          questionText: 'Feeling down, depressed, or hopeless',
          helpText: 'Over the last 2 weeks, how often have you been bothered by this?',
          category: 'Depression Symptoms',
          order: 2,
          questionType: 'single',
          options: [
            { value: 0, label: 'Not at all', score: 0 },
            { value: 1, label: 'Several days', score: 1 },
            { value: 2, label: 'More than half the days', score: 2 },
            { value: 3, label: 'Nearly every day', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'PHQ9-003',
          questionText: 'Trouble falling or staying asleep, or sleeping too much',
          helpText: 'Over the last 2 weeks, how often have you been bothered by this?',
          category: 'Depression Symptoms',
          order: 3,
          questionType: 'single',
          options: [
            { value: 0, label: 'Not at all', score: 0 },
            { value: 1, label: 'Several days', score: 1 },
            { value: 2, label: 'More than half the days', score: 2 },
            { value: 3, label: 'Nearly every day', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'PHQ9-004',
          questionText: 'Feeling tired or having little energy',
          helpText: 'Over the last 2 weeks, how often have you been bothered by this?',
          category: 'Depression Symptoms',
          order: 4,
          questionType: 'single',
          options: [
            { value: 0, label: 'Not at all', score: 0 },
            { value: 1, label: 'Several days', score: 1 },
            { value: 2, label: 'More than half the days', score: 2 },
            { value: 3, label: 'Nearly every day', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'PHQ9-005',
          questionText: 'Poor appetite or overeating',
          helpText: 'Over the last 2 weeks, how often have you been bothered by this?',
          category: 'Depression Symptoms',
          order: 5,
          questionType: 'single',
          options: [
            { value: 0, label: 'Not at all', score: 0 },
            { value: 1, label: 'Several days', score: 1 },
            { value: 2, label: 'More than half the days', score: 2 },
            { value: 3, label: 'Nearly every day', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'PHQ9-006',
          questionText: 'Feeling bad about yourself - or that you are a failure or have let yourself or your family down',
          helpText: 'Over the last 2 weeks, how often have you been bothered by this?',
          category: 'Depression Symptoms',
          order: 6,
          questionType: 'single',
          options: [
            { value: 0, label: 'Not at all', score: 0 },
            { value: 1, label: 'Several days', score: 1 },
            { value: 2, label: 'More than half the days', score: 2 },
            { value: 3, label: 'Nearly every day', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'PHQ9-007',
          questionText: 'Trouble concentrating on things, such as reading the newspaper or watching television',
          helpText: 'Over the last 2 weeks, how often have you been bothered by this?',
          category: 'Depression Symptoms',
          order: 7,
          questionType: 'single',
          options: [
            { value: 0, label: 'Not at all', score: 0 },
            { value: 1, label: 'Several days', score: 1 },
            { value: 2, label: 'More than half the days', score: 2 },
            { value: 3, label: 'Nearly every day', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'PHQ9-008',
          questionText: 'Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual',
          helpText: 'Over the last 2 weeks, how often have you been bothered by this?',
          category: 'Depression Symptoms',
          order: 8,
          questionType: 'single',
          options: [
            { value: 0, label: 'Not at all', score: 0 },
            { value: 1, label: 'Several days', score: 1 },
            { value: 2, label: 'More than half the days', score: 2 },
            { value: 3, label: 'Nearly every day', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'PHQ9-009',
          questionText: 'Thoughts that you would be better off dead or of hurting yourself in some way',
          helpText: 'Over the last 2 weeks, how often have you been bothered by this?',
          category: 'Depression Symptoms',
          order: 9,
          questionType: 'single',
          options: [
            { value: 0, label: 'Not at all', score: 0 },
            { value: 1, label: 'Several days', score: 1 },
            { value: 2, label: 'More than half the days', score: 2 },
            { value: 3, label: 'Nearly every day', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        }
      ],
      scoring: {
        method: 'sum'
      },
      thresholds: {
        low: 5,
        medium: 10,
        high: 15,
        veryHigh: 20
      }
    });

    // Create GAD-7 template
    await this.createTemplate({
      type: AssessmentType.GAD7,
      name: 'Generalized Anxiety Disorder 7-item scale',
      description:
        'GAD-7 is a validated instrument for screening and measuring the severity of generalized anxiety disorder. It assesses anxiety symptoms over the past two weeks.',
      version: '1.0.0',
      category: 'Mental Health',
      estimatedDuration: 5,
      source: 'Spitzer et al. (2006)',
      questions: [
        {
          questionId: 'GAD7-001',
          questionText: 'Feeling nervous, anxious, or on edge',
          helpText: 'Over the last 2 weeks, how often have you been bothered by this?',
          category: 'Anxiety Symptoms',
          order: 1,
          questionType: 'single',
          options: [
            { value: 0, label: 'Not at all', score: 0 },
            { value: 1, label: 'Several days', score: 1 },
            { value: 2, label: 'More than half the days', score: 2 },
            { value: 3, label: 'Nearly every day', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'GAD7-002',
          questionText: 'Not being able to stop or control worrying',
          helpText: 'Over the last 2 weeks, how often have you been bothered by this?',
          category: 'Anxiety Symptoms',
          order: 2,
          questionType: 'single',
          options: [
            { value: 0, label: 'Not at all', score: 0 },
            { value: 1, label: 'Several days', score: 1 },
            { value: 2, label: 'More than half the days', score: 2 },
            { value: 3, label: 'Nearly every day', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'GAD7-003',
          questionText: 'Worrying too much about different things',
          helpText: 'Over the last 2 weeks, how often have you been bothered by this?',
          category: 'Anxiety Symptoms',
          order: 3,
          questionType: 'single',
          options: [
            { value: 0, label: 'Not at all', score: 0 },
            { value: 1, label: 'Several days', score: 1 },
            { value: 2, label: 'More than half the days', score: 2 },
            { value: 3, label: 'Nearly every day', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'GAD7-004',
          questionText: 'Trouble relaxing',
          helpText: 'Over the last 2 weeks, how often have you been bothered by this?',
          category: 'Anxiety Symptoms',
          order: 4,
          questionType: 'single',
          options: [
            { value: 0, label: 'Not at all', score: 0 },
            { value: 1, label: 'Several days', score: 1 },
            { value: 2, label: 'More than half the days', score: 2 },
            { value: 3, label: 'Nearly every day', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'GAD7-005',
          questionText: 'Being so restless that it is hard to sit still',
          helpText: 'Over the last 2 weeks, how often have you been bothered by this?',
          category: 'Anxiety Symptoms',
          order: 5,
          questionType: 'single',
          options: [
            { value: 0, label: 'Not at all', score: 0 },
            { value: 1, label: 'Several days', score: 1 },
            { value: 2, label: 'More than half the days', score: 2 },
            { value: 3, label: 'Nearly every day', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'GAD7-006',
          questionText: 'Becoming easily annoyed or irritable',
          helpText: 'Over the last 2 weeks, how often have you been bothered by this?',
          category: 'Anxiety Symptoms',
          order: 6,
          questionType: 'single',
          options: [
            { value: 0, label: 'Not at all', score: 0 },
            { value: 1, label: 'Several days', score: 1 },
            { value: 2, label: 'More than half the days', score: 2 },
            { value: 3, label: 'Nearly every day', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        },
        {
          questionId: 'GAD7-007',
          questionText: 'Feeling afraid as if something awful might happen',
          helpText: 'Over the last 2 weeks, how often have you been bothered by this?',
          category: 'Anxiety Symptoms',
          order: 7,
          questionType: 'single',
          options: [
            { value: 0, label: 'Not at all', score: 0 },
            { value: 1, label: 'Several days', score: 1 },
            { value: 2, label: 'More than half the days', score: 2 },
            { value: 3, label: 'Nearly every day', score: 3 }
          ],
          scoringType: 'lookup',
          required: true
        }
      ],
      scoring: {
        method: 'sum'
      },
      thresholds: {
        low: 5,
        medium: 10,
        high: 15
      }
    });

    logger.info('Default templates initialized successfully');
  }
}

export const templateService = new TemplateService();
export default templateService;

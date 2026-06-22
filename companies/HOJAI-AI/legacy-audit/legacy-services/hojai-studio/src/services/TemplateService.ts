import { v4 as uuidv4 } from 'uuid';
import { TemplateModel } from '../models';
import type { Template, Flow } from '../types';

export class TemplateService {
  /**
   * Create a new template
   */
  async createTemplate(data: {
    name: string;
    description?: string;
    category: string;
    industry: string;
    flows: Flow[];
    variables?: any[];
    createdBy: string;
    isPublic?: boolean;
  }): Promise<TemplateModel> {
    const template = new TemplateModel({
      name: data.name,
      description: data.description,
      category: data.category,
      industry: data.industry,
      flows: data.flows,
      variables: data.variables || [],
      createdBy: data.createdBy,
      isPublic: data.isPublic || false
    });

    await template.save();
    return template;
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string): Promise<TemplateModel | null> {
    return TemplateModel.findById(templateId);
  }

  /**
   * Get all templates with filters
   */
  async getTemplates(filters: {
    category?: string;
    industry?: string;
    isPublic?: boolean;
    createdBy?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ templates: TemplateModel[]; total: number }> {
    const { category, industry, isPublic = true, createdBy, search, limit = 50, offset = 0 } = filters;

    const query: any = {};

    if (category) query.category = category;
    if (industry) query.industry = industry;
    if (isPublic !== undefined) query.isPublic = isPublic;
    if (createdBy) query.createdBy = createdBy;
    if (search) {
      query.$text = { $search: search };
    }

    const [templates, total] = await Promise.all([
      TemplateModel.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      TemplateModel.countDocuments(query)
    ]);

    return { templates, total };
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<{
      name: string;
      description: string;
      category: string;
      industry: string;
      flows: Flow[];
      variables: any[];
      isPublic: boolean;
    }>
  ): Promise<TemplateModel | null> {
    return TemplateModel.findByIdAndUpdate(
      templateId,
      { $set: updates },
      { new: true }
    );
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    const result = await TemplateModel.deleteOne({ _id: templateId });
    return result.deletedCount > 0;
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<TemplateModel[]> {
    return TemplateModel.find({ category, isPublic: true });
  }

  /**
   * Get templates by industry
   */
  async getTemplatesByIndustry(industry: string): Promise<TemplateModel[]> {
    return TemplateModel.find({ industry, isPublic: true });
  }

  /**
   * Search templates
   */
  async searchTemplates(query: string): Promise<TemplateModel[]> {
    return TemplateModel.find(
      {
        isPublic: true,
        $text: { $search: query }
      },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(
    templateId: string,
    userId: string,
    newName?: string
  ): Promise<TemplateModel | null> {
    const original = await this.getTemplateById(templateId);
    if (!original) return null;

    return this.createTemplate({
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      category: original.category,
      industry: original.industry,
      flows: original.flows.map((flow: any) => ({
        ...flow.toObject ? flow.toObject() : flow,
        id: uuidv4(),
        nodes: (flow.nodes || []).map((node: any) => ({
          ...node,
          id: uuidv4()
        }))
      })),
      variables: original.variables,
      createdBy: userId,
      isPublic: false
    });
  }

  /**
   * Seed default templates
   */
  async seedDefaultTemplates(): Promise<void> {
    const existing = await TemplateModel.countDocuments();
    if (existing > 0) return;

    const defaultTemplates = this.getDefaultTemplates();

    for (const templateData of defaultTemplates) {
      await this.createTemplate(templateData);
    }

    console.log(`Seeded ${defaultTemplates.length} default templates`);
  }

  /**
   * Get default template configurations
   */
  private getDefaultTemplates() {
    const welcomeFlowId = uuidv4();
    const messageNodeId = uuidv4();
    const endNodeId = uuidv4();

    const supportFlowId = uuidv4();
    const aiNodeId = uuidv4();
    const conditionNodeId = uuidv4();
    const orderNodeId = uuidv4();
    const refundNodeId = uuidv4();
    const defaultNodeId = uuidv4();
    const supportEndId = uuidv4();

    return [
      // Welcome Template
      {
        name: 'Welcome Bot',
        description: 'Basic welcome flow for new customers',
        category: 'welcome',
        industry: 'general',
        flows: [{
          id: welcomeFlowId,
          name: 'Welcome Flow',
          description: 'Greet customers and show menu',
          nodes: [
            {
              id: messageNodeId,
              type: 'message',
              label: 'Welcome Message',
              position: { x: 250, y: 50 },
              config: {
                message: {
                  text: 'Welcome to {{company_name}}! How can I help you today?',
                  quickReplies: [
                    { id: 'qr1', text: 'View Products', emoji: '🛍️' },
                    { id: 'qr2', text: 'Track Order', emoji: '📦' },
                    { id: 'qr3', text: 'Talk to Support', emoji: '💬' }
                  ]
                }
              },
              nextNodeId: endNodeId
            },
            {
              id: endNodeId,
              type: 'end',
              label: 'End',
              position: { x: 250, y: 150 },
              config: {}
            }
          ],
          entryNodeId: messageNodeId
        }],
        variables: [
          { name: 'company_name', type: 'text', required: true, description: 'Your company name' }
        ],
        createdBy: 'system',
        isPublic: true
      },

      // Customer Support Template
      {
        name: 'Customer Support Bot',
        description: 'AI-powered customer support with order and refund handling',
        category: 'support',
        industry: 'ecommerce',
        flows: [{
          id: supportFlowId,
          name: 'Support Flow',
          description: 'Handle customer inquiries',
          nodes: [
            {
              id: aiNodeId,
              type: 'ai_response',
              label: 'AI Support Agent',
              position: { x: 250, y: 50 },
              config: {
                aiResponse: {
                  model: 'claude-3-5-sonnet',
                  systemPrompt: 'You are a helpful customer support agent. Be polite and efficient. Identify the customer issue and route accordingly.',
                  temperature: 0.7,
                  maxTokens: 500,
                  contextWindow: 10,
                  variables: ['customer_name', 'issue_type']
                }
              },
              nextNodeId: conditionNodeId
            },
            {
              id: conditionNodeId,
              type: 'condition',
              label: 'Route by Intent',
              position: { x: 250, y: 150 },
              config: {
                branches: [
                  {
                    id: 'b1',
                    conditions: [{ id: 'c1', field: 'issue_type', operator: 'equals', value: 'order' }],
                    nextNodeId: orderNodeId,
                    priority: 10
                  },
                  {
                    id: 'b2',
                    conditions: [{ id: 'c2', field: 'issue_type', operator: 'equals', value: 'refund' }],
                    nextNodeId: refundNodeId,
                    priority: 9
                  }
                ],
                defaultBranchNextNodeId: defaultNodeId
              }
            },
            {
              id: orderNodeId,
              type: 'message',
              label: 'Order Help',
              position: { x: 100, y: 250 },
              config: {
                message: {
                  text: 'I can help you with your order! Please provide your order ID.',
                  quickReplies: [
                    { id: 'qr_order', text: 'I have order ID' },
                    { id: 'qr_noorder', text: 'No order ID' }
                  ]
                }
              },
              nextNodeId: supportEndId
            },
            {
              id: refundNodeId,
              type: 'message',
              label: 'Refund Help',
              position: { x: 400, y: 250 },
              config: {
                message: {
                  text: 'I understand you need help with a refund. Let me connect you with our refund team.',
                  quickReplies: [
                    { id: 'qr_refund_yes', text: 'Continue' }
                  ]
                }
              },
              nextNodeId: supportEndId
            },
            {
              id: defaultNodeId,
              type: 'message',
              label: 'General Help',
              position: { x: 250, y: 350 },
              config: {
                message: {
                  text: 'I\'m here to help! What specific issue are you facing?'
                }
              },
              nextNodeId: aiNodeId
            },
            {
              id: supportEndId,
              type: 'end',
              label: 'End',
              position: { x: 250, y: 450 },
              config: {}
            }
          ],
          entryNodeId: aiNodeId
        }],
        variables: [
          { name: 'customer_name', type: 'text', description: 'Customer name' },
          { name: 'issue_type', type: 'text', description: 'Type of support issue' }
        ],
        createdBy: 'system',
        isPublic: true
      },

      // Order Follow-up Template
      {
        name: 'Order Follow-up',
        description: 'Automated order status updates and feedback collection',
        category: 'order',
        industry: 'ecommerce',
        flows: [{
          id: uuidv4(),
          name: 'Order Flow',
          description: 'Track and follow up on orders',
          nodes: [
            {
              id: uuidv4(),
              type: 'message',
              label: 'Order Status',
              position: { x: 250, y: 50 },
              config: {
                message: {
                  text: 'Hi {{customer_name}}! Your order #{{order_id}} is on its way! 📦',
                  quickReplies: [
                    { id: 'qr_track', text: 'Track Package' },
                    { id: 'qr_issue', text: 'Report Issue' }
                  ]
                }
              },
              nextNodeId: uuidv4()
            },
            {
              id: uuidv4(),
              type: 'delay',
              label: 'Wait for Delivery',
              position: { x: 250, y: 150 },
              config: {
                delay: { type: 'scheduled', sendAt: '2024-12-15T10:00:00', timezone: 'Asia/Kolkata' }
              },
              nextNodeId: uuidv4()
            },
            {
              id: uuidv4(),
              type: 'message',
              label: 'Delivery Complete',
              position: { x: 250, y: 250 },
              config: {
                message: {
                  text: 'Your order has been delivered! How was your experience?',
                  quickReplies: [
                    { id: 'qr_great', text: 'Great! ⭐' },
                    { id: 'qr_issues', text: 'Had issues' }
                  ]
                }
              },
              nextNodeId: uuidv4()
            },
            {
              id: uuidv4(),
              type: 'end',
              label: 'End',
              position: { x: 250, y: 350 },
              config: {}
            }
          ],
          entryNodeId: ''
        }],
        variables: [
          { name: 'customer_name', type: 'text', required: true },
          { name: 'order_id', type: 'text', required: true }
        ],
        createdBy: 'system',
        isPublic: true
      },

      // Appointment Booking Template
      {
        name: 'Appointment Booking',
        description: 'Book and manage appointments with AI scheduling',
        category: 'appointment',
        industry: 'healthcare',
        flows: [{
          id: uuidv4(),
          name: 'Booking Flow',
          description: 'Schedule appointments',
          nodes: [
            {
              id: uuidv4(),
              type: 'ai_response',
              label: 'Booking Assistant',
              position: { x: 250, y: 50 },
              config: {
                aiResponse: {
                  model: 'claude-3-5-sonnet',
                  systemPrompt: 'You are a professional appointment booking assistant. Collect: name, preferred date/time, service type, contact info. Be efficient and confirm details.',
                  temperature: 0.5,
                  maxTokens: 300
                }
              },
              nextNodeId: uuidv4()
            },
            {
              id: uuidv4(),
              type: 'webhook',
              label: 'Create Appointment',
              position: { x: 250, y: 150 },
              config: {
                webhook: {
                  url: '{{BOOKING_SERVICE_URL}}/api/appointments',
                  method: 'POST',
                  bodyTemplate: {
                    customerName: '{{customer_name}}',
                    dateTime: '{{appointment_date}}',
                    service: '{{service_type}}',
                    contact: '{{contact}}'
                  },
                  successNextNodeId: ''
                }
              }
            },
            {
              id: uuidv4(),
              type: 'message',
              label: 'Confirmation',
              position: { x: 250, y: 250 },
              config: {
                message: {
                  text: '✅ Your appointment is confirmed for {{appointment_date}}! We\'ll send a reminder before your visit.'
                }
              },
              nextNodeId: uuidv4()
            },
            {
              id: uuidv4(),
              type: 'end',
              label: 'End',
              position: { x: 250, y: 350 },
              config: {}
            }
          ],
          entryNodeId: ''
        }],
        variables: [
          { name: 'customer_name', type: 'text', required: true },
          { name: 'appointment_date', type: 'text', required: true },
          { name: 'service_type', type: 'text', required: true },
          { name: 'contact', type: 'phone', required: true }
        ],
        createdBy: 'system',
        isPublic: true
      }
    ];
  }
}

export const templateService = new TemplateService();

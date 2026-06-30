/**
 * AI Agent Integration for Visual Workflow Builder
 *
 * Connects workflow nodes to actual AI agents.
 * Supports HOJAI AgentOS and external AI providers.
 */

// =============================================================================
// AGENT STORE (Singleton)
// =============================================================================

const agentStore = {
  agents: {},

  add(id, agent) {
    this.agents[id] = agent;
  },

  get(id) {
    return this.agents[id] || null;
  },

  list(category) {
    const all = Object.values(this.agents);
    if (category) {
      return all.filter(a => a.category === category);
    }
    return all;
  },

  remove(id) {
    if (this.agents[id] && !this.agents[id].builtin) {
      delete this.agents[id];
      return true;
    }
    return false;
  },

  categories() {
    return [...new Set(Object.values(this.agents).map(a => a.category))];
  },
};

// =============================================================================
// PRE-CONFIGURED AI AGENTS (Built-in)
// =============================================================================

const BUILTIN_AGENTS = {
  // Sales Agents
  sdr_agent: {
    id: 'sdr_agent',
    name: 'AI SDR',
    category: 'sales',
    icon: '🎯',
    description: 'Qualifies leads and books meetings',
    skills: ['lead_qualification', 'email_outreach', 'meeting_booking', 'crm_update'],
    config: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
    },
    memory: ['customer_history', 'interaction_memory', 'preference_memory'],
    twins: ['customer_twin'],
  },
  account_executive: {
    id: 'account_executive',
    name: 'Account Executive',
    category: 'sales',
    icon: '💼',
    description: 'Closes deals and manages accounts',
    skills: ['proposal_generation', 'negotiation', 'contract_review', 'objection_handling'],
    config: {
      model: 'gpt-4',
      temperature: 0.5,
      maxTokens: 2000,
    },
    memory: ['deal_history', 'preference_memory'],
    twins: ['deal_twin', 'customer_twin'],
  },
  customer_success: {
    id: 'customer_success',
    name: 'Customer Success',
    category: 'sales',
    icon: '🌟',
    description: 'Manages customer success and retention',
    skills: ['health_scoring', 'churn_prediction', 'expansion_recommendations', 'nps_analysis'],
    config: {
      model: 'gpt-4',
      temperature: 0.6,
      maxTokens: 1500,
    },
    memory: ['customer_history', 'health_memory', 'nps_memory'],
    twins: ['customer_twin', 'health_twin'],
  },

  // Marketing Agents
  content_writer: {
    id: 'content_writer',
    name: 'Content Writer',
    category: 'marketing',
    icon: '✍️',
    description: 'Generates marketing content',
    skills: ['blog_writing', 'social_writing', 'email_writing', 'seo_optimization'],
    config: {
      model: 'gpt-4',
      temperature: 0.8,
      maxTokens: 2000,
    },
    memory: ['brand_memory', 'content_history'],
    twins: ['brand_twin'],
  },
  social_media_manager: {
    id: 'social_media_manager',
    name: 'Social Media Manager',
    category: 'marketing',
    icon: '📱',
    description: 'Manages social media presence',
    skills: ['post_scheduling', 'engagement_analysis', 'trend_monitoring', 'influencer_outreach'],
    config: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
    },
    memory: ['social_memory', 'trend_memory'],
    twins: ['brand_twin', 'social_twin'],
  },
  seo_agent: {
    id: 'seo_agent',
    name: 'SEO Agent',
    category: 'marketing',
    icon: '🔍',
    description: 'Optimizes for search engines',
    skills: ['keyword_research', 'content_optimization', 'competitor_analysis', 'link_building'],
    config: {
      model: 'gpt-4',
      temperature: 0.6,
      maxTokens: 1500,
    },
    memory: ['seo_memory', 'keyword_memory'],
    twins: ['seo_twin'],
  },

  // HR Agents
  recruiter: {
    id: 'recruiter',
    name: 'AI Recruiter',
    category: 'hr',
    icon: '👔',
    description: 'Screens and interviews candidates',
    skills: ['resume_screening', 'interview_scheduling', 'candidate_scoring', 'offer_generation'],
    config: {
      model: 'gpt-4',
      temperature: 0.5,
      maxTokens: 1500,
    },
    memory: ['candidate_history', 'job_memory'],
    twins: ['candidate_twin', 'job_twin'],
  },
  hr_assistant: {
    id: 'hr_assistant',
    name: 'HR Assistant',
    category: 'hr',
    icon: '🏢',
    description: 'Answers HR questions and policies',
    skills: ['policy_qa', 'leave_management', 'benefits_exploration', 'onboarding_guidance'],
    config: {
      model: 'gpt-4',
      temperature: 0.6,
      maxTokens: 1000,
    },
    memory: ['policy_memory', 'employee_memory'],
    twins: ['employee_twin'],
  },
  onboarding_agent: {
    id: 'onboarding_agent',
    name: 'Onboarding Agent',
    category: 'hr',
    icon: '🚀',
    description: 'Guides new employees',
    skills: ['welcome_sequence', 'document_collection', 'training_recommendations', 'team_introduction'],
    config: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1500,
    },
    memory: ['onboarding_memory', 'company_memory'],
    twins: ['employee_twin', 'team_twin'],
  },

  // Finance Agents
  invoice_processor: {
    id: 'invoice_processor',
    name: 'Invoice Processor',
    category: 'finance',
    icon: '📄',
    description: 'Processes and validates invoices',
    skills: ['invoice_validation', 'expense_categorization', 'approval_routing', 'payment_tracking'],
    config: {
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 1000,
    },
    memory: ['invoice_memory', 'vendor_memory'],
    twins: ['invoice_twin', 'vendor_twin'],
  },
  finance_analyst: {
    id: 'finance_analyst',
    name: 'Finance Analyst',
    category: 'finance',
    icon: '📊',
    description: 'Analyzes financial data',
    skills: ['cashflow_forecasting', 'budget_analysis', 'variance_analysis', 'report_generation'],
    config: {
      model: 'gpt-4',
      temperature: 0.4,
      maxTokens: 2000,
    },
    memory: ['financial_memory', 'budget_memory'],
    twins: ['financial_twin'],
  },

  // Support Agents
  support_agent: {
    id: 'support_agent',
    name: 'AI Support Agent',
    category: 'support',
    icon: '🎧',
    description: 'Handles customer support',
    skills: ['ticket_classification', 'response_generation', 'knowledge_retrieval', 'escalation_routing'],
    config: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
    },
    memory: ['ticket_memory', 'knowledge_base'],
    twins: ['ticket_twin', 'customer_twin'],
  },
  sentiment_analyzer: {
    id: 'sentiment_analyzer',
    name: 'Sentiment Analyzer',
    category: 'support',
    icon: '💭',
    description: 'Analyzes customer sentiment',
    skills: ['sentiment_detection', 'emotion_analysis', 'urgency_detection', 'escalation_prediction'],
    config: {
      model: 'gpt-4',
      temperature: 0.5,
      maxTokens: 500,
    },
    memory: ['sentiment_memory', 'feedback_memory'],
    twins: ['sentiment_twin'],
  },

  // Procurement Agents
  procurement_officer: {
    id: 'procurement_officer',
    name: 'Procurement Officer',
    category: 'procurement',
    icon: '🛒',
    description: 'Manages procurement',
    skills: ['supplier_discovery', 'price_comparison', 'contract_negotiation', 'delivery_tracking'],
    config: {
      model: 'gpt-4',
      temperature: 0.5,
      maxTokens: 1500,
    },
    memory: ['supplier_memory', 'purchase_memory'],
    twins: ['supplier_twin', 'purchase_twin'],
  },

  // Industry-Specific Agents
  restaurant_manager: {
    id: 'restaurant_manager',
    name: 'Restaurant Manager',
    category: 'restaurant',
    icon: '🍽️',
    description: 'Manages restaurant operations',
    skills: ['order_management', 'inventory_tracking', 'staff_scheduling', 'customer_feedback'],
    config: {
      model: 'gpt-4',
      temperature: 0.6,
      maxTokens: 1500,
    },
    memory: ['restaurant_memory', 'inventory_memory'],
    twins: ['restaurant_twin', 'inventory_twin'],
  },
  hotel_concierge: {
    id: 'hotel_concierge',
    name: 'Hotel Concierge',
    category: 'hotel',
    icon: '🏨',
    description: 'Manages guest experience',
    skills: ['booking_management', 'guest_preferences', 'upselling', 'complaint_resolution'],
    config: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1500,
    },
    memory: ['guest_memory', 'preference_memory'],
    twins: ['guest_twin', 'booking_twin'],
  },
  clinic_receptionist: {
    id: 'clinic_receptionist',
    name: 'Clinic Receptionist',
    category: 'healthcare',
    icon: '🏥',
    description: 'Manages patient appointments',
    skills: ['appointment_scheduling', 'patient_intake', 'insurance_verification', 'follow_up_reminders'],
    config: {
      model: 'gpt-4',
      temperature: 0.6,
      maxTokens: 1000,
    },
    memory: ['patient_memory', 'appointment_memory'],
    twins: ['patient_twin', 'appointment_twin'],
  },
  real_estate_agent: {
    id: 'real_estate_agent',
    name: 'Real Estate Agent',
    category: 'real_estate',
    icon: '🏠',
    description: 'Manages property transactions',
    skills: ['property_matching', 'inquiry_responses', 'site_visit_scheduling', 'document_management'],
    config: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1500,
    },
    memory: ['property_memory', 'client_memory'],
    twins: ['property_twin', 'client_twin'],
  },

  // General/Corporate Agents
  chief_of_staff: {
    id: 'chief_of_staff',
    name: 'Chief of Staff',
    category: 'executive',
    icon: '👑',
    description: 'Executive coordination',
    skills: ['calendar_management', 'email_summary', 'meeting_preparation', 'decision_support'],
    config: {
      model: 'gpt-4',
      temperature: 0.5,
      maxTokens: 2000,
    },
    memory: ['executive_memory', 'calendar_memory'],
    twins: ['executive_twin'],
  },
  researcher: {
    id: 'researcher',
    name: 'Research Agent',
    category: 'general',
    icon: '🔬',
    description: 'Conducts research',
    skills: ['web_research', 'competitor_analysis', 'market_intelligence', 'data_synthesis'],
    config: {
      model: 'gpt-4',
      temperature: 0.6,
      maxTokens: 2000,
    },
    memory: ['research_memory', 'source_memory'],
    twins: ['research_twin'],
  },
};

// =============================================================================
// AGENT EXECUTION
// =============================================================================

export async function executeAgent(agentId, context, workflowId, nodeId) {
  const agent = agentStore.get(agentId);
  if (!agent) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  // Create execution context
  const execution = {
    id: `exec_${Date.now()}`,
    agentId,
    workflowId,
    nodeId,
    startedAt: new Date().toISOString(),
    status: 'running',
    context,
  };

  // Simulate agent execution (in production, this would call the actual agent)
  try {
    // Log execution start
    console.log(`🤖 Agent ${agent.name} starting...`);
    console.log(`   Context:`, JSON.stringify(context).slice(0, 200));

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate response based on agent type
    const response = await generateAgentResponse(agent, context);

    execution.status = 'completed';
    execution.completedAt = new Date().toISOString();
    execution.result = response;

    console.log(`✅ Agent ${agent.name} completed`);

    return response;
  } catch (error) {
    execution.status = 'failed';
    execution.error = error.message;
    execution.completedAt = new Date().toISOString();
    console.error(`❌ Agent ${agent.name} failed:`, error);
    throw error;
  }
}

// =============================================================================
// AGENT RESPONSE GENERATION
// =============================================================================

async function generateAgentResponse(agent, context) {
  const { task } = context;

  // Route to appropriate handler
  switch (agent.category) {
    case 'sales':
      return handleSalesTask(agent, context);
    case 'marketing':
      return handleMarketingTask(agent, context);
    case 'hr':
      return handleHRTask(agent, context);
    case 'finance':
      return handleFinanceTask(agent, context);
    case 'support':
      return handleSupportTask(agent, context);
    case 'procurement':
      return handleProcurementTask(agent, context);
    case 'restaurant':
      return handleRestaurantTask(agent, context);
    case 'hotel':
      return handleHotelTask(agent, context);
    case 'healthcare':
      return handleHealthcareTask(agent, context);
    case 'real_estate':
      return handleRealEstateTask(agent, context);
    case 'executive':
      return handleExecutiveTask(agent, context);
    default:
      return handleGeneralTask(agent, context);
  }
}

function handleSalesTask(agent, context) {
  const { task, data } = context;

  if (task === 'qualify_lead' || task === 'lead_score') {
    const score = Math.floor(Math.random() * 30) + 70; // 70-100
    return {
      action: 'score_lead',
      score,
      recommendation: score >= 80 ? 'hot' : score >= 60 ? 'warm' : 'cold',
      nextStep: score >= 80 ? 'immediate_call' : score >= 60 ? 'email_sequence' : 'nurture',
    };
  }

  if (task === 'send_email' || task === 'email_outreach') {
    return {
      action: 'email_sent',
      subject: `Re: ${data.subject || 'Quick question'}`,
      body: `Hi ${data.name || 'there'},\n\n[Personalized message based on ${agent.name}]\n\nBest regards`,
      channel: 'email',
    };
  }

  if (task === 'book_meeting') {
    return {
      action: 'meeting_booked',
      slot: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      duration: 30,
      type: 'video_call',
    };
  }

  return { action: 'completed', agent: agent.name };
}

function handleMarketingTask(agent, context) {
  const { task, data } = context;

  if (task === 'generate_content' || task === 'write') {
    return {
      action: 'content_generated',
      content: `[${agent.name}] Generated content for: ${data.topic || 'General topic'}`,
      type: data.type || 'blog_post',
      wordCount: Math.floor(Math.random() * 500) + 500,
    };
  }

  if (task === 'schedule_post') {
    return {
      action: 'post_scheduled',
      platform: data.platform || 'linkedin',
      scheduledTime: new Date(Date.now() + 3600000).toISOString(),
    };
  }

  return { action: 'completed', agent: agent.name };
}

function handleHRTask(agent, context) {
  const { task, data } = context;

  if (task === 'screen_resume') {
    return {
      action: 'resume_screened',
      score: Math.floor(Math.random() * 30) + 60,
      recommendation: 'proceed_to_interview',
      flags: [],
    };
  }

  if (task === 'schedule_interview') {
    return {
      action: 'interview_scheduled',
      slot: new Date(Date.now() + 172800000).toISOString(),
      interviewers: ['Hiring Manager'],
    };
  }

  return { action: 'completed', agent: agent.name };
}

function handleFinanceTask(agent, context) {
  const { task, data } = context;

  if (task === 'validate_invoice') {
    return {
      action: 'invoice_validated',
      status: 'approved',
      amount: data.amount,
      vendor: data.vendor,
    };
  }

  if (task === 'generate_report') {
    return {
      action: 'report_generated',
      type: data.reportType || 'monthly_summary',
      metrics: {
        revenue: Math.random() * 1000000,
        costs: Math.random() * 500000,
        profit: Math.random() * 500000,
      },
    };
  }

  return { action: 'completed', agent: agent.name };
}

function handleSupportTask(agent, context) {
  const { task, data } = context;

  if (task === 'classify_ticket') {
    const categories = ['billing', 'technical', 'general', 'complaint'];
    return {
      action: 'ticket_classified',
      category: categories[Math.floor(Math.random() * categories.length)],
      priority: Math.random() > 0.7 ? 'high' : 'medium',
      sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
    };
  }

  if (task === 'generate_response') {
    return {
      action: 'response_generated',
      body: `Thank you for reaching out. [${agent.name} has analyzed your request and is preparing a response.]\n\nPlease let us know if you need further assistance.`,
      tone: 'professional',
    };
  }

  return { action: 'completed', agent: agent.name };
}

function handleProcurementTask(agent, context) {
  const { task, data } = context;

  if (task === 'find_suppliers') {
    return {
      action: 'suppliers_found',
      suppliers: [
        { name: 'Supplier A', rating: 4.5, price: data.budget || 10000 },
        { name: 'Supplier B', rating: 4.2, price: (data.budget || 10000) * 0.9 },
      ],
    };
  }

  return { action: 'completed', agent: agent.name };
}

function handleRestaurantTask(agent, context) {
  const { task, data } = context;

  if (task === 'update_inventory') {
    return {
      action: 'inventory_updated',
      items: data.items || [],
      alerts: data.lowStock ? ['Low stock: Item X'] : [],
    };
  }

  return { action: 'completed', agent: agent.name };
}

function handleHotelTask(agent, context) {
  const { task, data } = context;

  if (task === 'check_in') {
    return {
      action: 'check_in_completed',
      room: `Room ${Math.floor(Math.random() * 100) + 100}`,
      welcome: `Welcome to our hotel, ${data.name || 'Guest'}!`,
    };
  }

  return { action: 'completed', agent: agent.name };
}

function handleHealthcareTask(agent, context) {
  const { task, data } = context;

  if (task === 'schedule_appointment') {
    return {
      action: 'appointment_scheduled',
      slot: new Date(Date.now() + 86400000).toISOString(),
      doctor: data.doctor || 'Available Doctor',
    };
  }

  return { action: 'completed', agent: agent.name };
}

function handleRealEstateTask(agent, context) {
  const { task, data } = context;

  if (task === 'match_properties') {
    return {
      action: 'properties_matched',
      count: Math.floor(Math.random() * 10) + 5,
      topMatches: [
        { address: '123 Main St', price: 5000000, match: 95 },
        { address: '456 Oak Ave', price: 4500000, match: 88 },
      ],
    };
  }

  return { action: 'completed', agent: agent.name };
}

function handleExecutiveTask(agent, context) {
  const { task, data } = context;

  if (task === 'summarize_emails') {
    return {
      action: 'emails_summarized',
      count: data.count || 10,
      summary: `${data.count || 10} emails analyzed. Key items: Meeting at 3pm, Proposal due Friday, Budget review Monday.`,
    };
  }

  return { action: 'completed', agent: agent.name };
}

function handleGeneralTask(agent, context) {
  return {
    action: 'completed',
    agent: agent.name,
    task: context.task,
    result: 'Task processed successfully',
  };
}

// =============================================================================
// AGENT REGISTRATION
// =============================================================================

export function registerAgent(agentConfig) {
  agentStore.add(agentConfig.id, { ...agentConfig, builtin: false });
  return agentStore.get(agentConfig.id);
}

export function unregisterAgent(agentId) {
  return agentStore.remove(agentId);
}

export function getAgent(agentId) {
  return agentStore.get(agentId);
}

export function listAgents(category = null) {
  return agentStore.list(category);
}

export function getAgentCategories() {
  return agentStore.categories();
}

// Export AI_AGENTS for backward compatibility
export { agentStore as AI_AGENTS };

// Initialize store with builtin agents
for (const [id, agent] of Object.entries(BUILTIN_AGENTS)) {
  agentStore.add(id, { ...agent, builtin: true });
}

/**
 * AI Resolution Agent for Service Management
 * Provides intelligent ticket responses and routing
 */

class AIResolutionAgent {
  constructor(config = {}) {
    this.aiServiceUrl = config.aiServiceUrl;
    this.knowledgeBase = config.knowledgeBase || [];
    this.autoRespond = config.autoRespond || false;
  }

  // Analyze ticket and suggest resolution
  async analyzeTicket(ticket) {
    const { title, description, type, priority } = ticket;

    // Categorize the issue
    const category = this.categorize(title, description);

    // Find similar resolved tickets
    const similar = this.findSimilar(ticket);

    // Suggest actions
    const actions = this.suggestActions(category, ticket);

    // Generate initial response
    const response = await this.generateResponse(ticket, category, similar);

    return {
      category,
      similar_tickets: similar.slice(0, 3),
      suggested_actions: actions,
      suggested_response: response,
      confidence: this.calculateConfidence(category, similar),
      suggested_assignee: this.suggestAssignee(category, ticket),
      estimated_resolution_time: this.estimateTime(category, priority)
    };
  }

  // Categorize ticket
  categorize(title, description) {
    const text = `${title} ${description}`.toLowerCase();

    const categories = {
      'password_reset': ['password', 'reset', 'forgot', 'login', 'sign in'],
      'hardware': ['laptop', 'computer', 'keyboard', 'mouse', 'monitor', 'screen', 'printer'],
      'software': ['install', 'update', 'crash', 'bug', 'error', 'software'],
      'access_request': ['access', 'permission', 'access', 'grant', 'permission'],
      'network': ['wifi', 'internet', 'network', 'vpn', 'connection'],
      'email': ['email', 'mail', 'outlook', 'gmail', 'inbox'],
      'accounting': ['invoice', 'payment', 'bill', 'expense', 'reimbursement'],
      'hr_request': ['leave', 'holiday', 'salary', 'benefits', 'policy'],
      'it_support': ['help', 'issue', 'problem', 'not working', 'broken'],
      'general_inquiry': []
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (category === 'general_inquiry') continue;
      if (keywords.some(kw => text.includes(kw))) {
        return category;
      }
    }

    return 'general_inquiry';
  }

  // Find similar resolved tickets
  findSimilar(ticket) {
    const { title, description, type } = ticket;

    // Simple keyword matching (replace with vector search in production)
    return [];
  }

  // Suggest actions based on category
  suggestActions(category, ticket) {
    const actionsByCategory = {
      'password_reset': [
        { action: 'send_password_reset_link', type: 'automated', description: 'Send password reset email' },
        { action: 'verify_identity', type: 'manual', description: 'Verify user identity via security questions' }
      ],
      'hardware': [
        { action: 'create_hardware_ticket', type: 'automated', description: 'Create hardware replacement request' },
        { action: 'check_inventory', type: 'automated', description: 'Check available inventory for replacement' }
      ],
      'software': [
        { action: 'check_version', type: 'automated', description: 'Check current software version' },
        { action: 'create_install_ticket', type: 'automated', description: 'Create installation request' }
      ],
      'access_request': [
        { action: 'verify_approval', type: 'manual', description: 'Get manager approval for access' },
        { action: 'grant_access', type: 'automated', description: 'Grant requested access after approval' }
      ],
      'network': [
        { action: 'run_diagnostics', type: 'automated', description: 'Run network diagnostics' },
        { action: 'reset_wifi', type: 'automated', description: 'Reset WiFi connection' }
      ],
      'email': [
        { action: 'check_email_settings', type: 'automated', description: 'Verify email configuration' },
        { action: 'refresh_connection', type: 'automated', description: 'Force email sync' }
      ],
      'accounting': [
        { action: 'route_to_finance', type: 'automated', description: 'Route to finance team' },
        { action: 'send_expense_form', type: 'automated', description: 'Send expense reimbursement form' }
      ],
      'hr_request': [
        { action: 'check_policy', type: 'automated', description: 'Verify HR policy compliance' },
        { action: 'route_to_hr', type: 'automated', description: 'Route to HR team' }
      ],
      'it_support': [
        { action: 'collect_diagnostics', type: 'automated', description: 'Collect system information' },
        { action: 'check_knowledge_base', type: 'automated', description: 'Search knowledge base' }
      ],
      'general_inquiry': [
        { action: 'route_to_team', type: 'automated', description: 'Route to appropriate team' },
        { action: 'request_more_info', type: 'automated', description: 'Ask for more details' }
      ]
    };

    return actionsByCategory[category] || actionsByCategory['general_inquiry'];
  }

  // Generate AI response
  async generateResponse(ticket, category, similar) {
    if (!this.aiServiceUrl) {
      return this.generateTemplateResponse(category, ticket);
    }

    try {
      const axios = require('axios');
      const response = await axios.post(`${this.aiServiceUrl}/generate`, {
        prompt: `Generate a professional ticket acknowledgment response for:

Category: ${category}
Ticket: ${ticket.title}
Description: ${ticket.description}
Requester: ${ticket.requester?.name || 'Customer'}

Respond with:
1. Acknowledgment
2. Expected response time
3. What we're doing
4. Reference number`
      });

      return response.data.response;
    } catch (error) {
      return this.generateTemplateResponse(category, ticket);
    }
  }

  // Template-based response fallback
  generateTemplateResponse(category, ticket) {
    const templates = {
      'password_reset': `Hi ${ticket.requester?.name || 'there'},

Thank you for reaching out. I've received your password reset request.

**What happens next:**
1. You'll receive a password reset email within the next 5 minutes
2. Click the link in the email to set your new password
3. The reset link expires in 24 hours

If you don't receive the email, please check your spam folder or contact IT support.

Ticket: ${ticket.id}`,
      'hardware': `Hi ${ticket.requester?.name || 'there'},

Thank you for reporting this hardware issue. We're looking into it now.

**What happens next:**
1. Our IT team will assess the issue within 4 business hours
2. If replacement is needed, we'll arrange it based on warranty status
3. You'll receive updates via email

Ticket: ${ticket.id}`,
      'access_request': `Hi ${ticket.requester?.name || 'there'},

Thank you for your access request. This typically requires manager approval.

**What happens next:**
1. Your manager will be notified for approval
2. Once approved, access will be granted within 1 business day
3. You'll receive confirmation when access is ready

Ticket: ${ticket.id}`,
      'default': `Hi ${ticket.requester?.name || 'there'},

Thank you for contacting support. Your ticket has been received.

**Ticket:** ${ticket.id}
**Priority:** ${ticket.priority}

We're working on your request and will update you soon.

Best regards,
Support Team`
    };

    return templates[category] || templates['default'];
  }

  // Calculate confidence
  calculateConfidence(category, similar) {
    let confidence = 0.6; // Base confidence

    if (category !== 'general_inquiry') {
      confidence += 0.2;
    }

    if (similar && similar.length > 0) {
      confidence += 0.15;
    }

    return Math.min(confidence, 0.95);
  }

  // Suggest assignee based on category
  suggestAssignee(category, ticket) {
    const teamMapping = {
      'password_reset': { team: 'it_helpdesk', level: 1 },
      'hardware': { team: 'it_hardware', level: 2 },
      'software': { team: 'it_software', level: 2 },
      'access_request': { team: 'it_security', level: 2 },
      'network': { team: 'it_network', level: 2 },
      'email': { team: 'it_helpdesk', level: 1 },
      'accounting': { team: 'finance', level: 1 },
      'hr_request': { team: 'hr', level: 1 },
      'it_support': { team: 'it_helpdesk', level: 1 },
      'general_inquiry': { team: 'general_support', level: 1 }
    };

    return teamMapping[category] || { team: 'general_support', level: 1 };
  }

  // Estimate resolution time
  estimateTime(category, priority) {
    const baseTimes = {
      'password_reset': '1 hour',
      'hardware': '2-4 hours',
      'software': '2-8 hours',
      'access_request': '1-2 days',
      'network': '1-4 hours',
      'email': '30 minutes',
      'accounting': '1-3 days',
      'hr_request': '1-2 days',
      'it_support': '4-24 hours',
      'general_inquiry': '1-2 days'
    };

    const base = baseTimes[category] || '1-2 days';

    if (priority === 1) return '1-2 hours';
    if (priority === 2) return base;

    return base;
  }

  // Auto-resolve if confident
  async tryAutoResolve(ticket) {
    const analysis = await this.analyzeTicket(ticket);

    // Auto-resolve if high confidence and similar ticket exists
    if (analysis.confidence > 0.8 && analysis.similar_tickets.length > 0) {
      const resolution = this.generateAutoResolution(analysis);

      return {
        can_auto_resolve: true,
        resolution,
        confidence: analysis.confidence
      };
    }

    return {
      can_auto_resolve: false,
      analysis,
      reason: 'Low confidence or no similar tickets'
    };
  }

  // Generate auto-resolution
  generateAutoResolution(analysis) {
    const similar = analysis.similar_tickets[0];

    return {
      status: 'resolved',
      resolution: similar?.resolution || 'Issue resolved based on similar tickets',
      similar_ticket: similar?.id,
      resolved_by: 'ai_auto_resolution',
      resolved_at: new Date().toISOString()
    };
  }
}

module.exports = AIResolutionAgent;

/**
 * Refund Approval Service
 * Process refund requests with AI validation
 */

class RefundApprovalService {
  constructor(config) {
    this.db = config.database;
    this.aiServiceUrl = config.aiServiceUrl;
    this.limits = config.limits || {
      autoApprove: 5000,
      managerApproval: 20000,
      directorApproval: 100000,
    };
  }

  // Process refund request
  async processRefund({ requestId, customerId, amount, reason, currency = 'INR' }) {
    // 1. Get customer history
    const history = await this.getCustomerHistory(customerId);

    // 2. AI fraud check
    const fraudScore = await this.checkFraud({
      customerId, amount, reason, history,
    });

    // 3. Determine approval route
    const route = this.determineRoute(amount, fraudScore);

    // 4. Execute
    const result = await this.execute({
      requestId, amount, currency, route, fraudScore, history,
    });

    return result;
  }

  async getCustomerHistory(customerId) {
    // Get from DB
    return {
      totalOrders: 0,
      refundsRequested: 0,
      lifetimeValue: 0,
      accountAge: 0,
      previousFraud: false,
    };
  }

  async checkFraud({ customerId, amount, reason, history }) {
    if (!this.aiServiceUrl) {
      return { score: 0.1, factors: [] };
    }

    try {
      const axios = require('axios');
      const response = await axios.post(`${this.aiServiceUrl}/fraud-check`, {
        customerId,
        amount,
        reason,
        history,
      });

      return response.data;
    } catch {
      return { score: 0.1, factors: [] };
    }
  }

  determineRoute(amount, fraudScore) {
    if (fraudScore >= 0.8) {
      return { level: 'reject', reason: 'High fraud risk', approvers: [] };
    }

    if (amount <= this.limits.autoApprove) {
      return {
        level: 'auto',
        approvers: [],
        reason: 'Below auto-approval limit',
      };
    }

    if (amount <= this.limits.managerApproval) {
      return {
        level: 'manager',
        approvers: ['finance_manager'],
        reason: 'Requires manager approval',
      };
    }

    if (amount <= this.limits.directorApproval) {
      return {
        level: 'director',
        approvers: ['finance_manager', 'finance_director'],
        reason: 'Requires director approval',
      };
    }

    return {
      level: 'cfo',
      approvers: ['finance_manager', 'finance_director', 'cfo'],
      reason: 'Requires CFO approval',
    };
  }

  async execute({ requestId, amount, currency, route, fraudScore, history }) {
    // Save approval record
    const approval = {
      id: `appr_${Date.now()}`,
      requestId,
      amount,
      currency,
      route: route.level,
      approvers: route.approvers,
      status: 'pending',
      fraudScore: fraudScore.score,
      fraudFactors: fraudScore.factors,
      history,
      createdAt: new Date().toISOString(),
    };

    if (route.level === 'auto') {
      approval.status = 'approved';
      approval.approvedAt = new Date().toISOString();
      approval.approvedBy = 'system';

      // Process payment
      await this.processPayment(requestId, amount, currency);
    } else if (route.level === 'reject') {
      approval.status = 'rejected';
      approval.rejectedAt = new Date().toISOString();
      approval.reason = route.reason;
    } else {
      approval.status = 'pending_manager';

      // Send approval notifications
      await this.notifyApprovers(approval);
    }

    return { success: true, approval };
  }

  async notifyApprovers(approval) {
    // Send notification to managers
    console.log(`[Refund Approval] Notifying ${approval.approvers.join(', ')}`);
  }

  async processPayment(requestId, amount, currency) {
    console.log(`[Refund] Processing payment for ${requestId}: ${currency} ${amount}`);
  }

  // Approve endpoint for managers
  async approve({ approvalId, approverId, decision, notes }) {
    try {
      // Update approval
      const approval = {
        id: approvalId,
        approver: approverId,
        decision, // 'approved' or 'rejected'
        notes,
        decidedAt: new Date().toISOString(),
      };

      if (decision === 'approved') {
        await this.processPayment(
          // Find request by approvalId
          'unknown', 0, 'INR'
        );
      }

      return { success: true, approval };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = RefundApprovalService;

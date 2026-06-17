import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Workflow } from './models/Workflow';

dotenv.config();

const sampleWorkflows = [
  {
    workflowId: 'WF-RETAIL-REFUND-001',
    name: 'Retail Refund Processing',
    industry: 'retail',
    description: 'Standard refund workflow for retail orders including validation, approval, and processing',
    category: 'refund',
    steps: [
      { order: 1, action: 'validate_order', description: 'Verify order exists and refund eligibility', assignee: 'system' },
      { order: 2, action: 'check_inventory', description: 'Verify returned items', assignee: 'warehouse' },
      { order: 3, action: 'approve_refund', condition: 'amount > 500', assignee: 'manager' },
      { order: 4, action: 'process_refund', description: 'Process payment refund', assignee: 'finance' },
      { order: 5, action: 'send_confirmation', description: 'Email refund confirmation', assignee: 'system' },
    ],
    installs: 245,
    isFeatured: true,
    author: 'RTMN Team',
    version: '2.1.0',
    tags: ['refund', 'retail', 'e-commerce', 'payment'],
  },
  {
    workflowId: 'WF-RESTAURANT-RESERVE-001',
    name: 'Restaurant Table Reservation',
    industry: 'restaurant',
    description: 'Complete table reservation workflow with confirmation and reminders',
    category: 'onboarding',
    steps: [
      { order: 1, action: 'check_availability', description: 'Check table availability', assignee: 'system' },
      { order: 2, action: 'create_reservation', description: 'Book the table', assignee: 'host' },
      { order: 3, action: 'send_confirmation', description: 'Send SMS/email confirmation', assignee: 'system' },
      { order: 4, action: 'send_reminder', description: 'Send reminder 2 hours before', assignee: 'system' },
    ],
    installs: 189,
    isFeatured: true,
    author: 'RTMN Team',
    version: '1.5.0',
    tags: ['reservation', 'restaurant', 'booking'],
  },
  {
    workflowId: 'WF-HOTEL-CANCEL-001',
    name: 'Hotel Booking Cancellation',
    industry: 'hotel',
    description: 'Handle hotel booking cancellations with policy checks and refunds',
    category: 'cancellation',
    steps: [
      { order: 1, action: 'validate_cancellation', description: 'Check cancellation policy', assignee: 'system' },
      { order: 2, action: 'calculate_refund', description: 'Calculate refund amount based on policy', assignee: 'system' },
      { order: 3, action: 'notify_housekeeping', description: 'Mark room as available', assignee: 'housekeeping' },
      { order: 4, action: 'process_refund', condition: 'refund_amount > 0', assignee: 'finance' },
      { order: 5, action: 'send_confirmation', description: 'Email cancellation details', assignee: 'system' },
    ],
    installs: 156,
    isFeatured: false,
    author: 'RTMN Team',
    version: '1.2.0',
    tags: ['cancellation', 'hotel', 'booking', 'refund'],
  },
  {
    workflowId: 'WF-HEALTHCARE-APPOINT-001',
    name: 'Healthcare Appointment Scheduling',
    industry: 'healthcare',
    description: 'Book, confirm, and manage healthcare appointments',
    category: 'onboarding',
    steps: [
      { order: 1, action: 'check_doctor_availability', description: 'Get available slots', assignee: 'system' },
      { order: 2, action: 'create_appointment', description: 'Book the slot', assignee: 'reception' },
      { order: 3, action: 'send_reminders', description: 'Schedule SMS reminders', assignee: 'system' },
      { order: 4, action: 'prepare_records', description: 'Prepare patient records', assignee: 'nurse' },
    ],
    installs: 312,
    isFeatured: true,
    author: 'RTMN Team',
    version: '3.0.0',
    tags: ['appointment', 'healthcare', 'scheduling'],
  },
  {
    workflowId: 'WF-INSURANCE-CLAIM-001',
    name: 'Insurance Claim Processing',
    industry: 'insurance',
    description: 'Process insurance claims from submission to resolution',
    category: 'claim',
    steps: [
      { order: 1, action: 'validate_claim', description: 'Check claim eligibility', assignee: 'claims_agent' },
      { order: 2, action: 'gather_documents', description: 'Request additional documents', assignee: 'system' },
      { order: 3, action: 'assess_damage', description: 'Review claim details', assignee: 'adjuster' },
      { order: 4, action: 'calculate_payout', description: 'Determine payout amount', assignee: 'underwriter' },
      { order: 5, action: 'approve_claim', condition: 'amount > 10000', assignee: 'manager' },
      { order: 6, action: 'process_payment', description: 'Release payment', assignee: 'finance' },
    ],
    installs: 98,
    isFeatured: true,
    author: 'RTMN Team',
    version: '2.0.0',
    tags: ['claim', 'insurance', 'payout', 'approval'],
  },
  {
    workflowId: 'WF-FITNESS-UPGRADE-001',
    name: 'Fitness Membership Upgrade',
    industry: 'fitness',
    description: 'Handle gym membership upgrades and plan changes',
    category: 'upgrade',
    steps: [
      { order: 1, action: 'check_current_plan', description: 'Get current membership details', assignee: 'system' },
      { order: 2, action: 'show_upgrade_options', description: 'Display available plans', assignee: 'system' },
      { order: 3, action: 'process_payment', description: 'Charge difference amount', assignee: 'finance' },
      { order: 4, action: 'update_membership', description: 'Apply new plan', assignee: 'system' },
      { order: 5, action: 'send_confirmation', description: 'Email new membership details', assignee: 'system' },
    ],
    installs: 87,
    isFeatured: false,
    author: 'RTMN Team',
    version: '1.0.0',
    tags: ['upgrade', 'fitness', 'membership', 'payment'],
  },
  {
    workflowId: 'WF-BEAUTY-BOOK-001',
    name: 'Beauty Salon Booking',
    industry: 'beauty',
    description: 'Book beauty services with staff assignment and reminders',
    category: 'onboarding',
    steps: [
      { order: 1, action: 'check_availability', description: 'Check stylist availability', assignee: 'system' },
      { order: 2, action: 'book_slot', description: 'Reserve appointment', assignee: 'reception' },
      { order: 3, action: 'assign_stylist', description: 'Assign available stylist', assignee: 'manager' },
      { order: 4, action: 'send_confirmation', description: 'Send booking confirmation', assignee: 'system' },
    ],
    installs: 134,
    isFeatured: false,
    author: 'RTMN Team',
    version: '1.1.0',
    tags: ['booking', 'beauty', 'salon', 'appointment'],
  },
  {
    workflowId: 'WF-REALESTATE-LEAD-001',
    name: 'Real Estate Lead Follow-up',
    industry: 'realestate',
    description: 'Automated lead qualification and follow-up workflow',
    category: 'support',
    steps: [
      { order: 1, action: 'capture_lead', description: 'Record lead information', assignee: 'system' },
      { order: 2, action: 'score_lead', description: 'Calculate lead score', assignee: 'system' },
      { order: 3, action: 'assign_agent', condition: 'score > 70', assignee: 'manager' },
      { order: 4, action: 'send_intro', description: 'Send introduction message', assignee: 'agent' },
      { order: 5, action: 'schedule_followup', description: 'Schedule next contact', assignee: 'system' },
    ],
    installs: 203,
    isFeatured: true,
    author: 'RTMN Team',
    version: '2.5.0',
    tags: ['lead', 'realestate', 'crm', 'followup'],
  },
  {
    workflowId: 'WF-SUPPORT-TICKET-001',
    name: 'Customer Support Ticket',
    industry: 'general',
    description: 'Standard customer support ticket workflow from intake to resolution',
    category: 'support',
    steps: [
      { order: 1, action: 'create_ticket', description: 'Log support request', assignee: 'system' },
      { order: 2, action: 'categorize_issue', description: 'Tag and categorize', assignee: 'support_agent' },
      { order: 3, action: 'assign_priority', description: 'Set urgency level', assignee: 'system' },
      { order: 4, action: 'resolve_issue', description: 'Address customer concern', assignee: 'support_agent' },
      { order: 5, action: 'send_survey', description: 'Request feedback', assignee: 'system' },
    ],
    installs: 456,
    isFeatured: true,
    author: 'RTMN Team',
    version: '3.2.0',
    tags: ['support', 'ticket', 'customer-service', 'helpdesk'],
  },
  {
    workflowId: 'WF-LOYALTY-REWARD-001',
    name: 'Loyalty Points Redemption',
    industry: 'retail',
    description: 'Process loyalty points redemption and reward fulfillment',
    category: 'loyalty',
    steps: [
      { order: 1, action: 'verify_points', description: 'Check available points', assignee: 'system' },
      { order: 2, action: 'validate_reward', description: 'Check reward eligibility', assignee: 'system' },
      { order: 3, action: 'deduct_points', description: 'Subtract points from account', assignee: 'system' },
      { order: 4, action: 'fulfill_reward', description: 'Process reward delivery', assignee: 'warehouse' },
      { order: 5, action: 'send_confirmation', description: 'Email reward confirmation', assignee: 'system' },
    ],
    installs: 178,
    isFeatured: false,
    author: 'RTMN Team',
    version: '1.8.0',
    tags: ['loyalty', 'points', 'rewards', 'redemption'],
  },
];

async function seed() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow-marketplace';

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing workflows
    await Workflow.deleteMany({});
    console.log('Cleared existing workflows');

    // Insert sample workflows
    await Workflow.insertMany(sampleWorkflows);
    console.log(`Inserted ${sampleWorkflows.length} sample workflows`);

    console.log('Seeding complete!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seed();

/**
 * Operations OS - Industry-Specific Workflows
 * Pre-built workflows for each industry
 */

const industryWorkflows = {
  // ============ HOSPITALITY ============
  hospitality: {
    name: 'Hospitality Operations',
    workflows: [
      {
        id: 'HOSP-001',
        name: 'Hotel Check-in',
        process: ['Guest Arrival', 'ID Verification', 'Payment Pre-auth', 'Room Assignment', 'Key Delivery', 'Amenity Briefing'],
        sla: '5 minutes',
        automation: 'auto-assign-room',
      },
      {
        id: 'HOSP-002',
        name: 'Hotel Check-out',
        process: ['Bill Generation', 'Payment Settlement', 'Key Return', 'Feedback Collection', 'Room Release'],
        sla: '10 minutes',
        automation: 'auto-checkout',
      },
      {
        id: 'HOSP-003',
        name: 'Room Service Order',
        process: ['Order Receive', 'Kitchen Notification', 'Food Prep', 'Quality Check', 'Delivery', 'Guest Confirmation'],
        sla: '30 minutes',
        automation: 'kitchen-display',
      },
      {
        id: 'HOSP-004',
        name: 'Housekeeping Request',
        process: ['Request Triage', 'Staff Assignment', 'Room Access', 'Cleaning', 'Inspection', 'Status Update'],
        sla: '45 minutes',
        automation: 'staff-routing',
      },
      {
        id: 'HOSP-005',
        name: 'Concierge Service',
        process: ['Guest Request', 'Research', 'Booking', 'Confirmation', 'Billing'],
        sla: '1 hour',
        automation: 'booking-api',
      },
    ],
  },

  // ============ RESTAURANT ============
  restaurant: {
    name: 'Restaurant Operations',
    workflows: [
      {
        id: 'REST-001',
        name: 'Table Reservation',
        process: ['Booking Request', 'Availability Check', 'Confirmation', 'Reminder', 'Seating'],
        sla: '5 minutes',
        automation: 'auto-confirm',
      },
      {
        id: 'REST-002',
        name: 'Order to Kitchen',
        process: ['Order Entry', 'Kitchen Display', 'Prep', 'Quality Check', 'Plating', 'Runner Delivery'],
        sla: '20 minutes',
        automation: 'pos-kds',
      },
      {
        id: 'REST-003',
        name: 'POS Settlement',
        process: ['Bill Request', 'Order Aggregation', 'Discount Apply', 'Payment', 'Receipt', 'Table Clear'],
        sla: '5 minutes',
        automation: 'auto-settle',
      },
      {
        id: 'REST-004',
        name: 'Complaint Resolution',
        process: ['Issue Capture', 'Manager Alert', 'Compensation Decision', 'Resolution', 'Follow-up'],
        sla: '15 minutes',
        automation: 'auto-escalate',
      },
    ],
  },

  // ============ HEALTHCARE ============
  healthcare: {
    name: 'Healthcare Operations',
    workflows: [
      {
        id: 'HEAL-001',
        name: 'Patient Registration',
        process: ['Arrival', 'Insurance Verify', 'History Capture', 'Vital Signs', 'Triage', 'Room Assignment'],
        sla: '15 minutes',
        automation: 'insurance-api',
      },
      {
        id: 'HEAL-002',
        name: 'Appointment Scheduling',
        process: ['Request', 'Availability Check', 'Doctor Assignment', 'Confirmation', 'Reminder', 'Check-in'],
        sla: '10 minutes',
        automation: 'calendar-sync',
      },
      {
        id: 'HEAL-003',
        name: 'Lab Results',
        process: ['Sample Collect', 'Lab Processing', 'Result Review', 'Doctor Alert', 'Patient Notification'],
        sla: '24 hours',
        automation: 'lab-interface',
      },
      {
        id: 'HEAL-004',
        name: 'Emergency Response',
        process: ['Alert', 'Triage', 'Resource Mobilize', 'Treatment', 'Stabilization', 'Admission/Discharge'],
        sla: 'immediate',
        automation: 'code-blue',
      },
    ],
  },

  // ============ RETAIL ============
  retail: {
    name: 'Retail Operations',
    workflows: [
      {
        id: 'RETL-001',
        name: 'POS Sale',
        process: ['Scan Items', 'Price Verify', 'Discount Apply', 'Payment', 'Receipt', 'Bagging'],
        sla: '3 minutes',
        automation: 'auto-scan',
      },
      {
        id: 'RETL-002',
        name: 'Return Processing',
        process: ['Item Verify', 'Policy Check', 'Refund Method', 'Supervisor Approval', 'Processing', 'Receipt'],
        sla: '10 minutes',
        automation: 'policy-check',
      },
      {
        id: 'RETL-003',
        name: 'Inventory Replenishment',
        process: ['Stock Alert', 'Reorder Generate', 'Supplier Notify', 'Delivery Schedule', 'Stock Receive', 'Shelf Update'],
        sla: '24 hours',
        automation: 'auto-reorder',
      },
    ],
  },

  // ============ MANUFACTURING ============
  manufacturing: {
    name: 'Manufacturing Operations',
    workflows: [
      {
        id: 'MFG-001',
        name: 'Production Order',
        process: ['Order Create', 'BOM Check', 'Material Allocate', 'Work Order', 'Production', 'QC', 'Storage'],
        sla: 'variable',
        automation: 'mes-integration',
      },
      {
        id: 'MFG-002',
        name: 'Quality Inspection',
        process: ['Sample Select', 'Test Execute', 'Results Record', 'Pass/Fail Decision', 'Disposition'],
        sla: '2 hours',
        automation: 'qc-equipment',
      },
      {
        id: 'MFG-003',
        name: 'Machine Maintenance',
        process: ['Schedule', 'Downtime Notify', 'Technician Assign', 'Repair Execute', 'Testing', 'Restart'],
        sla: '4 hours',
        automation: 'iot-monitoring',
      },
    ],
  },

  // ============ EDUCATION ============
  education: {
    name: 'Education Operations',
    workflows: [
      {
        id: 'EDU-001',
        name: 'Student Enrollment',
        process: ['Application', 'Document Verify', 'Fee Payment', 'Confirmation', 'ID Generate', 'Orientation'],
        sla: '3 days',
        automation: 'auto-enroll',
      },
      {
        id: 'EDU-002',
        name: 'Exam Processing',
        process: ['Schedule Generate', 'Hall Allocation', 'Admit Card', 'Exam Conduct', 'Evaluation', 'Result Publish'],
        sla: '2 weeks',
        automation: 'auto-grade',
      },
    ],
  },

  // ============ LOGISTICS ============
  logistics: {
    name: 'Logistics Operations',
    workflows: [
      {
        id: 'LOG-001',
        name: 'Order Fulfillment',
        process: ['Order Receive', 'Pick List Generate', 'Warehouse Pick', 'Pack', 'Ship', 'Track'],
        sla: '24 hours',
        automation: 'wms-integration',
      },
      {
        id: 'LOG-002',
        name: 'Delivery',
        process: ['Route Optimize', 'Driver Assign', 'Delivery Attempt', 'Proof Capture', 'Customer Confirm'],
        sla: 'same-day',
        automation: 'route-optimize',
      },
    ],
  },

  // ============ CONSTRUCTION ============
  construction: {
    name: 'Construction Operations',
    workflows: [
      {
        id: 'CONS-001',
        name: 'Project Kickoff',
        process: ['Contract Sign', 'Team Assemble', 'Resource Allocate', 'Site Setup', 'Kickoff Meeting'],
        sla: '1 week',
        automation: 'document-gen',
      },
      {
        id: 'CONS-002',
        name: 'Material Procurement',
        process: ['Requisition', 'Quote Collect', 'Vendor Select', 'PO Create', 'Delivery Schedule', 'Inspection'],
        sla: '1 week',
        automation: 'quote-compare',
      },
      {
        id: 'CONS-003',
        name: 'Safety Incident',
        process: ['Report', 'Stop Work', 'Investigate', 'Report Generate', 'Corrective Action', 'Resume'],
        sla: 'immediate',
        automation: 'safety-alert',
      },
    ],
  },

  // ============ IT SERVICES ============
  itServices: {
    name: 'IT Services Operations',
    workflows: [
      {
        id: 'IT-001',
        name: 'IT Ticket',
        process: ['Ticket Create', 'Categorize', 'Assign', 'Investigate', 'Fix', 'Verify', 'Close'],
        sla: '24 hours',
        automation: 'auto-assign',
      },
      {
        id: 'IT-002',
        name: 'Software Deployment',
        process: ['Request', 'Testing', 'Approval', 'Deployment Window', 'Deploy', 'Monitor', 'Sign-off'],
        sla: '1 week',
        automation: 'ci-cd',
      },
      {
        id: 'IT-003',
        name: 'Access Provision',
        process: ['Request', 'Manager Approval', 'Security Review', 'Provision', 'Notify', 'Audit Log'],
        sla: '4 hours',
        automation: 'iam-integration',
      },
    ],
  },

  // ============ GENERAL ============
  general: {
    name: 'General Business Operations',
    workflows: [
      {
        id: 'GEN-001',
        name: 'Employee Onboarding',
        process: ['HR Initiate', 'Documentation', 'IT Setup', 'Access Provision', 'Training Assign', 'Buddy Assign', 'Complete'],
        sla: '5 days',
        automation: 'template-workflow',
      },
      {
        id: 'GEN-002',
        name: 'Purchase Request',
        process: ['Request Create', 'Budget Check', 'Manager Approve', 'Procurement Review', 'PO Create', 'Receive', 'Close'],
        sla: '3 days',
        automation: 'budget-check',
      },
      {
        id: 'GEN-003',
        name: 'Invoice Processing',
        process: ['Receive', 'Verify', 'GL Code', 'Approve', 'Pay', 'Archive'],
        sla: '7 days',
        automation: 'ocr-scan',
      },
      {
        id: 'GEN-004',
        name: 'Customer Onboarding',
        process: ['Signup', 'KYC', 'Contract', 'Setup', 'Training', 'Go Live', 'Handover'],
        sla: '10 days',
        automation: 'template-workflow',
      },
    ],
  },
};

// Export workflows
module.exports = industryWorkflows;

// Add to app
function registerIndustryWorkflows(app) {
  // Get all industries
  app.get('/api/workflows/industries', (req, res) => {
    const industries = Object.entries(industryWorkflows).map(([id, data]) => ({
      id,
      name: data.name,
      workflowCount: data.workflows.length,
    }));
    res.json({ industries, total: industries.length });
  });

  // Get workflows by industry
  app.get('/api/workflows/industry/:id', (req, res) => {
    const industry = industryWorkflows[req.params.id];
    if (!industry) return res.status(404).json({ error: 'Industry not found' });
    res.json(industry);
  });

  // Get single workflow
  app.get('/api/workflows/industry/:id/:workflowId', (req, res) => {
    const industry = industryWorkflows[req.params.id];
    if (!industry) return res.status(404).json({ error: 'Industry not found' });
    const workflow = industry.workflows.find(w => w.id === req.params.workflowId);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json(workflow);
  });

  // Execute workflow
  app.post('/api/workflows/industry/:id/:workflowId/execute', (req, res) => {
    const industry = industryWorkflows[req.params.id];
    if (!industry) return res.status(404).json({ error: 'Industry not found' });
    const workflow = industry.workflows.find(w => w.id === req.params.workflowId);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const execution = {
      id: `EXEC-${Date.now()}`,
      workflowId: workflow.id,
      workflowName: workflow.name,
      industry: industry.name,
      process: workflow.process,
      status: 'started',
      startedAt: new Date().toISOString(),
      currentStep: 0,
      completedSteps: [],
    };

    res.json({ execution, workflow });
  });
}

module.exports.registerIndustryWorkflows = registerIndustryWorkflows;

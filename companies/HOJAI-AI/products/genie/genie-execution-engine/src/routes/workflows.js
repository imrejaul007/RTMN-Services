const express = require('express');
const router = express.Router();

// In-memory workflow storage
const workflows = new Map();

// Workflow templates
const workflowTemplates = [
  {
    id: 'onboarding',
    name: 'Employee Onboarding',
    description: 'Complete onboarding process for new hires',
    steps: [
      { order: 1, name: 'Send welcome email', type: 'email' },
      { order: 2, name: 'Create accounts', type: 'task' },
      { order: 3, name: 'Schedule orientation', type: 'calendar' },
      { order: 4, name: 'Assign buddy', type: 'notification' },
      { order: 5, name: 'First week check-in', type: 'reminder' }
    ]
  },
  {
    id: 'content-publish',
    name: 'Content Publishing',
    description: 'Review and publish content',
    steps: [
      { order: 1, name: 'Create draft', type: 'task' },
      { order: 2, name: 'Internal review', type: 'approval' },
      { order: 3, name: 'Final edits', type: 'task' },
      { order: 4, name: 'Schedule publish', type: 'calendar' },
      { order: 5, name: 'Notify team', type: 'notification' }
    ]
  },
  {
    id: 'lead-nurture',
    name: 'Lead Nurturing',
    description: 'Nurture leads through funnel',
    steps: [
      { order: 1, name: 'Welcome sequence', type: 'automation' },
      { order: 2, name: 'Follow-up call', type: 'task' },
      { order: 3, name: 'Send proposal', type: 'email' },
      { order: 4, name: 'Demo scheduled', type: 'calendar' },
      { order: 5, name: 'Final follow-up', type: 'reminder' }
    ]
  },
  {
    id: 'project-kickoff',
    name: 'Project Kickoff',
    description: 'Start a new project',
    steps: [
      { order: 1, name: 'Define scope', type: 'task' },
      { order: 2, name: 'Assemble team', type: 'task' },
      { order: 3, name: 'Schedule kickoff meeting', type: 'calendar' },
      { order: 4, name: 'Create project folder', type: 'webhook' },
      { order: 5, name: 'Send project brief', type: 'email' }
    ]
  }
];

// Create workflow
router.post('/', (req, res) => {
  const { userId, name, description, steps } = req.body;

  if (!userId || !name) {
    return res.status(400).json({
      success: false,
      error: 'userId and name are required'
    });
  }

  const workflow = {
    id: `wf-${Date.now()}`,
    userId,
    name,
    description: description || '',
    steps: (steps || []).map((step, i) => ({
      ...step,
      order: step.order || i + 1,
      status: 'pending'
    })),
    status: 'draft',
    currentStep: 0,
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null
  };

  if (!workflows.has(userId)) {
    workflows.set(userId, []);
  }
  workflows.get(userId).push(workflow);

  res.json({
    success: true,
    message: 'Workflow created',
    data: workflow
  });
});

// Get workflows
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const { status } = req.query;

  let userWorkflows = workflows.get(userId) || [];

  if (status) {
    userWorkflows = userWorkflows.filter(w => w.status === status);
  }

  userWorkflows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    data: {
      workflows: userWorkflows,
      count: userWorkflows.length,
      byStatus: {
        draft: userWorkflows.filter(w => w.status === 'draft').length,
        running: userWorkflows.filter(w => w.status === 'running').length,
        completed: userWorkflows.filter(w => w.status === 'completed').length
      }
    }
  });
});

// Start workflow
router.post('/:workflowId/start', (req, res) => {
  const { workflowId } = req.params;

  let workflow = null;
  for (const userWfs of workflows.values()) {
    const found = userWfs.find(w => w.id === workflowId);
    if (found) {
      workflow = found;
      break;
    }
  }

  if (!workflow) {
    return res.status(404).json({
      success: false,
      error: 'Workflow not found'
    });
  }

  workflow.status = 'running';
  workflow.startedAt = new Date().toISOString();
  workflow.currentStep = 1;
  workflow.steps[0].status = 'in-progress';
  workflow.steps[0].startedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'Workflow started',
    data: {
      workflow,
      currentStep: workflow.steps[0],
      remainingSteps: workflow.steps.length - 1
    }
  });
});

// Execute current step
router.post('/:workflowId/advance', (req, res) => {
  const { workflowId } = req.params;
  const { stepData, notes } = req.body;

  let workflow = null;
  for (const userWfs of workflows.values()) {
    const found = userWfs.find(w => w.id === workflowId);
    if (found) {
      workflow = found;
      break;
    }
  }

  if (!workflow) {
    return res.status(404).json({
      success: false,
      error: 'Workflow not found'
    });
  }

  if (workflow.status !== 'running') {
    return res.status(400).json({
      success: false,
      error: 'Workflow is not running'
    });
  }

  const currentStep = workflow.steps.find(s => s.order === workflow.currentStep);
  if (currentStep) {
    currentStep.status = 'completed';
    currentStep.completedAt = new Date().toISOString();
    currentStep.data = stepData;
    currentStep.notes = notes;
  }

  // Move to next step
  if (workflow.currentStep < workflow.steps.length) {
    workflow.currentStep++;
    const nextStep = workflow.steps.find(s => s.order === workflow.currentStep);
    if (nextStep) {
      nextStep.status = 'in-progress';
      nextStep.startedAt = new Date().toISOString();
    }

    res.json({
      success: true,
      message: `Step ${workflow.currentStep - 1} completed`,
      data: {
        workflow,
        completedStep: currentStep,
        nextStep,
        progress: Math.round((workflow.currentStep - 1) / workflow.steps.length * 100),
        remainingSteps: workflow.steps.length - workflow.currentStep + 1
      }
    });
  } else {
    workflow.status = 'completed';
    workflow.completedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Workflow completed! 🎉',
      data: {
        workflow,
        progress: 100,
        totalTime: calculateWorkflowTime(workflow)
      }
    });
  }
});

// Get workflow templates
router.get('/templates/all', (req, res) => {
  res.json({
    success: true,
    data: workflowTemplates
  });
});

// Create workflow from template
router.post('/from-template/:templateId', (req, res) => {
  const { templateId } = req.params;
  const { userId, customizations } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required'
    });
  }

  const template = workflowTemplates.find(t => t.id === templateId);
  if (!template) {
    return res.status(404).json({
      success: false,
      error: 'Template not found',
      available: workflowTemplates.map(t => t.id)
    });
  }

  const workflow = {
    id: `wf-${Date.now()}`,
    userId,
    name: customizations?.name || template.name,
    description: customizations?.description || template.description,
    templateId: template.id,
    steps: template.steps.map(step => ({
      ...step,
      status: 'pending'
    })),
    status: 'draft',
    currentStep: 0,
    createdAt: new Date().toISOString()
  };

  if (!workflows.has(userId)) {
    workflows.set(userId, []);
  }
  workflows.get(userId).push(workflow);

  res.json({
    success: true,
    message: 'Workflow created from template',
    data: workflow
  });
});

// Delete workflow
router.delete('/:workflowId', (req, res) => {
  const { workflowId } = req.params;

  for (const [userId, userWfs] of workflows.entries()) {
    const index = userWfs.findIndex(w => w.id === workflowId);
    if (index !== -1) {
      userWfs.splice(index, 1);
      res.json({ success: true, message: 'Workflow deleted' });
      return;
    }
  }

  res.status(404).json({ success: false, error: 'Workflow not found' });
});

// Helper functions
function calculateWorkflowTime(workflow) {
  if (!workflow.startedAt || !workflow.completedAt) return null;

  const start = new Date(workflow.startedAt);
  const end = new Date(workflow.completedAt);
  const ms = end - start;

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes, totalMs: ms };
}

module.exports = router;
import { Router, Request, Response } from 'express';
import { store, Workflow, WorkflowExecution, Trigger, WorkflowAction } from '../models/Automation';
import { TriggerEngine } from '../services/triggerEngine';

const router = Router();
const triggerEngine = new TriggerEngine();

// Create workflow
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, description, triggers, actions, active } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const workflow = store.createWorkflow({
      name,
      description,
      triggers: triggers as Trigger[],
      actions: actions as WorkflowAction[],
      active
    });

    res.status(201).json(workflow);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get all workflows
router.get('/', (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    let workflows = store.getAllWorkflows();

    if (active !== undefined) {
      workflows = workflows.filter(w => w.active === (active === 'true'));
    }

    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get workflow by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const workflow = store.getWorkflow(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update workflow
router.put('/:id', (req: Request, res: Response) => {
  try {
    const updated = store.updateWorkflow(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete workflow
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = store.deleteWorkflow(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json({ message: 'Workflow deleted' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Activate workflow
router.post('/:id/activate', (req: Request, res: Response) => {
  try {
    const updated = store.updateWorkflow(req.params.id, { active: true });
    if (!updated) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Deactivate workflow
router.post('/:id/deactivate', (req: Request, res: Response) => {
  try {
    const updated = store.updateWorkflow(req.params.id, { active: false });
    if (!updated) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Execute workflow manually
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const workflow = store.getWorkflow(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const { triggerData } = req.body;
    const result = await triggerEngine.executeWorkflow(workflow, triggerData || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get workflow executions
router.get('/:id/executions', (req: Request, res: Response) => {
  try {
    const executions = store.getExecutionsByWorkflow(req.params.id);
    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get execution by ID
router.get('/executions/:execId', (req: Request, res: Response) => {
  try {
    const execution = store.getWorkflowExecution(req.params.execId);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    res.json(execution);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Cancel workflow execution
router.post('/executions/:execId/cancel', (req: Request, res: Response) => {
  try {
    const execution = store.getWorkflowExecution(req.params.execId);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date();
    res.json(execution);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Test workflow conditions
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const workflow = store.getWorkflow(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const { testData } = req.body;
    const matches = await triggerEngine.testConditions(workflow.triggers, testData || {});
    res.json({ matches, triggers: workflow.triggers });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

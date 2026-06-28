/**
 * Unit tests for Workflow Visual Builder
 */
import { describe, it, expect } from 'vitest';

function validateWorkflow(workflow) {
  const issues = [];
  if (!workflow.steps?.length) issues.push('No steps defined');
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    if (!step.type) issues.push(`Step ${i}: Missing type`);
    if (step.channel && !['whatsapp', 'email', 'sms', 'internal'].includes(step.channel)) {
      issues.push(`Step ${i}: Invalid channel ${step.channel}`);
    }
  }
  return { valid: issues.length === 0, issues };
}

function estimateImpact(template) {
  const impacts = {
    abandoned_cart_recovery: 50000,
    welcome_series: 20000,
    win_back: 30000,
    post_purchase: 15000,
    birthday_campaign: 10000
  };
  return impacts[template] || 10000;
}

function getWorkflowProgress(workflow, executed) {
  if (!workflow.steps?.length) return 0;
  return Math.round((executed / workflow.steps.length) * 100);
}

describe('Workflow Visual Builder', () => {
  it('should validate complete workflow', () => {
    const wf = {
      steps: [
        { type: 'trigger', channel: 'whatsapp' },
        { type: 'action', channel: 'email' }
      ]
    };
    const result = validateWorkflow(wf);
    expect(result.valid).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it('should detect missing step types', () => {
    const wf = { steps: [{ channel: 'email' }] };
    const result = validateWorkflow(wf);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('Step 0: Missing type');
  });

  it('should detect invalid channels', () => {
    const wf = { steps: [{ type: 'action', channel: 'fax' }] };
    const result = validateWorkflow(wf);
    expect(result.valid).toBe(false);
  });

  it('should estimate revenue impact', () => {
    expect(estimateImpact('abandoned_cart_recovery')).toBe(50000);
    expect(estimateImpact('welcome_series')).toBe(20000);
  });

  it('should calculate workflow progress', () => {
    const wf = { steps: [{}, {}, {}, {}] };
    expect(getWorkflowProgress(wf, 2)).toBe(50);
    expect(getWorkflowProgress(wf, 4)).toBe(100);
    expect(getWorkflowProgress(wf, 0)).toBe(0);
  });
});

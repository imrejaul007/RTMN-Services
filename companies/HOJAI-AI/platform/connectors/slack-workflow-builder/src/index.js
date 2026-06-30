/**
 * Slack Workflow Builder
 */
class SlackWorkflowBuilder {
  constructor(config) {
    this.token = config.token;
  }
  async createWorkflow(name, trigger, steps) {
    return fetch('https://slack.com/api/workflows.create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ name, trigger, steps })
    }).then(r => r.json());
  }
}
module.exports = SlackWorkflowBuilder;

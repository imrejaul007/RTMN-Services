/**
 * FlowOS Workflow Templates
 * Pre-built workflows for common use cases
 */

export const templates = {
  // === AUTOMATION ===
  helloWorld: {
    name: 'Hello World',
    description: 'Simple workflow that logs a message',
    category: 'automation',
    nodes: [
      { id: 'trigger', type: 'trigger', name: 'Start', config: { type: 'manual' } },
      { id: 'log', type: 'task', name: 'Log Message', config: { action: 'log', message: 'Hello from FlowOS!' } }
    ],
    connections: [{ source: 'trigger', target: 'log' }]
  },

  scheduledTask: {
    name: 'Scheduled Task',
    description: 'Runs daily at midnight',
    category: 'automation',
    nodes: [
      { id: 'trigger', type: 'trigger', name: 'Daily Trigger', config: { type: 'schedule', cron: '0 0 * * *' } },
      { id: 'task', type: 'task', name: 'Run Task', config: { action: 'process' } }
    ],
    connections: [{ source: 'trigger', target: 'task' }]
  },

  webhookReceiver: {
    name: 'Webhook Receiver',
    description: 'Receives and processes webhook events',
    category: 'automation',
    nodes: [
      { id: 'trigger', type: 'trigger', name: 'Webhook', config: { type: 'webhook' } },
      { id: 'validate', type: 'task', name: 'Validate Payload', config: { action: 'validate' } },
      { id: 'process', type: 'task', name: 'Process Event', config: { action: 'process' } }
    ],
    connections: [
      { source: 'trigger', target: 'validate' },
      { source: 'validate', target: 'process' }
    ]
  },

  // === DATA PROCESSING ===
  dataPipeline: {
    name: 'Data Pipeline',
    description: 'Extract, transform, load data',
    category: 'data',
    nodes: [
      { id: 'trigger', type: 'trigger', name: 'Schedule', config: { type: 'schedule', cron: '0 */6 * * *' } },
      { id: 'extract', type: 'http', name: 'Extract Data', config: { url: 'https://api.example.com/data', method: 'GET' } },
      { id: 'transform', type: 'transform', name: 'Transform', config: { transform: { formatted: '${body}' } } },
      { id: 'load', type: 'task', name: 'Load to DB', config: { action: 'database_insert' } }
    ],
    connections: [
      { source: 'trigger', target: 'extract' },
      { source: 'extract', target: 'transform' },
      { source: 'transform', target: 'load' }
    ]
  },

  batchProcessing: {
    name: 'Batch Processor',
    description: 'Process items in parallel batches',
    category: 'data',
    nodes: [
      { id: 'trigger', type: 'trigger', name: 'Start', config: { type: 'schedule' } },
      { id: 'fetch', type: 'task', name: 'Fetch Items', config: { action: 'fetch_batch' } },
      { id: 'parallel', type: 'parallel', name: 'Process Items', config: { branches: ['item1', 'item2', 'item3', 'item4'] } },
      { id: 'aggregate', type: 'task', name: 'Aggregate Results', config: { action: 'aggregate' } }
    ],
    connections: [
      { source: 'trigger', target: 'fetch' },
      { source: 'fetch', target: 'parallel' },
      { source: 'parallel', target: 'aggregate' }
    ]
  },

  // === APPROVAL FLOWS ===
  approvalFlow: {
    name: 'Approval Flow',
    description: 'Multi-level approval with notifications',
    category: 'business',
    nodes: [
      { id: 'trigger', type: 'trigger', name: 'Request', config: { type: 'webhook' } },
      { id: 'notify', type: 'task', name: 'Notify Manager', config: { action: 'notify', channel: 'email' } },
      { id: 'wait', type: 'delay', name: 'Wait for Approval', config: { duration: 86400000 } },
      { id: 'check', type: 'condition', name: 'Approved?', config: { condition: 'approval.status == "approved"' } },
      { id: 'approved', type: 'task', name: 'Process Approval', config: { action: 'process' } },
      { id: 'rejected', type: 'task', name: 'Handle Rejection', config: { action: 'notify', message: 'Request rejected' } }
    ],
    connections: [
      { source: 'trigger', target: 'notify' },
      { source: 'notify', target: 'wait' },
      { source: 'wait', target: 'check' },
      { source: 'check', target: 'approved', condition: 'approved' },
      { source: 'check', target: 'rejected', condition: 'rejected' }
    ]
  },

  // === INTEGRATIONS ===
  slackNotifier: {
    name: 'Slack Notifier',
    description: 'Send notifications to Slack',
    category: 'integration',
    nodes: [
      { id: 'trigger', type: 'trigger', name: 'Event', config: { type: 'webhook' } },
      { id: 'format', type: 'transform', name: 'Format Message', config: { transform: { text: '${event.message}' } } },
      { id: 'send', type: 'task', name: 'Send to Slack', config: { action: 'slack_message', channel: '#alerts' } }
    ],
    connections: [
      { source: 'trigger', target: 'format' },
      { source: 'format', target: 'send' }
    ]
  },

  githubWebhook: {
    name: 'GitHub Webhook Handler',
    description: 'Handle GitHub events',
    category: 'integration',
    nodes: [
      { id: 'trigger', type: 'trigger', name: 'GitHub Event', config: { type: 'webhook' } },
      { id: 'parse', type: 'task', name: 'Parse Event', config: { action: 'parse_github_event' } },
      { id: 'pr', type: 'condition', name: 'Is PR?', config: { condition: 'event.type == "pull_request"' } },
      { id: 'notify', type: 'task', name: 'Notify Team', config: { action: 'notify' } }
    ],
    connections: [
      { source: 'trigger', target: 'parse' },
      { source: 'parse', target: 'pr' },
      { source: 'pr', target: 'notify' }
    ]
  },

  // === MONITORING ===
  healthCheck: {
    name: 'Service Health Check',
    description: 'Monitor service health and alert',
    category: 'monitoring',
    nodes: [
      { id: 'trigger', type: 'trigger', name: 'Schedule', config: { type: 'schedule', cron: '*/5 * * * *' } },
      { id: 'check1', type: 'http', name: 'Check Service A', config: { url: 'https://api.service-a.com/health', method: 'GET' } },
      { id: 'check2', type: 'http', name: 'Check Service B', config: { url: 'https://api.service-b.com/health', method: 'GET' } },
      { id: 'aggregate', type: 'task', name: 'Aggregate Status', config: { action: 'aggregate_health' } },
      { id: 'alert', type: 'condition', name: 'Any Down?', config: { condition: 'status.ok == false' } },
      { id: 'sendAlert', type: 'task', name: 'Send Alert', config: { action: 'notify', channels: ['email', 'slack'] } }
    ],
    connections: [
      { source: 'trigger', target: 'check1' },
      { source: 'trigger', target: 'check2' },
      { source: 'check1', target: 'aggregate' },
      { source: 'check2', target: 'aggregate' },
      { source: 'aggregate', target: 'alert' },
      { source: 'alert', target: 'sendAlert', condition: 'alert' }
    ]
  },

  // === ETL ===
  etlWorkflow: {
    name: 'ETL Pipeline',
    description: 'Extract, Transform, Load',
    category: 'data',
    nodes: [
      { id: 'trigger', type: 'trigger', name: 'Schedule', config: { type: 'schedule' } },
      { id: 'extract', type: 'http', name: 'Extract', config: { url: '${config.sourceUrl}', method: 'GET' } },
      { id: 'clean', type: 'task', name: 'Clean Data', config: { action: 'clean', rules: ['remove_nulls', 'trim_strings'] } },
      { id: 'transform', type: 'transform', name: 'Transform', config: { transform: { mapped: '${body}' } } },
      { id: 'validate', type: 'task', name: 'Validate', config: { action: 'validate_schema' } },
      { id: 'load', type: 'task', name: 'Load', config: { action: 'bulk_insert' } },
      { id: 'report', type: 'task', name: 'Report', config: { action: 'send_report' } }
    ],
    connections: [
      { source: 'trigger', target: 'extract' },
      { source: 'extract', target: 'clean' },
      { source: 'clean', target: 'transform' },
      { source: 'transform', target: 'validate' },
      { source: 'validate', target: 'load' },
      { source: 'load', target: 'report' }
    ]
  }
};

export const categories = [...new Set(Object.values(templates).map(t => t.category))];

export function getTemplates(category = null) {
  if (category) return Object.values(templates).filter(t => t.category === category);
  return Object.values(templates);
}

export function getTemplate(name) {
  return templates[name] || null;
}

export default templates;
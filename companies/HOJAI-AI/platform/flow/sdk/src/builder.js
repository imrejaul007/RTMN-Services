/**
 * FlowOS SDK - Workflow Builder
 * Fluent API for building workflows programmatically
 */

export class WorkflowBuilder {
  constructor(name = 'Unnamed Workflow') {
    this.workflow = {
      name,
      nodes: [],
      connections: [],
      variables: {},
      settings: {},
    };
    this.nodeCounter = 0;
    this.connectionCounter = 0;
  }

  // Node types
  task(name, config = {}) {
    const id = `task_${++this.nodeCounter}`;
    this.workflow.nodes.push({
      id,
      type: 'task',
      name,
      config,
      errorHandling: config.errorHandling || null,
    });
    return new NodeBuilder(this, id);
  }

  trigger(name, config = {}) {
    const id = `trigger_${++this.nodeCounter}`;
    this.workflow.nodes.push({
      id,
      type: 'trigger',
      name,
      config,
    });
    return new NodeBuilder(this, id);
  }

  condition(name, config = {}) {
    const id = `condition_${++this.nodeCounter}`;
    this.workflow.nodes.push({
      id,
      type: 'condition',
      name,
      condition: config.condition,
      config,
    });
    return new NodeBuilder(this, id);
  }

  http(name, config = {}) {
    const id = `http_${++this.nodeCounter}`;
    this.workflow.nodes.push({
      id,
      type: 'http',
      name,
      config: {
        url: config.url,
        method: config.method || 'GET',
        ...config,
      },
    });
    return new NodeBuilder(this, id);
  }

  parallel(name, config = {}) {
    const id = `parallel_${++this.nodeCounter}`;
    this.workflow.nodes.push({
      id,
      type: 'parallel',
      name,
      branches: config.branches || [],
      config,
    });
    return new ParallelBuilder(this, id);
  }

  loop(name, config = {}) {
    const id = `loop_${++this.nodeCounter}`;
    this.workflow.nodes.push({
      id,
      type: 'loop',
      name,
      iterations: config.iterations,
      config,
    });
    return new NodeBuilder(this, id);
  }

  delay(name, config = {}) {
    const id = `delay_${++this.nodeCounter}`;
    this.workflow.nodes.push({
      id,
      type: 'delay',
      name,
      config: {
        duration: config.duration || 1000,
        ...config,
      },
    });
    return new NodeBuilder(this, id);
  }

  transform(name, config = {}) {
    const id = `transform_${++this.nodeCounter}`;
    this.workflow.nodes.push({
      id,
      type: 'transform',
      name,
      transform: config.transform || {},
      config,
    });
    return new NodeBuilder(this, id);
  }

  // Settings
  setVariable(key, value) {
    this.workflow.variables[key] = value;
    return this;
  }

  setTimeout(duration) {
    this.workflow.settings.timeout = duration;
    return this;
  }

  setRetries(maxRetries, delay = 1000) {
    this.workflow.settings.retries = { maxRetries, delay };
    return this;
  }

  // Build
  build() {
    return JSON.parse(JSON.stringify(this.workflow));
  }

  toJSON() {
    return this.build();
  }
}

class NodeBuilder {
  constructor(builder, nodeId) {
    this.builder = builder;
    this.nodeId = nodeId;
  }

  then(targetId) {
    const targetNode = this.builder.workflow.nodes.find(n => n.id === targetId);
    if (targetNode) {
      this.builder.workflow.connections.push({
        id: `conn_${++this.builder.connectionCounter}`,
        source: this.nodeId,
        target: targetId,
      });
    }
    return new NodeBuilder(this.builder, targetId);
  }

  onError(errorNodeId) {
    const node = this.builder.workflow.nodes.find(n => n.id === this.nodeId);
    if (node) {
      node.errorHandling = {
        target: errorNodeId,
      };
    }
    return this;
  }

  withConfig(config) {
    const node = this.builder.workflow.nodes.find(n => n.id === this.nodeId);
    if (node) {
      node.config = { ...node.config, ...config };
    }
    return this;
  }

  timeout(duration) {
    const node = this.builder.workflow.nodes.find(n => n.id === this.nodeId);
    if (node) {
      node.config.timeout = duration;
    }
    return this;
  }
}

class ParallelBuilder {
  constructor(builder, nodeId) {
    this.builder = builder;
    this.nodeId = nodeId;
  }

  branch(id, workflow) {
    const node = this.builder.workflow.nodes.find(n => n.id === this.nodeId);
    if (node) {
      node.branches = node.branches || [];
      node.branches.push({ id, workflow });
    }
    return this;
  }
}

// Pre-built workflow templates
export const Templates = {
  helloWorld() {
    return new WorkflowBuilder('Hello World')
      .trigger('start', { type: 'manual' })
      .task('say-hello', { action: 'log', message: 'Hello World!' })
      .build();
  },

  httpGet(url) {
    return new WorkflowBuilder('HTTP GET')
      .trigger('start', { type: 'schedule', cron: '0 * * * *' })
      .http('fetch-data', { url, method: 'GET' })
      .transform('process', { transform: { parsed: '${body}' } })
      .build();
  },

  approvalFlow(approvers = []) {
    const wf = new WorkflowBuilder('Approval Flow')
      .trigger('start', { type: 'webhook' })
      .task('notify-approvers', { action: 'notify', users: approvers });

    let lastNode = 'notify-approvers';
    for (const approver of approvers) {
      wf.condition(`check-${approver}`, { condition: `approval.${approver} === true` })
        .task(`process-${approver}`, { action: 'process-approval' });
    }

    return wf.build();
  },

  dataPipeline(steps = []) {
    const wf = new WorkflowBuilder('Data Pipeline')
      .trigger('start', { type: 'schedule', cron: '0 0 * * *' });

    steps.forEach((step, i) => {
      wf.task(`step-${i}`, step);
    });

    return wf.build();
  },

  parallelProcessing(items = []) {
    return new WorkflowBuilder('Parallel Processing')
      .trigger('start', { type: 'manual' })
      .parallel('process-items', { branches: items.map((item, i) => ({ id: `item-${i}`, item })) })
      .task('aggregate', { action: 'collect-results' })
      .build();
  },
};

export default WorkflowBuilder;
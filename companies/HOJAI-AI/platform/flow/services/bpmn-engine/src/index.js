/**
 * FlowOS BPMN Engine
 *
 * BPMN 2.0 compliant process execution engine:
 * - Parse and execute BPMN 2.0 XML
 * - Support for gateways, events, timers
 * - Human task management
 * - Compensation handlers
 *
 * Port: 5370
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';

const app = express();
const PORT = process.env.PORT || 5370;

app.use(cors());
app.use(express.json());

// Storage
const storage = {
  definitions: new Map(),  // Process definitions
  instances: new Map(),    // Process instances
  tasks: new Map(),        // Human tasks
  timers: new Map()        // Timer jobs
};

// BPMN Element Types
const ELEMENT_TYPES = {
  START_EVENT: 'startEvent',
  END_EVENT: 'endEvent',
  INTERMEDIATE_THROW_EVENT: 'intermediateThrowEvent',
  INTERMEDIATE_CATCH_EVENT: 'intermediateCatchEvent',
  USER_TASK: 'userTask',
  SERVICE_TASK: 'serviceTask',
  MANUAL_TASK: 'manualTask',
  SCRIPT_TASK: 'scriptTask',
  EXCLUSIVE_GATEWAY: 'exclusiveGateway',
  PARALLEL_GATEWAY: 'parallelGateway',
  INCLUSIVE_GATEWAY: 'inclusiveGateway',
  EVENT_BASED_GATEWAY: 'eventBasedGateway',
  SEQUENCE_FLOW: 'sequenceFlow',
  PARTICIPANT: 'participant',
  LANE: 'lane'
};

// Task States
const TASK_STATES = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed'
};

// XML Parser
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_'
});

// Parse BPMN 2.0 XML
function parseBPMN(xmlString) {
  const parsed = parser.parse(xmlString);
  const definitions = parsed['bpmn:definitions'] || parsed.definitions;

  if (!definitions) {
    throw new Error('Invalid BPMN 2.0 XML: missing definitions');
  }

  const process = definitions['bpmn:process'] || definitions.process;
  const elements = {};
  const flows = [];

  // Extract elements
  for (const [key, value] of Object.entries(process)) {
    if (key.startsWith('bpmn:')) {
      const type = key.replace('bpmn:', '');
      const items = Array.isArray(value) ? value : [value];

      for (const item of items) {
        if (item && item['@_id']) {
          elements[item['@_id']] = {
            id: item['@_id'],
            name: item['@_name'] || '',
            type,
            data: item
          };
        }
      }
    }
  }

  // Extract sequence flows
  const sequenceFlows = elementsByType(elements, ELEMENT_TYPES.SEQUENCE_FLOW);
  for (const flow of sequenceFlows) {
    flows.push({
      id: flow.id,
      name: flow.name,
      sourceRef: flow.data['bpmn:sourceRef'],
      targetRef: flow.data['bpmn:targetRef'],
      conditionExpression: flow.data['bpmn:conditionExpression']?.['#text'] || null
    });
  }

  return {
    id: definitions['@_id'] || crypto.randomUUID(),
    name: process['@_name'] || 'Unnamed Process',
    elements,
    flows,
    raw: definitions
  };
}

// Get elements by type
function elementsByType(elements, type) {
  return Object.values(elements).filter(e => e.type === type);
}

// Find start events
function findStartEvents(elements) {
  return elementsByType(elements, ELEMENT_TYPES.START_EVENT);
}

// Find end events
function findEndEvents(elements) {
  return elementsByType(elements, ELEMENT_TYPES.END_EVENT);
}

// Find outgoing flows from element
function findOutgoingFlows(flows, elementId) {
  return flows.filter(f => f.sourceRef === elementId);
}

// Find incoming flows to element
function findIncomingFlows(flows, elementId) {
  return flows.filter(f => f.targetRef === elementId);
}

// Evaluate gateway condition
function evaluateCondition(condition, context = {}) {
  if (!condition) return true;

  try {
    // Simple condition evaluation
    const expr = condition.replace(/\$\{([^}]+)}/g, (_, path) => {
      return context[path] !== undefined ? context[path] : 0;
    });

    // Basic operators
    if (expr.includes('>')) {
      const [left, right] = expr.split('>').map(s => parseFloat(s.trim()));
      return left > right;
    }
    if (expr.includes('<')) {
      const [left, right] = expr.split('<').map(s => parseFloat(s.trim()));
      return left < right;
    }
    if (expr.includes('==')) {
      const [left, right] = expr.split('==').map(s => s.trim().replace(/['"]/g, ''));
      return left === right;
    }

    return true;
  } catch {
    return true;
  }
}

// Process gateway routing
function routeGateway(element, context, flows) {
  const outgoingFlows = findOutgoingFlows(flows, element.id);

  switch (element.type) {
    case ELEMENT_TYPES.EXCLUSIVE_GATEWAY:
      // Find first flow with satisfied condition
      for (const flow of outgoingFlows) {
        if (evaluateCondition(flow.conditionExpression, context)) {
          return [flow.targetRef];
        }
      }
      // Default to default flow (no condition)
      const defaultFlow = outgoingFlows.find(f => !f.conditionExpression);
      return defaultFlow ? [defaultFlow.targetRef] : [];

    case ELEMENT_TYPES.PARALLEL_GATEWAY:
      // Take all outgoing flows
      return outgoingFlows.map(f => f.targetRef);

    case ELEMENT_TYPES.INCLUSIVE_GATEWAY:
      // Take all flows with satisfied conditions
      return outgoingFlows
        .filter(f => !f.conditionExpression || evaluateCondition(f.conditionExpression, context))
        .map(f => f.targetRef);

    case ELEMENT_TYPES.EVENT_BASED_GATEWAY:
      // Wait for first matching event
      return outgoingFlows.map(f => f.targetRef);

    default:
      return outgoingFlows.map(f => f.targetRef);
  }
}

// Execute a single element
function executeElement(element, instance, context) {
  const now = new Date().toISOString();

  switch (element.type) {
    case ELEMENT_TYPES.USER_TASK:
      // Create human task
      const taskId = 'task_' + crypto.randomUUID();
      const task = {
        id: taskId,
        instanceId: instance.id,
        elementId: element.id,
        name: element.name || 'User Task',
        status: TASK_STATES.PENDING,
        assignee: null,
        dueDate: null,
        formFields: extractFormFields(element),
        createdAt: now,
        completedAt: null
      };
      storage.tasks.set(taskId, task);
      instance.activeTasks.push(taskId);
      return { type: 'wait', taskId };

    case ELEMENT_TYPES.SERVICE_TASK:
      // Execute service task (simulated)
      return { type: 'complete' };

    case ELEMENT_TYPES.SCRIPT_TASK:
      // Execute script task
      return { type: 'complete' };

    case ELEMENT_TYPES.MANUAL_TASK:
      // Manual task - completes immediately
      return { type: 'complete' };

    case ELEMENT_TYPES.EXCLUSIVE_GATEWAY:
    case ELEMENT_TYPES.PARALLEL_GATEWAY:
    case ELEMENT_TYPES.INCLUSIVE_GATEWAY:
    case ELEMENT_TYPES.EVENT_BASED_GATEWAY:
      const nextElements = routeGateway(element, context, instance.definition.flows);
      return { type: 'continue', nextElements };

    case ELEMENT_TYPES.END_EVENT:
      return { type: 'end' };

    case ELEMENT_TYPES.INTERMEDIATE_THROW_EVENT:
      // Handle compensation, escalation, etc.
      return { type: 'continue', nextElements: findOutgoingFlows(instance.definition.flows, element.id).map(f => f.targetRef) };

    case ELEMENT_TYPES.INTERMEDIATE_CATCH_EVENT:
      // Wait for event
      return { type: 'wait', event: element.name || 'intermediate' };

    default:
      // Continue to next element
      const flows = findOutgoingFlows(instance.definition.flows, element.id);
      return { type: 'continue', nextElements: flows.map(f => f.targetRef) };
  }
}

// Extract form fields from user task
function extractFormFields(element) {
  const fields = [];
  const formData = element.data['bpmn:formData'];

  if (formData) {
    const items = Array.isArray(formData['bpmn:formField'])
      ? formData['bpmn:formField']
      : [formData['bpmn:formField']];

    for (const item of items) {
      if (item) {
        fields.push({
          id: item['@_id'],
          label: item['@_label'] || item['@_id'],
          type: item['@_type'] || 'string',
          required: item['@_required'] === 'true'
        });
      }
    }
  }

  return fields;
}

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'bpmn-engine',
    version: '1.0.0',
    port: PORT,
    definitions: storage.definitions.size,
    instances: storage.instances.size,
    tasks: storage.tasks.size,
    timestamp: new Date().toISOString()
  });
});

// Import BPMN 2.0 XML
app.post('/api/bpmn/import', (req, res) => {
  try {
    const { xml, id, name } = req.body || {};

    if (!xml) {
      return res.status(400).json({ error: 'xml is required' });
    }

    const definition = parseBPMN(xml);
    if (id) definition.id = id;
    if (name) definition.name = name;

    storage.definitions.set(definition.id, definition);

    res.json({
      success: true,
      definition: {
        id: definition.id,
        name: definition.name,
        elements: Object.keys(definition.elements).length,
        flows: definition.flows.length
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Export BPMN 2.0 XML
app.get('/api/bpmn/export/:id', (req, res) => {
  const definition = storage.definitions.get(req.params.id);

  if (!definition) {
    return res.status(404).json({ error: 'Process definition not found' });
  }

  // Generate BPMN XML
  const xml = generateBPMN(definition);
  res.json({ id: definition.id, name: definition.name, xml });
});

// Create process definition
app.post('/api/bpmn/processes', (req, res) => {
  try {
    const { name, elements, flows } = req.body || {};

    if (!name || !elements) {
      return res.status(400).json({ error: 'name and elements are required' });
    }

    const id = 'process_' + crypto.randomUUID();
    const definition = {
      id,
      name,
      elements: elements.reduce((acc, el) => ({ ...acc, [el.id]: { ...el, data: el }), {}),
      flows: flows || [],
      createdAt: new Date().toISOString()
    };

    storage.definitions.set(id, definition);

    res.status(201).json(definition);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get process definition
app.get('/api/bpmn/processes/:id', (req, res) => {
  const definition = storage.definitions.get(req.params.id);

  if (!definition) {
    return res.status(404).json({ error: 'Process not found' });
  }

  res.json(definition);
});

// List process definitions
app.get('/api/bpmn/processes', (req, res) => {
  const definitions = Array.from(storage.definitions.values()).map(d => ({
    id: d.id,
    name: d.name,
    elements: Object.keys(d.elements).length,
    flows: d.flows.length,
    createdAt: d.createdAt
  }));

  res.json({ count: definitions.length, definitions });
});

// Start process instance
app.post('/api/bpmn/processes/:id/start', (req, res) => {
  try {
    const { id } = req.params;
    const { variables = {}, startElementId } = req.body || {};

    const definition = storage.definitions.get(id);
    if (!definition) {
      return res.status(404).json({ error: 'Process not found' });
    }

    // Find start event
    const startEvents = findStartEvents(definition.elements);
    if (startEvents.length === 0) {
      return res.status(400).json({ error: 'No start event found' });
    }

    const startElement = startElementId
      ? definition.elements[startElementId]
      : startEvents[0];

    const instanceId = 'inst_' + crypto.randomUUID();
    const now = new Date().toISOString();

    const instance = {
      id: instanceId,
      definitionId: id,
      definition,
      status: 'running',
      currentElements: [startElement.id],
      activeTasks: [],
      variables,
      history: [{ element: startElement.id, type: 'start', at: now }],
      startedAt: now,
      completedAt: null
    };

    storage.instances.set(instanceId, instance);

    // Execute start element
    const result = executeElement(startElement, instance, variables);

    res.status(201).json({
      instance: {
        id: instanceId,
        status: instance.status,
        currentElements: instance.currentElements,
        activeTasks: instance.activeTasks,
        result
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get process instance
app.get('/api/bpmn/instances/:id', (req, res) => {
  const instance = storage.instances.get(req.params.id);

  if (!instance) {
    return res.status(404).json({ error: 'Instance not found' });
  }

  res.json(instance);
});

// List process instances
app.get('/api/bpmn/instances', (req, res) => {
  const { definitionId, status } = req.query;

  let instances = Array.from(storage.instances.values());

  if (definitionId) {
    instances = instances.filter(i => i.definitionId === definitionId);
  }
  if (status) {
    instances = instances.filter(i => i.status === status);
  }

  res.json({
    count: instances.length,
    instances: instances.map(i => ({
      id: i.id,
      definitionId: i.definitionId,
      status: i.status,
      startedAt: i.startedAt,
      completedAt: i.completedAt
    }))
  });
});

// Complete human task
app.post('/api/bpmn/tasks/:id/complete', (req, res) => {
  try {
    const { id } = req.params;
    const { variables = {}, assignee } = req.body || {};

    const task = storage.tasks.get(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const instance = storage.instances.get(task.instanceId);
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    // Complete task
    task.status = TASK_STATES.COMPLETED;
    task.completedAt = new Date().toISOString();
    task.variables = variables;

    // Remove from active tasks
    instance.activeTasks = instance.activeTasks.filter(t => t !== id);

    // Merge task variables
    instance.variables = { ...instance.variables, ...variables };

    // Continue execution
    const element = instance.definition.elements[task.elementId];
    const flows = findOutgoingFlows(instance.definition.flows, element.id);

    if (flows.length > 0) {
      const nextElements = flows.map(f => f.targetRef);
      instance.currentElements = nextElements;
      instance.history.push({ element: task.elementId, type: 'complete', at: task.completedAt });

      // Execute next elements
      const results = [];
      for (const nextId of nextElements) {
        const nextElement = instance.definition.elements[nextId];
        if (nextElement) {
          const result = executeElement(nextElement, instance, instance.variables);
          results.push({ element: nextId, result });

          if (result.type === 'end') {
            instance.status = 'completed';
            instance.completedAt = new Date().toISOString();
          }
        }
      }

      res.json({ task, instance, continuation: results });
    } else {
      instance.status = 'completed';
      instance.completedAt = new Date().toISOString();
      res.json({ task, instance });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get human tasks
app.get('/api/bpmn/tasks', (req, res) => {
  const { instanceId, status } = req.query;

  let tasks = Array.from(storage.tasks.values());

  if (instanceId) {
    tasks = tasks.filter(t => t.instanceId === instanceId);
  }
  if (status) {
    tasks = tasks.filter(t => t.status === status);
  }

  res.json({ count: tasks.length, tasks });
});

// Get task
app.get('/api/bpmn/tasks/:id', (req, res) => {
  const task = storage.tasks.get(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

// Generate BPMN XML
function generateBPMN(definition) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                   xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                   xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                   id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${definition.id}" name="${definition.name}" isExecutable="true">`;

  for (const element of Object.values(definition.elements)) {
    xml += `
    <bpmn:${element.type} id="${element.id}" name="${element.name}"/>`;
  }

  for (const flow of definition.flows) {
    xml += `
    <bpmn:sequenceFlow id="${flow.id}" sourceRef="${flow.sourceRef}" targetRef="${flow.targetRef}"/>`;
  }

  xml += `
  </bpmn:process>
</bpmn:definitions>`;

  return xml;
}

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  console.log(`[bpmn-engine] listening on :${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[bpmn-engine] Shutting down...');
  server.close();
});

export { app };

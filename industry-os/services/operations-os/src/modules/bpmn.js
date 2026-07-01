/**
 * Operations OS - BPMN Designer Module
 * Business Process Model and Notation designer for workflow creation
 */

const { db } = require('../db/database');

class BPMNDesigner {
  constructor() {
    this.db = db;
  }

  /**
   * Create a new BPMN diagram
   */
  createDiagram(data) {
    const id = this.db.generateId('BPMN');

    const diagram = {
      id,
      name: data.name,
      description: data.description || '',
      processId: data.processId || null,
      version: data.version || 1,
      elements: [],
      connections: [],
      lanes: data.lanes || [],
      pools: data.pools || [],
      metadata: {
        createdBy: data.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    this.db.set('bpmnDiagrams', id, diagram);
    return diagram;
  }

  /**
   * Add element to diagram
   */
  addElement(diagramId, elementData) {
    const diagram = this.db.get('bpmnDiagrams', diagramId);
    if (!diagram) return null;

    const element = {
      id: this.db.generateId('EL'),
      diagramId,
      type: elementData.type, // startEvent, endEvent, task, serviceTask, userTask, gateway, subprocess
      name: elementData.name || '',
      description: elementData.description || '',
      position: elementData.position || { x: 0, y: 0 },
      size: elementData.size || { width: 120, height: 80 },
      properties: elementData.properties || {},
      forms: elementData.forms || [],
      documentation: elementData.documentation || '',
      assignee: elementData.assignee || null,
      candidateGroups: elementData.candidateGroups || [],
      isForCompensation: elementData.isForCompensation || false,
      loopCharacteristics: elementData.loopCharacteristics || null,
      multiInstance: elementData.multiInstance || null,
      ioSpecification: elementData.ioSpecification || null,
      dataInputs: elementData.dataInputs || [],
      dataOutputs: elementData.dataOutputs || [],
    };

    this.db.set('bpmnElements', element.id, element);
    diagram.elements.push(element.id);
    this.db.set('bpmnDiagrams', diagramId, diagram);

    return element;
  }

  /**
   * Add connection between elements
   */
  addConnection(diagramId, sourceId, targetId, connectionType = 'sequenceFlow') {
    const diagram = this.db.get('bpmnDiagrams', diagramId);
    if (!diagram) return null;

    const connection = {
      id: this.db.generateId('CONN'),
      diagramId,
      sourceId,
      targetId,
      type: connectionType, // sequenceFlow, messageFlow, association
      name: '',
      conditionExpression: null,
      sourceRef: sourceId,
      targetRef: targetId,
      waypoints: [],
      defaultFlow: false,
      properties: {},
    };

    this.db.set('bpmnConnections', connection.id, connection);
    diagram.connections.push(connection.id);
    this.db.set('bpmnDiagrams', diagramId, diagram);

    return connection;
  }

  /**
   * Add gateway
   */
  addGateway(diagramId, gatewayData) {
    return this.addElement(diagramId, {
      type: 'gateway',
      name: gatewayData.name || 'Gateway',
      properties: {
        gatewayType: gatewayData.gatewayType || 'exclusive', // exclusive, parallel, inclusive, event-based
        instantiate: gatewayData.instantiate || false,
        eventGatewayType: gatewayData.eventGatewayType || null,
      },
      ...gatewayData,
    });
  }

  /**
   * Add task
   */
  addTask(diagramId, taskData) {
    return this.addElement(diagramId, {
      type: 'task',
      name: taskData.name || 'Task',
      properties: {
        taskType: taskData.taskType || 'user', // user, service, script, manual, businessRule
        implementation: taskData.implementation || 'webService',
      },
      assignee: taskData.assignee,
      ...taskData,
    });
  }

  /**
   * Add subprocess
   */
  addSubprocess(diagramId, subprocessData) {
    return this.addElement(diagramId, {
      type: 'subprocess',
      name: subprocessData.name || 'Subprocess',
      properties: {
        triggeredByEvent: subprocessData.triggeredByEvent || false,
        subProcesses: [],
      },
      ...subprocessData,
    });
  }

  /**
   * Add lane
   */
  addLane(diagramId, laneData) {
    const diagram = this.db.get('bpmnDiagrams', diagramId);
    if (!diagram) return null;

    const lane = {
      id: this.db.generateId('LANE'),
      diagramId,
      name: laneData.name || 'Lane',
      partitionElement: laneData.partitionElement || null,
      elements: laneData.elements || [],
    };

    diagram.lanes.push(lane.id);
    this.db.set('bpmnLanes', lane.id, lane);
    this.db.set('bpmnDiagrams', diagramId, diagram);

    return lane;
  }

  /**
   * Get diagram with all elements
   */
  getDiagram(diagramId) {
    const diagram = this.db.get('bpmnDiagrams', diagramId);
    if (!diagram) return null;

    const elements = (diagram.elements || [])
      .map(id => this.db.get('bpmnElements', id))
      .filter(Boolean);

    const connections = (diagram.connections || [])
      .map(id => this.db.get('bpmnConnections', id))
      .filter(Boolean);

    const lanes = (diagram.lanes || [])
      .map(id => this.db.get('bpmnLanes', id))
      .filter(Boolean);

    return {
      ...diagram,
      elements,
      connections,
      lanes,
    };
  }

  /**
   * Export BPMN as JSON
   */
  export(diagramId) {
    const diagram = this.getDiagram(diagramId);
    if (!diagram) return null;

    return {
      id: diagram.id,
      name: diagram.name,
      processId: diagram.processId,
      version: diagram.version,
      elements: diagram.elements.map(el => ({
        id: el.id,
        type: el.type,
        name: el.name,
        position: el.position,
        properties: el.properties,
      })),
      connections: diagram.connections.map(conn => ({
        id: conn.id,
        type: conn.type,
        sourceId: conn.sourceId,
        targetId: conn.targetId,
      })),
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Validate BPMN diagram
   */
  validate(diagramId) {
    const diagram = this.getDiagram(diagramId);
    if (!diagram) return { valid: false, errors: ['Diagram not found'] };

    const errors = [];
    const warnings = [];

    // Check for start event
    const startEvents = diagram.elements.filter(el => el.type === 'startEvent');
    if (startEvents.length === 0) {
      errors.push('Diagram must have at least one start event');
    }
    if (startEvents.length > 1) {
      warnings.push('Multiple start events found');
    }

    // Check for end event
    const endEvents = diagram.elements.filter(el => el.type === 'endEvent');
    if (endEvents.length === 0) {
      errors.push('Diagram must have at least one end event');
    }

    // Check for orphaned elements
    const connectedElements = new Set();
    diagram.connections.forEach(conn => {
      connectedElements.add(conn.sourceId);
      connectedElements.add(conn.targetId);
    });

    diagram.elements.forEach(el => {
      if (!connectedElements.has(el.id) && !['startEvent', 'endEvent'].includes(el.type)) {
        warnings.push(`Element "${el.name}" is not connected`);
      }
    });

    // Check gateway branching
    const gateways = diagram.elements.filter(el => el.type === 'gateway');
    gateways.forEach(gw => {
      const outgoing = diagram.connections.filter(c => c.sourceId === gw.id);
      const incoming = diagram.connections.filter(c => c.targetId === gw.id);

      if (outgoing.length < 2 && gw.properties?.gatewayType !== 'exclusive') {
        warnings.push(`Gateway "${gw.name}" should have multiple outgoing flows`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate process from BPMN
   */
  generateProcess(diagramId) {
    const diagram = this.getDiagram(diagramId);
    if (!diagram) return null;

    const process = {
      id: this.db.generateId('PROC'),
      name: diagram.name,
      processId: diagram.processId,
      type: 'bpmn_generated',
      version: diagram.version,
      steps: [],
      gateways: [],
      createdAt: new Date().toISOString(),
    };

    // Convert elements to steps
    diagram.elements.forEach(el => {
      if (['task', 'serviceTask', 'userTask', 'scriptTask'].includes(el.type)) {
        process.steps.push({
          id: el.id,
          name: el.name,
          type: el.properties?.taskType || 'task',
          assignee: el.assignee,
          order: 0,
        });
      } else if (el.type === 'gateway') {
        process.gateways.push({
          id: el.id,
          name: el.name,
          type: el.properties?.gatewayType || 'exclusive',
        });
      }
    });

    // Order steps by connections
    const ordered = this.topologicalSort(diagram);

    return {
      process,
      orderedElements: ordered,
      diagramId,
    };
  }

  /**
   * Topological sort for execution order
   */
  topologicalSort(diagram) {
    const elements = diagram.elements;
    const connections = diagram.connections;

    const graph = new Map();
    const inDegree = new Map();

    elements.forEach(el => {
      graph.set(el.id, []);
      inDegree.set(el.id, 0);
    });

    connections.forEach(conn => {
      if (conn.type === 'sequenceFlow') {
        graph.get(conn.sourceId)?.push(conn.targetId);
        inDegree.set(conn.targetId, (inDegree.get(conn.targetId) || 0) + 1);
      }
    });

    const queue = [];
    const result = [];

    inDegree.forEach((degree, id) => {
      if (degree === 0) queue.push(id);
    });

    while (queue.length > 0) {
      const current = queue.shift();
      result.push(elements.find(el => el.id === current));
      graph.get(current)?.forEach(neighbor => {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
        if (inDegree.get(neighbor) === 0) queue.push(neighbor);
      });
    }

    return result;
  }
}

// Express routes
function registerBPMNRoutes(app) {
  const bpmn = new BPMNDesigner();

  // Create diagram
  app.post('/api/bpmn/diagrams', (req, res) => {
    const diagram = bpmn.createDiagram({
      ...req.body,
      userId: req.user?.userId,
    });
    res.status(201).json(diagram);
  });

  // Get all diagrams
  app.get('/api/bpmn/diagrams', (req, res) => {
    const diagrams = db.getAll('bpmnDiagrams');
    res.json({ diagrams, total: diagrams.length });
  });

  // Get diagram with elements
  app.get('/api/bpmn/diagrams/:id', (req, res) => {
    const diagram = bpmn.getDiagram(req.params.id);
    if (!diagram) return res.status(404).json({ error: 'Diagram not found' });
    res.json(diagram);
  });

  // Add element
  app.post('/api/bpmn/diagrams/:id/elements', (req, res) => {
    const element = bpmn.addElement(req.params.id, req.body);
    if (!element) return res.status(404).json({ error: 'Diagram not found' });
    res.status(201).json(element);
  });

  // Add task shortcut
  app.post('/api/bpmn/diagrams/:id/tasks', (req, res) => {
    const task = bpmn.addTask(req.params.id, req.body);
    if (!task) return res.status(404).json({ error: 'Diagram not found' });
    res.status(201).json(task);
  });

  // Add gateway shortcut
  app.post('/api/bpmn/diagrams/:id/gateways', (req, res) => {
    const gateway = bpmn.addGateway(req.params.id, req.body);
    if (!gateway) return res.status(404).json({ error: 'Diagram not found' });
    res.status(201).json(gateway);
  });

  // Add connection
  app.post('/api/bpmn/diagrams/:id/connections', (req, res) => {
    const { sourceId, targetId, type } = req.body;
    const connection = bpmn.addConnection(req.params.id, sourceId, targetId, type);
    if (!connection) return res.status(404).json({ error: 'Diagram not found' });
    res.status(201).json(connection);
  });

  // Validate diagram
  app.get('/api/bpmn/diagrams/:id/validate', (req, res) => {
    const validation = bpmn.validate(req.params.id);
    res.json(validation);
  });

  // Export diagram
  app.get('/api/bpmn/diagrams/:id/export', (req, res) => {
    const exported = bpmn.export(req.params.id);
    if (!exported) return res.status(404).json({ error: 'Diagram not found' });
    res.json(exported);
  });

  // Generate process from diagram
  app.post('/api/bpmn/diagrams/:id/generate', (req, res) => {
    const result = bpmn.generateProcess(req.params.id);
    if (!result) return res.status(404).json({ error: 'Diagram not found' });
    res.status(201).json(result);
  });

  // Delete diagram
  app.delete('/api/bpmn/diagrams/:id', (req, res) => {
    const diagram = db.get('bpmnDiagrams', req.params.id);
    if (!diagram) return res.status(404).json({ error: 'Diagram not found' });

    // Delete elements and connections
    diagram.elements?.forEach(id => db.delete('bpmnElements', id));
    diagram.connections?.forEach(id => db.delete('bpmnConnections', id));
    diagram.lanes?.forEach(id => db.delete('bpmnLanes', id));
    db.delete('bpmnDiagrams', req.params.id);

    res.json({ success: true });
  });
}

module.exports = { BPMNDesigner, registerBPMNRoutes };

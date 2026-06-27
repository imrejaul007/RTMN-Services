/**
 * BPMN Parser Service (Port 5372) - Phase 2.1
 *
 * Parses BPMN 2.0 XML into FlowOS DAG format.
 * Evaluates DMN decision tables.
 *
 * Supported BPMN Elements:
 * - StartEvent, EndEvent, TerminateEndEvent
 * - UserTask, ServiceTask, ScriptTask, ManualTask
 * - ExclusiveGateway, ParallelGateway, InclusiveGateway
 * - TimerEvent, SignalEvent, MessageEvent
 * - SubProcess, CallActivity
 * - SequenceFlow, ConditionalFlow
 *
 * Supported DMN Elements:
 * - DecisionTable
 * - InputClause, OutputClause
 * - Rule, Annotation
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT, 10) || 5372;
const SERVICE_NAME = 'bpmn-parser';
const DATA_DIR = process.env.BPMN_DATA_DIR || path.join(__dirname, '../data');

// ============================================================================
// BPMN TO FLOWOS MAPPING
// ============================================================================

const BPMN_NODE_TYPES = {
  'bpmn:StartEvent': 'trigger',
  'bpmn:EndEvent': 'terminal',
  'bpmn:TerminateEndEvent': 'terminal',
  'bpmn:UserTask': 'human_task',
  'bpmn:ServiceTask': 'service_task',
  'bpmn:ScriptTask': 'script_task',
  'bpmn:ManualTask': 'manual_task',
  'bpmn:ExclusiveGateway': 'condition',
  'bpmn:ParallelGateway': 'parallel',
  'bpmn:InclusiveGateway': 'conditional_parallel',
  'bpmn:TimerEvent': 'schedule',
  'bpmn:SignalEvent': 'signal',
  'bpmn:MessageEvent': 'message',
  'bpmn:SubProcess': 'subprocess',
  'bpmn:CallActivity': 'subprocess'
};

const BPMN_TASK_TYPES = {
  'bpmn:UserTask': 'human',
  'bpmn:ServiceTask': 'service',
  'bpmn:ScriptTask': 'script',
  'bpmn:ManualTask': 'manual'
};

// ============================================================================
// XML PARSER
// ============================================================================

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
  isArray: (name) => ['bpmn:task', 'bpmn:sequenceFlow', 'bpmn:rule', 'bpmn:input', 'bpmn:output', 'bpmn:inputEntry', 'bpmn:outputEntry'].includes(name)
});

// ============================================================================
// DATA PERSISTENCE
// ============================================================================

function ensureDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_) { /* ignore */ }
}

function getTemplatesPath() {
  return path.join(DATA_DIR, 'templates.json');
}

function loadTemplates() {
  try {
    if (!fs.existsSync(getTemplatesPath())) return {};
    return JSON.parse(fs.readFileSync(getTemplatesPath(), 'utf8'));
  } catch (_) {
    return {};
  }
}

function saveTemplates(templates) {
  ensureDir();
  fs.writeFileSync(getTemplatesPath(), JSON.stringify(templates, null, 2));
}

// Default workflow templates
const DEFAULT_TEMPLATES = {
  'approval-workflow': {
    id: 'approval-workflow',
    name: 'Approval Workflow',
    description: 'Standard multi-level approval process',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="ApprovalWorkflow" isExecutable="true">
    <startEvent id="Start" />
    <userTask id="SubmitRequest" name="Submit Request" />
    <userTask id="ManagerApproval" name="Manager Approval" />
    <exclusiveGateway id="ManagerDecision" name="Approved?">
      <outgoing>Flow_Approve</outgoing>
      <outgoing>Flow_Reject</outgoing>
    </exclusiveGateway>
    <userTask id="DirectorApproval" name="Director Approval" />
    <endEvent id="EndApproved" name="Approved" />
    <endEvent id="EndRejected" name="Rejected" />
    <sequenceFlow id="F1" sourceRef="Start" targetRef="SubmitRequest" />
    <sequenceFlow id="F2" sourceRef="SubmitRequest" targetRef="ManagerApproval" />
    <sequenceFlow id="F3" sourceRef="ManagerApproval" targetRef="ManagerDecision" />
    <sequenceFlow id="Flow_Approve" sourceRef="ManagerDecision" targetRef="DirectorApproval">
      <conditionExpression>approved == true</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="Flow_Reject" sourceRef="ManagerDecision" targetRef="EndRejected">
      <conditionExpression>approved == false</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="F6" sourceRef="DirectorApproval" targetRef="EndApproved" />
  </process>
</definitions>`,
    createdAt: Date.now()
  },
  'order-processing': {
    id: 'order-processing',
    name: 'Order Processing',
    description: 'E-commerce order fulfillment workflow',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="OrderProcessing" isExecutable="true">
    <startEvent id="Start" />
    <serviceTask id="ValidateOrder" name="Validate Order" />
    <serviceTask id="CheckInventory" name="Check Inventory" />
    <exclusiveGateway id="InventoryCheck" name="In Stock?">
      <outgoing>Flow_InStock</outgoing>
      <outgoing>Flow_OutOfStock</outgoing>
    </exclusiveGateway>
    <serviceTask id="ProcessPayment" name="Process Payment" />
    <serviceTask id="ShipOrder" name="Ship Order" />
    <serviceTask id="RefundOrder" name="Refund Order" />
    <endEvent id="EndSuccess" name="Order Complete" />
    <endEvent id="EndCancelled" name="Order Cancelled" />
    <sequenceFlow id="F1" sourceRef="Start" targetRef="ValidateOrder" />
    <sequenceFlow id="F2" sourceRef="ValidateOrder" targetRef="CheckInventory" />
    <sequenceFlow id="F3" sourceRef="CheckInventory" targetRef="InventoryCheck" />
    <sequenceFlow id="Flow_InStock" sourceRef="InventoryCheck" targetRef="ProcessPayment">
      <conditionExpression>inStock == true</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="Flow_OutOfStock" sourceRef="InventoryCheck" targetRef="RefundOrder">
      <conditionExpression>inStock == false</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="F6" sourceRef="ProcessPayment" targetRef="ShipOrder" />
    <sequenceFlow id="F7" sourceRef="ShipOrder" targetRef="EndSuccess" />
    <sequenceFlow id="F8" sourceRef="RefundOrder" targetRef="EndCancelled" />
  </process>
</definitions>`,
    createdAt: Date.now()
  }
};

// In-memory templates (load from file or use defaults)
let templates = loadTemplates();

// Initialize with defaults if empty
if (Object.keys(templates).length === 0) {
  templates = DEFAULT_TEMPLATES;
}

// ============================================================================
// BPMN PARSER
// ============================================================================

/**
 * Parse BPMN XML string to FlowOS DAG
 */
function parseBPMN(xmlString, options = {}) {
  try {
    const parsed = xmlParser.parse(xmlString);

    // Find definitions - handle both namespaced and non-namespaced
    const definitions = parsed['bpmn:definitions'] || parsed['definitions'];

    if (!definitions) {
      throw new Error('Invalid BPMN: missing definitions element');
    }

    // Get process - handle both namespaced and non-namespaced
    const process = definitions['bpmn:process'] || definitions['process'];
    if (!process) {
      throw new Error('Invalid BPMN: missing process element');
    }

    // Extract all BPMN elements
    const elements = extractElements(process);

    // Build node map
    const nodeMap = buildNodeMap(elements, options);

    // Extract sequence flows
    const flows = extractFlows(process, elements);

    // Build edges from flows
    const edges = buildEdges(flows, nodeMap);

    // Build FlowOS DAG
    const dag = {
      id: options.id || uuidv4(),
      name: process['@_name'] || process['@_id'] || 'Unnamed Process',
      description: options.description || '',
      version: options.version || '1.0.0',
      nodes: Object.values(nodeMap).filter(n => n.flowosType !== 'gateway_marker'),
      edges: edges,
      metadata: {
        bpmnId: process['@_id'] || process.id,
        parsedAt: Date.now(),
        nodeCount: Object.keys(nodeMap).length,
        edgeCount: edges.length
      },
      stats: {
        triggers: Object.values(nodeMap).filter(n => n.flowosType === 'trigger').length,
        terminals: Object.values(nodeMap).filter(n => n.flowosType === 'terminal').length,
        humanTasks: Object.values(nodeMap).filter(n => n.flowosType === 'human_task').length,
        serviceTasks: Object.values(nodeMap).filter(n => n.flowosType === 'service_task').length,
        conditions: Object.values(nodeMap).filter(n => n.flowosType === 'condition').length,
        parallel: Object.values(nodeMap).filter(n => n.flowosType === 'parallel').length
      }
    };

    return dag;

  } catch (error) {
    throw new Error(`BPMN parse error: ${error.message}`);
  }
}

/**
 * Extract all BPMN elements from process
 */
function extractElements(process) {
  const elements = {};

  // BPMN element type to canonical type mapping
  const typeMap = {
    'startEvent': 'bpmn:StartEvent',
    'endEvent': 'bpmn:EndEvent',
    'terminateEndEvent': 'bpmn:TerminateEndEvent',
    'userTask': 'bpmn:UserTask',
    'serviceTask': 'bpmn:ServiceTask',
    'scriptTask': 'bpmn:ScriptTask',
    'manualTask': 'bpmn:ManualTask',
    'task': 'bpmn:ServiceTask',
    'exclusiveGateway': 'bpmn:ExclusiveGateway',
    'parallelGateway': 'bpmn:ParallelGateway',
    'inclusiveGateway': 'bpmn:InclusiveGateway',
    'gateway': 'bpmn:ExclusiveGateway',
    'sequenceFlow': 'bpmn:SequenceFlow',
    'subProcess': 'bpmn:SubProcess',
    'callActivity': 'bpmn:CallActivity',
    'timerEventDefinition': 'bpmn:TimerEvent',
    'signalEventDefinition': 'bpmn:SignalEvent',
    'messageEventDefinition': 'bpmn:MessageEvent'
  };

  // Recursive extraction helper
  function extract(obj) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      // If this is a BPMN element array, extract each item
      const objType = obj[0] && Object.keys(typeMap).find(t => typeMap[t] === obj[0]?.type);
      if (objType) {
        obj.forEach(item => extract(item));
      } else {
        // Otherwise, recurse into each item
        obj.forEach(item => extract(item));
      }
      return;
    }

    // Check if this object has a BPMN element type as a key
    for (const [key, value] of Object.entries(obj)) {
      if (typeMap[key]) {
        // This is a BPMN element - handle both array and single object
        const items = Array.isArray(value) ? value : [value];
        for (const item of items) {
          const elementId = item['@_id'] || item.id;
          if (elementId && !elements[elementId]) {
            elements[elementId] = {
              type: typeMap[key],
              id: elementId,
              name: item['@_name'] || item.name || '',
              ...item
            };
          }
        }
      }
    }

    // Recurse into all values (except BPMN type keys which we handled above)
    for (const [key, value] of Object.entries(obj)) {
      if (typeMap[key]) continue; // Skip BPMN type keys
      if (value && typeof value === 'object') {
        extract(value);
      }
    }
  }

  extract(process);
  return elements;
}

/**
 * Build node map from BPMN elements
 */
function buildNodeMap(elements, options = {}) {
  const nodeMap = {};
  const gatewayMarkers = new Set();

  for (const [id, element] of Object.entries(elements)) {
    const bpmnType = element.type;

    // Skip sequence flows
    if (bpmnType === 'bpmn:SequenceFlow') continue;

    // Get FlowOS type
    const flowosType = BPMN_NODE_TYPES[bpmnType] || 'unknown';

    // Create node
    const node = {
      id: id,
      bpmnId: id,
      bpmnType: bpmnType.replace('bpmn:', ''),
      flowosType: flowosType,
      name: element.name || element['@_name'] || id,
      data: extractElementData(element),
      position: extractPosition(element)
    };

    // Handle specific types
    if (flowosType === 'human_task') {
      node.taskType = 'human';
      node.assignee = element['bpmn:humanPerformer']?.['bpmn:humanPerformer']?.['@_name'] ||
                     element['bpmn:potentialOwner']?.['bpmn:potentialOwner']?.['@_name'];
      node.formFields = extractFormFields(element);
    }

    if (flowosType === 'service_task') {
      node.taskType = 'service';
      node.implementation = element['@_implementation'] || 'WebService';
      node.operationRef = extractOperationRef(element);
    }

    if (flowosType === 'script_task') {
      node.taskType = 'script';
      node.script = extractScript(element);
    }

    if (flowosType === 'condition') {
      node.conditionType = 'exclusive';
      node.defaultFlow = element['@_default'] === 'true';
    }

    if (flowosType === 'parallel') {
      node.gatewayType = 'parallel';
      node.joinBehavior = 'all';
      node.splitBehavior = 'all';
    }

    if (flowosType === 'conditional_parallel') {
      node.gatewayType = 'inclusive';
      node.joinBehavior = 'all';
      node.splitBehavior = 'complex';
    }

    if (flowosType === 'schedule') {
      node.schedule = extractTimerDefinition(element);
    }

    if (flowosType === 'subprocess') {
      node.isEmbedded = element['@_triggeredByEvent'] !== 'true';
    }

    nodeMap[id] = node;
  }

  return nodeMap;
}

/**
 * Extract element-specific data
 */
function extractElementData(element) {
  const data = {};

  // Documentation
  if (element['bpmn:documentation']) {
    const docs = Array.isArray(element['bpmn:documentation'])
      ? element['bpmn:documentation']
      : [element['bpmn:documentation']];
    data.documentation = docs.map(d => d['#text'] || d).filter(Boolean).join('\n');
  }

  // Multi-instance (loop characteristics)
  if (element['bpmn:multiInstanceLoopCharacteristics']) {
    data.loopType = 'multiInstance';
    const mi = element['bpmn:multiInstanceLoopCharacteristics'];
    data.loopCardinality = mi['bpmn:loopCardinality']?.['@_value'] ||
                          mi['bpmn:loopDataInputRef'];
    data.loopCollection = mi['bpmn:loopDataInputRef'];
    data.completionCondition = mi['bpmn:completionCondition'];
  }

  if (element['bpmn:standardLoopCharacteristics']) {
    data.loopType = 'standard';
    data.loopMaximum = element['bpmn:standardLoopCharacteristics']?.['@_maximumLoopCounter'];
  }

  // Resource assignments
  if (element['bpmn:resourceAssignmentExpression']) {
    data.resources = extractResources(element);
  }

  // IO specification
  if (element['bpmn:ioSpecification']) {
    data.ioSpec = extractIOSpec(element['bpmn:ioSpecification']);
  }

  return data;
}

/**
 * Extract position from DI (Diagram Interchange)
 */
function extractPosition(element) {
  // In a full implementation, this would parse the DI elements
  // For now, return placeholder
  return { x: 0, y: 0 };
}

/**
 * Extract form fields for human tasks
 */
function extractFormFields(element) {
  const fields = [];

  if (element['bpmn:formProperty']) {
    const props = Array.isArray(element['bpmn:formProperty'])
      ? element['bpmn:formProperty']
      : [element['bpmn:formProperty']];

    for (const prop of props) {
      fields.push({
        id: prop['@_id'],
        name: prop['@_name'],
        type: prop['@_type'] || 'string',
        required: prop['@_required'] === 'true',
        defaultValue: prop['@_default']
      });
    }
  }

  return fields;
}

/**
 * Extract operation reference for service tasks
 */
function extractOperationRef(element) {
  if (element['bpmn:operationRef']) {
    return element['bpmn:operationRef']['@_operationRef'];
  }
  return null;
}

/**
 * Extract script from script tasks
 */
function extractScript(element) {
  if (element['bpmn:script']) {
    return element['bpmn:script']['#text'] || element['bpmn:script'];
  }
  return null;
}

/**
 * Extract timer definition
 */
function extractTimerDefinition(element) {
  const timerEventDef = element['bpmn:timerEventDefinition'];
  if (!timerEventDef) return null;

  if (timerEventDef['bpmn:timeDate']) {
    return { type: 'date', value: timerEventDef['bpmn:timeDate']['@_value'] || timerEventDef['bpmn:timeDate'] };
  }

  if (timerEventDef['bpmn:timeDuration']) {
    return { type: 'duration', value: timerEventDef['bpmn:timeDuration']['@_value'] || timerEventDef['bpmn:timeDuration'] };
  }

  if (timerEventDef['bpmn:timeCycle']) {
    return { type: 'cycle', value: timerEventDef['bpmn:timeCycle']['@_value'] || timerEventDef['bpmn:timeCycle'] };
  }

  return null;
}

/**
 * Extract resources
 */
function extractResources(element) {
  const resources = [];
  const expr = element['bpmn:resourceAssignmentExpression'];

  if (expr?.['bpmn:formalExpression']) {
    const fe = expr['bpmn:formalExpression'];
    const resourceRefs = Array.isArray(fe) ? fe : [fe];

    for (const ref of resourceRefs) {
      const val = ref['#text'] || ref;
      if (typeof val === 'string') {
        resources.push(val);
      }
    }
  }

  return resources;
}

/**
 * Extract IO specification
 */
function extractIOSpec(element) {
  const spec = {
    inputs: [],
    outputs: []
  };

  if (element.inputs) {
    for (const input of element.inputs) {
      spec.inputs.push({
        id: input.id,
        name: input.name,
        dataType: input.dataType
      });
    }
  }

  if (element.outputs) {
    for (const output of element.outputs) {
      spec.outputs.push({
        id: output.id,
        name: output.name,
        dataType: output.dataType
      });
    }
  }

  return spec;
}

/**
 * Extract sequence flows
 */
function extractFlows(process, elements) {
  const flows = [];

  // Find all sequence flows
  for (const [id, element] of Object.entries(elements)) {
    if (element.type === 'bpmn:SequenceFlow' || element.type === 'SequenceFlow') {
      flows.push({
        id: element.id,
        sourceRef: element['@_sourceRef'] || element.sourceRef,
        targetRef: element['@_targetRef'] || element.targetRef,
        name: element.name,
        conditionExpression: extractConditionExpression(element),
        isDefault: element['@_default'] === 'true'
      });
    }
  }

  return flows;
}

/**
 * Extract condition expression from flow
 */
function extractConditionExpression(element) {
  // Check for namespaced and non-namespaced conditionExpression
  let ce = element['bpmn:conditionExpression'] || element.conditionExpression;
  if (!ce) return null;

  // Handle array case (multiple condition expressions)
  if (Array.isArray(ce)) ce = ce[0];

  // If ce is a string, it's the body itself
  if (typeof ce === 'string') {
    return { body: ce, type: 'bpmn:tFormalExpression' };
  }

  return {
    type: ce['@_xsi:type'] || ce.xsi_type || 'bpmn:tFormalExpression',
    language: ce['@_language'] || ce.language,
    body: ce['#text'] || ce.text || ce
  };
}

/**
 * Build edges from sequence flows
 */
function buildEdges(flows, nodeMap) {
  const edges = [];

  for (const flow of flows) {
    const sourceNode = nodeMap[flow.sourceRef];
    const targetNode = nodeMap[flow.targetRef];

    if (sourceNode && targetNode) {
      const edge = {
        id: flow.id,
        source: flow.sourceRef,
        target: flow.targetRef,
        type: 'sequence'
      };

      // Add condition if present
      if (flow.conditionExpression) {
        edge.condition = flow.conditionExpression.body;
        edge.conditionType = flow.conditionExpression.type.includes('Formal') ? 'expression' : 'script';
      }

      // Mark default flows
      if (flow.isDefault) {
        edge.isDefault = true;
      }

      edges.push(edge);
    }
  }

  return edges;
}

// ============================================================================
// DMN PARSER
// ============================================================================

/**
 * Parse DMN XML string to decision table
 */
function parseDMN(xmlString, options = {}) {
  try {
    const parsed = xmlParser.parse(xmlString);

    // Handle both namespaced and non-namespaced
    const definitions = parsed['dmnd:definitions'] || parsed['definitions'];

    if (!definitions) {
      throw new Error('Invalid DMN: missing definitions element');
    }

    const decisions = definitions['dmnd:decision'] || definitions['decision'] || [];
    const decisionList = Array.isArray(decisions) ? decisions : [decisions];

    return decisionList.map(decision => parseDecision(decision, options));

  } catch (error) {
    throw new Error(`DMN parse error: ${error.message}`);
  }
}

/**
 * Parse a single decision
 */
function parseDecision(decision, options = {}) {
  const id = decision['@_id'] || decision.id;
  const name = decision['@_name'] || decision.name;

  // Find decision table (handle namespaced and non-namespaced)
  const decisionTable = decision.decisionTable;

  if (!decisionTable) {
    return {
      id,
      name,
      type: 'unknown',
      message: 'No decision table found'
    };
  }

  // Extract inputs (handle both single and array)
  let rawInputs = decisionTable.input;
  if (rawInputs && !Array.isArray(rawInputs)) rawInputs = [rawInputs];
  const inputs = (rawInputs || []).map(parseInput);

  // Extract outputs (handle both single and array)
  let rawOutputs = decisionTable.output;
  if (rawOutputs && !Array.isArray(rawOutputs)) rawOutputs = [rawOutputs];
  const outputs = (rawOutputs || []).map(parseOutput);

  // Extract rules (handle both single and array)
  let rawRules = decisionTable.rule;
  if (rawRules && !Array.isArray(rawRules)) rawRules = [rawRules];
  const rules = (rawRules || []).map(rule => parseRule(rule, inputs.length, outputs.length));

  // Extract annotations
  const annotations = decisionTable.annotations?.text || '';

  return {
    id,
    name,
    type: 'decisionTable',
    hitPolicy: decisionTable['@_hitPolicy'] || decisionTable.hitPolicy || 'UNIQUE',
    aggregation: decisionTable['@_aggregation'] || decisionTable.aggregation,
    inputs,
    outputs,
    rules,
    annotations,
    compiledAt: Date.now()
  };
}

/**
 * Parse DMN input clause
 */
function parseInput(input) {
  const inputExpr = input.inputExpression || {};
  const inputValues = input.inputValues;

  return {
    id: input['@_id'] || input.id,
    label: input['@_label'] || inputExpr.name || input['@_id'] || input.id,
    type: inputExpr['@_typeRef'] || inputExpr.typeRef || 'string',
    expression: typeof inputExpr === 'string' ? inputExpr : (inputExpr.text || ''),
    inputValues: inputValues ? {
      text: inputValues.text,
      type: 'expression'
    } : null
  };
}

/**
 * Parse DMN output clause
 */
function parseOutput(output) {
  return {
    id: output['@_id'] || output.id,
    label: output['@_name'] || output.name,
    type: output['@_typeRef'] || output.typeRef || 'string'
  };
}

/**
 * Parse DMN rule
 */
function parseRule(rule, inputCount, outputCount) {
  const parsedRule = {
    id: rule['@_id'] || rule.id
  };

  // Parse input entries (handle both single and array)
  let inputEntries = rule.inputEntry;
  if (inputEntries && !Array.isArray(inputEntries)) inputEntries = [inputEntries];
  parsedRule.conditions = (inputEntries || []).map(entry => ({
    operator: '==',
    value: typeof entry === 'string' ? entry : (entry.text || '')
  }));

  // Parse output entries (handle both single and array)
  let outputEntries = rule.outputEntry;
  if (outputEntries && !Array.isArray(outputEntries)) outputEntries = [outputEntries];
  parsedRule.conclusions = (outputEntries || []).map(entry => ({
    value: typeof entry === 'string' ? entry : String(entry.text || entry)
  }));

  // Parse description/annotation
  parsedRule.description = rule.description || '';

  return parsedRule;
}

/**
 * Evaluate DMN decision table
 */
function evaluateDMN(decisionTable, inputs) {
  if (!decisionTable.rules) {
    return { matched: false, outputs: {} };
  }

  // Match rules based on hit policy
  const matchedRules = [];

  for (const rule of decisionTable.rules) {
    if (matchesRule(rule, inputs)) {
      matchedRules.push(rule);
    }
  }

  if (matchedRules.length === 0) {
    return { matched: false, outputs: {} };
  }

  // Apply hit policy
  let selectedRule;

  switch (decisionTable.hitPolicy) {
    case 'FIRST':
      selectedRule = matchedRules[0];
      break;
    case 'UNIQUE':
      selectedRule = matchedRules.length === 1 ? matchedRules[0] : null;
      break;
    case 'ANY':
      selectedRule = matchedRules[0];
      break;
    case 'PRIORITY':
      selectedRule = matchedRules.reduce((best, rule) =>
        !best || getPriority(rule) > getPriority(best) ? rule : best
      );
      break;
    case 'COLLECT':
      return {
        matched: true,
        outputs: matchedRules.map(rule => extractOutputs(rule, decisionTable))
      };
    case 'RULE ORDER':
      return {
        matched: true,
        outputs: matchedRules.map(rule => extractOutputs(rule, decisionTable))
      };
    case 'OUTPUT ORDER':
      return {
        matched: true,
        outputs: matchedRules
          .sort((a, b) => getPriority(b) - getPriority(a))
          .map(rule => extractOutputs(rule, decisionTable))
      };
    default:
      selectedRule = matchedRules[0];
  }

  if (!selectedRule) {
    return { matched: false, error: 'Multiple matching rules with UNIQUE policy' };
  }

  return {
    matched: true,
    outputs: extractOutputs(selectedRule, decisionTable)
  };
}

/**
 * Check if inputs match rule conditions
 */
function matchesRule(rule, inputs) {
  for (let i = 0; i < rule.conditions.length; i++) {
    const condition = rule.conditions[i];
    const input = inputs[i];

    if (!matchesCondition(condition, input)) {
      return false;
    }
  }
  return true;
}

/**
 * Check if input matches condition
 */
function matchesCondition(condition, input) {
  if (condition.value === '-') return true; // Dash means "else"
  if (input === undefined || input === null) return false;

  // Simple equality check - in production, use expression evaluator
  return String(input) === condition.value.replace(/"/g, '');
}

/**
 * Extract outputs from matched rule
 */
function extractOutputs(rule, decisionTable) {
  const outputs = {};
  for (let i = 0; i < rule.conclusions.length; i++) {
    const outputLabel = decisionTable.outputs[i]?.label || `output_${i}`;
    outputs[outputLabel] = rule.conclusions[i].value.replace(/"/g, '');
  }
  return outputs;
}

/**
 * Get priority for PRIORITY/OUTPUT ORDER policies
 */
function getPriority(rule) {
  return rule.conclusions[0]?.value || '';
}

// ============================================================================
// BPMN VALIDATION
// ============================================================================

/**
 * Validate BPMN structure
 */
function validateBPMN(xmlString) {
  const errors = [];
  const warnings = [];

  try {
    const parsed = xmlParser.parse(xmlString);

    // Handle both namespaced and non-namespaced
    const definitions = parsed['bpmn:definitions'] || parsed.definitions;

    if (!definitions) {
      errors.push('Missing definitions element');
      return { valid: false, errors, warnings };
    }

    const process = definitions['bpmn:process'] || definitions.process;

    if (!process) {
      errors.push('Missing process element');
      return { valid: false, errors, warnings };
    }

    // Extract elements
    const elements = extractElements(process);
    const flows = extractFlows(process, elements);

    // Check for start events
    const startEvents = Object.values(elements).filter(e =>
      e.type === 'bpmn:StartEvent' || e.type === 'StartEvent'
    );

    if (startEvents.length === 0) {
      warnings.push('No start event found');
    }

    // Check for end events
    const endEvents = Object.values(elements).filter(e =>
      e.type === 'bpmn:EndEvent' || e.type === 'bpmn:TerminateEndEvent' ||
      e.type === 'EndEvent' || e.type === 'TerminateEndEvent'
    );

    if (endEvents.length === 0) {
      warnings.push('No end event found');
    }

    // Check for orphaned nodes
    const sourceRefs = new Set(flows.map(f => f.sourceRef));
    const targetRefs = new Set(flows.map(f => f.targetRef));

    for (const [id, element] of Object.entries(elements)) {
      if (element.type === 'bpmn:SequenceFlow' || element.type === 'SequenceFlow') continue;

      if (!sourceRefs.has(id) && !targetRefs.has(id) &&
          element.type !== 'bpmn:StartEvent' && element.type !== 'StartEvent') {
        warnings.push(`Node "${id}" is not connected to any flow`);
      }
    }

    // Check for duplicate IDs
    const ids = new Set(Object.keys(elements));
    if (ids.size !== Object.keys(elements).length) {
      warnings.push('Duplicate element IDs detected');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalElements: Object.keys(elements).length,
        flows: flows.length,
        startEvents: startEvents.length,
        endEvents: endEvents.length
      }
    };

  } catch (error) {
    errors.push(`Parse error: ${error.message}`);
    return { valid: false, errors, warnings };
  }
}

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan(`[${SERVICE_NAME}] :method :url :status :response-time ms`));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// ============================================================================
// BPMN ENDPOINTS
// ============================================================================

// Parse BPMN
app.post('/api/bpmn/parse', (req, res) => {
  try {
    const { xml, options } = req.body;

    if (!xml || typeof xml !== 'string') {
      return res.status(400).json({
        error: 'xml string is required',
        example: { xml: '<bpmn:definitions...', options: { id: 'my-process' } }
      });
    }

    const dag = parseBPMN(xml, options);

    res.json({
      success: true,
      dag
    });

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Parse error:`, error);
    res.status(400).json({ error: error.message });
  }
});

// Validate BPMN
app.post('/api/bpmn/validate', (req, res) => {
  try {
    const { xml } = req.body;

    if (!xml || typeof xml !== 'string') {
      return res.status(400).json({ error: 'xml string is required' });
    }

    const result = validateBPMN(xml);

    res.json(result);

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Validation error:`, error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// TEMPLATE ENDPOINTS
// ============================================================================

// Save template
app.post('/api/bpmn/templates', (req, res) => {
  try {
    const { id, name, xml, dag, description } = req.body;

    if (!name || !xml) {
      return res.status(400).json({ error: 'name and xml are required' });
    }

    const templateId = id || uuidv4();

    // Parse and store
    const parsedDag = dag || parseBPMN(xml, { id: templateId, name });

    templates[templateId] = {
      id: templateId,
      name,
      xml,
      dag: parsedDag,
      description: description || '',
      createdAt: Date.now()
    };

    saveTemplates(templates);

    res.status(201).json({
      success: true,
      template: templates[templateId]
    });

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Template save error:`, error);
    res.status(400).json({ error: error.message });
  }
});

// List templates
app.get('/api/bpmn/templates', (req, res) => {
  try {
    const { search } = req.query;

    let result = Object.values(templates);

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      count: result.length,
      templates: result.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        nodeCount: t.dag?.stats?.humanTasks + t.dag?.stats?.serviceTasks || 0,
        createdAt: t.createdAt
      }))
    });

  } catch (error) {
    console.error(`[${SERVICE_NAME}] List error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get template
app.get('/api/bpmn/templates/:id', (req, res) => {
  try {
    const template = templates[req.params.id];

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template });

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Get error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete template
app.delete('/api/bpmn/templates/:id', (req, res) => {
  try {
    if (!templates[req.params.id]) {
      return res.status(404).json({ error: 'Template not found' });
    }

    delete templates[req.params.id];
    saveTemplates(templates);

    res.json({ success: true });

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Delete error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DMN ENDPOINTS
// ============================================================================

// Parse DMN
app.post('/api/dmn/parse', (req, res) => {
  try {
    const { xml } = req.body;

    if (!xml || typeof xml !== 'string') {
      return res.status(400).json({
        error: 'xml string is required'
      });
    }

    const decisions = parseDMN(xml);

    res.json({
      success: true,
      decisions
    });

  } catch (error) {
    console.error(`[${SERVICE_NAME}] DMN parse error:`, error);
    res.status(400).json({ error: error.message });
  }
});

// Evaluate DMN
app.post('/api/dmn/evaluate', (req, res) => {
  try {
    const { decisionTable, inputs } = req.body;

    if (!decisionTable) {
      return res.status(400).json({ error: 'decisionTable is required' });
    }

    if (!inputs || typeof inputs !== 'object') {
      return res.status(400).json({ error: 'inputs object is required' });
    }

    const result = evaluateDMN(decisionTable, Object.values(inputs));

    res.json(result);

  } catch (error) {
    console.error(`[${SERVICE_NAME}] DMN evaluate error:`, error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  ensureDir();
  console.log(`[${SERVICE_NAME}] BPMN Parser Service started on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] Data directory: ${DATA_DIR}`);
});

module.exports = {
  parseBPMN,
  validateBPMN,
  parseDMN,
  evaluateDMN,
  BPMN_NODE_TYPES
};

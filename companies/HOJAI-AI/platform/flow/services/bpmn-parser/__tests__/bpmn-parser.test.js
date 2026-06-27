/**
 * BPMN Parser Tests
 * Port: 5372
 * Tests BPMN 2.0 XML parsing and DMN decision table evaluation
 */

const { describe, it, beforeEach, after, before } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Set test data directory
process.env.PORT = '5372';
process.env.BPMN_DATA_DIR = path.join(__dirname, '../test-data');

const BASE_URL = 'http://localhost:5372';
let server = null;

// Simple HTTP client
async function request(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', () => resolve({ status: 503, data: {} }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Wait for server to be ready
async function waitForServer(maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await request('/health');
      if (res.status === 200) return true;
    } catch (_) { /* ignore */ }
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

// Clean test data
function cleanTestData() {
  const dir = process.env.BPMN_DATA_DIR;
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

// Start server before all tests
before(async () => {
  cleanTestData();

  // Start the server
  server = spawn('node', ['src/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '5372', BPMN_DATA_DIR: path.join(__dirname, '../test-data') },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Wait for server to be ready
  const ready = await waitForServer();
  if (!ready) {
    throw new Error('Server failed to start');
  }
});

// Stop server after all tests
after(() => {
  if (server) {
    server.kill();
  }
  cleanTestData();
});

// Sample BPMN XML for order processing
const SAMPLE_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DDDC/20100524/DC"
             targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="OrderProcess" isExecutable="true">
    <startEvent id="Start" />
    <userTask id="ValidateOrder" name="Validate Order">
      <incoming>Flow_1</incoming>
      <outgoing>Flow_2</outgoing>
    </userTask>
    <exclusiveGateway id="Gateway" name="Order Valid?">
      <incoming>Flow_2</incoming>
      <outgoing>Flow_3a</outgoing>
      <outgoing>Flow_3b</outgoing>
    </exclusiveGateway>
    <serviceTask id="ProcessPayment" name="Process Payment">
      <incoming>Flow_3a</incoming>
      <outgoing>Flow_4</outgoing>
    </serviceTask>
    <serviceTask id="RejectOrder" name="Reject Order">
      <incoming>Flow_3b</incoming>
      <outgoing>Flow_5</outgoing>
    </serviceTask>
    <endEvent id="End" />
    <sequenceFlow id="Flow_1" sourceRef="Start" targetRef="ValidateOrder" />
    <sequenceFlow id="Flow_2" sourceRef="ValidateOrder" targetRef="Gateway" />
    <sequenceFlow id="Flow_3a" sourceRef="Gateway" targetRef="ProcessPayment">
      <conditionExpression>valid == true</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="Flow_3b" sourceRef="Gateway" targetRef="RejectOrder">
      <conditionExpression>valid == false</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="Flow_4" sourceRef="ProcessPayment" targetRef="End" />
    <sequenceFlow id="Flow_5" sourceRef="RejectOrder" targetRef="End" />
  </process>
</definitions>`;

// Sample parallel BPMN
const PARALLEL_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="ParallelProcess" isExecutable="true">
    <startEvent id="Start" />
    <parallelGateway id="Fork" gatewayDirection="Diverging" />
    <serviceTask id="Task1" name="Task 1" />
    <serviceTask id="Task2" name="Task 2" />
    <parallelGateway id="Join" gatewayDirection="Converging" />
    <endEvent id="End" />
    <sequenceFlow id="Flow_1" sourceRef="Start" targetRef="Fork" />
    <sequenceFlow id="Flow_2" sourceRef="Fork" targetRef="Task1" />
    <sequenceFlow id="Flow_3" sourceRef="Fork" targetRef="Task2" />
    <sequenceFlow id="Flow_4" sourceRef="Task1" targetRef="Join" />
    <sequenceFlow id="Flow_5" sourceRef="Task2" targetRef="Join" />
    <sequenceFlow id="Flow_6" sourceRef="Join" targetRef="End" />
  </process>
</definitions>`;

// Sample DMN
const SAMPLE_DMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/DMN/20191111/MODEL"
             xmlns:dmndi="http://www.omg.org/spec/DMN/20191111/DMNDI"
             targetNamespace="http://www.omg.org/spec/DMN/20191111/MODEL">
  <decision id="PricingDecision" name="Pricing Decision">
    <decisionTable id="PricingTable" hitPolicy="FIRST">
      <input id="Input1" label="Customer Type">
        <inputExpression typeRef="string">
          <text>customerType</text>
        </inputExpression>
      </input>
      <input id="Input2" label="Order Amount">
        <inputExpression typeRef="number">
          <text>orderAmount</text>
        </inputExpression>
      </input>
      <output id="Output1" label="Discount %" name="discount" typeRef="number" />
      <rule id="Rule1">
        <inputEntry id="InputEntry1"><text>"premium"</text></inputEntry>
        <inputEntry id="InputEntry2"><text>>= 1000</text></inputEntry>
        <outputEntry id="OutputEntry1"><text>15</text></outputEntry>
      </rule>
      <rule id="Rule2">
        <inputEntry id="InputEntry3"><text>"regular"</text></inputEntry>
        <inputEntry id="InputEntry4"><text>>= 500</text></inputEntry>
        <outputEntry id="OutputEntry2"><text>10</text></outputEntry>
      </rule>
      <rule id="Rule3">
        <inputEntry id="InputEntry5"><text></text></inputEntry>
        <inputEntry id="InputEntry6"><text></text></inputEntry>
        <outputEntry id="OutputEntry3"><text>0</text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
</definitions>`;

describe('BPMN Parser - Health', () => {
  it('should return healthy status', async () => {
    const res = await request('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'healthy');
    assert.strictEqual(res.data.service, 'bpmn-parser');
  });

  it('should return ready status', async () => {
    const res = await request('/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ready');
  });
});

describe('BPMN Parser - Parse BPMN XML', () => {
  beforeEach(() => {
    cleanTestData();
  });

  it('should parse simple BPMN XML to FlowOS DAG', async () => {
    const res = await request('/api/bpmn/parse', 'POST', { xml: SAMPLE_BPMN });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.dag);
    assert.strictEqual(res.data.dag.name, 'OrderProcess');
    assert.ok(Array.isArray(res.data.dag.nodes));
    assert.ok(Array.isArray(res.data.dag.edges));
  });

  it('should parse start event as trigger node', async () => {
    const res = await request('/api/bpmn/parse', 'POST', { xml: SAMPLE_BPMN });

    const triggerNode = res.data.dag.nodes.find(n => n.flowosType === 'trigger');
    assert.ok(triggerNode, 'Should have a trigger node');
    assert.strictEqual(triggerNode.id, 'Start');
  });

  it('should parse end event as terminal node', async () => {
    const res = await request('/api/bpmn/parse', 'POST', { xml: SAMPLE_BPMN });

    const terminalNodes = res.data.dag.nodes.filter(n => n.flowosType === 'terminal');
    assert.ok(terminalNodes.length > 0, 'Should have terminal node(s)');
  });

  it('should parse user tasks as human_task nodes', async () => {
    const res = await request('/api/bpmn/parse', 'POST', { xml: SAMPLE_BPMN });

    const humanTask = res.data.dag.nodes.find(n => n.flowosType === 'human_task');
    assert.ok(humanTask, 'Should have a human_task node');
    assert.strictEqual(humanTask.name, 'Validate Order');
  });

  it('should parse service tasks as service_task nodes', async () => {
    const res = await request('/api/bpmn/parse', 'POST', { xml: SAMPLE_BPMN });

    const serviceTasks = res.data.dag.nodes.filter(n => n.flowosType === 'service_task');
    assert.ok(serviceTasks.length >= 2, 'Should have service tasks');
  });

  it('should parse exclusive gateway as condition node', async () => {
    const res = await request('/api/bpmn/parse', 'POST', { xml: SAMPLE_BPMN });

    const conditionNode = res.data.dag.nodes.find(n => n.flowosType === 'condition');
    assert.ok(conditionNode, 'Should have a condition node');
    assert.strictEqual(conditionNode.name, 'Order Valid?');
  });

  it('should parse parallel gateway as parallel node', async () => {
    const res = await request('/api/bpmn/parse', 'POST', { xml: PARALLEL_BPMN });

    const parallelNodes = res.data.dag.nodes.filter(n => n.flowosType === 'parallel');
    assert.ok(parallelNodes.length >= 2, 'Should have parallel gateway nodes');
  });

  it('should create edges between nodes', async () => {
    const res = await request('/api/bpmn/parse', 'POST', { xml: SAMPLE_BPMN });

    assert.ok(res.data.dag.edges.length > 0, 'Should have edges');
    const edge = res.data.dag.edges[0];
    assert.ok(edge.source, 'Edge should have source');
    assert.ok(edge.target, 'Edge should have target');
  });

  it('should preserve condition expressions in edges', async () => {
    const res = await request('/api/bpmn/parse', 'POST', { xml: SAMPLE_BPMN });

    const conditionEdge = res.data.dag.edges.find(e => e.condition);
    assert.ok(conditionEdge, 'Should have conditional edges');
    assert.ok(conditionEdge.condition.includes('valid'), 'Should preserve condition logic');
  });

  it('should reject invalid BPMN XML', async () => {
    const invalidBpmn = `<?xml version="1.0"?><invalid>not bpmn</invalid>`;
    const res = await request('/api/bpmn/parse', 'POST', { xml: invalidBpmn });

    assert.strictEqual(res.status, 400);
    assert.ok(res.data.error);
  });

  it('should reject empty XML', async () => {
    const res = await request('/api/bpmn/parse', 'POST', { xml: '' });

    assert.strictEqual(res.status, 400);
  });

  it('should handle BPMN with multiple start/end events', async () => {
    const multiEventBpmn = `<?xml version="1.0" encoding="UTF-8"?>
    <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="test">
      <process id="MultiEventProcess">
        <startEvent id="Start1" name="Start 1" />
        <startEvent id="Start2" name="Start 2" />
        <endEvent id="End1" name="End 1" />
        <endEvent id="End2" name="End 2" />
        <sequenceFlow id="F1" sourceRef="Start1" targetRef="End1" />
        <sequenceFlow id="F2" sourceRef="Start2" targetRef="End2" />
      </process>
    </definitions>`;

    const res = await request('/api/bpmn/parse', 'POST', { xml: multiEventBpmn });

    assert.strictEqual(res.status, 200);
    const startNodes = res.data.dag.nodes.filter(n => n.flowosType === 'trigger');
    assert.ok(startNodes.length >= 2, 'Should have multiple trigger nodes');
  });
});

describe('BPMN Parser - BPMN Validation', () => {
  it('should validate BPMN and return validation result', async () => {
    const res = await request('/api/bpmn/validate', 'POST', { xml: SAMPLE_BPMN });

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.hasOwnProperty('valid'));
    assert.ok(Array.isArray(res.data.warnings));
  });

  it('should detect missing process element', async () => {
    const invalidBpmn = `<?xml version="1.0" encoding="UTF-8"?>
    <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
    </definitions>`;

    const res = await request('/api/bpmn/validate', 'POST', { xml: invalidBpmn });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.valid, false);
    assert.ok(res.data.errors.length > 0);
  });

  it('should return stats for valid BPMN', async () => {
    const res = await request('/api/bpmn/validate', 'POST', { xml: SAMPLE_BPMN });

    assert.strictEqual(res.status, 200);
    if (res.data.stats) {
      assert.ok(res.data.stats.totalElements !== undefined);
    }
  });
});

describe('BPMN Parser - Workflow Templates', () => {
  beforeEach(() => {
    cleanTestData();
  });

  it('should list available templates', async () => {
    const res = await request('/api/bpmn/templates');

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.templates));
    assert.ok(res.data.templates.length > 0);
  });

  it('should have approval workflow template in list', async () => {
    const res = await request('/api/bpmn/templates');

    const approvalTemplate = res.data.templates.find(t => t.id === 'approval-workflow');
    assert.ok(approvalTemplate, 'Should have approval workflow template');
  });

  it('should have order processing template', async () => {
    const res = await request('/api/bpmn/templates');

    const orderTemplate = res.data.templates.find(t => t.id === 'order-processing');
    assert.ok(orderTemplate, 'Should have order processing template');
  });

  it('should get and parse approval template by ID', async () => {
    // First find the approval template in the list
    const listRes = await request('/api/bpmn/templates');
    const approvalTemplate = listRes.data.templates.find(t => t.id === 'approval-workflow');
    assert.ok(approvalTemplate, 'Should have approval template');

    // Get full template by ID
    const getRes = await request(`/api/bpmn/templates/approval-workflow`);
    assert.strictEqual(getRes.status, 200);
    assert.ok(getRes.data.template.xml, 'Should have XML');

    // Parse it
    const res = await request('/api/bpmn/parse', 'POST', { xml: getRes.data.template.xml });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.dag.nodes.length > 0);
  });
});

describe('BPMN Parser - DMN Evaluation', () => {
  it('should parse DMN decision table', async () => {
    const res = await request('/api/dmn/parse', 'POST', { xml: SAMPLE_DMN });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.decisions);
    assert.ok(Array.isArray(res.data.decisions));
    const decision = res.data.decisions[0];
    assert.strictEqual(decision.id, 'PricingDecision');
    assert.strictEqual(decision.name, 'Pricing Decision');
    assert.ok(Array.isArray(decision.rules));
  });

  it('should evaluate DMN decision table', async () => {
    // First parse DMN to get decision table
    const parseRes = await request('/api/dmn/parse', 'POST', { xml: SAMPLE_DMN });
    assert.strictEqual(parseRes.status, 200);
    assert.ok(parseRes.data.decisions, 'Should return decisions array');

    const decisionTable = parseRes.data.decisions[0];
    assert.ok(decisionTable, 'Should have first decision');

    // Evaluate with inputs
    const inputs = { customerType: 'premium', orderAmount: 1500 };
    const res = await request('/api/dmn/evaluate', 'POST', {
      decisionTable,
      inputs
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.hasOwnProperty('matched'));
  });

  it('should evaluate with different inputs', async () => {
    // First parse DMN
    const parseRes = await request('/api/dmn/parse', 'POST', { xml: SAMPLE_DMN });
    const decisionTable = parseRes.data.decisions[0];

    // Evaluate with regular customer
    const inputs = { customerType: 'regular', orderAmount: 600 };
    const res = await request('/api/dmn/evaluate', 'POST', {
      decisionTable,
      inputs
    });

    assert.strictEqual(res.status, 200);
  });

  it('should reject DMN without inputs', async () => {
    // First parse DMN
    const parseRes = await request('/api/dmn/parse', 'POST', { xml: SAMPLE_DMN });
    const decisionTable = parseRes.data.decisions[0];

    const res = await request('/api/dmn/evaluate', 'POST', {
      decisionTable
    });

    assert.strictEqual(res.status, 400);
  });

  it('should reject invalid DMN XML', async () => {
    const res = await request('/api/dmn/parse', 'POST', { xml: '<invalid/>' });

    assert.strictEqual(res.status, 400);
  });
});

describe('BPMN Parser - Workflow Templates', () => {
  beforeEach(() => {
    cleanTestData();
  });

  it('should list available templates', async () => {
    const res = await request('/api/bpmn/templates');

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.templates));
    assert.ok(res.data.templates.length > 0, 'Should have default templates');
  });

  it('should have approval workflow in templates list', async () => {
    const res = await request('/api/bpmn/templates');

    assert.strictEqual(res.status, 200);
    const templates = res.data.templates;
    assert.ok(templates.some(t => t.id === 'approval-workflow' || t.name === 'Approval Workflow'),
      'Should have approval workflow template');
  });

  it('should create and retrieve a template', async () => {
    const res = await request('/api/bpmn/templates', 'POST', {
      name: 'Test Template',
      xml: SAMPLE_BPMN,
      description: 'A test workflow template'
    });

    assert.strictEqual(res.status, 201);
    assert.ok(res.data.template);
    assert.strictEqual(res.data.template.name, 'Test Template');

    // Get template
    const getRes = await request(`/api/bpmn/templates/${res.data.template.id}`);
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.data.template.name, 'Test Template');
  });

  it('should delete a template', async () => {
    // Create a template first
    const createRes = await request('/api/bpmn/templates', 'POST', {
      name: 'Delete Me',
      xml: SAMPLE_BPMN
    });

    const templateId = createRes.data.template.id;

    // Delete it
    const deleteRes = await request(`/api/bpmn/templates/${templateId}`, 'DELETE');
    assert.strictEqual(deleteRes.status, 200);

    // Verify it's gone
    const getRes = await request(`/api/bpmn/templates/${templateId}`);
    assert.strictEqual(getRes.status, 404);
  });

  it('should get full template by ID and parse it', async () => {
    // First create a template
    const createRes = await request('/api/bpmn/templates', 'POST', {
      name: 'Parse Template',
      xml: SAMPLE_BPMN
    });

    // Get the full template (which includes XML)
    const getRes = await request(`/api/bpmn/templates/${createRes.data.template.id}`);
    assert.strictEqual(getRes.status, 200);
    assert.ok(getRes.data.template.xml, 'Should have XML');

    // Parse the template's XML
    const parseRes = await request('/api/bpmn/parse', 'POST', { xml: getRes.data.template.xml });
    assert.strictEqual(parseRes.status, 200);
    assert.ok(parseRes.data.dag.nodes.length > 0);
  });
});

// Cleanup
after(() => {
  cleanTestData();
});

/**
 * Workflow Designer API Client
 * Connects to BPMN Parser Service (port 5372)
 */

const BPMN_PARSER_URL = process.env.BPMN_PARSER_URL || 'http://localhost:5372';

/**
 * Parse BPMN XML to workflow
 */
export async function parseBPMN(xml) {
  const response = await fetch(`${BPMN_PARSER_URL}/api/bpmn/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xml })
  });
  return response.json();
}

/**
 * Convert FlowOS DAG to BPMN XML
 */
export async function exportBPMN(workflow) {
  const response = await fetch(`${BPMN_PARSER_URL}/api/bpmn/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow })
  });
  return response.json();
}

/**
 * Validate BPMN XML
 */
export async function validateBPMN(xml) {
  const response = await fetch(`${BPMN_PARSER_URL}/api/bpmn/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xml })
  });
  return response.json();
}

/**
 * Get workflow templates
 */
export async function getTemplates() {
  const response = await fetch(`${BPMN_PARSER_URL}/api/bpmn/templates`);
  return response.json();
}

/**
 * Convert ReactFlow nodes/edges to FlowOS DAG
 */
export function toFlowOSDAG(nodes, edges) {
  return {
    nodes: nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data
    })),
    edges: edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      condition: e.condition,
      label: e.label
    }))
  };
}

/**
 * Convert FlowOS DAG to ReactFlow nodes/edges
 */
export function fromFlowOSDAG(dag) {
  const nodes = dag.nodes.map(n => ({
    id: n.id,
    type: n.type || 'service_task',
    position: n.position || { x: 0, y: 0 },
    data: n.data || { label: n.name || n.id }
  }));

  const edges = dag.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    condition: e.condition
  }));

  return { nodes, edges };
}

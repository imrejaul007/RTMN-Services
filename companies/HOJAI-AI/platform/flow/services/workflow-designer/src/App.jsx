import React, { useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap, Controls, Background, useNodesState, useEdgesState,
  addEdge, ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css';

import './App.css';

// Custom Node Types
const nodeTypes = {
  trigger: TriggerNode,
  terminal: TerminalNode,
  human_task: HumanTaskNode,
  service_task: ServiceTaskNode,
  condition: ConditionNode,
  parallel: ParallelNode,
};

// Custom Node Components
function TriggerNode({ data }) {
  return (
    <div className="node trigger-node">
      <div className="node-icon">🚀</div>
      <div className="node-label">{data.label || 'Start'}</div>
    </div>
  );
}

function TerminalNode({ data }) {
  return (
    <div className="node terminal-node">
      <div className="node-icon">🏁</div>
      <div className="node-label">{data.label || 'End'}</div>
    </div>
  );
}

function HumanTaskNode({ data }) {
  return (
    <div className="node human-task-node">
      <div className="node-icon">👤</div>
      <div className="node-label">{data.label || 'Human Task'}</div>
      {data.assignee && <div className="node-meta">@{data.assignee}</div>}
    </div>
  );
}

function ServiceTaskNode({ data }) {
  return (
    <div className="node service-task-node">
      <div className="node-icon">⚙️</div>
      <div className="node-label">{data.label || 'Service Task'}</div>
      {data.service && <div className="node-meta">{data.service}</div>}
    </div>
  );
}

function ConditionNode({ data }) {
  return (
    <div className="node condition-node">
      <div className="node-icon">🔀</div>
      <div className="node-label">{data.label || 'Condition'}</div>
    </div>
  );
}

function ParallelNode({ data }) {
  return (
    <div className="node parallel-node">
      <div className="node-icon">⏩</div>
      <div className="node-label">{data.label || 'Parallel'}</div>
    </div>
  );
}

// Default nodes and edges
const initialNodes = [
  { id: '1', type: 'trigger', position: { x: 100, y: 200 }, data: { label: 'Start' } },
  { id: '2', type: 'service_task', position: { x: 300, y: 200 }, data: { label: 'Process Order', service: 'OrderService' } },
  { id: '3', type: 'condition', position: { x: 500, y: 200 }, data: { label: 'In Stock?' } },
  { id: '4', type: 'service_task', position: { x: 700, y: 100 }, data: { label: 'Ship Order', service: 'ShippingService' } },
  { id: '5', type: 'service_task', position: { x: 700, y: 300 }, data: { label: 'Cancel Order', service: 'OrderService' } },
  { id: '6', type: 'terminal', position: { x: 900, y: 200 }, data: { label: 'Complete' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  { id: 'e3-4', source: '3', target: '4', label: 'Yes', style: { stroke: '#10b981' } },
  { id: 'e3-5', source: '3', target: '5', label: 'No', style: { stroke: '#ef4444' } },
  { id: 'e4-6', source: '4', target: '6', animated: true },
  { id: 'e5-6', source: '5', target: '6', animated: true },
];

// Toolbar Component
function Toolbar({ onAddNode, onExport, onImport }) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={() => onAddNode('trigger')} className="toolbar-btn">
          🚀 Start
        </button>
        <button onClick={() => onAddNode('human_task')} className="toolbar-btn">
          👤 Human Task
        </button>
        <button onClick={() => onAddNode('service_task')} className="toolbar-btn">
          ⚙️ Service Task
        </button>
        <button onClick={() => onAddNode('condition')} className="toolbar-btn">
          🔀 Condition
        </button>
        <button onClick={() => onAddNode('parallel')} className="toolbar-btn">
          ⏩ Parallel
        </button>
        <button onClick={() => onAddNode('terminal')} className="toolbar-btn">
          🏁 End
        </button>
      </div>
      <div className="toolbar-group">
        <button onClick={onImport} className="toolbar-btn secondary">
          📥 Import BPMN
        </button>
        <button onClick={onExport} className="toolbar-btn primary">
          📤 Export BPMN
        </button>
      </div>
    </div>
  );
}

// Properties Panel
function PropertiesPanel({ selectedNode, onUpdateNode }) {
  if (!selectedNode) {
    return <div className="properties-panel"><p className="no-selection">Select a node to edit</p></div>;
  }

  const handleChange = (field, value) => {
    onUpdateNode(selectedNode.id, { ...selectedNode.data, [field]: value });
  };

  return (
    <div className="properties-panel">
      <h3>Node Properties</h3>
      <div className="property-group">
        <label>Type</label>
        <span className="node-type-badge">{selectedNode.type}</span>
      </div>
      <div className="property-group">
        <label>Label</label>
        <input
          type="text"
          value={selectedNode.data.label || ''}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder="Node label"
        />
      </div>
      {selectedNode.type === 'human_task' && (
        <div className="property-group">
          <label>Assignee</label>
          <input
            type="text"
            value={selectedNode.data.assignee || ''}
            onChange={(e) => handleChange('assignee', e.target.value)}
            placeholder="User or role"
          />
        </div>
      )}
      {selectedNode.type === 'service_task' && (
        <div className="property-group">
          <label>Service</label>
          <input
            type="text"
            value={selectedNode.data.service || ''}
            onChange={(e) => handleChange('service', e.target.value)}
            placeholder="Service name"
          />
        </div>
      )}
      {selectedNode.type === 'service_task' && (
        <div className="property-group">
          <label>Action</label>
          <input
            type="text"
            value={selectedNode.data.action || ''}
            onChange={(e) => handleChange('action', e.target.value)}
            placeholder="Action to execute"
          />
        </div>
      )}
    </div>
  );
}

// Main App
function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: ConnectionLineType.Bezier }), eds),
    [setEdges]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onAddNode = useCallback((type) => {
    const typeLabels = {
      trigger: 'Start',
      terminal: 'End',
      human_task: 'Human Task',
      service_task: 'Service Task',
      condition: 'Condition',
      parallel: 'Parallel'
    };

    const newNode = {
      id: `node_${Date.now()}`,
      type,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: { label: typeLabels[type] || type }
    };

    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const onUpdateNode = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
    setSelectedNode((prev) => prev && prev.id === nodeId ? { ...prev, data: newData } : prev);
  }, [setNodes, setSelectedNode]);

  const onExport = useCallback(() => {
    const workflow = {
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
        label: e.label,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle
      }))
    };

    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const onImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.bpmn,.xml';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const workflow = JSON.parse(evt.target.result);
          if (workflow.nodes && workflow.edges) {
            setNodes(workflow.nodes);
            setEdges(workflow.edges);
          }
        } catch (err) {
          alert('Invalid workflow file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setNodes, setEdges]);

  return (
    <div className="app">
      <header className="header">
        <h1>🎯 FlowOS Workflow Designer</h1>
        <span className="version">Phase 2.3 | Port 5374</span>
      </header>
      <Toolbar onAddNode={onAddNode} onExport={onExport} onImport={onImport} />
      <div className="main-content">
        <div className="canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Controls />
            <MiniMap nodeColor={(n) => {
              const colors = {
                trigger: '#10b981',
                terminal: '#ef4444',
                human_task: '#8b5cf6',
                service_task: '#3b82f6',
                condition: '#f59e0b',
                parallel: '#06b6d4'
              };
              return colors[n.type] || '#94a3b8';
            }} />
            <Background variant="dots" gap={20} size={1} />
          </ReactFlow>
        </div>
        <PropertiesPanel selectedNode={selectedNode} onUpdateNode={onUpdateNode} />
      </div>
    </div>
  );
}

export default App;

/**
 * HOJAI Visual Builder - Production React UI
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// TYPES
// ============================================

type NodeType = 'trigger' | 'memory' | 'twin' | 'ai_agent' | 'intelligence' | 'sutar' | 'condition' | 'action' | 'human' | 'integration' | 'notification' | 'crm';

interface Node {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  config: Record<string, any>;
}

interface Connection {
  from: string;
  to: string;
}

interface Workflow {
  id: string;
  name: string;
  nodes: Node[];
  connections: Connection[];
}

interface NodeTypeConfig {
  name: string;
  icon: string;
  color: string;
}

// ============================================
// NODE TYPE CONFIGURATIONS
// ============================================

const NODE_TYPES: Record<NodeType, NodeTypeConfig> = {
  trigger: { name: 'Trigger', icon: '⚡', color: '#10b981' },
  memory: { name: 'Memory', icon: '🧠', color: '#8b5cf6' },
  twin: { name: 'Twin', icon: '👥', color: '#06b6d4' },
  ai_agent: { name: 'AI Agent', icon: '🤖', color: '#3b82f6' },
  intelligence: { name: 'Intelligence', icon: '📊', color: '#f59e0b' },
  sutar: { name: 'SUTAR', icon: '🤝', color: '#ec4899' },
  condition: { name: 'Condition', icon: '🔀', color: '#6366f1' },
  action: { name: 'Action', icon: '⚙️', color: '#64748b' },
  human: { name: 'Human', icon: '👤', color: '#f97316' },
  integration: { name: 'Integration', icon: '🔌', color: '#84cc16' },
  notification: { name: 'Notification', icon: '📧', color: '#14b8a6' },
  crm: { name: 'CRM', icon: '📋', color: '#a855f7' },
};

// ============================================
// API CLIENT
// ============================================

const API_BASE = 'http://localhost:4600';

const api = {
  async getNodeTypes() { return fetch(`${API_BASE}/api/node-types`).then(r => r.json()); },
  async listTemplates(category?: string) {
    const url = category ? `${API_BASE}/api/templates?category=${category}` : `${API_BASE}/api/templates`;
    return fetch(url).then(r => r.json());
  },
  async createWorkflow(params: any) { return fetch(`${API_BASE}/api/workflows`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) }).then(r => r.json()); },
  async getWorkflow(id: string) { return fetch(`${API_BASE}/api/workflows/${id}`).then(r => r.json()); },
  async listWorkflows() { return fetch(`${API_BASE}/api/workflows`).then(r => r.json()); },
  async updateWorkflow(id: string, data: any) { return fetch(`${API_BASE}/api/workflows/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()); },
  async addNode(workflowId: string, node: any) { return fetch(`${API_BASE}/api/workflows/${workflowId}/nodes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(node) }).then(r => r.json()); },
  async updateNode(workflowId: string, nodeId: string, updates: any) { return fetch(`${API_BASE}/api/workflows/${workflowId}/nodes/${nodeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) }).then(r => r.json()); },
  async deleteNode(workflowId: string, nodeId: string) { return fetch(`${API_BASE}/api/workflows/${workflowId}/nodes/${nodeId}`, { method: 'DELETE' }).then(r => r.json()); },
  async addConnection(workflowId: string, conn: any) { return fetch(`${API_BASE}/api/workflows/${workflowId}/connections`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(conn) }).then(r => r.json()); },
  async deleteConnection(workflowId: string, from: string, to: string) { return fetch(`${API_BASE}/api/workflows/${workflowId}/connections/${from}-to-${to}`, { method: 'DELETE' }).then(r => r.json()); },
  async undo(workflowId: string) { return fetch(`${API_BASE}/api/workflows/${workflowId}/undo`, { method: 'POST' }).then(r => r.json()); },
  async redo(workflowId: string) { return fetch(`${API_BASE}/api/workflows/${workflowId}/redo`, { method: 'POST' }).then(r => r.json()); },
  async getHistory(workflowId: string) { return fetch(`${API_BASE}/api/workflows/${workflowId}/history`).then(r => r.json()); },
  async exportWorkflow(id: string, category?: string) {
    const url = category ? `${API_BASE}/api/workflows/${id}/export?category=${category}` : `${API_BASE}/api/workflows/${id}/export`;
    return fetch(url).then(r => r.json());
  },
};

// ============================================
// WORKFLOW NODE COMPONENT
// ============================================

function WorkflowNode({ node, selected, onSelect, onDrag, onDelete }: {
  node: Node;
  selected: boolean;
  onSelect: () => void;
  onDrag: (x: number, y: number) => void;
  onDelete: () => void;
}) {
  const config = NODE_TYPES[node.type];
  const dragRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node-actions')) return;
    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startNodeX = node.x;
    const startNodeY = node.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      onDrag(startNodeX + dx, startNodeY + dy);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={dragRef}
      className={`workflow-node ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        backgroundColor: config.color,
        borderColor: selected ? '#fff' : 'transparent',
        cursor: 'grab',
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <div className="node-icon">{config.icon}</div>
      <div className="node-info">
        <div className="node-name">{node.name}</div>
        <div className="node-type">{config.name}</div>
      </div>
      <div className="node-actions">
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">×</button>
      </div>
    </div>
  );
}

// ============================================
// CANVAS COMPONENT
// ============================================

function Canvas({ nodes, connections, selectedNodeId, onNodeSelect, onNodeMove, onNodeDelete, onCanvasClick }: {
  nodes: Node[];
  connections: Connection[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string) => void;
  onNodeMove: (id: string, x: number, y: number) => void;
  onNodeDelete: (id: string) => void;
  onCanvasClick: () => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);

  return (
    <div className="canvas" ref={canvasRef} onClick={onCanvasClick}>
      <svg className="connections-layer">
        {connections.map((conn, i) => {
          const fromNode = nodes.find(n => n.id === conn.from);
          const toNode = nodes.find(n => n.id === conn.to);
          if (!fromNode || !toNode) return null;

          const fromX = fromNode.x + 100;
          const fromY = fromNode.y + 25;
          const toX = toNode.x;
          const toY = toNode.y + 25;

          return (
            <g key={i}>
              <line x1={fromX} y1={fromY} x2={toX} y2={toY} stroke="#64748b" strokeWidth="2" />
              <circle cx={(fromX + toX) / 2} cy={(fromY + toY) / 2} r="5" fill="#3b82f6" />
            </g>
          );
        })}
      </svg>
      {nodes.map(node => (
        <WorkflowNode
          key={node.id}
          node={node}
          selected={selectedNodeId === node.id}
          onSelect={() => onNodeSelect(node.id)}
          onDrag={(x, y) => onNodeMove(node.id, x, y)}
          onDelete={() => onNodeDelete(node.id)}
        />
      ))}
    </div>
  );
}

// ============================================
// NODE PALETTE
// ============================================

function NodePalette({ onAddNode }: { onAddNode: (type: NodeType) => void }) {
  return (
    <div className="node-palette">
      <h3>Node Types</h3>
      <div className="node-list">
        {(Object.entries(NODE_TYPES) as [NodeType, NodeTypeConfig][]).map(([type, config]) => (
          <div
            key={type}
            className="palette-item"
            style={{ backgroundColor: config.color }}
            onClick={() => onAddNode(type)}
          >
            <span className="palette-icon">{config.icon}</span>
            <span className="palette-name">{config.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// PROPERTIES PANEL
// ============================================

function PropertiesPanel({ node, onUpdate }: { node: Node | null; onUpdate: (config: any) => void }) {
  if (!node) {
    return (
      <div className="properties-panel">
        <h3>Properties</h3>
        <p className="empty-state">Select a node to edit</p>
      </div>
    );
  }

  const config = NODE_TYPES[node.type];

  return (
    <div className="properties-panel">
      <h3>{config.icon} {config.name}</h3>
      <div className="property-group">
        <label>Name</label>
        <input
          type="text"
          value={node.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
      </div>
      <div className="property-group">
        <label>Position</label>
        <div className="position-inputs">
          <input
            type="number"
            value={node.x}
            onChange={(e) => onUpdate({ x: parseInt(e.target.value) })}
            placeholder="X"
          />
          <input
            type="number"
            value={node.y}
            onChange={(e) => onUpdate({ y: parseInt(e.target.value) })}
            placeholder="Y"
          />
        </div>
      </div>
      <div className="property-group">
        <label>Type</label>
        <input type="text" value={config.name} disabled />
      </div>
      <div className="property-group">
        <label>Node ID</label>
        <input type="text" value={node.id} disabled />
      </div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================

export default function App() {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [history, setHistory] = useState<{ canUndo: boolean; canRedo: boolean }>({ canUndo: false, canRedo: false });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [view, setView] = useState<'canvas' | 'list'>('canvas');

  // Load templates
  useEffect(() => {
    api.listTemplates().then(data => {
      setTemplates(data.templates || []);
    });
  }, []);

  // Create new workflow
  const createNewWorkflow = async () => {
    const wf = await api.createWorkflow({ name: workflowName });
    setWorkflow(wf);
    setNodes([]);
    setConnections([]);
    setSelectedNodeId(null);
    updateHistory(wf.id);
  };

  // Load workflow
  const loadWorkflow = async (id: string) => {
    const wf = await api.getWorkflow(id);
    setWorkflow(wf);
    setNodes(wf.nodes || []);
    setConnections(wf.connections || []);
    setWorkflowName(wf.name);
    setSelectedNodeId(null);
    updateHistory(wf.id);
    setShowTemplates(false);
  };

  // Update history status
  const updateHistory = async (workflowId: string) => {
    try {
      const h = await api.getHistory(workflowId);
      setHistory(h);
    } catch (e) {}
  };

  // Add node
  const addNode = async (type: NodeType) => {
    if (!workflow) return;

    const config = NODE_TYPES[type];
    const x = 100 + Math.random() * 300;
    const y = 100 + Math.random() * 200;

    try {
      const node = await api.addNode(workflow.id, { type, position: { x, y }, config: { name: `${config.name} Node` } });
      setNodes(prev => [...prev, { ...node, x: node.position?.x || x, y: node.position?.y || y }]);
      updateHistory(workflow.id);
    } catch (e) {
      // Fallback: add locally
      const localNode = {
        id: `node_${Date.now()}`,
        type,
        name: `${config.name} Node`,
        x,
        y,
        config: {},
      };
      setNodes(prev => [...prev, localNode]);
    }
  };

  // Update node
  const updateNode = async (nodeId: string, updates: any) => {
    if (!workflow) return;

    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...updates } : n));

    try {
      await api.updateNode(workflow.id, nodeId, updates);
      updateHistory(workflow.id);
    } catch (e) {}
  };

  // Move node
  const moveNode = (nodeId: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, x, y } : n));
  };

  // Save node position (on drag end)
  const saveNodePosition = async (nodeId: string, x: number, y: number) => {
    if (!workflow) return;
    moveNode(nodeId, x, y);
    try {
      await api.updateNode(workflow.id, nodeId, { position: { x, y } });
      updateHistory(workflow.id);
    } catch (e) {}
  };

  // Delete node
  const deleteNode = async (nodeId: string) => {
    if (!workflow) return;

    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
    setSelectedNodeId(null);

    try {
      await api.deleteNode(workflow.id, nodeId);
      updateHistory(workflow.id);
    } catch (e) {}
  };

  // Add connection
  const addConnection = async (from: string, to: string) => {
    if (!workflow) return;
    if (from === to) return;

    // Check if connection exists
    const exists = connections.some(c => c.from === from && c.to === to);
    if (exists) return;

    setConnections(prev => [...prev, { from, to }]);

    try {
      await api.addConnection(workflow.id, { from, to });
      updateHistory(workflow.id);
    } catch (e) {}
  };

  // Delete connection
  const deleteConnection = async (from: string, to: string) => {
    if (!workflow) return;

    setConnections(prev => prev.filter(c => !(c.from === from && c.to === to)));

    try {
      await api.deleteConnection(workflow.id, from, to);
      updateHistory(workflow.id);
    } catch (e) {}
  };

  // Undo
  const undo = async () => {
    if (!workflow) return;
    try {
      const result = await api.undo(workflow.id);
      if (result.workflow) {
        setNodes(result.workflow.nodes || []);
        setConnections(result.workflow.connections || []);
        updateHistory(workflow.id);
      }
    } catch (e) {}
  };

  // Redo
  const redo = async () => {
    if (!workflow) return;
    try {
      const result = await api.redo(workflow.id);
      if (result.workflow) {
        setNodes(result.workflow.nodes || []);
        setConnections(result.workflow.connections || []);
        updateHistory(workflow.id);
      }
    } catch (e) {}
  };

  // Export
  const exportWorkflow = async () => {
    if (!workflow) return;
    try {
      const template = await api.exportWorkflow(workflow.id, 'custom');
      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workflow.name.replace(/\s+/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      // Fallback: export locally
      const template = {
        id: workflow.id,
        name: workflow.name,
        category: 'custom',
        nodes,
        connections,
      };
      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workflow.name.replace(/\s+/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 2));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedNodeId) {
        deleteNode(selectedNodeId);
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        }
        if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, workflow]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1>🎨 HOJAI Visual Builder</h1>
          <input
            type="text"
            className="workflow-name"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Workflow Name"
          />
        </div>
        <div className="header-actions">
          <button onClick={() => setShowTemplates(!showTemplates)}>📁 Templates</button>
          {!workflow && <button onClick={createNewWorkflow}>➕ New</button>}
          {workflow && (
            <>
              <button onClick={undo} disabled={!history.canUndo}>↩️ Undo</button>
              <button onClick={redo} disabled={!history.canRedo}>↪️ Redo</button>
              <button onClick={exportWorkflow}>📤 Export</button>
            </>
          )}
        </div>
      </header>

      <div className="main-content">
        {/* Templates Modal */}
        {showTemplates && (
          <div className="templates-modal">
            <div className="templates-header">
              <h2>Templates</h2>
              <button onClick={() => setShowTemplates(false)}>×</button>
            </div>
            <div className="templates-list">
              {templates.length === 0 ? (
                <p>No templates found</p>
              ) : (
                templates.map(template => (
                  <div key={template.id} className="template-item" onClick={() => loadWorkflow(template.id)}>
                    <div className="template-name">{template.name}</div>
                    <div className="template-category">{template.category}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Node Palette */}
        <NodePalette onAddNode={addNode} />

        {/* Canvas */}
        <div className="canvas-container" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
          {workflow ? (
            <Canvas
              nodes={nodes}
              connections={connections}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              onNodeMove={saveNodePosition}
              onNodeDelete={deleteNode}
              onCanvasClick={() => setSelectedNodeId(null)}
            />
          ) : (
            <div className="empty-canvas">
              <p>Create a new workflow to get started</p>
              <button onClick={createNewWorkflow}>➕ Create Workflow</button>
            </div>
          )}
        </div>

        {/* Properties Panel */}
        <PropertiesPanel
          node={selectedNode}
          onUpdate={(config) => selectedNodeId && updateNode(selectedNodeId, config)}
        />
      </div>

      {/* Zoom Controls */}
      <div className="zoom-controls">
        <button onClick={() => handleZoom(-0.1)}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => handleZoom(0.1)}>+</button>
      </div>

      {/* Styles */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .app {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #1a1a2e;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: #16213e;
          border-bottom: 1px solid #333;
        }
        .header-left { display: flex; align-items: center; gap: 20px; }
        .header-left h1 { font-size: 18px; font-weight: 600; }
        .workflow-name {
          background: #1a1a2e;
          border: 1px solid #333;
          color: #fff;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 14px;
        }
        .header-actions { display: flex; gap: 8px; }
        .header-actions button {
          background: #3b82f6;
          border: none;
          color: #fff;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        }
        .header-actions button:hover { background: #2563eb; }
        .header-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
        .main-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        .node-palette {
          width: 180px;
          background: #16213e;
          padding: 16px;
          border-right: 1px solid #333;
          overflow-y: auto;
        }
        .node-palette h3 { font-size: 13px; margin-bottom: 12px; color: #888; }
        .node-list { display: flex; flex-direction: column; gap: 6px; }
        .palette-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: transform 0.1s;
        }
        .palette-item:hover { transform: scale(1.02); }
        .canvas-container {
          flex: 1;
          position: relative;
          overflow: hidden;
        }
        .canvas {
          width: 2000px;
          height: 2000px;
          background: #1a1a2e;
          background-image: radial-gradient(circle, #333 1px, transparent 1px);
          background-size: 20px 20px;
          position: relative;
        }
        .connections-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .workflow-node {
          width: 100px;
          padding: 8px;
          border-radius: 8px;
          border: 2px solid transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          user-select: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .workflow-node.selected, .workflow-node:hover { border-color: #fff; }
        .workflow-node.dragging { opacity: 0.8; cursor: grabbing; }
        .node-icon { font-size: 20px; }
        .node-info { text-align: center; }
        .node-name { font-size: 11px; font-weight: 600; }
        .node-type { font-size: 9px; opacity: 0.8; }
        .node-actions {
          position: absolute;
          top: -8px;
          right: -8px;
        }
        .node-actions button {
          background: #ef4444;
          border: none;
          color: #fff;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 12px;
          display: none;
        }
        .workflow-node:hover .node-actions button { display: block; }
        .empty-canvas {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #666;
          gap: 16px;
        }
        .empty-canvas button {
          background: #3b82f6;
          border: none;
          color: #fff;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
        }
        .properties-panel {
          width: 260px;
          background: #16213e;
          padding: 16px;
          border-left: 1px solid #333;
          overflow-y: auto;
        }
        .properties-panel h3 { font-size: 14px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .empty-state { color: #666; font-size: 13px; }
        .property-group { margin-bottom: 12px; }
        .property-group label { display: block; font-size: 11px; color: #888; margin-bottom: 4px; }
        .property-group input {
          width: 100%;
          background: #1a1a2e;
          border: 1px solid #333;
          color: #fff;
          padding: 8px;
          border-radius: 4px;
          font-size: 13px;
        }
        .property-group input:disabled { opacity: 0.6; }
        .position-inputs { display: flex; gap: 8px; }
        .position-inputs input { flex: 1; }
        .templates-modal {
          position: fixed;
          top: 60px;
          left: 180px;
          width: 400px;
          max-height: 500px;
          background: #16213e;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          z-index: 100;
        }
        .templates-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #333;
        }
        .templates-header h2 { font-size: 16px; }
        .templates-header button { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
        .templates-list { padding: 12px; max-height: 400px; overflow-y: auto; }
        .template-item {
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
          margin-bottom: 8px;
          background: #1a1a2e;
        }
        .template-item:hover { background: #252542; }
        .template-name { font-size: 14px; font-weight: 500; }
        .template-category { font-size: 12px; color: #888; }
        .zoom-controls {
          position: fixed;
          bottom: 20px;
          right: 280px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #16213e;
          padding: 8px 12px;
          border-radius: 8px;
        }
        .zoom-controls button {
          background: #333;
          border: none;
          color: #fff;
          width: 28px;
          height: 28px;
          border-radius: 4px;
          cursor: pointer;
        }
        .zoom-controls span { font-size: 12px; min-width: 40px; text-align: center; }
      `}</style>
    </div>
  );
}

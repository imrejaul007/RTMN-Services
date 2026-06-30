/**
 * HOJAI Visual Workflow Builder - React Canvas Component
 *
 * Drag-drop canvas for building workflow templates.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

// Node type definitions
const NODE_TYPES = {
  trigger: { name: 'Trigger', icon: '⚡', color: '#10b981', description: 'Starts the workflow' },
  memory: { name: 'Memory', icon: '🧠', color: '#8b5cf6', description: 'Load or save memory' },
  twin: { name: 'Twin', icon: '👥', color: '#06b6d4', description: 'Create or update digital twin' },
  ai_agent: { name: 'AI Agent', icon: '🤖', color: '#3b82f6', description: 'AI worker that performs tasks' },
  intelligence: { name: 'Intelligence', icon: '📊', color: '#f59e0b', description: 'Analytics and scoring' },
  sutar: { name: 'SUTAR', icon: '🤝', color: '#ec4899', description: 'Commerce and negotiation' },
  condition: { name: 'Condition', icon: '🔀', color: '#6366f1', description: 'Branch based on condition' },
  action: { name: 'Action', icon: '⚙️', color: '#64748b', description: 'Perform an action' },
  human: { name: 'Human', icon: '👤', color: '#f97316', description: 'Human approval or input' },
  integration: { name: 'Integration', icon: '🔌', color: '#84cc16', description: 'Connect to external service' },
  notification: { name: 'Notification', icon: '📧', color: '#14b8a6', description: 'Send notification' },
  crm: { name: 'CRM', icon: '📋', color: '#a855f7', description: 'CRM operations' },
};

const INITIAL_NODES = [
  { id: 'trigger-1', type: 'trigger', name: 'Lead Created', x: 100, y: 200, config: { type: 'webhook', source: 'website', event: 'lead.created' } },
  { id: 'agent-1', type: 'ai_agent', name: 'Qualify Lead', x: 350, y: 200, config: { agent: 'sdr_agent', task: 'qualify' } },
  { id: 'condition-1', type: 'condition', name: 'Score >= 70?', x: 600, y: 200, config: { field: 'score', operator: '>=', value: 70 } },
  { id: 'action-1', type: 'action', name: 'Route to SDR', x: 850, y: 100, config: { action: 'assign_sdr' } },
  { id: 'action-2', type: 'action', name: 'Add to Nurture', x: 850, y: 300, config: { action: 'add_to_sequence' } },
];

const INITIAL_CONNECTIONS = [
  { from: 'trigger-1', to: 'agent-1' },
  { from: 'agent-1', to: 'condition-1' },
  { from: 'condition-1', to: 'action-1', label: 'Yes' },
  { from: 'condition-1', to: 'action-2', label: 'No' },
];

export default function WorkflowCanvas({ workflowId, onSave }) {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [connections, setConnections] = useState(INITIAL_CONNECTIONS);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef(null);

  // Handle node drag
  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    setDragging({ nodeId, offsetX: e.clientX - node.x, offsetY: e.clientY - node.y });
    setSelectedNode(nodeId);
  }, [nodes]);

  // Handle canvas mouse move (for dragging and connecting)
  const handleCanvasMouseMove = useCallback((e) => {
    if (dragging) {
      setNodes(prev => prev.map(n =>
        n.id === dragging.nodeId
          ? { ...n, x: e.clientX - dragging.offsetX, y: e.clientY - dragging.offsetY }
          : n
      ));
    }
    if (connecting) {
      // Update connection line
    }
  }, [dragging, connecting]);

  // Handle canvas mouse up
  const handleCanvasMouseUp = useCallback(() => {
    setDragging(null);
    setConnecting(null);
  }, []);

  // Handle connection start
  const handleConnectionStart = useCallback((nodeId) => {
    setConnecting({ from: nodeId });
  }, []);

  // Handle connection end
  const handleConnectionEnd = useCallback((nodeId) => {
    if (connecting && connecting.from !== nodeId) {
      setConnections(prev => [...prev, { from: connecting.from, to: nodeId }]);
    }
    setConnecting(null);
  }, [connecting]);

  // Add new node from palette
  const addNode = useCallback((type) => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      name: `${NODE_TYPES[type].name} Node`,
      x: 200 + Math.random() * 200,
      y: 200 + Math.random() * 200,
      config: {},
    };
    setNodes(prev => [...prev, newNode]);
  }, []);

  // Delete selected node
  const deleteNode = useCallback(() => {
    if (selectedNode) {
      setNodes(prev => prev.filter(n => n.id !== selectedNode));
      setConnections(prev => prev.filter(c => c.from !== selectedNode && c.to !== selectedNode));
      setSelectedNode(null);
    }
  }, [selectedNode]);

  // Update node config
  const updateNodeConfig = useCallback((nodeId, config) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n
    ));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNode && !e.target.matches('input, textarea')) {
          deleteNode();
        }
      }
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setConnecting(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, deleteNode]);

  // Calculate connection paths
  const getConnectionPath = (conn) => {
    const fromNode = nodes.find(n => n.id === conn.from);
    const toNode = nodes.find(n => n.id === conn.to);
    if (!fromNode || !toNode) return '';

    const x1 = fromNode.x + 120;
    const y1 = fromNode.y + 30;
    const x2 = toNode.x;
    const y2 = toNode.y + 30;

    return `M ${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarTitle}>🎨 Workflow Canvas</div>
        <div style={styles.toolbarActions}>
          <button style={styles.button} onClick={() => onSave?.({ nodes, connections })}>
            💾 Save
          </button>
          <button style={styles.buttonSecondary} onClick={() => {
            fetch(`/api/workflows/${workflowId || 'new'}/export`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nodes, connections }),
            });
          }}>
            📤 Export
          </button>
        </div>
      </div>

      <div style={styles.workspace}>
        {/* Node Palette */}
        <div style={styles.palette}>
          <div style={styles.paletteTitle}>Node Types</div>
          {Object.entries(NODE_TYPES).map(([type, info]) => (
            <div
              key={type}
              style={styles.paletteItem}
              onClick={() => addNode(type)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('nodeType', type);
              }}
            >
              <span style={styles.paletteIcon}>{info.icon}</span>
              <span>{info.name}</span>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          style={styles.canvas}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onClick={() => setSelectedNode(null)}
        >
          <svg style={styles.connectionsSvg}>
            {/* Connection lines */}
            {connections.map((conn, i) => (
              <g key={i}>
                <path
                  d={getConnectionPath(conn)}
                  stroke={conn.label ? '#10b981' : '#64748b'}
                  strokeWidth={2}
                  fill="none"
                  markerEnd="url(#arrowhead)"
                />
                {conn.label && (
                  <text
                    x={(nodes.find(n => n.id === conn.from)?.x || 0) + 140}
                    y={(nodes.find(n => n.id === conn.from)?.y || 0) + 20}
                    style={styles.connectionLabel}
                  >
                    {conn.label}
                  </text>
                )}
              </g>
            ))}
            {/* Arrow marker */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
              </marker>
            </defs>
          </svg>

          {/* Nodes */}
          {nodes.map(node => (
            <div
              key={node.id}
              style={{
                ...styles.node,
                left: node.x,
                top: node.y,
                borderColor: selectedNode === node.id ? '#3b82f6' : NODE_TYPES[node.type]?.color,
                boxShadow: selectedNode === node.id ? '0 0 0 2px #3b82f6' : '0 2px 8px rgba(0,0,0,0.1)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode(node.id);
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            >
              <div style={styles.nodeHeader}>
                <span style={styles.nodeIcon}>{NODE_TYPES[node.type]?.icon}</span>
                <span style={styles.nodeType}>{NODE_TYPES[node.type]?.name}</span>
              </div>
              <div style={styles.nodeName}>{node.name}</div>
              <div style={styles.nodeConfig}>
                {Object.entries(node.config).slice(0, 2).map(([k, v]) => (
                  <span key={k} style={styles.configTag}>{k}: {String(v).slice(0, 15)}</span>
                ))}
              </div>
              {/* Connection handles */}
              <div
                style={styles.handleLeft}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleConnectionStart(node.id);
                }}
              />
              <div
                style={styles.handleRight}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  handleConnectionEnd(node.id);
                }}
              />
            </div>
          ))}
        </div>

        {/* Properties Panel */}
        {selectedNode && (
          <div style={styles.properties}>
            <div style={styles.propertiesTitle}>
              Properties
              <button style={styles.deleteButton} onClick={deleteNode}>🗑️</button>
            </div>
            <div style={styles.propertyGroup}>
              <label style={styles.propertyLabel}>Name</label>
              <input
                style={styles.propertyInput}
                value={nodes.find(n => n.id === selectedNode)?.name || ''}
                onChange={(e) => updateNodeConfig(selectedNode, { name: e.target.value })}
              />
            </div>
            <div style={styles.propertyGroup}>
              <label style={styles.propertyLabel}>Type</label>
              <div style={styles.propertyValue}>{nodes.find(n => n.id === selectedNode)?.type}</div>
            </div>
            <div style={styles.propertyGroup}>
              <label style={styles.propertyLabel}>Config</label>
              <pre style={styles.configJson}>
                {JSON.stringify(nodes.find(n => n.id === selectedNode)?.config || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div style={styles.zoomControls}>
        <button style={styles.zoomButton} onClick={() => setZoom(z => Math.min(z + 0.1, 2))}>+</button>
        <span style={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
        <button style={styles.zoomButton} onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}>−</button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  toolbarTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
  },
  toolbarActions: {
    display: 'flex',
    gap: '8px',
  },
  button: {
    padding: '8px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  buttonSecondary: {
    padding: '8px 16px',
    background: 'white',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  workspace: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  palette: {
    width: '200px',
    background: 'white',
    borderRight: '1px solid #e2e8f0',
    padding: '16px',
    overflowY: 'auto',
  },
  paletteTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: '12px',
  },
  paletteItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    marginBottom: '4px',
    background: '#f8fafc',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'background 0.15s',
  },
  paletteIcon: {
    fontSize: '16px',
  },
  canvas: {
    flex: 1,
    position: 'relative',
    overflow: 'auto',
    background: '#f1f5f9',
    backgroundImage: `
      linear-gradient(#e2e8f0 1px, transparent 1px),
      linear-gradient(90deg, #e2e8f0 1px, transparent 1px)
    `,
    backgroundSize: '20px 20px',
  },
  connectionsSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  connectionLabel: {
    fontSize: '11px',
    fill: '#10b981',
    fontWeight: '500',
  },
  node: {
    position: 'absolute',
    width: '120px',
    background: 'white',
    borderRadius: '8px',
    border: '2px solid',
    padding: '10px',
    cursor: 'move',
    userSelect: 'none',
  },
  nodeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
  },
  nodeIcon: {
    fontSize: '14px',
  },
  nodeType: {
    fontSize: '10px',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  nodeName: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: '6px',
  },
  nodeConfig: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  configTag: {
    fontSize: '10px',
    background: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: '4px',
    color: '#64748b',
  },
  handleLeft: {
    position: 'absolute',
    left: '-6px',
    top: '50%',
    width: '12px',
    height: '12px',
    background: '#64748b',
    borderRadius: '50%',
    cursor: 'crosshair',
  },
  handleRight: {
    position: 'absolute',
    right: '-6px',
    top: '50%',
    width: '12px',
    height: '12px',
    background: '#64748b',
    borderRadius: '50%',
    cursor: 'crosshair',
  },
  properties: {
    width: '280px',
    background: 'white',
    borderLeft: '1px solid #e2e8f0',
    padding: '16px',
    overflowY: 'auto',
  },
  propertiesTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
  },
  propertyGroup: {
    marginBottom: '16px',
  },
  propertyLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
    marginBottom: '6px',
  },
  propertyInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
  },
  propertyValue: {
    fontSize: '13px',
    color: '#1e293b',
  },
  configJson: {
    fontSize: '11px',
    background: '#f8fafc',
    padding: '8px',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '200px',
  },
  zoomControls: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'white',
    padding: '8px 12px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  zoomButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  zoomLevel: {
    fontSize: '12px',
    color: '#64748b',
    minWidth: '40px',
    textAlign: 'center',
  },
};

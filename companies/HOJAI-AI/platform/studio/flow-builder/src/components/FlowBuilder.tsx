/**
 * HOJAI Flow Builder - Main Component
 */

import React, { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useFlowStore, FlowNode as FlowNodeType, Connection as ConnectionType, NodeType } from '../store';
import { NodePalette } from './NodePalette';
import { PropertiesPanel } from './PropertiesPanel';
import { FlowToolbar } from './FlowToolbar';
import { FlowNode } from './FlowNode';
import { ConditionNode } from './ConditionNode';
import { TriggerNode } from './TriggerNode';
import { AgentNode } from './AgentNode';

// Node types mapping
const nodeTypes = {
  trigger: TriggerNode,
  ai_agent: AgentNode,
  condition: ConditionNode,
  default: FlowNode,
};

export function FlowBuilder() {
  const {
    flow,
    selectedNodeId,
    addNode,
    addConnection,
    selectNode,
    saveFlow,
    loadFlow,
    newFlow,
  } = useFlowStore();

  // Convert store nodes to ReactFlow nodes
  const initialNodes: Node[] = flow.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  }));

  // Convert store connections to ReactFlow edges
  const initialEdges: Edge[] = flow.connections.map((c) => ({
    id: c.id,
    source: c.source,
    target: c.target,
    label: c.condition,
    animated: c.condition ? true : false,
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [showPalette, setShowPalette] = useState(true);
  const [showProperties, setShowProperties] = useState(false);

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      addConnection(params.source!, params.target!);
    },
    [setEdges, addConnection]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
      setShowProperties(true);
    },
    [selectNode]
  );

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    selectNode(null);
    setShowProperties(false);
  }, [selectNode]);

  // Handle drag and drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      // Get drop position
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: (event.clientX - reactFlowBounds.left - 200) * (1 / useFlowStore.getState().zoom),
        y: (event.clientY - reactFlowBounds.top) * (1 / useFlowStore.getState().zoom),
      };

      // Add node to store
      const newNodeId = addNode(type, position);

      // Also add to ReactFlow
      const nodeData = useFlowStore.getState().flow.nodes.find((n) => n.id === newNodeId);
      if (nodeData) {
        setNodes((nds) => [
          ...nds,
          {
            id: newNodeId,
            type,
            position,
            data: nodeData.data,
          },
        ]);
      }
    },
    [addNode, setNodes]
  );

  // Handle node position changes
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      useFlowStore.getState().moveNode(node.id, node.position);
    },
    []
  );

  // Save to store when nodes/edges change
  React.useEffect(() => {
    // Sync with store
  }, [nodes, edges]);

  return (
    <div className="flow-builder">
      {/* Toolbar */}
      <FlowToolbar
        flowName={flow.name}
        onSave={() => {
          saveFlow();
          // Sync to ReactFlow
        }}
        onNew={() => {
          newFlow();
          setNodes([]);
          setEdges([]);
        }}
        onLoad={() => {
          // TODO: Load from file or API
        }}
        onTogglePalette={() => setShowPalette(!showPalette)}
        onToggleProperties={() => setShowProperties(!showProperties)}
        showPalette={showPalette}
        showProperties={showProperties}
      />

      <div className="flow-builder-content">
        {/* Left Panel - Node Palette */}
        {showPalette && (
          <div className="flow-builder-palette">
            <NodePalette />
          </div>
        )}

        {/* Canvas */}
        <div
          className="flow-builder-canvas"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: false,
            }}
          >
            <Background color="#e5e7eb" gap={15} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case 'trigger':
                    return '#22c55e';
                  case 'ai_agent':
                    return '#8b5cf6';
                  case 'condition':
                    return '#f59e0b';
                  case 'end':
                    return '#ef4444';
                  default:
                    return '#3b82f6';
                }
              }}
            />
          </ReactFlow>
        </div>

        {/* Right Panel - Properties */}
        {showProperties && selectedNodeId && (
          <div className="flow-builder-properties">
            <PropertiesPanel nodeId={selectedNodeId} />
          </div>
        )}
      </div>
    </div>
  );
}

export default FlowBuilder;

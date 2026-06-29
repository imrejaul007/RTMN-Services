/**
 * HOJAI Studio - Flow Editor Page
 */

import React, { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ReactFlow, Background, Controls, MiniMap, addEdge, Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Play, Pause, ArrowLeft, Settings, Plus } from 'lucide-react';

const initialNodes: Node[] = [
  { id: '1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Webhook Trigger' } },
  { id: '2', type: 'default', position: { x: 250, y: 200 }, data: { label: 'AI Agent' } },
  { id: '3', type: 'default', position: { x: 100, y: 350 }, data: { label: 'Condition' } },
  { id: '4', type: 'default', position: { x: 250, y: 500 }, data: { label: 'Send Email' } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3' },
];

export function FlowEditor() {
  const { id } = useParams();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, []);

  const onNodesChange = useCallback((changes: any) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="h-14 border-b bg-white px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/workflows" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-semibold text-gray-900">Lead Qualification Pipeline</h1>
            <p className="text-xs text-gray-500">Sales • Active</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Settings className="w-5 h-5 text-gray-500" />
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg ${
              isRunning ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Stop' : 'Run'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onConnect={onConnect}
          onNodesChange={onNodesChange}
          fitView
        >
          <Background color="#e5e7eb" gap={16} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* Node Palette */}
      <div className="absolute left-4 top-20 w-64 bg-white rounded-xl shadow-lg border p-4">
        <h3 className="font-semibold text-sm mb-3">Add Node</h3>
        <div className="space-y-2">
          {[
            { icon: '⚡', label: 'Trigger', color: 'bg-green-100 text-green-600' },
            { icon: '🤖', label: 'AI Agent', color: 'bg-purple-100 text-purple-600' },
            { icon: '📧', label: 'Email', color: 'bg-blue-100 text-blue-600' },
            { icon: '🔀', label: 'Condition', color: 'bg-yellow-100 text-yellow-600' },
            { icon: '✅', label: 'Approval', color: 'bg-orange-100 text-orange-600' },
          ].map((node) => (
            <button
              key={node.label}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 border border-gray-100"
            >
              <div className={`w-8 h-8 ${node.color} rounded-lg flex items-center justify-center text-sm`}>
                {node.icon}
              </div>
              <span className="text-sm">{node.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

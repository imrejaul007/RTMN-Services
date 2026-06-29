/**
 * HOJAI Flow Builder - Node Palette
 * Draggable node categories
 */

import React from 'react';
import { NodeType } from '../store';

interface NodeCategory {
  name: string;
  icon: string;
  color: string;
  nodes: { type: NodeType; label: string; description: string }[];
}

const nodeCategories: NodeCategory[] = [
  {
    name: 'Triggers',
    icon: '⚡',
    color: '#22c55e',
    nodes: [
      { type: 'trigger', label: 'Webhook', description: 'Start on webhook' },
      { type: 'schedule', label: 'Schedule', description: 'Run on cron' },
      { type: 'email', label: 'Email', description: 'Start on email' },
      { type: 'form', label: 'Form', description: 'Form submission' },
    ],
  },
  {
    name: 'AI Agents',
    icon: '🤖',
    color: '#8b5cf6',
    nodes: [
      { type: 'ai_agent', label: 'AI Agent', description: 'Run AI agent' },
      { type: 'transform', label: 'Transform', description: 'Transform data' },
      { type: 'analytics', label: 'Analytics', description: 'Track events' },
    ],
  },
  {
    name: 'Logic',
    icon: '🔀',
    color: '#f59e0b',
    nodes: [
      { type: 'condition', label: 'Condition', description: 'Branch on condition' },
      { type: 'filter', label: 'Filter', description: 'Filter data' },
    ],
  },
  {
    name: 'Data',
    icon: '💾',
    color: '#3b82f6',
    nodes: [
      { type: 'memory', label: 'Memory', description: 'Save/load memory' },
      { type: 'twin', label: 'Twin', description: 'Update digital twin' },
    ],
  },
  {
    name: 'Integrations',
    icon: '🔌',
    color: '#06b6d4',
    nodes: [
      { type: 'crm', label: 'CRM', description: 'CRM operations' },
      { type: 'email', label: 'Email', description: 'Send email' },
      { type: 'sms', label: 'SMS', description: 'Send SMS' },
      { type: 'slack', label: 'Slack', description: 'Slack message' },
      { type: 'calendar', label: 'Calendar', description: 'Calendar event' },
    ],
  },
  {
    name: 'Documents',
    icon: '📄',
    color: '#64748b',
    nodes: [
      { type: 'document', label: 'Document', description: 'Generate PDF/Doc' },
      { type: 'webhook', label: 'Webhook', description: 'Send webhook' },
    ],
  },
  {
    name: 'Internet',
    icon: '🌐',
    color: '#10b981',
    nodes: [
      { type: 'actor', label: 'Actor', description: 'Scrape web data' },
    ],
  },
  {
    name: 'Actions',
    icon: '✅',
    color: '#ec4899',
    nodes: [
      { type: 'approval', label: 'Approval', description: 'Request approval' },
      { type: 'action', label: 'Action', description: 'Custom action' },
      { type: 'end', label: 'End', description: 'End flow' },
    ],
  },
];

export function NodePalette() {
  const onDragStart = (
    event: React.DragEvent,
    nodeType: NodeType
  ) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="node-palette">
      <div className="palette-header">
        <h3>Components</h3>
        <span className="hint">Drag to canvas</span>
      </div>

      <div className="palette-content">
        {nodeCategories.map((category) => (
          <div key={category.name} className="palette-category">
            <div className="category-header">
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </div>

            <div className="category-nodes">
              {category.nodes.map((node) => (
                <div
                  key={node.type}
                  className="palette-node"
                  draggable
                  onDragStart={(e) => onDragStart(e, node.type)}
                  style={{ borderColor: category.color }}
                >
                  <div className="node-label">{node.label}</div>
                  <div className="node-description">{node.description}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NodePalette;

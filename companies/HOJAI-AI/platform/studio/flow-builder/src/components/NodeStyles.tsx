/**
 * HOJAI Flow Builder - Custom Nodes
 */

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

const nodeStyles = {
  trigger: {
    bg: '#22c55e',
    border: '#16a34a',
    icon: '⚡',
  },
  ai_agent: {
    bg: '#8b5cf6',
    border: '#7c3aed',
    icon: '🤖',
  },
  condition: {
    bg: '#f59e0b',
    border: '#d97706',
    icon: '🔀',
  },
  memory: {
    bg: '#3b82f6',
    border: '#2563eb',
    icon: '💾',
  },
  twin: {
    bg: '#3b82f6',
    border: '#2563eb',
    icon: '👤',
  },
  email: {
    bg: '#06b6d4',
    border: '#0891b2',
    icon: '📧',
  },
  slack: {
    bg: '#ec4899',
    border: '#db2777',
    icon: '💬',
  },
  approval: {
    bg: '#f97316',
    border: '#ea580c',
    icon: '✅',
  },
  end: {
    bg: '#ef4444',
    border: '#dc2626',
    icon: '🔚',
  },
  default: {
    bg: '#64748b',
    border: '#475569',
    icon: '📦',
  },
};

export function FlowNode({ data, type }: NodeProps) {
  const style = nodeStyles[type as keyof typeof nodeStyles] || nodeStyles.default;

  return (
    <div
      className="flow-node"
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="node-icon">{style.icon}</div>
      <div className="node-label">{data.label}</div>
      {data.description && (
        <div className="node-description">{data.description}</div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function TriggerNode({ data }: NodeProps) {
  const style = nodeStyles.trigger;

  return (
    <div
      className="flow-node trigger-node"
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="node-header">
        <span className="node-icon">{style.icon}</span>
        <span className="node-type">Trigger</span>
      </div>
      <div className="node-label">{data.label}</div>
      <div className="node-config">
        {data.config?.type || 'webhook'}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function AgentNode({ data }: NodeProps) {
  const style = nodeStyles.ai_agent;

  return (
    <div
      className="flow-node agent-node"
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="node-header">
        <span className="node-icon">{style.icon}</span>
        <span className="node-type">AI Agent</span>
      </div>
      <div className="node-label">{data.label}</div>
      <div className="node-agent">
        {data.config?.agent || 'Select agent...'}
      </div>
      <div className="node-model">
        {data.config?.model || 'claude-3-5-sonnet'}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function ConditionNode({ data }: NodeProps) {
  const style = nodeStyles.condition;

  return (
    <div
      className="flow-node condition-node"
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="node-header">
        <span className="node-icon">{style.icon}</span>
        <span className="node-type">Condition</span>
      </div>
      <div className="node-label">{data.label}</div>
      <div className="node-condition">
        {data.config?.field} {data.config?.operator} {data.config?.value}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        style={{ top: '40%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="no"
        style={{ top: '60%' }}
      />
      <div className="condition-labels">
        <span className="yes-label">Yes</span>
        <span className="no-label">No</span>
      </div>
    </div>
  );
}

export function EndNode({ data }: NodeProps) {
  const style = nodeStyles.end;

  return (
    <div
      className="flow-node end-node"
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="node-icon">{style.icon}</div>
      <div className="node-label">{data.label}</div>
    </div>
  );
}

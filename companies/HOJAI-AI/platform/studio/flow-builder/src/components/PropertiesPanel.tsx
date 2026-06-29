/**
 * HOJAI Flow Builder - Properties Panel
 * Configure selected node properties
 */

import React, { useState, useEffect } from 'react';
import { useFlowStore, NodeType } from '../store';

interface PropertiesPanelProps {
  nodeId: string;
}

export function PropertiesPanel({ nodeId }: PropertiesPanelProps) {
  const { flow, updateNode, removeNode } = useFlowStore();
  const node = flow.nodes.find((n) => n.id === nodeId);

  const [label, setLabel] = useState(node?.data.label || '');
  const [description, setDescription] = useState(node?.data.description || '');
  const [config, setConfig] = useState<Record<string, any>>(node?.data.config || {});

  useEffect(() => {
    if (node) {
      setLabel(node.data.label);
      setDescription(node.data.description || '');
      setConfig(node.data.config || {});
    }
  }, [node]);

  if (!node) {
    return (
      <div className="properties-panel">
        <div className="panel-empty">Select a node to edit</div>
      </div>
    );
  }

  const handleSave = () => {
    updateNode(nodeId, {
      label,
      description,
      config,
    });
  };

  const handleDelete = () => {
    if (confirm('Delete this node?')) {
      removeNode(nodeId);
    }
  };

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <h3>Node Properties</h3>
        <span className="node-type-badge" data-type={node.type}>
          {node.type}
        </span>
      </div>

      <div className="panel-content">
        {/* Basic Info */}
        <div className="property-section">
          <h4>Basic</h4>
          <div className="property-group">
            <label>Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Node label"
            />
          </div>
          <div className="property-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this node do?"
              rows={3}
            />
          </div>
        </div>

        {/* Type-specific config */}
        <NodeConfigEditor
          nodeType={node.type}
          config={config}
          onChange={setConfig}
        />

        {/* Actions */}
        <div className="property-section actions">
          <button className="btn-primary" onClick={handleSave}>
            Save Changes
          </button>
          <button className="btn-danger" onClick={handleDelete}>
            Delete Node
          </button>
        </div>
      </div>
    </div>
  );
}

// Type-specific config editors
function NodeConfigEditor({
  nodeType,
  config,
  onChange,
}: {
  nodeType: NodeType;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}) {
  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  switch (nodeType) {
    case 'trigger':
      return (
        <div className="property-section">
          <h4>Trigger Config</h4>
          <div className="property-group">
            <label>Trigger Type</label>
            <select
              value={config.type || 'webhook'}
              onChange={(e) => updateConfig('type', e.target.value)}
            >
              <option value="webhook">Webhook</option>
              <option value="schedule">Schedule</option>
              <option value="email">Email</option>
              <option value="event">Event</option>
            </select>
          </div>
          {config.type === 'webhook' && (
            <div className="property-group">
              <label>Path</label>
              <input
                type="text"
                value={config.path || ''}
                onChange={(e) => updateConfig('path', e.target.value)}
                placeholder="/webhook/my-flow"
              />
            </div>
          )}
          {config.type === 'schedule' && (
            <div className="property-group">
              <label>Cron Expression</label>
              <input
                type="text"
                value={config.cron || ''}
                onChange={(e) => updateConfig('cron', e.target.value)}
                placeholder="0 9 * * *"
              />
            </div>
          )}
        </div>
      );

    case 'ai_agent':
      return (
        <div className="property-section">
          <h4>AI Agent Config</h4>
          <div className="property-group">
            <label>Agent</label>
            <select
              value={config.agent || ''}
              onChange={(e) => updateConfig('agent', e.target.value)}
            >
              <option value="">Select agent...</option>
              <option value="sdr_agent">SDR Agent</option>
              <option value="support_agent">Support Agent</option>
              <option value="outreach_agent">Outreach Agent</option>
              <option value="research_agent">Research Agent</option>
              <option value="custom">Custom Agent</option>
            </select>
          </div>
          <div className="property-group">
            <label>Model</label>
            <select
              value={config.model || 'claude-3-5-sonnet'}
              onChange={(e) => updateConfig('model', e.target.value)}
            >
              <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
            </select>
          </div>
          <div className="property-group">
            <label>System Prompt</label>
            <textarea
              value={config.prompt || ''}
              onChange={(e) => updateConfig('prompt', e.target.value)}
              placeholder="Instructions for the agent..."
              rows={5}
            />
          </div>
        </div>
      );

    case 'condition':
      return (
        <div className="property-section">
          <h4>Condition Config</h4>
          <div className="property-group">
            <label>Field</label>
            <input
              type="text"
              value={config.field || ''}
              onChange={(e) => updateConfig('field', e.target.value)}
              placeholder="e.g., data.score"
            />
          </div>
          <div className="property-group">
            <label>Operator</label>
            <select
              value={config.operator || '=='}
              onChange={(e) => updateConfig('operator', e.target.value)}
            >
              <option value="==">Equals</option>
              <option value="!=">Not equals</option>
              <option value=">">Greater than</option>
              <option value=">=">Greater or equal</option>
              <option value="<">Less than</option>
              <option value="<=">Less or equal</option>
              <option value="contains">Contains</option>
            </select>
          </div>
          <div className="property-group">
            <label>Value</label>
            <input
              type="text"
              value={config.value || ''}
              onChange={(e) => updateConfig('value', e.target.value)}
              placeholder="Value to compare"
            />
          </div>
        </div>
      );

    case 'email':
      return (
        <div className="property-section">
          <h4>Email Config</h4>
          <div className="property-group">
            <label>Provider</label>
            <select
              value={config.provider || 'smtp'}
              onChange={(e) => updateConfig('provider', e.target.value)}
            >
              <option value="smtp">SMTP</option>
              <option value="sendgrid">SendGrid</option>
              <option value="mailgun">Mailgun</option>
            </select>
          </div>
          <div className="property-group">
            <label>Template</label>
            <select
              value={config.template || ''}
              onChange={(e) => updateConfig('template', e.target.value)}
            >
              <option value="">Select template...</option>
              <option value="welcome">Welcome Email</option>
              <option value="follow_up">Follow Up</option>
              <option value="notification">Notification</option>
            </select>
          </div>
          <div className="property-group">
            <label>Track Opens</label>
            <input
              type="checkbox"
              checked={config.track_opens || false}
              onChange={(e) => updateConfig('track_opens', e.target.checked)}
            />
          </div>
        </div>
      );

    case 'approval':
      return (
        <div className="property-section">
          <h4>Approval Config</h4>
          <div className="property-group">
            <label>Approvers</label>
            <input
              type="text"
              value={(config.approvers || []).join(', ')}
              onChange={(e) =>
                updateConfig(
                  'approvers',
                  e.target.value.split(',').map((s) => s.trim())
                )
              }
              placeholder="email1, email2"
            />
          </div>
          <div className="property-group">
            <label>Timeout (hours)</label>
            <input
              type="number"
              value={config.timeout || 24}
              onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
            />
          </div>
        </div>
      );

    case 'memory':
      return (
        <div className="property-section">
          <h4>Memory Config</h4>
          <div className="property-group">
            <label>Action</label>
            <select
              value={config.action || 'save'}
              onChange={(e) => updateConfig('action', e.target.value)}
            >
              <option value="save">Save to Memory</option>
              <option value="load">Load from Memory</option>
              <option value="search">Search Memory</option>
            </select>
          </div>
          <div className="property-group">
            <label>Memory Type</label>
            <select
              value={config.memory_type || ''}
              onChange={(e) => updateConfig('memory_type', e.target.value)}
            >
              <option value="">Select type...</option>
              <option value="fact">Fact</option>
              <option value="interaction">Interaction</option>
              <option value="preference">Preference</option>
              <option value="knowledge">Knowledge</option>
            </select>
          </div>
        </div>
      );

    case 'twin':
      return (
        <div className="property-section">
          <h4>Twin Config</h4>
          <div className="property-group">
            <label>Action</label>
            <select
              value={config.action || 'update'}
              onChange={(e) => updateConfig('action', e.target.value)}
            >
              <option value="create">Create Twin</option>
              <option value="update">Update Twin</option>
              <option value="load">Load Twin</option>
            </select>
          </div>
          <div className="property-group">
            <label>Twin Type</label>
            <select
              value={config.twin || ''}
              onChange={(e) => updateConfig('twin', e.target.value)}
            >
              <option value="">Select twin...</option>
              <option value="customer">Customer Twin</option>
              <option value="lead">Lead Twin</option>
              <option value="order">Order Twin</option>
              <option value="company">Company Twin</option>
            </select>
          </div>
        </div>
      );

    case 'actor':
      return (
        <div className="property-section">
          <h4>Actor Config</h4>
          <div className="property-group">
            <label>Actor</label>
            <select
              value={config.actor || ''}
              onChange={(e) => updateConfig('actor', e.target.value)}
            >
              <option value="">Select actor...</option>
              <option value="google_maps">Google Maps</option>
              <option value="linkedin">LinkedIn</option>
              <option value="news">News</option>
              <option value="zomato">Zomato</option>
              <option value="custom">Custom Actor</option>
            </select>
          </div>
          <div className="property-group">
            <label>Target</label>
            <input
              type="text"
              value={config.target || ''}
              onChange={(e) => updateConfig('target', e.target.value)}
              placeholder="What to scrape"
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="property-section">
          <h4>Configuration</h4>
          <div className="property-group">
            <label>Custom Config</label>
            <textarea
              value={JSON.stringify(config, null, 2)}
              onChange={(e) => {
                try {
                  updateConfig(JSON.parse(e.target.value));
                } catch {}
              }}
              rows={5}
              placeholder="{}"
            />
          </div>
        </div>
      );
  }
}

export default PropertiesPanel;

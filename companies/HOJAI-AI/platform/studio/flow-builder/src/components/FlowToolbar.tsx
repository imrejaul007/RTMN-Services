/**
 * HOJAI Flow Builder - Toolbar
 */

import React from 'react';
import { useFlowStore } from '../store';

interface FlowToolbarProps {
  flowName: string;
  onSave: () => void;
  onNew: () => void;
  onLoad: () => void;
  onTogglePalette: () => void;
  onToggleProperties: () => void;
  showPalette: boolean;
  showProperties: boolean;
}

export function FlowToolbar({
  flowName,
  onSave,
  onNew,
  onLoad,
  onTogglePalette,
  onToggleProperties,
  showPalette,
  showProperties,
}: FlowToolbarProps) {
  const { flow, zoom, setZoom } = useFlowStore();

  return (
    <div className="flow-toolbar">
      <div className="toolbar-left">
        <div className="flow-name">
          <span className="flow-icon">⚡</span>
          <input
            type="text"
            value={flowName}
            onChange={(e) => {
              useFlowStore.getState().setFlow({
                ...flow,
                name: e.target.value,
              });
            }}
            placeholder="Flow name"
          />
        </div>
        <span className="flow-status">
          {flow.nodes.length} nodes • {flow.connections.length} connections
        </span>
      </div>

      <div className="toolbar-center">
        <button
          className={`toolbar-btn ${showPalette ? 'active' : ''}`}
          onClick={onTogglePalette}
          title="Toggle Node Palette"
        >
          📦 Nodes
        </button>
        <button
          className={`toolbar-btn ${showProperties ? 'active' : ''}`}
          onClick={onToggleProperties}
          title="Toggle Properties"
        >
          ⚙️ Properties
        </button>
      </div>

      <div className="toolbar-right">
        <div className="zoom-controls">
          <button onClick={() => setZoom(zoom - 0.1)} title="Zoom Out">
            ➖
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(zoom + 0.1)} title="Zoom In">
            ➕
          </button>
          <button onClick={() => setZoom(1)} title="Reset Zoom">
            🔄
          </button>
        </div>

        <div className="toolbar-actions">
          <button className="toolbar-btn secondary" onClick={onNew}>
            ➕ New
          </button>
          <button className="toolbar-btn secondary" onClick={onLoad}>
            📂 Load
          </button>
          <button className="toolbar-btn primary" onClick={onSave}>
            💾 Save
          </button>
          <button className="toolbar-btn success" onClick={() => {}}>
            ▶️ Test
          </button>
          <button className="toolbar-btn primary" onClick={() => {}}>
            🚀 Deploy
          </button>
        </div>
      </div>
    </div>
  );
}

export default FlowToolbar;

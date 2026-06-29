/**
 * HOJAI Flow Builder - Main Entry
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { FlowBuilder } from './components/FlowBuilder';
import './styles.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<FlowBuilder />);
}

export { FlowBuilder } from './components/FlowBuilder';
export { useFlowStore } from './store';
export { flowRuntime } from './components/FlowRuntime';

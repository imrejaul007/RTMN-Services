/**
 * HOJAI Studio - Main App
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Workflows } from './pages/Workflows';
import { FlowEditor } from './pages/FlowEditor';
import { Agents } from './pages/Agents';
import { Templates } from './pages/Templates';
import { Marketplace } from './pages/Marketplace';
import { Settings } from './pages/Settings';
import './index.css';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/workflows/:id" element={<FlowEditor />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

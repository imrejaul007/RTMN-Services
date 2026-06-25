import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { SessionInspector } from './components/SessionInspector';

type View = 'dashboard' | 'session';

export const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setView('session');
  };

  const handleBack = () => {
    setView('dashboard');
    setSelectedSessionId(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Inspector</h1>
                <p className="text-xs text-gray-500">Visual Debugger for AI Agents</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                ● Connected
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {view === 'dashboard' && (
          <Dashboard />
        )}
        {view === 'session' && selectedSessionId && (
          <SessionInspector
            sessionId={selectedSessionId}
            onBack={handleBack}
          />
        )}
      </main>
    </div>
  );
};

export default App;

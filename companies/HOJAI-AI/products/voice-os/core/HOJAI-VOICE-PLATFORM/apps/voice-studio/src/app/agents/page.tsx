'use client';

import { useState } from 'react';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  language: string;
  description: string;
  greeting: string;
  farewell: string;
}

const AGENT_TYPES = [
  { value: 'customer-service', label: 'Customer Service' },
  { value: 'voice-commerce', label: 'Voice Commerce' },
  { value: 'voice-search', label: 'Voice Search' },
  { value: 'appointment', label: 'Appointment' },
];

const LANGUAGES = [
  { value: 'en-IN', label: 'English (India)' },
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'ta-IN', label: 'Tamil' },
  { value: 'te-IN', label: 'Telugu' },
  { value: 'bn-IN', label: 'Bengali' },
  { value: 'kn-IN', label: 'Kannada' },
  { value: 'ml-IN', label: 'Malayalam' },
  { value: 'mr-IN', label: 'Marathi' },
  { value: 'gu-IN', label: 'Gujarati' },
  { value: 'pa-IN', label: 'Punjabi' },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([
    { id: '1', name: 'Customer Support', type: 'customer-service', status: 'active', language: 'en-IN', description: 'Handles customer inquiries and support', greeting: 'Namaste! How can I help you?', farewell: 'Thank you for calling!' },
    { id: '2', name: 'Voice Commerce', type: 'voice-commerce', status: 'active', language: 'hi-IN', description: 'Voice-enabled shopping agent', greeting: 'Namaste! Welcome to shopping', farewell: 'Thank you for shopping with us!' },
  ]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: '',
    type: 'customer-service',
    language: 'en-IN',
    description: '',
    greeting: 'Namaste! How can I help you?',
    farewell: 'Thank you for calling!',
  });

  const handleCreateAgent = () => {
    const agent: Agent = {
      id: String(Date.now()),
      ...newAgent,
      status: 'active',
    };
    setAgents([...agents, agent]);
    setShowCreateModal(false);
    setNewAgent({ name: '', type: 'customer-service', language: 'en-IN', description: '', greeting: 'Namaste! How can I help you?', farewell: 'Thank you for calling!' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Voice Agents</h1>
          <p className="text-gray-500 mt-1">Create and manage your voice AI agents</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Agent
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Create New Voice Agent</h2>

            <div className="space-y-4">
              <div>
                <label className="label">Agent Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Customer Support"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Agent Type</label>
                  <select
                    className="input"
                    value={newAgent.type}
                    onChange={(e) => setNewAgent({ ...newAgent, type: e.target.value })}
                  >
                    {AGENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Language</label>
                  <select
                    className="input"
                    value={newAgent.language}
                    onChange={(e) => setNewAgent({ ...newAgent, language: e.target.value })}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Describe what this agent does..."
                  value={newAgent.description}
                  onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Greeting Message</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Namaste! How can I help you?"
                  value={newAgent.greeting}
                  onChange={(e) => setNewAgent({ ...newAgent, greeting: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Farewell Message</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Thank you for calling!"
                  value={newAgent.farewell}
                  onChange={(e) => setNewAgent({ ...newAgent, farewell: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleCreateAgent} className="btn-primary" disabled={!newAgent.name}>
                Create Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <div key={agent.id} className="card hover:shadow-lg transition">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{agent.name}</h3>
                <span className="text-xs text-gray-500 uppercase">{agent.type.replace('-', ' ')}</span>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                agent.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {agent.status}
              </span>
            </div>

            <p className="text-gray-500 text-sm mb-4">{agent.description}</p>

            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span>{LANGUAGES.find(l => l.value === agent.language)?.label}</span>
            </div>

            <div className="border-t pt-4 mt-4">
              <p className="text-xs text-gray-500 mb-1">Greeting:</p>
              <p className="text-sm italic">"{agent.greeting}"</p>
            </div>

            <div className="flex gap-2 mt-4">
              <button className="flex-1 btn-secondary text-sm">Edit</button>
              <button className="flex-1 btn-primary text-sm">Test</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

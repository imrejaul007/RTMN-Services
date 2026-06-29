/**
 * HOJAI Agent Studio - AI Agent Builder UI
 */

import React, { useState } from 'react';
import { Bot, Save, Play, Plus, Trash2, Code, MessageSquare, Database, Sparkles } from 'lucide-react';

const SKILL_TEMPLATES = [
  { id: 'sdr', name: 'Sales Development', skills: ['lead_qualification', 'email_outreach', 'meeting_booking'] },
  { id: 'support', name: 'Customer Support', skills: ['ticket_classification', 'knowledge_retrieval', 'response_generation'] },
  { id: 'marketing', name: 'Marketing', skills: ['content_creation', 'campaign_optimization', 'lead_nurture'] },
  { id: 'finance', name: 'Finance', skills: ['invoice_processing', 'expense_approval', 'reporting'] },
  { id: 'hr', name: 'HR', skills: ['resume_screening', 'onboarding', 'leave_management'] },
];

const TOOL_TEMPLATES = [
  { id: 'crm', name: 'CRM', icon: '📊' },
  { id: 'email', name: 'Email', icon: '📧' },
  { id: 'slack', name: 'Slack', icon: '💬' },
  { id: 'calendar', name: 'Calendar', icon: '📅' },
  { id: 'whatsapp', name: 'WhatsApp', icon: '📱' },
  { id: 'memory', name: 'Memory', icon: '🧠' },
];

export function AgentStudio() {
  const [agent, setAgent] = useState({
    id: '',
    name: 'New Agent',
    role: 'custom',
    description: '',
    instructions: 'You are a helpful AI assistant.',
    skills: [] as string[],
    tools: [] as string[],
    model: 'claude-3-5-sonnet',
    temperature: 0.7,
  });

  const [tab, setTab] = useState<'config' | 'instructions' | 'tools' | 'test'>('config');

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Agents</h2>
        <div className="space-y-2">
          {['SDR Agent', 'Support Agent', 'Marketing Agent', 'Finance Agent'].map((name) => (
            <button
              key={name}
              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-purple-300 hover:bg-purple-50 text-left"
            >
              <Bot className="w-5 h-5 text-purple-500" />
              <span className="text-sm">{name}</span>
            </button>
          ))}
          <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed text-gray-400 hover:border-purple-300 hover:text-purple-600">
            <Plus className="w-5 h-5" />
            <span className="text-sm">New Agent</span>
          </button>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b bg-white px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Bot className="w-8 h-8 text-purple-600" />
            <input
              type="text"
              value={agent.name}
              onChange={(e) => setAgent({ ...agent, name: e.target.value })}
              className="text-xl font-semibold bg-transparent border-none focus:outline-none"
              placeholder="Agent Name"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Code className="w-4 h-4" />
              API
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Save className="w-4 h-4" />
              Save
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
              <Play className="w-4 h-4" />
              Deploy
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b bg-white px-6">
          <div className="flex gap-6">
            {[
              { id: 'config', label: 'Configuration', icon: Bot },
              { id: 'instructions', label: 'Instructions', icon: MessageSquare },
              { id: 'tools', label: 'Tools', icon: Database },
              { id: 'test', label: 'Test', icon: Sparkles },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-2 py-4 border-b-2 ${
                  tab === t.id ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {tab === 'config' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
                <input
                  type="text"
                  value={agent.name}
                  onChange={(e) => setAgent({ ...agent, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={agent.role}
                  onChange={(e) => setAgent({ ...agent, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="sdr">Sales Development (SDR)</option>
                  <option value="support">Customer Support</option>
                  <option value="marketing">Marketing</option>
                  <option value="finance">Finance</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LLM Model</label>
                <select
                  value={agent.model}
                  onChange={(e) => setAgent({ ...agent, model: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Recommended)</option>
                  <option value="claude-3-opus">Claude 3 Opus</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={agent.temperature}
                  onChange={(e) => setAgent({ ...agent, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Precise</span>
                  <span>{agent.temperature}</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'instructions' && (
            <div className="max-w-3xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium">System Instructions</h3>
                <button className="text-sm text-purple-600 hover:underline">
                  Use template
                </button>
              </div>
              <textarea
                value={agent.instructions}
                onChange={(e) => setAgent({ ...agent, instructions: e.target.value })}
                rows={20}
                className="w-full p-4 border rounded-lg font-mono text-sm"
                placeholder="You are a helpful AI assistant..."
              />
              <p className="mt-2 text-xs text-gray-500">
                Describe what this agent does, how it should behave, and any specific guidelines.
              </p>
            </div>
          )}

          {tab === 'tools' && (
            <div className="max-w-2xl">
              <h3 className="font-medium mb-4">Available Tools</h3>
              <div className="grid grid-cols-2 gap-4">
                {TOOL_TEMPLATES.map((tool) => (
                  <label
                    key={tool.id}
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${
                      agent.tools.includes(tool.id) ? 'border-purple-500 bg-purple-50' : 'hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={agent.tools.includes(tool.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAgent({ ...agent, tools: [...agent.tools, tool.id] });
                        } else {
                          setAgent({ ...agent, tools: agent.tools.filter(t => t !== tool.id) });
                        }
                      }}
                      className="w-5 h-5 rounded border-gray-300 text-purple-600"
                    />
                    <span className="text-xl">{tool.icon}</span>
                    <span className="font-medium">{tool.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {tab === 'test' && (
            <div className="max-w-2xl">
              <h3 className="font-medium mb-4">Test Agent</h3>
              <div className="bg-gray-100 rounded-lg p-4 mb-4 min-h-48">
                <p className="text-gray-500 text-sm">Agent responses will appear here...</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask the agent..."
                  className="flex-1 px-4 py-2 border rounded-lg"
                />
                <button className="px-4 bg-purple-600 text-white rounded-lg">Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Sparkles, MessageSquare, Phone, Target, TrendingUp, HelpCircle } from 'lucide-react';

const features = [
  { id: 'next-action', name: 'Next Best Action', icon: Target, desc: 'Get AI recommendations for your next action' },
  { id: 'script', name: 'Sales Script', icon: MessageSquare, desc: 'Generate conversation scripts' },
  { id: 'prepare-call', name: 'Call Prep', icon: Phone, desc: 'Prepare for your sales calls' },
  { id: 'analyze-call', name: 'Call Analysis', icon: Sparkles, desc: 'Analyze call transcripts' },
  { id: 'coach', name: 'Sales Coaching', icon: TrendingUp, desc: 'Get personalized coaching' },
  { id: 'objection', name: 'Objection Handler', icon: HelpCircle, desc: 'Handle objections with AI' },
];

export default function CopilotPage() {
  const [selected, setSelected] = useState('next-action');
  const [leadId, setLeadId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!leadId) return;
    setLoading(true);
    // Simulate AI response
    await new Promise(r => setTimeout(r, 1500));
    setResult({
      action: 'Send WhatsApp message',
      reason: 'Lead responded to last email - high engagement',
      priority: 9,
      channel: 'whatsapp',
      message: 'Great to hear from you! Would you be available for a quick call this week?'
    });
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-yellow-500" />
        AI Sales Copilot
      </h1>

      {/* Features */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {features.map(f => (
          <button
            key={f.id}
            onClick={() => setSelected(f.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              selected === f.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <f.icon className="w-8 h-8 text-blue-600 mb-2" />
            <h3 className="font-semibold">{f.name}</h3>
            <p className="text-sm text-gray-500">{f.desc}</p>
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {features.find(f => f.id === selected)?.name}
        </h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={leadId}
            onChange={e => setLeadId(e.target.value)}
            placeholder="Enter lead ID or name..."
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAsk}
            disabled={loading || !leadId}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Thinking...' : 'Ask Copilot'}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
          <h3 className="font-semibold text-lg mb-4">🤖 AI Recommendation</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="text-gray-600">Recommended Action</span>
              <span className="font-semibold">{result.action}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="text-gray-600">Channel</span>
              <span className="font-semibold capitalize">{result.channel}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="text-gray-600">Priority</span>
              <span className="font-semibold">{result.priority}/10</span>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <span className="text-gray-600 block mb-1">Reason</span>
              <p>{result.reason}</p>
            </div>
            {result.message && (
              <div className="p-3 bg-white rounded-lg">
                <span className="text-gray-600 block mb-1">Suggested Message</span>
                <p className="italic">"{result.message}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

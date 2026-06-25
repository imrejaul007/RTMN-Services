'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Phone, Mic, Settings, Play, Plus, Bot } from 'lucide-react';

export default function VoicePage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch('http://localhost:4430/api/v1/agents');
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await fetch(`http://localhost:4430/api/v1/agents/${id}/activate`, { method: 'POST' });
      fetchAgents();
    } catch (error) {
      console.error('Failed to activate:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="text-white font-bold">HOJAI Studio</span>
            </Link>
            <span className="text-slate-500">/</span>
            <span className="text-white font-medium">Voice Studio</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-slate-300 hover:text-white transition-colors">Home</Link>
            <Link href="/voice" className="text-white font-medium">Voice Studio</Link>
            <Link href="/app-store" className="text-slate-300 hover:text-white transition-colors">App Store</Link>
          </nav>
        </div>
      </header>

      <main className="pt-24 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-sm mb-6">
              <Mic className="w-4 h-4" />
              <span>Build voice agents in minutes</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              HOJAI Voice Studio
            </h1>
            <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
              Create AI voice agents for receptionists, sales, concierge, and more.
              Powered by Whisper, Deepgram, ElevenLabs, and more.
            </p>
            <Link
              href="/voice/agents/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Voice Agent
            </Link>
          </div>

          {/* Agents */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Your Voice Agents</h2>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : agents.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                <Bot className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No voice agents yet</h3>
                <p className="text-slate-400 mb-6">Create your first voice agent to get started</p>
                <Link
                  href="/voice/agents/new"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create Agent
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Phone className="w-6 h-6 text-white" />
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        agent.status === 'active'
                          ? 'bg-green-500/10 text-green-400'
                          : agent.status === 'paused'
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">{agent.name}</h3>
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">{agent.description}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                      <span>{agent.language}</span>
                      <span>•</span>
                      <span>{agent.voice?.provider}</span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/voice/agents/${agent.id}`}
                        className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Configure
                      </Link>
                      {agent.status !== 'active' && (
                        <button
                          onClick={() => handleActivate(agent.id)}
                          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Capabilities */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Capabilities</h2>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { icon: Phone, title: 'Call Handling', desc: 'Answer, transfer, voicemail' },
                { icon: Mic, title: 'Speech Recognition', desc: 'Whisper, Deepgram, Google, Sarvam' },
                { icon: Bot, title: 'AI Responses', desc: 'Natural conversation flow' },
                { icon: Settings, title: 'Custom Voice', desc: 'ElevenLabs, Cartesia, Google TTS' }
              ].map((cap) => (
                <div key={cap.title} className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                  <cap.icon className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-1">{cap.title}</h3>
                  <p className="text-slate-400 text-sm">{cap.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

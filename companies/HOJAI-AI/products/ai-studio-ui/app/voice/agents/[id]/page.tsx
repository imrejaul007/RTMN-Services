'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Mic, Phone, Settings, Play, Pause, Trash2 } from 'lucide-react';

const TTS_PROVIDERS = ['elevenlabs', 'cartesia', 'google', 'sarvam'];
const STT_PROVIDERS = ['whisper', 'deepgram', 'google', 'sarvam'];
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'en-IN', name: 'English (India)' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' },
  { code: 'es', name: 'Spanish' },
];

export default function VoiceAgentPage() {
  const params = useParams();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    greeting: '',
    fallbackMessage: '',
    language: 'en',
    voiceProvider: 'elevenlabs',
    voiceId: '',
    voiceSpeed: 1.0,
    sttProvider: 'deepgram',
    maxCallDuration: 600,
    recordings: true,
    analytics: true,
  });

  useEffect(() => {
    if (params.id && params.id !== 'new') {
      fetchAgent(params.id as string);
    } else {
      setLoading(false);
    }
  }, [params.id]);

  const fetchAgent = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:4430/api/v1/agents/${id}`);
      const data = await res.json();
      if (data.agent) {
        setAgent(data.agent);
        setForm({
          name: data.agent.name || '',
          description: data.agent.description || '',
          greeting: data.agent.greeting || '',
          fallbackMessage: data.agent.fallbackMessage || '',
          language: data.agent.language || 'en',
          voiceProvider: data.agent.voice?.provider || 'elevenlabs',
          voiceId: data.agent.voice?.voiceId || '',
          voiceSpeed: data.agent.voice?.speed || 1.0,
          sttProvider: data.agent.transcription?.provider || 'deepgram',
          maxCallDuration: data.agent.maxCallDuration || 600,
          recordings: data.agent.recordings !== false,
          analytics: data.agent.analytics !== false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        greeting: form.greeting,
        fallbackMessage: form.fallbackMessage,
        language: form.language,
        voice: {
          provider: form.voiceProvider,
          voiceId: form.voiceId,
          speed: form.voiceSpeed,
        },
        transcription: {
          provider: form.sttProvider,
          language: form.language,
        },
        maxCallDuration: form.maxCallDuration,
        recordings: form.recordings,
        analytics: form.analytics,
      };

      if (params.id === 'new') {
        await fetch('http://localhost:4430/api/v1/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`http://localhost:4430/api/v1/agents/${params.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    try {
      await fetch(`http://localhost:4430/api/v1/agents/${params.id}`, { method: 'DELETE' });
      window.location.href = '/voice';
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/voice" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="text-white font-medium">
              {params.id === 'new' ? 'Create Voice Agent' : 'Configure Agent'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {params.id !== 'new' && (
              <button
                onClick={handleDelete}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-20 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Basic Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-400" />
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Agent Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="My Voice Agent"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does this agent do?"
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Voice Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Mic className="w-5 h-5 text-slate-400" />
              Voice Settings
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">TTS Provider</label>
                <select
                  value={form.voiceProvider}
                  onChange={(e) => setForm({ ...form, voiceProvider: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TTS_PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Voice ID</label>
                <input
                  type="text"
                  value={form.voiceId}
                  onChange={(e) => setForm({ ...form, voiceId: e.target.value })}
                  placeholder="e.g., rachel, matt"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Language</label>
                <select
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Speed ({form.voiceSpeed}x)</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={form.voiceSpeed}
                  onChange={(e) => setForm({ ...form, voiceSpeed: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Transcription Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-slate-400" />
              Transcription
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">STT Provider</label>
              <select
                value={form.sttProvider}
                onChange={(e) => setForm({ ...form, sttProvider: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STT_PROVIDERS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Messages */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Messages</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Greeting</label>
                <textarea
                  value={form.greeting}
                  onChange={(e) => setForm({ ...form, greeting: e.target.value })}
                  placeholder="Hello! How can I help you today?"
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Fallback Message</label>
                <textarea
                  value={form.fallbackMessage}
                  onChange={(e) => setForm({ ...form, fallbackMessage: e.target.value })}
                  placeholder="I'm not sure I understand. Let me transfer you."
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Max Call Duration (seconds)</label>
                <input
                  type="number"
                  value={form.maxCallDuration}
                  onChange={(e) => setForm({ ...form, maxCallDuration: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.recordings}
                    onChange={(e) => setForm({ ...form, recordings: e.target.checked })}
                    className="w-5 h-5 rounded bg-slate-800 border-slate-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-white">Enable Call Recordings</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.analytics}
                    onChange={(e) => setForm({ ...form, analytics: e.target.checked })}
                    className="w-5 h-5 rounded bg-slate-800 border-slate-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-white">Enable Analytics</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

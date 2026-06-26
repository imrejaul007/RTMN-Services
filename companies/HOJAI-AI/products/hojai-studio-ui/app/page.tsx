'use client';
import { useState } from 'react';
import { Zap, Rocket, Users, Shield, ArrowRight, Check } from 'lucide-react';

const TEMPLATES = [
  { id: 'mobility', name: 'Mobility', icon: '🚗', desc: 'Uber-like ride-hailing', agents: 13, color: '#FF6B35' },
  { id: 'marketplace', name: 'Marketplace', icon: '🛒', desc: 'B2C/B2B catalog', agents: 8, color: '#8B5CF6' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', desc: 'Telemedicine + pharmacy', agents: 6, color: '#10B981' },
  { id: 'education', name: 'Education', icon: '🎓', desc: 'LMS + AI tutoring', agents: 6, color: '#F59E0B' },
  { id: 'finance', name: 'Fintech', icon: '💰', desc: 'Digital bank + payments', agents: 7, color: '#EC4899' },
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️', desc: 'POS + delivery', agents: 6, color: '#EF4444' },
  { id: 'hotel', name: 'Hotel', icon: '🏨', desc: 'Booking + guest mgmt', agents: 7, color: '#06B6D4' },
  { id: 'logistics', name: 'Logistics', icon: '🚚', desc: 'Fleet + dispatch', agents: 8, color: '#84CC16' },
  { id: 'b2b', name: 'B2B Platform', icon: '🤝', desc: 'RFQ + trade finance', agents: 9, color: '#6366F1' },
];

const STEPS = ['Select Template', 'Company Details', 'AI Workers', 'Review & Deploy'];

export default function HomePage() {
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);

  const template = TEMPLATES.find(t => t.id === selectedTemplate);

  const handleDeploy = async () => {
    setDeploying(true);
    // Simulate deployment
    await new Promise(r => setTimeout(r, 3000));
    setDeploying(false);
    setDeployed(true);
  };

  if (deployed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-4xl font-bold mb-4">Congratulations, {companyName}!</h1>
          <p className="text-xl text-white/80 mb-8">Your AI-powered company is live</p>
          <div className="space-y-4">
            <div className="bg-white/10 rounded-xl p-4 text-left max-w-md mx-auto">
              <p className="text-sm text-white/60 mb-2">Your apps</p>
              <p className="text-lg">📱 Passenger App: <span className="text-green-400">live</span></p>
              <p className="text-lg">🚗 Driver App: <span className="text-green-400">live</span></p>
              <p className="text-lg">📊 Admin: <span className="text-green-400">live</span></p>
            </div>
            <button className="bg-white text-purple-900 px-8 py-3 rounded-full font-semibold">
              Open Dashboard →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-8 h-8 text-yellow-400" />
            <span className="text-xl font-bold">HOJAI Studio</span>
          </div>
          <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg">
            Sign In
          </button>
        </div>
      </header>

      {/* Progress */}
      <div className="border-b border-white/10 bg-gray-900">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${i <= step ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`ml-2 text-sm ${i <= step ? 'text-white' : 'text-gray-500'}`}>{s}</span>
                {i < STEPS.length - 1 && <div className="w-12 h-px bg-gray-700 mx-4" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {step === 0 && (
          <div>
            <h1 className="text-4xl font-bold text-center mb-2">Build Your AI Company</h1>
            <p className="text-gray-400 text-center mb-12">Select a template to get started in 30 minutes</p>

            <div className="grid md:grid-cols-3 gap-6">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`p-6 rounded-2xl border-2 text-left transition-all hover:scale-105
                    ${selectedTemplate === t.id
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-800 bg-gray-900 hover:border-gray-700'}`}
                >
                  <span className="text-4xl mb-4 block">{t.icon}</span>
                  <h3 className="text-xl font-semibold mb-2">{t.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{t.desc}</p>
                  <p className="text-purple-400 text-sm">{t.agents} AI workers included</p>
                </button>
              ))}
            </div>

            <div className="text-center mt-12">
              <button
                disabled={!selectedTemplate}
                onClick={() => setStep(1)}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-4 rounded-xl text-lg font-semibold"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="max-w-xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Company Details</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. MoveX, HealthAI, EduPro"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-lg"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Region</label>
                <select className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                  <option>India 🇮🇳</option>
                  <option>United States 🇺🇸</option>
                  <option>United Kingdom 🇬🇧</option>
                  <option>Singapore 🇸🇬</option>
                  <option>UAE 🇦🇪</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Industry</label>
                <select className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                  <option>{template?.name}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(0)} className="text-gray-400 hover:text-white">
                ← Back
              </button>
              <button
                disabled={!companyName}
                onClick={() => setStep(2)}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-8 py-3 rounded-xl font-semibold"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-3xl font-bold mb-4">AI Workers</h2>
            <p className="text-gray-400 mb-8">Your AI team is ready. Each worker costs ~$200-500/month</p>

            <div className="bg-gray-900 rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl">{template?.icon}</span>
                <div>
                  <h3 className="text-xl font-semibold">{template?.name} Team</h3>
                  <p className="text-purple-400">{template?.agents} AI workers • ~$3,800/month total</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { role: 'CEO Strategist', salary: 500, desc: 'Vision, strategy, OKRs' },
                  { role: 'COO Operations', salary: 400, desc: 'Daily operations' },
                  { role: 'Growth Agent', salary: 400, desc: 'Marketing, acquisition' },
                  { role: 'Finance Agent', salary: 300, desc: 'Payouts, reporting' },
                  { role: 'Support Agent', salary: 150, desc: 'Customer support' },
                  { role: 'Safety Agent', salary: 250, desc: 'Monitoring, compliance' },
                ].map((agent, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-800 rounded-xl">
                    <div>
                      <p className="font-medium">{agent.role}</p>
                      <p className="text-sm text-gray-400">{agent.desc}</p>
                    </div>
                    <p className="text-purple-400">${agent.salary}/mo</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white">
                ← Back
              </button>
              <button onClick={() => setStep(3)} className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-xl font-semibold">
                Review & Deploy →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Review & Deploy</h2>

            <div className="bg-gray-900 rounded-2xl p-8 mb-8">
              <h3 className="text-xl font-semibold mb-6">Ready to Deploy</h3>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Company</span>
                  <span className="font-semibold">{companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Template</span>
                  <span>{template?.icon} {template?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">AI Workers</span>
                  <span className="text-purple-400">{template?.agents} agents</span>
                </div>
                <hr className="border-gray-800" />
                <div className="flex justify-between text-lg">
                  <span>Monthly Cost</span>
                  <span className="text-purple-400 font-bold">${(template?.agents || 0) * 300}/mo</span>
                </div>
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-8">
              <div className="flex items-center gap-3">
                <Rocket className="text-green-400 w-6 h-6" />
                <div>
                  <p className="font-semibold text-green-400">Deploy in 30 minutes</p>
                  <p className="text-sm text-gray-400">Apps, AI workers, Nexha network all set up automatically</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="text-gray-400 hover:text-white">
                ← Back
              </button>
              <button
                onClick={handleDeploy}
                disabled={deploying}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-2"
              >
                {deploying ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    Deploy Now
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

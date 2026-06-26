'use client';

import { useState } from 'react';
import Link from 'next/link';

const MOCK_BLUEPRINTS = [
  { id: 'bp_restaurant', name: 'Restaurant Blueprint', industry: 'restaurant', agents: 5, twins: 3, workflows: 8 },
  { id: 'bp_hotel', name: 'Hotel Blueprint', industry: 'hotel', agents: 6, twins: 4, workflows: 12 },
  { id: 'bp_retail', name: 'Retail Store Blueprint', industry: 'retail', agents: 4, twins: 2, workflows: 6 },
  { id: 'bp_healthcare', name: 'Healthcare Blueprint', industry: 'healthcare', agents: 8, twins: 5, workflows: 15 },
  { id: 'bp_ecommerce', name: 'E-commerce Blueprint', industry: 'ecommerce', agents: 7, twins: 4, workflows: 10 },
];

export default function StudioPage() {
  const [selectedBlueprint, setSelectedBlueprint] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [bcp, setBcp] = useState<any>(null);

  const selected = MOCK_BLUEPRINTS.find(b => b.id === selectedBlueprint);

  const generateBCP = async () => {
    if (!selectedBlueprint) return;
    setGenerating(true);

    // Simulate API call to Studio Integration
    await new Promise(r => setTimeout(r, 2000));

    const blueprint = MOCK_BLUEPRINTS.find(b => b.id === selectedBlueprint);
    setBcp({
      id: `bcp_${Date.now()}`,
      name: `${blueprint?.name} Package`,
      category: 'business-capability-pack',
      industry: blueprint?.industry,
      price: 199900,
      pricingModel: 'subscription',
      components: {
        agents: blueprint?.agents || 0,
        twins: blueprint?.twins || 0,
        workflows: blueprint?.workflows || 0,
      },
      status: 'draft',
    });

    setGenerating(false);
  };

  const publishToBAM = async () => {
    if (!bcp) return;
    alert('Publishing to BAM... In production, this submits for moderation review.');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">HOJAI Studio → BAM</h1>
      <p className="text-slate-600 mb-8">Convert your Studio blueprints to BAM listings with one click</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Blueprints from Studio */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">📋 Select Blueprint</h2>
          <p className="text-sm text-slate-500 mb-4">Choose a blueprint from HOJAI Studio to convert</p>

          <div className="space-y-3">
            {MOCK_BLUEPRINTS.map(bp => (
              <button
                key={bp.id}
                onClick={() => setSelectedBlueprint(bp.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selectedBlueprint === bp.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{bp.name}</h3>
                    <p className="text-sm text-slate-500 capitalize">{bp.industry}</p>
                  </div>
                  <div className="flex gap-4 text-sm text-slate-500">
                    <span>🤖 {bp.agents}</span>
                    <span>🔄 {bp.twins}</span>
                    <span>⚡ {bp.workflows}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={generateBCP}
            disabled={!selectedBlueprint || generating}
            className="w-full mt-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating BCP...
              </>
            ) : (
              <>🔄 Convert to Business Capability Pack</>
            )}
          </button>
        </div>

        {/* Generated BCP */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">📦 Generated BCP</h2>

          {bcp ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">✅</span>
                  <span className="font-semibold text-green-800">BCP Generated!</span>
                </div>
                <p className="text-sm text-green-700">
                  Ready to publish to BAM marketplace
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-500">Name</label>
                  <input type="text" value={bcp.name} readOnly
                    className="w-full mt-1 px-4 py-2 border rounded-lg bg-slate-50" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900">{bcp.components.agents}</div>
                    <div className="text-xs text-slate-500">AI Agents</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900">{bcp.components.twins}</div>
                    <div className="text-xs text-slate-500">Digital Twins</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900">{bcp.components.workflows}</div>
                    <div className="text-xs text-slate-500">Workflows</div>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-500">Price</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900">₹{(bcp.price / 100).toLocaleString('en-IN')}</span>
                    <span className="text-slate-500">/month</span>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <h4 className="font-semibold text-purple-900 mb-2">🔗 Nexha Federation</h4>
                  <p className="text-sm text-purple-700 mb-3">
                    Automatically register capabilities in Global Nexha
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                    <span className="text-sm text-purple-800">Enable Nexha deployment</span>
                  </label>
                </div>
              </div>

              <button
                onClick={publishToBAM}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                🚀 Publish to BAM Marketplace
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl mb-4 opacity-50">📦</div>
              <p className="text-slate-500">Select a blueprint and click convert</p>
            </div>
          )}
        </div>
      </div>

      {/* Agentic Features */}
      <div className="mt-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-4">✨ Agentic Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="font-semibold">Auto-Generate Listings</h3>
            <p className="text-sm opacity-80">AI analyzes market demand and creates listings automatically</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-2xl mb-2">🌐</div>
            <h3 className="font-semibold">Nexha Federation</h3>
            <p className="text-sm opacity-80">Deploy directly to Global Nexha network</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-semibold">Smart Matching</h3>
            <p className="text-sm opacity-80">AI matches buyers with the right products</p>
          </div>
        </div>
      </div>
    </div>
  );
}

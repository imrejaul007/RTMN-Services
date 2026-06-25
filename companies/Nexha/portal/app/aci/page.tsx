'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface AciProfile {
  corpid: string;
  overallScore: number;
  trust: { score: number; events: number; trend: number };
  quality: { score: number; defects: number; trend: number };
  delivery: { score: number; onTime: number; fillRate: number; trend: number };
  responsiveness: { score: number; avgResponseMs: number; trend: number };
  compliance: { score: number; violations: number; trend: number };
  bootstrapStage: number;
  percentile: number;
  rank: number;
  tier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Iron' | 'Restricted';
  lastUpdated: string;
}

interface LeaderboardEntry {
  corpid: string;
  name: string;
  overallScore: number;
  tier: AciProfile['tier'];
  trend: number;
}

interface TrendIndicatorProps {
  value: number;
  unit?: string;
}

function TrendIndicator({ value, unit = '' }: TrendIndicatorProps) {
  if (value === 0) return <span className="text-gray-400 text-xs">—</span>;
  const color = value > 0 ? 'text-green-600' : 'text-red-600';
  const arrow = value > 0 ? '↑' : '↓';
  return (
    <span className={`${color} text-xs font-medium`}>
      {arrow} {Math.abs(value).toFixed(1)}{unit}
    </span>
  );
}

function ScoreBar({ score, label, color = 'bg-blue-600' }: { score: number; label: string; color?: string }) {
  const scoreColor =
    score >= 80 ? 'text-green-600' :
    score >= 60 ? 'text-yellow-600' :
    score >= 40 ? 'text-orange-600' :
    'text-red-600';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-semibold w-10 text-right ${scoreColor}`}>{score}</span>
      <span className="text-xs text-gray-400 w-16">{label}</span>
    </div>
  );
}

function TierBadge({ tier }: { tier: AciProfile['tier'] }) {
  const styles: Record<string, string> = {
    Platinum: 'bg-gradient-to-r from-slate-800 to-slate-600 text-white',
    Gold: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white',
    Silver: 'bg-gradient-to-r from-gray-400 to-gray-300 text-gray-900',
    Bronze: 'bg-gradient-to-r from-orange-600 to-amber-700 text-white',
    Iron: 'bg-gray-500 text-white',
    Restricted: 'bg-red-600 text-white',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[tier] || 'bg-gray-200'}`}>
      {tier}
    </span>
  );
}

function TrustBadge({ level }: { level: number }) {
  if (level >= 80) return <span className="text-green-600 font-semibold text-sm">High Trust</span>;
  if (level >= 60) return <span className="text-yellow-600 font-semibold text-sm">Medium Trust</span>;
  if (level >= 40) return <span className="text-orange-600 font-semibold text-sm">Low Trust</span>;
  return <span className="text-red-600 font-semibold text-sm">Untrusted</span>;
}

// ─────────────────────────────────────────────────────────────────
// Mock data for demo (when ReputationOS is not reachable)
// ─────────────────────────────────────────────────────────────────
const DEMO_ACI: AciProfile = {
  corpid: 'corp-restaurant-delhi',
  overallScore: 78,
  trust: { score: 82, events: 47, trend: 2.3 },
  quality: { score: 75, defects: 2, trend: -0.5 },
  delivery: { score: 80, onTime: 94.2, fillRate: 98, trend: 1.1 },
  responsiveness: { score: 74, avgResponseMs: 3400, trend: 3.2 },
  compliance: { score: 85, violations: 0, trend: 0 },
  bootstrapStage: 4,
  percentile: 72,
  rank: 2847,
  tier: 'Gold',
  lastUpdated: new Date().toISOString(),
};

const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { corpid: 'corp-supplier-mumbai', name: 'Mumbai Fresh Foods', overallScore: 96, tier: 'Platinum', trend: 0.8 },
  { corpid: 'corp-logistics-del', name: 'Delhi Express Logistics', overallScore: 93, tier: 'Platinum', trend: 1.2 },
  { corpid: 'corp-restaurant-del', name: 'Delhi Spice Kitchen', overallScore: 91, tier: 'Gold', trend: -0.3 },
  { corpid: 'corp-hotel-goa', name: 'Goa Beach Resorts', overallScore: 89, tier: 'Gold', trend: 2.1 },
  { corpid: 'corp-retail-blr', name: 'Bangalore Retail Co.', overallScore: 87, tier: 'Gold', trend: 0.5 },
];

// ─────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────
export default function AciPage() {
  const router = useRouter();
  const [aci, setAci] = useState<AciProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [corpId, setCorpId] = useState<string>('');
  const [searchId, setSearchId] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('nexha_token');
    const storedCorpId = localStorage.getItem('nexha_corpid');
    if (!token) { router.push('/login'); return; }

    setCorpId(storedCorpId ?? 'corp-restaurant-delhi');

    // Try to fetch real ACI data from ReputationOS (4271)
    Promise.all([
      fetch('http://localhost:4271/api/v1/aci/summary')
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
      fetch('http://localhost:4271/api/v1/aci/leaderboard?limit=5')
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
    ]).then(([aciData, lbData]) => {
      if (aciData?.data) setAci(aciData.data as AciProfile);
      else setAci(DEMO_ACI); // fallback to demo data
      if (lbData?.data) setLeaderboard((lbData.data as { leaderboard?: LeaderboardEntry[] }).leaderboard ?? []);
      else setLeaderboard(DEMO_LEADERBOARD);
    }).finally(() => setLoading(false));
  }, [router]);

  const handleSearch = () => {
    if (!searchId.trim()) return;
    fetch(`http://localhost:4271/api/v1/aci/${searchId}`)
      .then(r => r.json())
      .then(d => { if (d?.data) setAci(d.data as AciProfile); })
      .catch(() => alert('ACI not found for: ' + searchId));
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const score = aci?.overallScore ?? 0;
  const scoreColor =
    score >= 80 ? 'text-green-600' :
    score >= 60 ? 'text-yellow-600' :
    score >= 40 ? 'text-orange-600' :
    'text-red-600';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
          <h1 className="font-semibold text-gray-900">ACI — Autonomous Commerce Index</h1>
          <div className="ml-auto flex items-center gap-3">
            <TierBadge tier={aci?.tier ?? 'Iron'} />
            <span className="text-xs text-gray-500">Powered by ReputationOS</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Search bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex items-center gap-3">
          <span className="text-gray-500 text-sm">Look up any business:</span>
          <input
            type="text"
            placeholder="Enter CorpID..."
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            Look Up
          </button>
          <Link href="/dashboard" className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50">
            My ACI
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Main score card */}
          <div className="lg:col-span-1 space-y-6">
            {/* Big score */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Your ACI Score</p>
              <div className="relative w-48 h-48 mx-auto mb-4">
                {/* SVG gauge */}
                <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                  <circle cx="100" cy="100" r="85" fill="none" stroke="#f3f4f6" strokeWidth="16" />
                  <circle
                    cx="100" cy="100" r="85" fill="none"
                    stroke={score >= 80 ? '#16a34a' : score >= 60 ? '#ca8a04' : score >= 40 ? '#ea580c' : '#dc2626'}
                    strokeWidth="16"
                    strokeDasharray={`${(score / 100) * 534} 534`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-5xl font-bold ${scoreColor}`}>{score}</span>
                  <span className="text-gray-400 text-sm">/100</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <TierBadge tier={aci?.tier ?? 'Iron'} />
                <TrustBadge level={aci?.trust.score ?? 0} />
              </div>
              <p className="text-xs text-gray-500">
                Top {aci?.percentile ?? 50}% in network · Rank #{aci?.rank ?? '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Updated {aci?.lastUpdated ? new Date(aci.lastUpdated).toLocaleDateString() : 'recently'}
              </p>
            </div>

            {/* Bootstrap stage */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Trust Bootstrap Journey</h3>
              <div className="space-y-3">
                {[
                  { stage: 0, label: 'Founder Reputation', done: true },
                  { stage: 1, label: 'Identity Verified', done: true },
                  { stage: 2, label: 'Capabilities Declared', done: true },
                  { stage: 3, label: 'Pilot Deals (3+)', done: true },
                  { stage: 4, label: 'Established', done: true },
                  { stage: 5, label: 'Network Effects', done: false },
                ].map(({ stage, label, done }) => (
                  <div key={stage} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${stage < (aci?.bootstrapStage ?? 0) ? 'bg-green-500 text-white' :
                        stage === (aci?.bootstrapStage ?? 0) ? 'bg-blue-600 text-white' :
                        'bg-gray-200 text-gray-400'}`}>
                      {stage < (aci?.bootstrapStage ?? 0) ? '✓' : stage + 1}
                    </div>
                    <span className={`text-sm ${stage <= (aci?.bootstrapStage ?? 0) ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Score breakdown + leaderboard */}
          <div className="lg:col-span-2 space-y-6">
            {/* Score dimensions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-6">ACI Breakdown</h3>
              <div className="space-y-5">
                {[
                  { dim: 'Trust', score: aci?.trust.score ?? 0, note: `${aci?.trust.events ?? 0} events`, trend: aci?.trust.trend ?? 0 },
                  { dim: 'Quality', score: aci?.quality.score ?? 0, note: `${aci?.quality.defects ?? 0} defects`, trend: aci?.quality.trend ?? 0 },
                  { dim: 'Delivery', score: aci?.delivery.score ?? 0, note: `${aci?.delivery.onTime ?? 0}% on-time`, trend: aci?.delivery.trend ?? 0 },
                  { dim: 'Responsiveness', score: aci?.responsiveness.score ?? 0, note: `avg ${(aci?.responsiveness.avgResponseMs ?? 0) / 1000}s response`, trend: aci?.responsiveness.trend ?? 0 },
                  { dim: 'Compliance', score: aci?.compliance.score ?? 0, note: `${aci?.compliance.violations ?? 0} violations`, trend: aci?.compliance.trend ?? 0 },
                ].map(({ dim, score: s, note, trend }) => (
                  <div key={dim}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{dim}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{note}</span>
                        <TrendIndicator value={trend} unit="pts" />
                      </div>
                    </div>
                    <ScoreBar score={s} label={dim} />
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  ACI = weighted average of Trust (40%) + Quality (25%) + Delivery (20%) + Responsiveness (10%) + Compliance (5%).
                  Scores update daily based on transaction events from all Nexha networks.
                </p>
              </div>
            </div>

            {/* Delivery stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 text-center">
                <p className="text-3xl font-bold text-blue-600">{aci?.delivery.onTime ?? 0}%</p>
                <p className="text-xs text-gray-500 mt-1">On-Time Rate</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 text-center">
                <p className="text-3xl font-bold text-green-600">{aci?.delivery.fillRate ?? 0}%</p>
                <p className="text-xs text-gray-500 mt-1">Fill Rate</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 text-center">
                <p className="text-3xl font-bold text-purple-600">{aci?.trust.events ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Trust Events</p>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">🏆 Top Nexhas — Hospitality</h3>
                <span className="text-xs text-gray-500">Updated daily</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 font-medium text-gray-500">#</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Business</th>
                      <th className="px-4 py-3 font-medium text-gray-500 text-center">ACI</th>
                      <th className="px-4 py-3 font-medium text-gray-500 text-center">Tier</th>
                      <th className="px-4 py-3 font-medium text-gray-500 text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {leaderboard.map((entry, i) => (
                      <tr key={entry.corpid} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{entry.name}</span>
                          <span className="text-gray-400 text-xs ml-2">{entry.corpid.slice(0, 16)}…</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900">{entry.overallScore}</td>
                        <td className="px-4 py-3 text-center"><TierBadge tier={entry.tier} /></td>
                        <td className="px-4 py-3 text-right"><TrendIndicator value={entry.trend} /></td>
                      </tr>
                    ))}
                    {leaderboard.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          No leaderboard data available. Connect ReputationOS to see rankings.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  How to improve: Complete more transactions, maintain on-time delivery, and respond within 5s to RFQs.
                </p>
                <Link href="/rfqs" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Respond to RFQs →
                </Link>
              </div>
            </div>

            {/* What is ACI */}
            <details className="bg-blue-50 rounded-2xl border border-blue-100 p-6">
              <summary className="font-semibold text-blue-900 cursor-pointer">What is the ACI?</summary>
              <div className="mt-4 text-sm text-blue-800 space-y-2">
                <p>
                  The <strong>Autonomous Commerce Index (ACI)</strong> is Nexha's trust and performance score for
                  businesses in the autonomous economy. Think of it as a credit score, but for B2B commerce.
                </p>
                <p>
                  ACI ranges from 0-100. Higher scores mean more trust from the network, which translates to
                  better discovery ranking, lower escrow requirements, and more automated transactions.
                </p>
                <p>
                  Scores are computed from real transaction events: delivery timeliness, quality metrics,
                  communication responsiveness, compliance records, and trust events from the SADA trust network.
                </p>
              </div>
            </details>
          </div>
        </div>
      </main>
    </div>
  );
}

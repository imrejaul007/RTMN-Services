'use client';
/**
 * Federation — Individual Nexha Profile
 * Nexha Portal v2.0
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { federation, type Nexha, type AuditEntry, type Handshake, type MatchRecommendation } from '@/lib/federation-api';

const TIER_COLORS: Record<string, string> = {
  founding: 'bg-amber-100 text-amber-800 border-amber-300',
  strategic: 'bg-violet-100 text-violet-800 border-violet-300',
  standard: 'bg-blue-100 text-blue-800 border-blue-300',
  associate: 'bg-gray-100 text-gray-700 border-gray-300',
  observer: 'bg-green-50 text-green-700 border-green-200',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-900 text-green-300',
  pending: 'bg-yellow-900 text-yellow-300',
  suspended: 'bg-red-900 text-red-300',
  expelled: 'bg-gray-800 text-gray-400',
  churned: 'bg-gray-800 text-gray-500',
};

const REGION_NAMES: Record<string, string> = {
  IN: 'India', SG: 'Singapore', US: 'United States', GB: 'United Kingdom',
  AE: 'UAE', AU: 'Australia', ID: 'Indonesia', TH: 'Thailand', VN: 'Vietnam',
  MY: 'Malaysia', PH: 'Philippines', JP: 'Japan', KR: 'South Korea',
  DE: 'Germany', NL: 'Netherlands', XX: 'Unknown',
};

export default function NexhaProfilePage() {
  const params = useParams();
  const nexhaId = Array.isArray(params?.nexhaId) ? params.nexhaId[0] : (params?.nexhaId as string ?? '');
  const [nexha, setNexha] = useState<Nexha | null>(null);
  const [peers, setPeers] = useState<Nexha[]>([]);
  const [matches, setMatches] = useState<MatchRecommendation[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [tab, setTab] = useState<'overview' | 'peers' | 'matches' | 'audit'>('overview');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [initiating, setInitiating] = useState<string | null>(null);

  useEffect(() => {
    if (!nexhaId) return;
    Promise.all([
      federation.get(nexhaId).catch(() => null),
      federation.peers(nexhaId).catch(() => null),
      federation.matches(nexhaId, 5).catch(() => null),
      federation.audit(nexhaId).catch(() => null),
    ]).then(([n, p, m, a]) => {
      if (!n) { setNotFound(true); setLoading(false); return; }
      setNexha(n);
      setPeers(p?.peers ?? []);
      setMatches(m?.matches ?? []);
      setAudit(a?.entries ?? []);
      setLoading(false);
    });
  }, [nexhaId]);

  const initiateHandshake = async (targetId: string) => {
    if (!nexha) return;
    const myId = localStorage.getItem('nexha_id') ?? '';
    if (!myId) {
      alert('Set your Nexha ID in localStorage (key: nexha_id) before initiating handshakes');
      return;
    }
    setInitiating(targetId);
    try {
      await federation.initiateHandshake({
        initiatorId: myId,
        targetId,
        terms: { mutualCapabilities: [], dataSharing: 'aggregated', paymentTerms: 'standard' }
      });
      // Refresh peers
      const p = await federation.peers(nexhaId);
      setPeers(p.peers);
    } catch (e: unknown) {
      alert(`Handshake failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setInitiating(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-gray-500">Loading Nexha profile...</div>
      </div>
    );
  }

  if (notFound || !nexha) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <div className="text-6xl">🔍</div>
        <h1 className="text-2xl font-bold">Nexha Not Found</h1>
        <p className="text-gray-400">The Nexha <span className="font-mono text-sm">{nexhaId}</span> does not exist in the federation.</p>
        <Link href="/federation/network" className="text-violet-400 hover:underline">Browse all Nexhas →</Link>
      </div>
    );
  }

  const regionName = REGION_NAMES[nexha.region] ?? nexha.region;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌐</span>
          <Link href="/federation" className="font-bold text-lg hover:text-violet-300">Nexha Federation</Link>
          <span className="text-gray-600">/</span>
          <Link href="/federation/network" className="text-gray-400 hover:text-white text-sm">Network</Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400 text-sm truncate max-w-xs">{nexha.name}</span>
        </div>
      </nav>

      <div className="px-6 py-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-2xl font-bold shrink-0">
              {nexha.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{nexha.name}</h1>
              <p className="text-gray-400 mt-1 max-w-xl">{nexha.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className={`text-xs px-2.5 py-1 rounded border font-medium ${TIER_COLORS[nexha.tier]}`}>
                  {nexha.tier.charAt(0).toUpperCase() + nexha.tier.slice(1)} Member
                </span>
                <span className={`text-xs px-2.5 py-1 rounded ${STATUS_BADGE[nexha.status]}`}>
                  {nexha.status.charAt(0).toUpperCase() + nexha.status.slice(1)}
                </span>
                <span className="text-xs px-2.5 py-1 rounded bg-gray-800 text-gray-400">
                  {regionName} ({nexha.region})
                </span>
              </div>
            </div>
          </div>
          {nexha.status === 'active' && (
            <button
              onClick={() => initiateHandshake(nexha.id)}
              disabled={!!initiating}
              className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition disabled:opacity-50 shrink-0"
            >
              {initiating === nexha.id ? 'Initiating...' : '🤝 Initiate Handshake'}
            </button>
          )}
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Nexha ID', value: <span className="font-mono text-sm">{nexha.id}</span> },
            { label: 'Region', value: regionName },
            { label: 'OS Version', value: nexha.osVersion },
            { label: 'Joined', value: new Date(nexha.joinedAt).toLocaleDateString() },
          ].map((m) => (
            <div key={m.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-xs text-gray-500 uppercase tracking-wider">{m.label}</div>
              <div className="mt-1 text-white font-medium">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Capabilities */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-8">
          <h2 className="font-semibold mb-3">Capabilities & Categories</h2>
          <div className="flex flex-wrap gap-2">
            {nexha.categories.map((cat) => (
              <span key={cat} className="text-sm bg-violet-950 border border-violet-800 text-violet-300 px-3 py-1 rounded-full">
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-800 mb-6">
          {(['overview', 'peers', 'matches', 'audit'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition capitalize ${
                tab === t
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h3 className="font-semibold mb-4">Contact</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="text-white">{nexha.contactEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tier</span>
                  <span className="text-white capitalize">{nexha.tier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="text-white capitalize">{nexha.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Sync</span>
                  <span className="text-white">{new Date(nexha.lastSyncAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h3 className="font-semibold mb-4">Engagement</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-bold">{peers.length}</div>
                  <div className="text-xs text-gray-500">Active Handshakes</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{matches.length}</div>
                  <div className="text-xs text-gray-500">Match Recommendations</div>
                </div>
                {nexha.metadata && (
                  <div className="pt-3 border-t border-gray-800">
                    <div className="text-xs text-gray-500 mb-2">Metadata</div>
                    <div className="space-y-1 text-xs text-gray-400">
                      {Object.entries(nexha.metadata).slice(0, 5).map(([k, v]) => (
                        <div key={k}><span className="text-gray-500">{k}:</span> {String(v)}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'peers' && (
          <div>
            {peers.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                No active handshakes yet.{' '}
                <button onClick={() => initiateHandshake(nexha.id)} className="text-violet-400 hover:underline">
                  Initiate the first one →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {peers.map((peer) => (
                  <Link key={peer.id} href={`/federation/${peer.id}`}
                    className="flex items-center justify-between bg-gray-900 rounded-xl p-4 border border-gray-800 hover:border-violet-600 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-lg font-bold">
                        {peer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-white">{peer.name}</div>
                        <div className="text-xs text-gray-500">{peer.id} · {REGION_NAMES[peer.region] ?? peer.region}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${TIER_COLORS[peer.tier]}`}>{peer.tier}</span>
                      <span className="text-gray-500 text-sm">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'matches' && (
          <div>
            {matches.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                No match recommendations available.
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((m, i) => (
                  <div key={m.nexha.id} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold text-gray-700 w-8">{i + 1}</div>
                        <div>
                          <div className="font-semibold text-white">{m.nexha.name}</div>
                          <div className="text-xs text-gray-500">{m.nexha.id}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${
                          m.score >= 70 ? 'text-green-400' : m.score >= 40 ? 'text-amber-400' : 'text-gray-500'
                        }`}>
                          {m.score}
                        </div>
                        <div className="text-xs text-gray-500">/ 100</div>
                      </div>
                    </div>
                    {/* Score breakdown */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[
                        { label: 'Category', val: m.categoryScore, max: 40 },
                        { label: 'Tier', val: m.tierAffinity, max: 25 },
                        { label: 'Status', val: m.statusBonus, max: 20 },
                        { label: 'Handshake', val: m.handshakePotential, max: 15 },
                      ].map((s) => (
                        <div key={s.label} className="bg-gray-800 rounded p-2 text-center">
                          <div className="text-sm font-bold">{s.val}</div>
                          <div className="text-xs text-gray-500">{s.label} /{s.max}</div>
                          <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                            <div className="bg-violet-500 h-1 rounded-full" style={{ width: `${(s.val / s.max) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Reasons */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {m.matchReasons.map((r, j) => (
                        <span key={j} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{r}</span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => initiateHandshake(m.nexha.id)}
                        disabled={!!initiating}
                        className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition disabled:opacity-50"
                      >
                        {initiating === m.nexha.id ? '...' : '🤝 Handshake'}
                      </button>
                      <Link href={`/federation/${m.nexha.id}`}
                        className="px-4 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-xs transition">
                        View Profile →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'audit' && (
          <div>
            {audit.length === 0 ? (
              <div className="text-center text-gray-500 py-12">No audit entries yet.</div>
            ) : (
              <div className="space-y-2">
                {audit.map((entry) => (
                  <div key={entry.id} className="flex gap-4 items-start bg-gray-900 rounded-xl p-4 border border-gray-800">
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-lg shrink-0">
                      {entry.action.startsWith('member_registered') ? '🎉' :
                       entry.action.startsWith('handshake') ? '🤝' :
                       entry.action.startsWith('auto_match') ? '⚡' :
                       entry.action.startsWith('policy') ? '📋' :
                       entry.action.startsWith('status') ? '🔄' :
                       entry.action.startsWith('sync') ? '🔁' : '•'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white">{entry.details}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="font-mono">{entry.action}</span>
                        <span>·</span>
                        <span>{entry.actor}</span>
                        <span>·</span>
                        <span>{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

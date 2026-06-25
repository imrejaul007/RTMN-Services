'use client';
/**
 * Federation Dashboard — Handshake Management
 * Nexha Portal v2.0
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { federation, type Handshake, type HandshakeStatus } from '@/lib/federation-api';

const STATUS_COLORS: Record<HandshakeStatus, string> = {
  pending: 'bg-yellow-900/50 text-yellow-300',
  accepted: 'bg-green-900/50 text-green-300',
  rejected: 'bg-red-900/50 text-red-300',
  expired: 'bg-gray-800 text-gray-400',
  revoked: 'bg-gray-800 text-gray-500',
};

export default function HandshakesPage() {
  const [handshakes, setHandshakes] = useState<Handshake[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HandshakeStatus | ''>('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    federation.listHandshakes(filter ? { status: filter } : undefined)
      .then((r) => { setHandshakes(r.handshakes); setLoading(false); })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : 'Load failed'); setLoading(false); });
  };

  useEffect(() => { load(); }, [filter]);

  const accept = async (id: string) => {
    try {
      await federation.respondHandshake(id, true, `sig-accept-${Date.now()}`);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Accept failed');
    }
  };

  const reject = async (id: string) => {
    try {
      await federation.respondHandshake(id, false, `sig-reject-${Date.now()}`);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Reject failed');
    }
  };

  const statuses: HandshakeStatus[] = ['pending', 'accepted', 'rejected', 'expired', 'revoked'];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🌐</span>
        <Link href="/federation" className="font-bold text-lg hover:text-violet-300">Nexha Federation</Link>
        <span className="text-gray-600">/ Dashboard / Handshakes</span>
      </nav>

      <div className="px-6 py-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Handshakes</h1>
            <p className="text-gray-400 mt-1">{handshakes.length} total</p>
          </div>
          <div className="flex gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as HandshakeStatus | '')}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
            >
              <option value="">All statuses</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={load} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm">
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 mb-6 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-500 py-20">Loading...</div>
        ) : handshakes.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            No handshakes found.{' '}
            <Link href="/federation/network" className="text-violet-400 hover:underline">Browse the network</Link>
            {' '}to initiate one.
          </div>
        ) : (
          <div className="space-y-4">
            {handshakes.map((h) => (
              <div key={h.id} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-gray-500">{h.id}</div>
                    <div className="mt-1 text-sm">
                      <span className="text-gray-400">Initiator:</span>{' '}
                      <span className="text-white">{h.initiatorId}</span>
                      {' → '}
                      <span className="text-gray-400">Target:</span>{' '}
                      <span className="text-white">{h.targetId}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded font-medium ${STATUS_COLORS[h.status]}`}>
                    {h.status}
                  </span>
                </div>

                {/* Terms */}
                <div className="bg-gray-800/50 rounded-lg p-3 mb-3 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-gray-500">Capabilities</div>
                    <div className="text-gray-300 mt-0.5 flex flex-wrap gap-1">
                      {h.terms.mutualCapabilities.slice(0, 3).map((c) => (
                        <span key={c} className="bg-gray-700 px-1.5 py-0.5 rounded">{c}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Data Sharing</div>
                    <div className="text-gray-300 mt-0.5">{h.terms.dataSharing}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Payment Terms</div>
                    <div className="text-gray-300 mt-0.5">{h.terms.paymentTerms}</div>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div>
                    Initiated: {new Date(h.initiatedAt).toLocaleString()}
                    {h.respondedAt && ` · Responded: ${new Date(h.respondedAt).toLocaleString()}`}
                    {h.expiresAt && ` · Expires: ${new Date(h.expiresAt).toLocaleString()}`}
                  </div>
                  {h.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => accept(h.id)}
                        className="px-3 py-1 rounded bg-green-700 hover:bg-green-600 text-green-100 text-xs font-medium transition"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => reject(h.id)}
                        className="px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-red-100 text-xs font-medium transition"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

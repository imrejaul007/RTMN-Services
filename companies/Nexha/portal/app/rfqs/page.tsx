'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RFQsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nexha_token');
    if (!token) { router.push('/login'); return; }
    setLoading(false);
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const rfqs = [
    { id: 'RFQ-001', product: 'Industrial Motors', quantity: '50 units', buyer: 'BUY-ABC123', status: 'Open', deadline: '2026-06-20' },
    { id: 'RFQ-002', product: 'Steel Pipes', quantity: '200 meters', buyer: 'BUY-XYZ789', status: 'Quoted', deadline: '2026-06-18' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">← Back</Link>
            <h1 className="font-semibold text-gray-900">Request for Quotes (RFQs)</h1>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            + Create RFQ
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['RFQ ID', 'Product', 'Quantity', 'Buyer', 'Status', 'Deadline'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rfqs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <span className="text-4xl">📋</span>
                    <p className="text-gray-400 mt-4">No RFQs yet</p>
                  </td>
                </tr>
              ) : rfqs.map((rfq) => (
                <tr key={rfq.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm text-blue-600">{rfq.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{rfq.product}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{rfq.quantity}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">{rfq.buyer}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      rfq.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>{rfq.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{rfq.deadline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

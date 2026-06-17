'use client';

import { MoreVertical, Mail, Phone, Building2, Calendar, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  score: number;
  status: 'hot' | 'warm' | 'cold';
  source: string;
  createdAt: string;
}

interface LeadTableProps {
  leads: Lead[];
  loading?: boolean;
  onView?: (lead: Lead) => void;
  onEdit?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
}

export default function LeadTable({ leads, loading, onView, onEdit, onDelete }: LeadTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="animate-pulse p-8">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
        <p className="text-gray-500">Start by discovering new leads or importing your existing contacts.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Lead
            </th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Company
            </th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Score
            </th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Source
            </th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Added
            </th>
            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leads.map((lead) => (
            <tr key={lead.id} className="table-row">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                    {lead.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{lead.name}</div>
                    <div className="text-sm text-gray-500">{lead.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="font-medium text-gray-900">{lead.company}</div>
                <div className="text-sm text-gray-500">{lead.role}</div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full',
                        lead.score >= 80 ? 'bg-green-500' :
                        lead.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      )}
                      style={{ width: `${lead.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{lead.score}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={clsx('badge', `badge-${lead.status}`)}>
                  {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-gray-600 capitalize">{lead.source}</span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  {new Date(lead.createdAt).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onView?.(lead)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="View"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => onEdit?.(lead)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Mail className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

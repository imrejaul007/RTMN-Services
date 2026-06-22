'use client';

import { useInboxStore } from '@/stores/inboxStore';

export function ChannelFilter() {
  const { statusFilter, setStatusFilter } = useInboxStore();

  const statuses = [
    { value: null, label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'pending', label: 'Pending' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];

  return (
    <div className="px-4 py-2 border-b bg-gray-50">
      <div className="flex gap-2 overflow-x-auto">
        {statuses.map((status) => (
          <button
            key={status.value || 'all'}
            onClick={() => setStatusFilter(status.value)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition ${
              statusFilter === status.value
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {status.label}
          </button>
        ))}
      </div>
    </div>
  );
}

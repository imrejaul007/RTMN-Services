'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Plus,
  Mail,
  MessageCircle,
  Phone,
  Globe,
  Monitor,
  ChevronDown,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { TicketCard } from '@/components/TicketCard';
import { api } from '@/lib/api';
import type { TicketPriority, TicketStatus, TicketChannel } from '@/lib/types';
import clsx from 'clsx';

const priorityOptions: { value: TicketPriority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-700' },
];

const statusOptions: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const channelOptions: { value: TicketChannel; label: string; icon: React.ElementType }[] = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'chat', label: 'Chat', icon: MessageCircle },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'social', label: 'Social', icon: Globe },
  { value: 'portal', label: 'Portal', icon: Monitor },
];

export default function TicketsPage() {
  const [search, setSearch] = useState('');
  const [selectedPriorities, setSelectedPriorities] = useState<TicketPriority[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<TicketStatus[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<TicketChannel[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api.getTickets(),
  });

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];

    return tickets.filter((ticket) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          ticket.subject.toLowerCase().includes(searchLower) ||
          ticket.customerName.toLowerCase().includes(searchLower) ||
          ticket.customerEmail.toLowerCase().includes(searchLower) ||
          ticket.id.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Priority filter
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(ticket.priority)) {
        return false;
      }

      // Status filter
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(ticket.status)) {
        return false;
      }

      // Channel filter
      if (selectedChannels.length > 0 && !selectedChannels.includes(ticket.channel)) {
        return false;
      }

      return true;
    });
  }, [tickets, search, selectedPriorities, selectedStatuses, selectedChannels]);

  const togglePriority = (priority: TicketPriority) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority)
        ? prev.filter((p) => p !== priority)
        : [...prev, priority]
    );
  };

  const toggleStatus = (status: TicketStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const toggleChannel = (channel: TicketChannel) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  const clearFilters = () => {
    setSelectedPriorities([]);
    setSelectedStatuses([]);
    setSelectedChannels([]);
    setSearch('');
  };

  const hasActiveFilters = selectedPriorities.length > 0 || selectedStatuses.length > 0 || selectedChannels.length > 0;

  // Sort tickets: urgent first, then by date
  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredTickets]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
          <p className="text-slate-500 mt-1">
            {isLoading ? 'Loading...' : `${sortedTickets.length} tickets`}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tickets by subject, customer, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 border rounded-lg font-medium transition-colors',
              showFilters || hasActiveFilters
                ? 'bg-primary-50 border-primary-200 text-primary-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                {selectedPriorities.length + selectedStatuses.length + selectedChannels.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Priority Filter */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Priority</h4>
                <div className="flex flex-wrap gap-2">
                  {priorityOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => togglePriority(option.value)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        selectedPriorities.includes(option.value)
                          ? option.color
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Status</h4>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => toggleStatus(option.value)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        selectedStatuses.includes(option.value)
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel Filter */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Channel</h4>
                <div className="flex flex-wrap gap-2">
                  {channelOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => toggleChannel(option.value)}
                        className={clsx(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                          selectedChannels.includes(option.value)
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm text-slate-500">Active filters:</span>
          {selectedPriorities.map((p) => (
            <span key={p} className="flex items-center gap-1 px-2 py-1 bg-slate-200 rounded text-xs">
              Priority: {p}
              <button onClick={() => togglePriority(p)} className="hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selectedStatuses.map((s) => (
            <span key={s} className="flex items-center gap-1 px-2 py-1 bg-slate-200 rounded text-xs">
              Status: {s}
              <button onClick={() => toggleStatus(s)} className="hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selectedChannels.map((c) => (
            <span key={c} className="flex items-center gap-1 px-2 py-1 bg-slate-200 rounded text-xs">
              Channel: {c}
              <button onClick={() => toggleChannel(c)} className="hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Ticket List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-4" />
              <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-200 rounded w-full mb-4" />
              <div className="h-8 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : sortedTickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No tickets found</h3>
          <p className="text-slate-500 mb-4">
            {hasActiveFilters || search
              ? 'Try adjusting your filters or search terms'
              : 'There are no tickets in the queue'}
          </p>
          {(hasActiveFilters || search) && (
            <button
              onClick={clearFilters}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}

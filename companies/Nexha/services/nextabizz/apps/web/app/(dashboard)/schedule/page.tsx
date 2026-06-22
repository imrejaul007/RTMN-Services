import { logger } from '../../shared/logger';
'use client';

import { useState, useEffect } from 'react';
import ScheduleCalendar from '@/components/ScheduleCalendar';
import NewEventModal from '@/components/NewEventModal';
import { ScheduleEvent, ServiceType } from '@/lib/schedule-utils';

interface Vendor {
  id: string;
  name: string;
  specialty: ServiceType;
}

export default function SchedulePage() {
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    week: 0,
    pending: 0,
  });

  // Fetch vendors and stats
  useEffect(() => {
    fetchVendors();
    fetchStats();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/schedule?type=vendors');
      const data = await res.json();
      if (data.success) {
        setVendors(data.data);
      }
    } catch (error) {
      logger.error('Failed to fetch vendors:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/schedule');
      const data = await res.json();
      if (data.success) {
        const events: ScheduleEvent[] = data.data;
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);

        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        setStats({
          total: events.length,
          today: events.filter((e: ScheduleEvent) => {
            const eventDate = new Date(e.startTime);
            return eventDate >= startOfToday && eventDate < endOfToday;
          }).length,
          week: events.filter((e: ScheduleEvent) => {
            const eventDate = new Date(e.startTime);
            return eventDate >= startOfWeek && eventDate < endOfWeek;
          }).length,
          pending: events.filter((e: ScheduleEvent) => e.status === 'scheduled').length,
        });
      }
    } catch (error) {
      logger.error('Failed to fetch stats:', error);
    }
  };

  const handleNewEvent = (date: Date) => {
    setSelectedDate(date);
    setShowNewEventModal(true);
  };

  const handleEventCreated = () => {
    setShowNewEventModal(false);
    setSelectedDate(undefined);
    // Stats will be refreshed when calendar re-fetches
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Schedule</h1>
          <p className="text-gray-400 mt-1">
            Manage appointments, service calls, and vendor availability
          </p>
        </div>

        <button
          onClick={() => setShowNewEventModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Appointment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Appointments</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Today</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.today}</p>
            </div>
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">This Week</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.week}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pending</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.pending}</p>
            </div>
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Filter */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm text-gray-400">Filter by vendor:</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedVendorId('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              !selectedVendorId
                ? 'bg-[#7C3AED] text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All Vendors
          </button>
          {vendors.map((vendor) => (
            <button
              key={vendor.id}
              onClick={() => setSelectedVendorId(vendor.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedVendorId === vendor.id
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {vendor.name}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <ScheduleCalendar
        onNewEvent={handleNewEvent}
        selectedVendorId={selectedVendorId}
      />

      {/* New Event Modal */}
      {showNewEventModal && (
        <NewEventModal
          initialDate={selectedDate}
          onClose={() => {
            setShowNewEventModal(false);
            setSelectedDate(undefined);
          }}
          onSuccess={handleEventCreated}
        />
      )}
    </div>
  );
}

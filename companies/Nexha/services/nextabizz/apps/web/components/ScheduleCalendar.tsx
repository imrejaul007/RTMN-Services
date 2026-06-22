import { logger } from '../../shared/logger';
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ScheduleEvent,
  ViewMode,
  ServiceType,
  AppointmentStatus,
  VendorAvailability,
  getMonthDays,
  getWeekDays,
  getDayHours,
  formatTime,
  formatDate,
  formatFullDate,
  formatDuration,
  getPeriodLabel,
  getPreviousPeriod,
  getNextPeriod,
  isSameDay,
  isToday,
  isCurrentMonth,
  SERVICE_TYPE_COLORS,
  STATUS_COLORS,
  getServiceTypeLabel,
  getStatusLabel,
  detectConflicts,
} from '@/lib/schedule-utils';

interface Vendor {
  id: string;
  name: string;
  specialty: ServiceType;
}

interface ScheduleCalendarProps {
  onEventClick?: (event: ScheduleEvent) => void;
  onNewEvent?: (date: Date) => void;
  selectedVendorId?: string;
}

export default function ScheduleCalendar({
  onEventClick,
  onNewEvent,
  selectedVendorId,
}: ScheduleCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 8)); // May 8, 2026
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [availability, setAvailability] = useState<VendorAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch events
      const eventsRes = await fetch('/api/schedule');
      const eventsData = await eventsRes.json();
      if (eventsData.success) {
        // Filter by vendor if selected
        const filtered = selectedVendorId
          ? eventsData.data.filter((e: ScheduleEvent) => e.vendorId === selectedVendorId)
          : eventsData.data;
        setEvents(filtered);
      }

      // Fetch vendors
      const vendorsRes = await fetch('/api/schedule?type=vendors');
      const vendorsData = await vendorsRes.json();
      if (vendorsData.success) {
        setVendors(vendorsData.data);
      }

      // Fetch availability
      const availRes = await fetch('/api/schedule?type=availability');
      const availData = await availRes.json();
      if (availData.success) {
        setAvailability(availData.data);
      }
    } catch (error) {
      logger.error('Failed to fetch schedule data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedVendorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigation handlers
  const goToPrevious = () => setCurrentDate(getPreviousPeriod(currentDate, viewMode));
  const goToNext = () => setCurrentDate(getNextPeriod(currentDate, viewMode));
  const goToToday = () => setCurrentDate(new Date());

  // Get days to display
  const displayDays =
    viewMode === 'week'
      ? getWeekDays(currentDate)
      : getMonthDays(currentDate);

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.startTime), day));
  };

  // Handle event click
  const handleEventClick = (event: ScheduleEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setShowEventModal(true);
    onEventClick?.(event);
  };

  // Handle day click
  const handleDayClick = (day: Date) => {
    if (onNewEvent) {
      onNewEvent(day);
    }
  };

  // Get color based on service type
  const getEventColor = (event: ScheduleEvent) => {
    return SERVICE_TYPE_COLORS[event.serviceType] || '#7C3AED';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C3AED]" />
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevious}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              aria-label="Previous"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToNext}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              aria-label="Next"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <h2 className="ml-4 text-lg font-semibold text-white">
              {getPeriodLabel(currentDate, viewMode)}
            </h2>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'week'
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'month'
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Month
              </button>
            </div>
            <button
              onClick={() => setShowAvailabilityModal(true)}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              title="Manage Availability"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-700">
          {Object.entries(SERVICE_TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-400">{getServiceTypeLabel(type as ServiceType)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-gray-800/50 border-b border-gray-800">
            {displayDays.slice(0, 7).map((day, i) => (
              <div
                key={i}
                className={`px-2 py-3 text-center border-r border-gray-800 last:border-r-0 ${
                  isToday(day) ? 'bg-[#7C3AED]/10' : ''
                }`}
              >
                <div className="text-xs text-gray-500 uppercase">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div
                  className={`text-lg font-semibold mt-0.5 ${
                    isToday(day)
                      ? 'text-[#7C3AED]'
                      : !isCurrentMonth(day, currentDate)
                      ? 'text-gray-600'
                      : 'text-white'
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Calendar Body */}
          {viewMode === 'week' ? (
            <WeekView
              days={displayDays}
              events={events}
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
              getEventColor={getEventColor}
            />
          ) : (
            <MonthView
              days={displayDays}
              events={events}
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
              getEventColor={getEventColor}
              currentMonth={currentDate}
            />
          )}
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && selectedEvent && (
        <EventModal
          event={selectedEvent}
          vendors={vendors}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          onUpdate={() => {
            fetchData();
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          onDelete={() => {
            fetchData();
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
        />
      )}

      {/* Availability Modal */}
      {showAvailabilityModal && (
        <AvailabilityModal
          vendors={vendors}
          availability={availability}
          onClose={() => setShowAvailabilityModal(false)}
          onSave={() => {
            fetchData();
            setShowAvailabilityModal(false);
          }}
        />
      )}
    </div>
  );
}

// Week View Component
interface ViewProps {
  days: Date[];
  events: ScheduleEvent[];
  onEventClick: (event: ScheduleEvent, e: React.MouseEvent) => void;
  onDayClick: (day: Date) => void;
  getEventColor: (event: ScheduleEvent) => string;
}

function WeekView({ days, events, onEventClick, onDayClick, getEventColor }: ViewProps) {
  const hours = getDayHours();
  const currentHour = new Date().getHours();

  return (
    <div className="grid grid-cols-8 border-t border-gray-800">
      {/* Time Column */}
      <div className="border-r border-gray-800 bg-gray-900">
        <div className="h-12 border-b border-gray-800" />
        {hours.map((hour) => (
          <div
            key={hour}
            className="h-14 border-b border-gray-800/50 flex items-start justify-end pr-2"
          >
            <span className="text-xs text-gray-500 transform -translate-y-1">
              {formatTime(new Date(2026, 0, 1, hour))}
            </span>
          </div>
        ))}
      </div>

      {/* Day Columns */}
      {days.map((day, dayIndex) => {
        const dayEvents = events.filter((e) => isSameDay(new Date(e.startTime), day));
        const isCurrentDay = isToday(day);

        return (
          <div
            key={dayIndex}
            className={`relative border-r border-gray-800 last:border-r-0 ${
              isCurrentDay ? 'bg-[#7C3AED]/5' : ''
            }`}
            onClick={() => onDayClick(day)}
          >
            {/* Current time indicator */}
            {isCurrentDay && (
              <div
                className="absolute left-0 right-0 h-0.5 bg-red-500 z-20"
                style={{ top: `${(currentHour / 24) * 100}%` }}
              >
                <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full" />
              </div>
            )}

            {/* Hour cells */}
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-14 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              />
            ))}

            {/* Events */}
            {dayEvents.map((event) => {
              const startHour = new Date(event.startTime).getHours();
              const startMin = new Date(event.startTime).getMinutes();
              const endHour = new Date(event.endTime).getHours();
              const endMin = new Date(event.endTime).getMinutes();
              const durationHours = endHour - startHour + (endMin - startMin) / 60;
              const top = ((startHour + startMin / 60) / 24) * 100;
              const height = (durationHours / 24) * 100;

              return (
                <button
                  key={event.id}
                  onClick={(e) => onEventClick(event, e)}
                  className="absolute left-1 right-1 rounded-md px-2 py-1 text-left overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer z-10"
                  style={{
                    top: `${top}%`,
                    height: `${Math.max(height, 8)}%`,
                    backgroundColor: getEventColor(event),
                    minHeight: '24px',
                  }}
                >
                  <div className="text-white text-xs font-medium truncate">
                    {event.title}
                  </div>
                  {height > 10 && (
                    <div className="text-white/80 text-[10px] truncate">
                      {formatTime(new Date(event.startTime))} - {formatTime(new Date(event.endTime))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// Month View Component
interface MonthViewProps extends ViewProps {
  currentMonth: Date;
}

function MonthView({ days, events, onEventClick, onDayClick, getEventColor, currentMonth }: MonthViewProps) {
  // Group days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="divide-y divide-gray-800">
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 divide-x divide-gray-800">
          {week.map((day, dayIndex) => {
            const dayEvents = events.filter((e) => isSameDay(new Date(e.startTime), day));
            const isCurrentDay = isToday(day);
            const inMonth = isCurrentMonth(day, currentMonth);

            return (
              <div
                key={dayIndex}
                className={`min-h-[100px] p-1.5 hover:bg-gray-800/30 transition-colors ${
                  isCurrentDay ? 'bg-[#7C3AED]/5' : ''
                } ${!inMonth ? 'opacity-40' : ''}`}
                onClick={() => onDayClick(day)}
              >
                {/* Events (max 3 visible) */}
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event, e);
                    }}
                    className="w-full text-left px-1.5 py-0.5 rounded text-xs mb-0.5 truncate hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: getEventColor(event),
                      color: 'white',
                    }}
                  >
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 px-1.5">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Event Modal Component
interface EventModalProps {
  event: ScheduleEvent;
  vendors: Vendor[];
  onClose: () => void;
  onUpdate: (updates: Partial<ScheduleEvent>) => void;
  onDelete: () => void;
}

function EventModal({ event, vendors, onClose, onUpdate, onDelete }: EventModalProps) {
  const [status, setStatus] = useState<AppointmentStatus>(event.status);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    try {
      const res = await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        onUpdate({ status: newStatus });
      }
    } catch (error) {
      logger.error('Failed to update status:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/schedule?eventId=${event.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onDelete();
      }
    } catch (error) {
      logger.error('Failed to delete event:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div
          className="px-6 py-4 border-b border-gray-700"
          style={{ backgroundColor: SERVICE_TYPE_COLORS[event.serviceType] }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">{event.title}</h3>
              <p className="text-white/80 text-sm mt-1">
                {getServiceTypeLabel(event.serviceType)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-700/50 rounded-lg">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">
                {formatFullDate(new Date(event.startTime))}
              </p>
              <p className="text-gray-400 text-sm">
                {formatTime(new Date(event.startTime))} - {formatTime(new Date(event.endTime))}
                <span className="ml-2">({formatDuration(new Date(event.startTime), new Date(event.endTime))})</span>
              </p>
            </div>
          </div>

          {/* Vendor */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-700/50 rounded-lg">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">{event.vendorName}</p>
              <p className="text-gray-400 text-sm">Service Provider</p>
            </div>
          </div>

          {/* Customer */}
          {event.customerName && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-700/50 rounded-lg">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">{event.customerName}</p>
                {event.customerPhone && (
                  <p className="text-gray-400 text-sm">{event.customerPhone}</p>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="bg-gray-700/30 rounded-lg p-3">
              <p className="text-gray-300 text-sm">{event.description}</p>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="bg-gray-700/30 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase mb-1">Notes</p>
              <p className="text-gray-300 text-sm">{event.notes}</p>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as AppointmentStatus)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
            >
              {Object.entries(STATUS_COLORS).map(([value, color]) => (
                <option key={value} value={value}>
                  {getStatusLabel(value as AppointmentStatus)}
                </option>
              ))}
            </select>
          </div>

          {/* Reminder Settings */}
          {event.reminderSettings && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Reminder Settings
              </label>
              <div className="flex flex-wrap gap-2">
                {event.reminderSettings.email && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                    Email
                  </span>
                )}
                {event.reminderSettings.sms && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                    SMS
                  </span>
                )}
                {event.reminderSettings.push && (
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                    Push
                  </span>
                )}
                <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs">
                  {event.reminderSettings.minutesBefore} min before
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 flex justify-between">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Availability Modal Component
interface AvailabilityModalProps {
  vendors: Vendor[];
  availability: VendorAvailability[];
  onClose: () => void;
  onSave: () => void;
}

function AvailabilityModal({ vendors, availability, onClose, onSave }: AvailabilityModalProps) {
  const [selectedVendor, setSelectedVendor] = useState<string>(vendors[0]?.id || '');
  const [vendorSchedule, setVendorSchedule] = useState<Record<number, { start: string; end: string; enabled: boolean }>>({
    0: { start: '09:00', end: '17:00', enabled: false },
    1: { start: '09:00', end: '17:00', enabled: true },
    2: { start: '09:00', end: '17:00', enabled: true },
    3: { start: '09:00', end: '17:00', enabled: true },
    4: { start: '09:00', end: '17:00', enabled: true },
    5: { start: '09:00', end: '17:00', enabled: true },
    6: { start: '09:00', end: '17:00', enabled: false },
  });

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleSave = async () => {
    const availData = Object.entries(vendorSchedule)
      .filter(([_, day]) => day.enabled)
      .map(([dayOfWeek, schedule]) => ({
        vendorId: selectedVendor,
        dayOfWeek: parseInt(dayOfWeek),
        startTime: schedule.start,
        endTime: schedule.end,
      }));

    try {
      const res = await fetch('/api/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateAvailability',
          vendorId: selectedVendor,
          availability: availData,
        }),
      });

      if (res.ok) {
        onSave();
      }
    } catch (error) {
      logger.error('Failed to save availability:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Manage Availability</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Vendor Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Select Vendor
            </label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
            >
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          {/* Schedule Grid */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Working Hours
            </label>
            <div className="space-y-2">
              {days.map((day, index) => (
                <div key={index} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vendorSchedule[index].enabled}
                      onChange={(e) =>
                        setVendorSchedule((prev) => ({
                          ...prev,
                          [index]: { ...prev[index], enabled: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[#7C3AED] focus:ring-[#7C3AED]"
                    />
                    <span className="text-white w-12">{day}</span>
                  </label>
                  {vendorSchedule[index].enabled && (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={vendorSchedule[index].start}
                        onChange={(e) =>
                          setVendorSchedule((prev) => ({
                            ...prev,
                            [index]: { ...prev[index], start: e.target.value },
                          }))
                        }
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="time"
                        value={vendorSchedule[index].end}
                        onChange={(e) =>
                          setVendorSchedule((prev) => ({
                            ...prev,
                            [index]: { ...prev[index], end: e.target.value },
                          }))
                        }
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

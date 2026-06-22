import { logger } from '../../shared/logger';
'use client';

import { useState, useEffect } from 'react';
import {
  ScheduleEvent,
  ServiceType,
  AppointmentStatus,
  ReminderSettings,
  VendorAvailability,
  getServiceTypeLabel,
  isWithinAvailability,
} from '@/lib/schedule-utils';

interface Vendor {
  id: string;
  name: string;
  specialty: ServiceType;
}

interface NewEventModalProps {
  initialDate?: Date;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewEventModal({ initialDate, onClose, onSuccess }: NewEventModalProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [availability, setAvailability] = useState<VendorAvailability[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('installation');
  const [vendorId, setVendorId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [reminders, setReminders] = useState<ReminderSettings>({
    email: true,
    sms: false,
    push: true,
    minutesBefore: 30,
  });

  useEffect(() => {
    // Set initial date
    if (initialDate) {
      setDate(initialDate.toISOString().split('T')[0]);
    }

    // Fetch vendors
    fetchVendors();
    fetchAvailability();
  }, [initialDate]);

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/schedule?type=vendors');
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setVendors(data.data);
        setVendorId(data.data[0].id);
      }
    } catch (err) {
      logger.error('Failed to fetch vendors:', err);
    }
  };

  const fetchAvailability = async () => {
    try {
      const res = await fetch('/api/schedule?type=availability');
      const data = await res.json();
      if (data.success) {
        setAvailability(data.data);
      }
    } catch (err) {
      logger.error('Failed to fetch availability:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      // Check availability
      if (!isWithinAvailability(startDateTime, endDateTime, availability)) {
        setError('The selected time is outside the vendor\'s available hours or during a break.');
        setIsSubmitting(false);
        return;
      }

      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          serviceType,
          vendorId,
          customerName,
          customerPhone,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          notes,
          reminderSettings: reminders,
          status: 'scheduled',
        }),
      });

      const data = await res.json();

      if (data.success) {
        onSuccess();
      } else {
        if (data.conflicts) {
          setError(`Scheduling conflict with: ${data.conflicts.map((c: ScheduleEvent) => c.title).join(', ')}`);
        } else {
          setError(data.error || 'Failed to create appointment');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reminderOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 1440, label: '1 day' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">New Appointment</h3>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Appointment Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g., HVAC Installation"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
            />
          </div>

          {/* Service Type & Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Service Type *
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              >
                {Object.entries(getServiceTypeLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Assigned Vendor *
              </label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                required
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              >
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                End Time *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              />
            </div>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g., Acme Corp"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Customer Phone
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g., 555-0100"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description of the service..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Internal Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Private notes for staff..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent resize-none"
            />
          </div>

          {/* Reminder Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Reminder Notifications
            </label>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminders.email}
                    onChange={(e) => setReminders((prev) => ({ ...prev, email: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[#7C3AED] focus:ring-[#7C3AED]"
                  />
                  <span className="text-white">Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminders.sms}
                    onChange={(e) => setReminders((prev) => ({ ...prev, sms: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[#7C3AED] focus:ring-[#7C3AED]"
                  />
                  <span className="text-white">SMS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminders.push}
                    onChange={(e) => setReminders((prev) => ({ ...prev, push: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[#7C3AED] focus:ring-[#7C3AED]"
                  />
                  <span className="text-white">Push</span>
                </label>
              </div>
              {(reminders.email || reminders.sms || reminders.push) && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Remind me</label>
                  <select
                    value={reminders.minutesBefore}
                    onChange={(e) => setReminders((prev) => ({ ...prev, minutesBefore: parseInt(e.target.value) }))}
                    className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                  >
                    {reminderOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-400 text-sm ml-2">before appointment</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title || !vendorId || !date}
              className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

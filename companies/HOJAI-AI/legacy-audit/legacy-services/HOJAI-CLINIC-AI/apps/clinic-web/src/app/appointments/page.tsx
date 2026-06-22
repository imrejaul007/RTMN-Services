'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Appointment, Patient, Doctor } from '@/types';
import { PlusIcon, MagnifyingGlassIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchDoctors();
  }, [selectedDate]);

  const fetchAppointments = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await api.get(`/appointments?startDate=${dateStr}&endDate=${dateStr}`);
      if (response.data.success) {
        setAppointments(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get('/patients?limit=100');
      if (response.data.success) {
        setPatients(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch patients');
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/doctors');
      if (response.data.success) {
        setDoctors(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch doctors');
    }
  };

  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((apt) => isSameDay(new Date(apt.date), date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700';
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'in_progress':
        return 'bg-amber-100 text-amber-700';
      case 'completed':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'no_show':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 mt-1">Manage patient appointments</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'calendar' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              Calendar
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Appointment
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="card mb-6">
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ←
          </button>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {format(selectedDate, 'MMMM yyyy')}
            </p>
          </div>
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            →
          </button>
        </div>
        <div className="flex border-t border-gray-100">
          {getWeekDays().map((day) => (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`flex-1 py-3 text-center border-r border-gray-100 last:border-r-0 ${
                isSameDay(day, selectedDate)
                  ? 'bg-primary-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <p className="text-xs text-gray-500 uppercase">{format(day, 'EEE')}</p>
              <p className={`text-lg font-semibold ${
                isSameDay(day, selectedDate) ? 'text-primary-700' : 'text-gray-900'
              }`}>
                {format(day, 'd')}
              </p>
              <p className="text-xs text-gray-500">{getAppointmentsForDate(day).length} apt</p>
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h2>
          <span className="text-sm text-gray-500">
            {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 mx-auto text-gray-300" />
              <p className="mt-2 text-gray-500">No appointments for this date</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((apt) => {
                  const patient = apt.patientId as Patient;
                  const doctor = apt.doctorId as Doctor;

                  return (
                    <div
                      key={apt._id}
                      className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-shrink-0 w-20">
                        <p className="text-sm font-semibold text-gray-900">{apt.startTime}</p>
                        <p className="text-xs text-gray-500">{apt.endTime}</p>
                      </div>
                      <div className="flex-shrink-0 mx-4 w-1 h-12 bg-primary-200 rounded"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {patient?.firstName} {patient?.lastName}
                          </p>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(apt.status)}`}>
                            {apt.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Dr. {doctor?.name} • {apt.type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{apt.reason}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* New Appointment Modal */}
      {showModal && (
        <AppointmentModal
          patients={patients}
          doctors={doctors}
          selectedDate={selectedDate}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchAppointments();
          }}
        />
      )}
    </div>
  );
}

function AppointmentModal({
  patients,
  doctors,
  selectedDate,
  onClose,
  onSave,
}: {
  patients: Patient[];
  doctors: Doctor[];
  selectedDate: Date;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    date: format(selectedDate, 'yyyy-MM-dd'),
    startTime: '09:00',
    type: 'consultation',
    reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  useEffect(() => {
    if (formData.doctorId && formData.date) {
      fetchSlots();
    }
  }, [formData.doctorId, formData.date]);

  const fetchSlots = async () => {
    try {
      const response = await api.get(`/appointments/slots?doctorId=${formData.doctorId}&date=${formData.date}`);
      if (response.data.success) {
        setAvailableSlots(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch slots');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.post('/appointments', formData);
      toast.success('Appointment booked successfully');
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to book appointment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Book Appointment</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Patient</label>
              <select
                required
                value={formData.patientId}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                className="form-select"
              >
                <option value="">Select patient</option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.firstName} {p.lastName} ({p.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Doctor</label>
              <select
                required
                value={formData.doctorId}
                onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                className="form-select"
              >
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} - {d.specialization}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Time</label>
                <select
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="form-select"
                >
                  {availableSlots.length > 0 ? (
                    availableSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))
                  ) : (
                    <option value="">Select doctor first</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="form-select"
              >
                <option value="consultation">Consultation</option>
                <option value="follow_up">Follow-up</option>
                <option value="teleconsult">Teleconsult</option>
                <option value="procedure">Procedure</option>
              </select>
            </div>

            <div>
              <label className="form-label">Reason</label>
              <textarea
                required
                rows={3}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="form-input"
                placeholder="Brief description of the visit reason"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'Booking...' : 'Book Appointment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

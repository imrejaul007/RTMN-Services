import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock, ChevronRight } from 'lucide-react'
import { getStylistToday, type Appointment } from '../lib/api'

const STYLIST_ID = 'STYLIST_001'

export default function Appointments() {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['stylist-today', STYLIST_ID],
    queryFn: () => getStylistToday(STYLIST_ID),
  })

  // Group appointments by status
  const grouped = {
    in_progress: appointments?.filter(a => a.status === 'in_progress') || [],
    pending: appointments?.filter(a => a.status === 'pending' || a.status === 'confirmed') || [],
    completed: appointments?.filter(a => a.status === 'completed') || [],
    cancelled: appointments?.filter(a => a.status === 'cancelled') || [],
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="p-4 flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Today's Appointments</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : (
          <>
            {/* In Progress */}
            {grouped.in_progress.length > 0 && (
              <AppointmentSection title="In Progress" appointments={grouped.in_progress} variant="amber" />
            )}

            {/* Pending */}
            {grouped.pending.length > 0 && (
              <AppointmentSection title="Upcoming" appointments={grouped.pending} variant="blue" />
            )}

            {/* Completed */}
            {grouped.completed.length > 0 && (
              <AppointmentSection title="Completed" appointments={grouped.completed} variant="green" />
            )}

            {/* Cancelled */}
            {grouped.cancelled.length > 0 && (
              <AppointmentSection title="Cancelled" appointments={grouped.cancelled} variant="red" />
            )}

            {/* Empty State */}
            {appointments?.length === 0 && (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No appointments for today</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function AppointmentSection({
  title,
  appointments,
  variant,
}: {
  title: string
  appointments: Appointment[]
  variant: 'blue' | 'amber' | 'green' | 'red'
}) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  }

  const color = colors[variant]

  return (
    <div>
      <h2 className={`text-sm font-semibold uppercase tracking-wide ${color.text} mb-3`}>
        {title} ({appointments.length})
      </h2>
      <div className="space-y-2">
        {appointments.map((appointment) => (
          <Link
            key={appointment.appointmentId}
            to={`/customer/${appointment.customerId}`}
            className={`block p-4 ${color.bg} border ${color.border} rounded-xl hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{appointment.customer?.name || 'Customer'}</p>
                <p className="text-sm text-gray-600">{appointment.serviceName}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-medium text-gray-900">{appointment.startTime}</p>
                  <p className="text-xs text-gray-500">{appointment.duration} min</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

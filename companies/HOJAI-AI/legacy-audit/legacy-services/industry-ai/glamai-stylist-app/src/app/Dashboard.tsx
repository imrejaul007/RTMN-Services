import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Clock, Users, DollarSign, Star, ChevronRight, AlertCircle } from 'lucide-react'
import { getStylistToday } from '../lib/api'

const STYLIST_ID = 'STYLIST_001' // Would come from auth

export default function Dashboard() {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['stylist-today', STYLIST_ID],
    queryFn: () => getStylistToday(STYLIST_ID),
    refetchInterval: 60000, // Refresh every minute
  })

  const now = new Date()
  const currentHour = now.getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening'

  // Stats
  const totalAppointments = appointments?.length || 0
  const completedToday = appointments?.filter(a => a.status === 'completed').length || 0
  const pendingToday = appointments?.filter(a => a.status === 'pending' || a.status === 'confirmed').length || 0
  const revenueToday = appointments
    ?.filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + (a.duration * 10), 0) || 0 // Simplified calculation

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, Stylist!</h1>
        <p className="text-gray-500">{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          label="Today's Appointments"
          value={totalAppointments}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Pending"
          value={pendingToday}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={<Star className="w-6 h-6" />}
          label="Completed"
          value={completedToday}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={<DollarSign className="w-6 h-6" />}
          label="Revenue Today"
          value={`₹${revenueToday.toLocaleString()}`}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
          <Link to="/appointments" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : appointments && appointments.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {appointments.slice(0, 5).map((appointment) => (
              <Link
                key={appointment.appointmentId}
                to={`/customer/${appointment.customerId}`}
                className="p-4 flex items-center hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 w-20 text-sm font-medium text-gray-900">
                  {appointment.startTime}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {appointment.customer?.name || 'Customer'}
                  </p>
                  <p className="text-sm text-gray-500">{appointment.serviceName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={appointment.status} />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No appointments scheduled for today</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickAction
          label="Check-in Customer"
          icon="📋"
          onClick={() => {/* Would open check-in modal */}}
        />
        <QuickAction
          label="Add Note"
          icon="📝"
          onClick={() => {/* Would open note modal */}}
        />
        <QuickAction
          label="Record Color"
          icon="🎨"
          onClick={() => {/* Would open color form */}}
        />
        <QuickAction
          label="View Inventory"
          icon="📦"
          onClick={() => {/* Would open inventory */}}
        />
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    confirmed: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.pending}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function QuickAction({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col items-center hover:shadow-md hover:border-brand-300 transition-all"
    >
      <span className="text-2xl mb-2">{icon}</span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </button>
  )
}

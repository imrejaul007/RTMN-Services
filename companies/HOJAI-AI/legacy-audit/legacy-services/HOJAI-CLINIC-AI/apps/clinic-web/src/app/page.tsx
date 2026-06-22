'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DashboardMetrics, Appointment, Patient } from '@/types';
import {
  UsersIcon,
  CalendarIcon,
  PhoneIcon,
  TrendingUpIcon,
  ClockIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Link from 'next/link';
import { format, isToday } from 'date-fns';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const data = await api.get('/analytics/dashboard');
      setMetrics(data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-gray-200 rounded-xl"></div>
          <div className="h-80 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard
          title="Today's Appointments"
          value={metrics?.todayAppointments || 0}
          subtitle={`${metrics?.todayPatients || 0} patients`}
          icon={<CalendarIcon className="h-6 w-6" />}
          color="primary"
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard
          title="Total Patients"
          value={metrics?.totalPatients || 0}
          subtitle={`+${metrics?.newPatientsThisMonth || 0} this month`}
          icon={<UsersIcon className="h-6 w-6" />}
          color="secondary"
        />
        <MetricCard
          title="Voice Calls Today"
          value={metrics?.todayCalls || 0}
          subtitle="AI handled"
          icon={<PhoneIcon className="h-6 w-6" />}
          color="success"
        />
        <MetricCard
          title="Monthly Revenue"
          value={`₹${(metrics?.revenueThisMonth || 0).toLocaleString()}`}
          subtitle="This month"
          icon={<TrendingUpIcon className="h-6 w-6" />}
          color="warning"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
            <Link href="/appointments" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View all
            </Link>
          </div>
          <div className="card-body">
            {metrics?.upcomingAppointments && metrics.upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {metrics.upcomingAppointments.map((apt: any) => (
                  <div
                    key={apt._id}
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-700 font-semibold text-lg">
                        {(apt.patientId as Patient)?.firstName?.[0] || '?'}
                      </span>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {(apt.patientId as Patient)?.firstName} {(apt.patientId as Patient)?.lastName}
                        </p>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {format(new Date(apt.date), 'MMM d')} at {apt.startTime}
                        <span className="mx-2">•</span>
                        Dr. {(apt.doctorId as any)?.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 mx-auto text-gray-300" />
                <p className="mt-2 text-gray-500">No upcoming appointments</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Quick Stats</h2>
          </div>
          <div className="card-body space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <UserGroupIcon className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm text-gray-600">This Week</span>
              </div>
              <span className="font-semibold text-gray-900">{metrics?.weekAppointments || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm text-gray-600">This Month</span>
              </div>
              <span className="font-semibold text-gray-900">{metrics?.monthAppointments || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <TrendingUpIcon className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm text-gray-600">Avg Daily</span>
              </div>
              <span className="font-semibold text-gray-900">
                {metrics?.monthAppointments ? Math.round(metrics.monthAppointments / 30) : 0}
              </span>
            </div>

            {/* Top Specialties */}
            {metrics?.topSpecialties && metrics.topSpecialties.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Top Specialties</h3>
                <div className="space-y-2">
                  {metrics.topSpecialties.map((spec: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{spec.specialty}</span>
                      <span className="text-sm font-medium text-gray-900">{spec.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning';
  trend?: { value: number; isPositive: boolean };
}) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    secondary: 'bg-secondary-50 text-secondary-600',
    success: 'bg-green-50 text-green-600',
    warning: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

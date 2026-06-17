'use client';

import React from 'react';
import { useTeam } from '@/hooks/useDashboard';
import { Users, TrendingUp, Award, Target, Clock, CheckCircle, Download } from 'lucide-react';
import { clsx } from 'clsx';

export default function TeamPage() {
  const { team, loading, error } = useTeam();

  const departmentStats = team.reduce((acc, member) => {
    if (!acc[member.department]) {
      acc[member.department] = { count: 0, totalPerformance: 0 };
    }
    acc[member.department].count++;
    acc[member.department].totalPerformance += member.performance;
    return acc;
  }, {} as Record<string, { count: number; totalPerformance: number }>);

  const avgPerformance = team.length > 0
    ? team.reduce((sum, m) => sum + m.performance, 0) / team.length
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Loading team data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-danger-600 font-medium">Error loading team data</p>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Performance</h1>
          <p className="text-gray-500 mt-1">Monitor team productivity and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            <Download className="w-4 h-4" />
            Export Report
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
            <Users className="w-4 h-4" />
            Manage Team
          </button>
        </div>
      </div>

      {/* Team Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">{team.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-success-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg Performance</p>
              <p className="text-2xl font-bold text-gray-900">{avgPerformance.toFixed(0)}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-warning-50 flex items-center justify-center">
              <Award className="w-6 h-6 text-warning-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Top Performers</p>
              <p className="text-2xl font-bold text-gray-900">
                {team.filter(m => m.performance >= 90).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Tasks Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {team.reduce((sum, m) => sum + m.completed, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Performance Distribution</h3>
          <div className="space-y-4">
            {[
              { range: '90-100%', count: team.filter(m => m.performance >= 90).length, color: 'bg-success-500', label: 'Exceptional' },
              { range: '80-89%', count: team.filter(m => m.performance >= 80 && m.performance < 90).length, color: 'bg-primary-500', label: 'Exceeds' },
              { range: '70-79%', count: team.filter(m => m.performance >= 70 && m.performance < 80).length, color: 'bg-warning-500', label: 'Meets' },
              { range: '60-69%', count: team.filter(m => m.performance >= 60 && m.performance < 70).length, color: 'bg-orange-500', label: 'Developing' },
              { range: '<60%', count: team.filter(m => m.performance < 60).length, color: 'bg-danger-500', label: 'Needs Support' }
            ].map((item) => (
              <div key={item.range} className="flex items-center gap-3">
                <div className={clsx('w-3 h-3 rounded-full', item.color)} />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium text-gray-900">{item.count} ({team.length > 0 ? Math.round(item.count / team.length * 100) : 0}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full', item.color)}
                      style={{ width: `${team.length > 0 ? (item.count / team.length * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Department Performance</h3>
          <div className="space-y-4">
            {Object.entries(departmentStats).map(([dept, stats]) => {
              const avg = stats.totalPerformance / stats.count;
              return (
                <div key={dept} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{dept}</span>
                    <span className="text-gray-500">{stats.count} members</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full',
                          avg >= 90 ? 'bg-success-500' : avg >= 80 ? 'bg-primary-500' : avg >= 70 ? 'bg-warning-500' : 'bg-danger-500'
                        )}
                        style={{ width: `${avg}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-10">{avg.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tasks Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tasks Overview</h3>
          <div className="flex items-center justify-center py-8">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeDasharray={`${team.reduce((sum, m) => sum + (m.completed / m.tasks), 0) / team.length * 100}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">
                  {team.length > 0 ? Math.round(team.reduce((sum, m) => sum + (m.completed / m.tasks), 0) / team.length * 100) : 0}%
                </span>
                <span className="text-xs text-gray-500">Completed</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center text-sm">
            <div>
              <div className="text-lg font-bold text-gray-900">
                {team.reduce((sum, m) => sum + m.tasks, 0)}
              </div>
              <div className="text-gray-500">Total Tasks</div>
            </div>
            <div>
              <div className="text-lg font-bold text-success-600">
                {team.reduce((sum, m) => sum + m.completed, 0)}
              </div>
              <div className="text-gray-500">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">Member</th>
                <th className="pb-3 font-medium">Department</th>
                <th className="pb-3 font-medium">Performance</th>
                <th className="pb-3 font-medium">Tasks</th>
                <th className="pb-3 font-medium">Completion</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => {
                const completionRate = member.tasks > 0 ? (member.completed / member.tasks) * 100 : 0;
                return (
                  <tr key={member.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-700">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                        {member.department}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              'h-full rounded-full',
                              member.performance >= 90 ? 'bg-success-500' :
                              member.performance >= 80 ? 'bg-primary-500' :
                              member.performance >= 70 ? 'bg-warning-500' : 'bg-danger-500'
                            )}
                            style={{ width: `${member.performance}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{member.performance}%</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="text-sm text-gray-600">{member.completed}/{member.tasks}</span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className={clsx(
                          'w-4 h-4',
                          completionRate >= 80 ? 'text-success-500' :
                          completionRate >= 60 ? 'text-warning-500' : 'text-danger-500'
                        )} />
                        <span className="text-sm font-medium">{completionRate.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Zap, Target, Trophy, Users, Play, Pause } from 'lucide-react';

export default function SutarPage() {
  const [activeTab, setActiveTab] = useState('goals');

  const goals = [
    { id: '1', name: 'Monthly Revenue', target: 100000, current: 67500, progress: 67 },
    { id: '2', name: 'New Leads', target: 50, current: 38, progress: 76 },
    { id: '3', name: 'Demo Calls', target: 20, current: 15, progress: 75 },
  ];

  const agents = [
    { id: '1', name: 'Sales Scout', status: 'running', tasks: 12 },
    { id: '2', name: 'Email Agent', status: 'paused', tasks: 8 },
    { id: '3', name: 'Research Bot', status: 'running', tasks: 5 },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Zap className="w-6 h-6 text-yellow-500" />
        SUTAR OS - Autonomous Operations
      </h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        {[
          { id: 'goals', name: 'Goals', icon: Target },
          { id: 'karma', name: 'Karma', icon: Trophy },
          { id: 'agents', name: 'Agents', icon: Users },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 flex items-center gap-2 border-b-2 -mb-px ${
              activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">Your Goals</h2>
            <div className="space-y-4">
              {goals.map(goal => (
                <div key={goal.id} className="border rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{goal.name}</span>
                    <span className="text-sm text-gray-500">${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <div className="text-right text-sm text-gray-500 mt-1">{goal.progress}%</div>
                </div>
              ))}
            </div>
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              + Add Goal
            </button>
          </div>
        </div>
      )}

      {/* Karma Tab */}
      {activeTab === 'karma' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl p-6 text-white">
            <Trophy className="w-10 h-10 mb-4" />
            <div className="text-4xl font-bold">2,450</div>
            <div className="text-lg opacity-90">Karma Points</div>
            <div className="mt-2 text-sm opacity-80">Rank #15 (Top 8%)</div>
          </div>
          <div className="col-span-2 bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">Earn Karma</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { action: 'Close Deal', points: '+50', icon: '🎯' },
                { action: 'Schedule Demo', points: '+25', icon: '📅' },
                { action: 'Send Email', points: '+5', icon: '📧' },
                { action: 'Log Activity', points: '+10', icon: '✅' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="font-medium">{item.action}</div>
                    <div className="text-green-600 text-sm">{item.points}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Agents Tab */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Active', value: 2, color: 'bg-green-500' },
              { label: 'Paused', value: 1, color: 'bg-yellow-500' },
              { label: 'Tasks Today', value: 25, color: 'bg-blue-500' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-xl border p-4 text-center">
                <div className={`inline-block px-3 py-1 ${stat.color} text-white rounded-full text-sm mb-2`}>
                  {stat.label}
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">Autonomous Agents</h2>
            <div className="space-y-3">
              {agents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${agent.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-sm text-gray-500">{agent.tasks} active tasks</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg">
                      {agent.status === 'running' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              + Deploy Agent
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * HOJAI Studio - AI Agents Page
 */

import React, { useState } from 'react';
import { Plus, Bot, MessageSquare, Phone, Mail, MoreVertical, Activity } from 'lucide-react';

const agents = [
  {
    id: '1',
    name: 'SDR Agent',
    department: 'Sales',
    status: 'active',
    tasks: 234,
    success: 94,
    avatar: 'S',
    color: 'bg-blue-500',
  },
  {
    id: '2',
    name: 'Support Agent',
    department: 'Support',
    status: 'active',
    tasks: 567,
    success: 91,
    avatar: 'U',
    color: 'bg-green-500',
  },
  {
    id: '3',
    name: 'Finance Agent',
    department: 'Finance',
    status: 'active',
    tasks: 89,
    success: 99,
    avatar: 'F',
    color: 'bg-purple-500',
  },
  {
    id: '4',
    name: 'Marketing Agent',
    department: 'Marketing',
    status: 'active',
    tasks: 156,
    success: 88,
    avatar: 'M',
    color: 'bg-orange-500',
  },
  {
    id: '5',
    name: 'HR Agent',
    department: 'HR',
    status: 'paused',
    tasks: 34,
    success: 95,
    avatar: 'H',
    color: 'bg-pink-500',
  },
  {
    id: '6',
    name: 'Briefing Agent',
    department: 'Founder',
    status: 'active',
    tasks: 30,
    success: 100,
    avatar: 'B',
    color: 'bg-cyan-500',
  },
];

const departments = ['All', 'Sales', 'Marketing', 'Support', 'Finance', 'HR', 'Founder'];

export function Agents() {
  const [department, setDepartment] = useState('All');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = agents.filter(
    (a) => department === 'All' || a.department === department
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-500 mt-1">
            Your AI workforce - {agents.filter((a) => a.status === 'active').length} active
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Agent
        </button>
      </div>

      {/* Department Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {departments.map((dept) => (
          <button
            key={dept}
            onClick={() => setDepartment(dept)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              department === dept
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((agent) => (
          <div
            key={agent.id}
            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 ${agent.color} rounded-xl flex items-center justify-center text-white text-xl font-bold`}
                  >
                    {agent.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-gray-500">{agent.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xl font-bold text-gray-900">{agent.tasks}</p>
                  <p className="text-xs text-gray-500">Tasks</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xl font-bold text-green-600">{agent.success}%</p>
                  <p className="text-xs text-gray-500">Success</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xl font-bold text-gray-900">
                    {agent.status === 'active' ? 'On' : 'Off'}
                  </p>
                  <p className="text-xs text-gray-500">Status</p>
                </div>
              </div>

              {/* Skills */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {['Lead Qualification', 'Email Outreach', 'CRM Update'].map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Activity */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Activity className="w-4 h-4" />
                <span>Last task: 2 min ago</span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-2">
              <button className="flex-1 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                Configure
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Agent Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add AI Agent</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent Type
                </label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500">
                  <option>SDR Agent - Sales Development</option>
                  <option>Support Agent - Customer Support</option>
                  <option>Finance Agent - Invoice Processing</option>
                  <option>Marketing Agent - Content Creation</option>
                  <option>HR Agent - Recruitment</option>
                  <option>Custom Agent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500">
                  <option>Sales</option>
                  <option>Marketing</option>
                  <option>Support</option>
                  <option>Finance</option>
                  <option>HR</option>
                  <option>Founder</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent Name
                </label>
                <input
                  type="text"
                  placeholder="My AI Agent"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Create Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

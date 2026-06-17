'use client'

import { useState } from 'react'
import {
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Mail,
  Shield,
  Crown,
  UserMinus,
  Settings,
  UserCheck,
} from 'lucide-react'

const teamMembers = [
  {
    id: 'tm-1',
    name: 'Sarah Chen',
    email: 'sarah.chen@rtmn.io',
    role: 'admin',
    status: 'active',
    avatar: 'SC',
    joinedAt: 'Jan 15, 2024',
  },
  {
    id: 'tm-2',
    name: 'Michael Rodriguez',
    email: 'michael.r@rtmn.io',
    role: 'editor',
    status: 'active',
    avatar: 'MR',
    joinedAt: 'Feb 20, 2024',
  },
  {
    id: 'tm-3',
    name: 'Emily Watson',
    email: 'emily.w@rtmn.io',
    role: 'viewer',
    status: 'active',
    avatar: 'EW',
    joinedAt: 'Mar 10, 2024',
  },
  {
    id: 'tm-4',
    name: 'James Kim',
    email: 'james.kim@rtmn.io',
    role: 'editor',
    status: 'active',
    avatar: 'JK',
    joinedAt: 'Apr 5, 2024',
  },
  {
    id: 'tm-5',
    name: 'Lisa Thompson',
    email: 'lisa.t@rtmn.io',
    role: 'viewer',
    status: 'invited',
    avatar: 'LT',
    joinedAt: 'Pending',
  },
]

const roles = [
  {
    name: 'Admin',
    description: 'Full access to all settings and features',
    color: 'bg-purple-100 text-purple-700',
    icon: Crown,
    count: 1,
  },
  {
    name: 'Editor',
    description: 'Can create and edit workflows, KB articles',
    color: 'bg-blue-100 text-blue-700',
    icon: Settings,
    count: 2,
  },
  {
    name: 'Viewer',
    description: 'Read-only access to workflows and KB',
    color: 'bg-gray-100 text-gray-700',
    icon: UserCheck,
    count: 2,
  },
]

export default function TeamsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)

  const filteredMembers = teamMembers.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700'
      case 'editor':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-muted-foreground mt-1">Manage team members and permissions</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Invite Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {roles.map((role) => (
          <div key={role.name} className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${role.color}`}>
                <role.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{role.count}</p>
                <p className="text-sm text-muted-foreground">{role.name}s</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
                />
              </div>
            </div>
            <div className="divide-y">
              {filteredMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-4 p-4">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                    {member.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(member.role)}`}>
                        {member.role}
                      </span>
                      {member.status === 'invited' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                          Pending invite
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{member.joinedAt}</span>
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Roles & Permissions */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Role Permissions</h3>
            </div>
            <div className="p-4 space-y-4">
              {roles.map((role) => (
                <div key={role.name} className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${role.color}`}>
                    <role.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{role.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Permission Matrix</h3>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2 text-muted-foreground">Permission</th>
                    <th className="pb-2 text-center text-muted-foreground">Admin</th>
                    <th className="pb-2 text-center text-muted-foreground">Editor</th>
                    <th className="pb-2 text-center text-muted-foreground">Viewer</th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {[
                    { name: 'Manage workflows', admin: true, editor: true, viewer: false },
                    { name: 'Edit KB articles', admin: true, editor: true, viewer: false },
                    { name: 'View workflows', admin: true, editor: true, viewer: true },
                    { name: 'Manage team', admin: true, editor: false, viewer: false },
                    { name: 'View analytics', admin: true, editor: true, viewer: true },
                    { name: 'Configure integrations', admin: true, editor: false, viewer: false },
                  ].map((perm) => (
                    <tr key={perm.name}>
                      <td className="py-1 text-muted-foreground">{perm.name}</td>
                      <td className="py-1 text-center">{perm.admin ? '✓' : '−'}</td>
                      <td className="py-1 text-center">{perm.editor ? '✓' : '−'}</td>
                      <td className="py-1 text-center">{perm.viewer ? '✓' : '−'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Invite Team Member</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email Address</label>
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  className="w-full mt-1 px-4 py-2 border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <select className="w-full mt-1 px-4 py-2 border rounded-lg bg-background">
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Message (optional)</label>
                <textarea
                  placeholder="Add a personal message..."
                  className="w-full mt-1 px-4 py-2 border rounded-lg bg-background h-20 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

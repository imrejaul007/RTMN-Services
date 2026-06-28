import React, { useState } from 'react';
import { Activity, Workflow, Users, DollarSign, Shield, Settings, Bell, Search, Plus, ChevronRight } from 'lucide-react';

// Mock data
const mockData = {
  workflows: {
    total: 156,
    active: 42,
    completed: 98,
    failed: 16
  },
  agents: {
    total: 234,
    active: 89,
    idle: 145
  },
  costs: {
    today: 1234.56,
    thisMonth: 45678.90,
    currency: 'USD'
  },
  trust: {
    average: 87.5,
    platinum: 45,
    gold: 89,
    silver: 67,
    bronze: 23
  },
  recentWorkflows: [
    { id: 'wf_1', name: 'Order Processing', status: 'running', duration: '2m 34s' },
    { id: 'wf_2', name: 'Invoice Approval', status: 'completed', duration: '45s' },
    { id: 'wf_3', name: 'Customer Onboarding', status: 'pending', duration: '-' },
    { id: 'wf_4', name: 'Payment Processing', status: 'failed', duration: '12s' }
  ],
  pendingApprovals: [
    { id: 'apr_1', workflow: 'Loan Approval', assignee: 'manager@company.com', deadline: '2h' },
    { id: 'apr_2', workflow: 'Vendor Payment', assignee: 'finance@company.com', deadline: '4h' }
  ],
  complianceMetrics: {
    gdpr: 98.5,
    soc2: 100,
    hipaa: 95.2
  }
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'workflows', label: 'Workflows', icon: Workflow },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'costs', label: 'Costs', icon: DollarSign },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 240 : 64,
        background: '#1e293b',
        padding: '16px',
        transition: 'width 0.3s'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>
            F
          </div>
          {sidebarOpen && <span style={{ fontWeight: 600, fontSize: 18 }}>Flow Console</span>}
        </div>

        <nav>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px',
                marginBottom: 4,
                borderRadius: 8,
                border: 'none',
                background: activeTab === tab.id ? '#334155' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <tab.icon size={20} />
              {sidebarOpen && <span>{tab.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: 24 }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              position: 'relative',
              width: 300
            }}>
              <Search
                size={18}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
              />
              <input
                type="text"
                placeholder="Search workflows, agents, policies..."
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  borderRadius: 8,
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#e2e8f0'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button style={{
              position: 'relative',
              padding: 8,
              borderRadius: 8,
              border: 'none',
              background: '#334155',
              color: '#94a3b8',
              cursor: 'pointer'
            }}>
              <Bell size={20} />
              <span style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#ef4444'
              }} />
            </button>
            <button style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 500
            }}>
              <Plus size={16} style={{ marginRight: 8 }} />
              New Workflow
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Dashboard</h1>

            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              marginBottom: 24
            }}>
              <StatCard
                title="Active Workflows"
                value={mockData.workflows.active}
                subtitle={`${mockData.workflows.total} total`}
                trend="+12%"
                icon={Workflow}
                color="#667eea"
              />
              <StatCard
                title="Active Agents"
                value={mockData.agents.active}
                subtitle={`${mockData.agents.total} total`}
                trend="+5%"
                icon={Users}
                color="#10b981"
              />
              <StatCard
                title="Today's Cost"
                value={`$${mockData.costs.today.toFixed(2)}`}
                subtitle="This month: $45,678.90"
                trend="-8%"
                icon={DollarSign}
                color="#f59e0b"
              />
              <StatCard
                title="Trust Score"
                value={`${mockData.trust.average}%`}
                subtitle="Average"
                trend="+2%"
                icon={Shield}
                color="#8b5cf6"
              />
            </div>

            {/* Two Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
              {/* Recent Workflows */}
              <div style={{
                background: '#1e293b',
                borderRadius: 12,
                padding: 20
              }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                  Recent Workflows
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#64748b', fontSize: 12 }}>
                      <th style={{ textAlign: 'left', padding: '8px 0' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '8px 0' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '8px 0' }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockData.recentWorkflows.map(wf => (
                      <tr key={wf.id} style={{ borderTop: '1px solid #334155' }}>
                        <td style={{ padding: '12px 0' }}>{wf.name}</td>
                        <td style={{ padding: '12px 0' }}>
                          <StatusBadge status={wf.status} />
                        </td>
                        <td style={{ padding: '12px 0', color: '#64748b' }}>{wf.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pending Approvals */}
              <div style={{
                background: '#1e293b',
                borderRadius: 12,
                padding: 20
              }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                  Pending Approvals
                </h2>
                {mockData.pendingApprovals.map(apr => (
                  <div
                    key={apr.id}
                    style={{
                      padding: 12,
                      background: '#334155',
                      borderRadius: 8,
                      marginBottom: 8,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{apr.workflow}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {apr.assignee}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: '#f59e0b',
                      marginTop: 4
                    }}>
                      Due in {apr.deadline}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance */}
            <div style={{
              background: '#1e293b',
              borderRadius: 12,
              padding: 20,
              marginTop: 24
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                Compliance Score
              </h2>
              <div style={{ display: 'flex', gap: 24 }}>
                {Object.entries(mockData.complianceMetrics).map(([key, value]) => (
                  <div key={key} style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>
                      {key}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: '#10b981' }}>
                      {value}%
                    </div>
                    <div style={{
                      height: 4,
                      background: '#334155',
                      borderRadius: 2,
                      marginTop: 8
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${value}%`,
                        background: '#10b981',
                        borderRadius: 2
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Placeholder for other tabs */}
        {activeTab !== 'dashboard' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 400,
            color: '#64748b'
          }}>
            <tabs.find(t => t.id === activeTab)?.icon size={48} />
            <p style={{ marginTop: 16, fontSize: 18 }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Panel
            </p>
            <p style={{ fontSize: 14 }}>Coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, subtitle, trend, icon: Icon, color }) {
  return (
    <div style={{
      background: '#1e293b',
      borderRadius: 12,
      padding: 20
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={20} color={color} />
        </div>
        <span style={{
          fontSize: 12,
          padding: '4px 8px',
          borderRadius: 4,
          background: trend.startsWith('+') ? '#10b98120' : '#ef444420',
          color: trend.startsWith('+') ? '#10b981' : '#ef4444'
        }}>
          {trend}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b' }}>{subtitle}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    running: { bg: '#3b82f620', color: '#3b82f6' },
    completed: { bg: '#10b98120', color: '#10b981' },
    pending: { bg: '#f59e0b20', color: '#f59e0b' },
    failed: { bg: '#ef444420', color: '#ef4444' }
  };

  const style = colors[status] || colors.pending;

  return (
    <span style={{
      padding: '4px 8px',
      borderRadius: 4,
      background: style.bg,
      color: style.color,
      fontSize: 12,
      fontWeight: 500
    }}>
      {status}
    </span>
  );
}

export default App;

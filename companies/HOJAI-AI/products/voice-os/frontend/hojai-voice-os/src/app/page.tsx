'use client';

import { useState, useEffect } from 'react';

// Types
interface VoiceEmployee {
  id: string;
  name: string;
  type: 'receptionist' | 'sdr' | 'support' | 'booking' | 'collections' | 'cfo' | 'hr';
  status: 'active' | 'paused' | 'offline';
  callsToday: number;
  leadsToday: number;
  conversion: number;
}

interface Call {
  id: string;
  customer: string;
  phone: string;
  duration: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  employee: string;
  transcript: string;
  status: 'completed' | 'transferred' | 'missed';
  timestamp: Date;
}

interface Analytics {
  totalCalls: number;
  activeCalls: number;
  avgDuration: number;
  avgSentiment: number;
  leads: number;
  conversions: number;
  revenue: number;
}

// Mock data
const mockEmployees: VoiceEmployee[] = [
  { id: '1', name: 'Priya - Receptionist', type: 'receptionist', status: 'active', callsToday: 45, leadsToday: 12, conversion: 26 },
  { id: '2', name: 'Amit - SDR', type: 'sdr', status: 'active', callsToday: 38, leadsToday: 15, conversion: 39 },
  { id: '3', name: 'Sara - Support', type: 'support', status: 'active', callsToday: 52, leadsToday: 8, conversion: 85 },
  { id: '4', name: 'Raj - Booking', type: 'booking', status: 'paused', callsToday: 23, leadsToday: 18, conversion: 78 },
  { id: '5', name: 'Neha - Collections', type: 'collections', status: 'active', callsToday: 67, leadsToday: 0, conversion: 34 },
];

const mockCalls: Call[] = [
  { id: '1', customer: 'Rahul Sharma', phone: '+919876543210', duration: 245, sentiment: 'positive', employee: 'Priya', transcript: 'I want to book a table for 4 tomorrow...', status: 'completed', timestamp: new Date() },
  { id: '2', customer: 'Priya Patel', phone: '+919876543211', duration: 180, sentiment: 'neutral', employee: 'Amit', transcript: 'Tell me about your loan products...', status: 'transferred', timestamp: new Date() },
  { id: '3', customer: 'Amit Kumar', phone: '+919876543212', duration: 320, sentiment: 'negative', employee: 'Sara', transcript: 'I have an issue with my order...', status: 'completed', timestamp: new Date() },
  { id: '4', customer: 'Sneha Reddy', phone: '+919876543213', duration: 90, sentiment: 'positive', employee: 'Raj', transcript: 'Book me a cab to airport...', status: 'completed', timestamp: new Date() },
];

const mockAnalytics: Analytics = {
  totalCalls: 412,
  activeCalls: 8,
  avgDuration: 215,
  avgSentiment: 72,
  leads: 156,
  conversions: 89,
  revenue: 234500,
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function VoiceOSDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calls' | 'employees' | 'knowledge' | 'settings'>('dashboard');
  const [analytics] = useState<Analytics>(mockAnalytics);
  const [employees] = useState<VoiceEmployee[]>(mockEmployees);
  const [calls] = useState<Call[]>(mockCalls);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: 280, background: '#0f172a', color: 'white', padding: 24 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>
            <span style={{ color: '#8b5cf6' }}>Hojai</span>
            <br />
            <span style={{ fontSize: 20, color: '#94a3b8' }}>VoiceOS</span>
          </h1>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>
            📊 Dashboard
          </NavButton>
          <NavButton active={activeTab === 'calls'} onClick={() => setActiveTab('calls')}>
            📞 Calls
          </NavButton>
          <NavButton active={activeTab === 'employees'} onClick={() => setActiveTab('employees')}>
            🤖 AI Employees
          </NavButton>
          <NavButton active={activeTab === 'knowledge'} onClick={() => setActiveTab('knowledge')}>
            📚 Knowledge Base
          </NavButton>
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>
            ⚙️ Settings
          </NavButton>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>ACTIVE NOW</div>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#22c55e' }}>{analytics.activeCalls}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>concurrent calls</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, background: '#f8fafc', padding: 24 }}>
        {activeTab === 'dashboard' && <DashboardTab analytics={analytics} employees={employees} />}
        {activeTab === 'calls' && <CallsTab calls={calls} />}
        {activeTab === 'employees' && <EmployeesTab employees={employees} />}
        {activeTab === 'knowledge' && <KnowledgeTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}

function NavButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 16px',
        borderRadius: 8,
        border: 'none',
        background: active ? '#8b5cf6' : 'transparent',
        color: 'white',
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}
    >
      {children}
    </button>
  );
}

function DashboardTab({ analytics, employees }: { analytics: Analytics; employees: VoiceEmployee[] }) {
  return (
    <div>
      <header style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 28 }}>VoiceOS Dashboard</h2>
        <p style={{ margin: '8px 0 0', color: '#64748b' }}>
          Real-time voice AI platform for your business
        </p>
      </header>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard title="Total Calls" value={analytics.totalCalls.toString()} icon="📞" color="#8b5cf6" />
        <StatCard title="Avg Duration" value={`${Math.floor(analytics.avgDuration / 60)}m`} icon="⏱️" color="#22c55e" />
        <StatCard title="Leads" value={analytics.leads.toString()} icon="👥" color="#f59e0b" />
        <StatCard title="Revenue" value={`₹${(analytics.revenue / 1000).toFixed(0)}K`} icon="💰" color="#ec4899" />
      </div>

      {/* Active Employees */}
      <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px' }}>🤖 Active AI Employees</h3>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
          {employees.map(emp => (
            <div key={emp.id} style={{
              minWidth: 200,
              padding: 16,
              background: '#f8fafc',
              borderRadius: 12,
              borderLeft: `4px solid ${emp.status === 'active' ? '#22c55e' : emp.status === 'paused' ? '#f59e0b' : '#94a3b8'}`
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{emp.name}</div>
              <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>{emp.type}</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 'bold' }}>{emp.callsToday}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Calls</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 'bold' }}>{emp.leadsToday}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Leads</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#22c55e' }}>{emp.conversion}%</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Conv.</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Calls */}
      <div style={{ background: 'white', borderRadius: 16, padding: 24 }}>
        <h3 style={{ margin: '0 0 16px' }}>📞 Recent Calls</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: 12, color: '#64748b' }}>Customer</th>
              <th style={{ textAlign: 'left', padding: 12, color: '#64748b' }}>Duration</th>
              <th style={{ textAlign: 'left', padding: 12, color: '#64748b' }}>Sentiment</th>
              <th style={{ textAlign: 'left', padding: 12, color: '#64748b' }}>Employee</th>
              <th style={{ textAlign: 'left', padding: 12, color: '#64748b' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.slice(0, 3).map((emp, i) => (
              <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: 12 }}>
                  <div style={{ fontWeight: 'bold' }}>{['Rahul Sharma', 'Priya Patel', 'Amit Kumar'][i]}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>+9198765***{10 + i}</div>
                </td>
                <td style={{ padding: 12 }}>{[245, 180, 320][i]}s</td>
                <td style={{ padding: 12 }}>
                  <SentimentBadge sentiment={['positive', 'neutral', 'negative'][i] as any} />
                </td>
                <td style={{ padding: 12 }}>{emp.name.split(' - ')[0]}</td>
                <td style={{ padding: 12 }}>
                  <StatusBadge status="completed" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        <span style={{ fontSize: 12, padding: '4px 8px', background: `${color}20`, color, borderRadius: 8 }}>
          +12%
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 'bold' }}>{value}</div>
      <div style={{ fontSize: 14, color: '#64748b' }}>{title}</div>
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: 'positive' | 'neutral' | 'negative' }) {
  const colors = {
    positive: { bg: '#dcfce7', text: '#16a34a' },
    neutral: { bg: '#fef3c7', text: '#d97706' },
    negative: { bg: '#fee2e2', text: '#dc2626' }
  };
  const c = colors[sentiment];
  return (
    <span style={{ padding: '4px 12px', borderRadius: 12, background: c.bg, color: c.text, fontSize: 12 }}>
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    completed: { bg: '#dcfce7', text: '#16a34a' },
    transferred: { bg: '#dbeafe', text: '#2563eb' },
    missed: { bg: '#fee2e2', text: '#dc2626' }
  };
  const c = colors[status] || colors.completed;
  return (
    <span style={{ padding: '4px 12px', borderRadius: 12, background: c.bg, color: c.text, fontSize: 12 }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function CallsTab({ calls }: { calls: Call[] }) {
  return (
    <div>
      <header style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 28 }}>Call History</h2>
        <p style={{ margin: '8px 0 0', color: '#64748b' }}>{calls.length} calls today</p>
      </header>

      <div style={{ background: 'white', borderRadius: 16, padding: 24 }}>
        {calls.map(call => (
          <div key={call.id} style={{
            padding: 16,
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              📞
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{call.customer}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{call.phone}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{call.transcript}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>{formatDuration(call.duration)}</div>
              <SentimentBadge sentiment={call.sentiment} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmployeesTab({ employees }: { employees: VoiceEmployee[] }) {
  return (
    <div>
      <header style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 28 }}>AI Employees</h2>
        <p style={{ margin: '8px 0 0', color: '#64748b' }}>Manage your voice AI workforce</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {employees.map(emp => (
          <div key={emp.id} style={{ background: 'white', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 'bold' }}>{emp.name}</div>
                <div style={{ fontSize: 14, color: '#64748b', textTransform: 'uppercase' }}>{emp.type}</div>
              </div>
              <span style={{
                padding: '4px 12px',
                borderRadius: 12,
                background: emp.status === 'active' ? '#dcfce7' : '#fef3c7',
                color: emp.status === 'active' ? '#16a34a' : '#d97706'
              }}>
                {emp.status}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ textAlign: 'center', padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{emp.callsToday}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Calls Today</div>
              </div>
              <div style={{ textAlign: 'center', padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{emp.leadsToday}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Leads</div>
              </div>
              <div style={{ textAlign: 'center', padding: 12, background: '#dcfce7', borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#16a34a' }}>{emp.conversion}%</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Conversion</div>
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: '#8b5cf6', color: 'white', cursor: 'pointer' }}>
                View Reports
              </button>
              <button style={{ padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                Settings
              </button>
            </div>
          </div>
        ))}
      </div>

      <button style={{
        marginTop: 24,
        padding: '16px 24px',
        borderRadius: 12,
        border: 'none',
        background: '#8b5cf6',
        color: 'white',
        fontSize: 16,
        cursor: 'pointer',
        width: '100%'
      }}>
        + Add New AI Employee
      </button>
    </div>
  );
}

function KnowledgeTab() {
  return (
    <div>
      <header style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 28 }}>Knowledge Base</h2>
        <p style={{ margin: '8px 0 0', color: '#64748b' }}>Train your AI employees</p>
      </header>

      <div style={{ background: 'white', borderRadius: 16, padding: 24 }}>
        <h3 style={{ margin: '0 0 16px' }}>📚 Training Data</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
            <div style={{ fontWeight: 'bold' }}>FAQs</div>
            <div style={{ color: '#64748b' }}>24 articles</div>
          </div>
          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 'bold' }}>SOPs</div>
            <div style={{ color: '#64748b' }}>12 procedures</div>
          </div>
          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🏢</div>
            <div style={{ fontWeight: 'bold' }}>Business Info</div>
            <div style={{ color: '#64748b' }}>5 categories</div>
          </div>
          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🌐</div>
            <div style={{ fontWeight: 'bold' }}>Languages</div>
            <div style={{ color: '#64748b' }}>English, Hindi</div>
          </div>
        </div>

        <button style={{
          padding: '12px 24px',
          borderRadius: 8,
          border: 'none',
          background: '#8b5cf6',
          color: 'white',
          cursor: 'pointer'
        }}>
          + Add Knowledge
        </button>
      </div>
    </div>
  );
}

function SettingsTab() {
  return (
    <div>
      <header style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 28 }}>Settings</h2>
        <p style={{ margin: '8px 0 0', color: '#64748b' }}>Configure your VoiceOS</p>
      </header>

      <div style={{ background: 'white', borderRadius: 16, padding: 24 }}>
        <h3 style={{ margin: '0 0 16px' }}>🔊 Voice Settings</h3>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Default Voice</label>
          <select style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <option>Alluka (Female - Natural)</option>
            <option>Kya (Female - Professional)</option>
            <option>Arjun (Male - Warm)</option>
          </select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Languages</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ padding: '8px 16px', background: '#8b5cf6', color: 'white', borderRadius: 20 }}>English ✅</span>
            <span style={{ padding: '8px 16px', background: '#f1f5f9', borderRadius: 20, cursor: 'pointer' }}>Hindi</span>
            <span style={{ padding: '8px 16px', background: '#f1f5f9', borderRadius: 20, cursor: 'pointer' }}>+ Add</span>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Telecom Provider</label>
          <select style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <option>Twilio</option>
            <option>Exotel (Coming Soon)</option>
            <option>Knowlarity (Coming Soon)</option>
          </select>
        </div>

        <button style={{
          padding: '12px 24px',
          borderRadius: 8,
          border: 'none',
          background: '#8b5cf6',
          color: 'white',
          cursor: 'pointer'
        }}>
          Save Changes
        </button>
      </div>
    </div>
  );
}

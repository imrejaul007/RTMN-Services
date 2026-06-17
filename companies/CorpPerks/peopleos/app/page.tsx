'use client';

import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  Receipt,
  GraduationCap,
  Building2,
  TrendingUp,
  Bot,
  Bell,
  Search,
  Menu,
  X,
  ChevronRight,
  CalendarDays,
  Clock4,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  XCircle,
  User,
  Settings,
  LogOut,
  FileText,
  DollarSign,
  Heart,
  Briefcase,
  Target,
  Award,
  MessageSquare,
  Zap,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useStore, demoUser } from '@/lib/store';
import {
  employeeApi,
  leaveApi,
  attendanceApi,
  payrollApi,
  benefitsApi,
  trainingApi,
  analyticsApi,
  copilotApi,
  organizationApi,
  predictionsApi,
} from '@/lib/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Colors
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// Navigation items
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'leave', label: 'Leave', icon: Calendar },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'payroll', label: 'Payroll', icon: DollarSign },
  { id: 'benefits', label: 'Benefits', icon: Heart },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'org', label: 'Organization', icon: Building2 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'copilot', label: 'AI Copilot', icon: Bot },
];

// Leave type colors
const LEAVE_COLORS: Record<string, string> = {
  casual: '#10B981',
  sick: '#F59E0B',
  earned: '#3B82F6',
  parental: '#EC4899',
  bereavement: '#6B7280',
  work_from_home: '#8B5CF6',
  loss_of_pay: '#EF4444',
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, setUser } = useStore();
  const [copilotMessage, setCopilotMessage] = useState('');
  const [copilotResponse, setCopilotResponse] = useState<any>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);

  // Demo data state
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [benefitsPlans, setBenefitsPlans] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [orgChart, setOrgChart] = useState<any>(null);

  // Set demo user on mount
  useEffect(() => {
    setUser(demoUser);
  }, [setUser]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dash, emps, lb, lr, att, pr, bp, crs, org] = await Promise.all([
          analyticsApi.getDashboard(),
          employeeApi.list({ limit: 10 }),
          leaveApi.getBalance(demoUser.id),
          leaveApi.listRequests({ employeeId: demoUser.id }),
          attendanceApi.getRecords(demoUser.id),
          payrollApi.listRecords({ employeeId: demoUser.id }),
          benefitsApi.getPlans(),
          trainingApi.getCourses(),
          organizationApi.getOrgChart(),
        ]);

        setDashboardData(dash);
        setEmployees(emps.data || []);
        setLeaveBalance(lb);
        setLeaveRequests(lr || []);
        setAttendanceRecords(att || []);
        setPayrollRecords(pr || []);
        setBenefitsPlans(bp || []);
        setCourses(crs.courses || []);
        setOrgChart(org);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Handle copilot chat
  const handleCopilotChat = async () => {
    if (!copilotMessage.trim()) return;

    setCopilotLoading(true);
    try {
      const response = await copilotApi.chat(copilotMessage, demoUser.id);
      setCopilotResponse(response);
    } catch (error) {
      console.error('Copilot error:', error);
      setCopilotResponse({
        response: 'I\'m having trouble connecting to the AI service. Please try again.',
        actions: [],
      });
    }
    setCopilotLoading(false);
  };

  // Handle check-in
  const handleCheckIn = async () => {
    try {
      await attendanceApi.checkIn({ employeeId: demoUser.id });
      setAttendanceRecords([...attendanceRecords, { date: new Date().toISOString().split('T')[0], checkIn: new Date().toISOString() }]);
    } catch (error) {
      console.error('Check-in error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-gray-900">PeopleOS</h1>
                <p className="text-xs text-gray-500">RTMN Workforce</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-500" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.position || 'Employee'}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                className="w-80 pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              dashboardData={dashboardData}
              leaveBalance={leaveBalance}
              leaveRequests={leaveRequests}
              attendanceRecords={attendanceRecords}
              courses={courses}
              onCheckIn={handleCheckIn}
            />
          )}
          {activeTab === 'employees' && <EmployeesView employees={employees} />}
          {activeTab === 'leave' && <LeaveView leaveBalance={leaveBalance} leaveRequests={leaveRequests} />}
          {activeTab === 'attendance' && <AttendanceView records={attendanceRecords} onCheckIn={handleCheckIn} />}
          {activeTab === 'payroll' && <PayrollView records={payrollRecords} />}
          {activeTab === 'benefits' && <BenefitsView plans={benefitsPlans} />}
          {activeTab === 'training' && <TrainingView courses={courses} />}
          {activeTab === 'expenses' && <ExpensesView />}
          {activeTab === 'org' && <OrgView chart={orgChart} />}
          {activeTab === 'analytics' && <AnalyticsView />}
          {activeTab === 'copilot' && (
            <CopilotView
              message={copilotMessage}
              setMessage={setCopilotMessage}
              response={copilotResponse}
              onSend={handleCopilotChat}
              loading={copilotLoading}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// DASHBOARD VIEW
// ============================================================

function DashboardView({
  dashboardData,
  leaveBalance,
  leaveRequests,
  attendanceRecords,
  courses,
  onCheckIn,
}: any) {
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendanceRecords.find((r: any) => r.date === today);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {demoUser.name.split(' ')[0]}! 👋</h1>
          <p className="text-gray-500 mt-1">Here's what's happening today</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        <QuickActionCard
          icon={Clock}
          label="Check In"
          value={todayAttendance?.checkIn ? new Date(todayAttendance.checkIn).toLocaleTimeString() : 'Not checked in'}
          color="blue"
          onClick={onCheckIn}
          disabled={!!todayAttendance?.checkIn}
        />
        <QuickActionCard
          icon={Calendar}
          label="Leave Balance"
          value={`${(leaveBalance?.casual || 0) + (leaveBalance?.earned || 0)} days`}
          color="green"
        />
        <QuickActionCard
          icon={GraduationCap}
          label="Training"
          value={`${courses.length} courses`}
          color="purple"
        />
        <QuickActionCard
          icon={DollarSign}
          label="Next Payday"
          value="25 Jun"
          color="orange"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Employees"
          value={dashboardData?.headcount?.total || 100}
          trend={5.2}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="On Leave Today"
          value={dashboardData?.leave?.onLeave || 8}
          icon={CalendarDays}
          color="green"
        />
        <StatCard
          label="Open Positions"
          value={dashboardData?.recruitment?.openJobs || 12}
          icon={Briefcase}
          color="purple"
        />
        <StatCard
          label="Pending Requests"
          value={leaveRequests.filter((r: any) => r.status === 'pending').length}
          icon={AlertCircle}
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Leave Balance */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Leave Balance</h3>
          <div className="space-y-4">
            {leaveBalance && Object.entries(leaveBalance).filter(([k]) => k !== 'employeeId' && k !== 'lastUpdated').map(([type, value]) => (
              <div key={type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-gray-600">{type.replace('_', ' ')}</span>
                  <span className="font-medium">{value as number} days</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((value as number / 30) * 100, 100)}%`,
                      backgroundColor: LEAVE_COLORS[type] || '#3B82F6',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Headcount by Department</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={Object.entries(dashboardData?.departmentDistribution || {}).map(([name, value]) => ({
                    name,
                    value,
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {Object.keys(dashboardData?.departmentDistribution || {}).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Leave Requests</h3>
        <div className="space-y-3">
          {leaveRequests.slice(0, 5).map((request: any) => (
            <div key={request.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  request.status === 'approved' ? 'bg-green-100' :
                  request.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  {request.status === 'approved' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                   request.status === 'pending' ? <Clock4 className="w-5 h-5 text-yellow-600" /> :
                   <XCircle className="w-5 h-5 text-red-600" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900 capitalize">{request.leaveType?.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-500">{request.startDate} - {request.endDate}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                request.status === 'approved' ? 'bg-green-100 text-green-700' :
                request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
              }`}>
                {request.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// QUICK ACTION CARD
// ============================================================

function QuickActionCard({
  icon: Icon,
  label,
  value,
  color,
  onClick,
  disabled,
}: any) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-white rounded-xl p-4 shadow-sm text-left ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md transition-shadow'}`}
    >
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </button>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({ label, value, trend, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

// ============================================================
// EMPLOYEES VIEW
// ============================================================

function EmployeesView({ employees }: { employees: any[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Add Employee
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                      <p className="text-sm text-gray-500">{emp.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{emp.position?.title || 'N/A'}</td>
                <td className="px-6 py-4 text-gray-600">{emp.department?.name || 'N/A'}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                    emp.status === 'active' ? 'bg-green-100 text-green-700' :
                    emp.status === 'on-leave' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {emp.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// LEAVE VIEW
// ============================================================

function LeaveView({ leaveBalance, leaveRequests }: any) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-4 gap-4">
        {leaveBalance && Object.entries(leaveBalance).filter(([k]) => k !== 'employeeId' && k !== 'lastUpdated').map(([type, value]) => (
          <div key={type} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: LEAVE_COLORS[type] || '#3B82F6' }} />
              <span className="text-sm font-medium text-gray-600 capitalize">{type.replace('_', ' ')}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value as number}</p>
            <p className="text-sm text-gray-500">days available</p>
          </div>
        ))}
      </div>

      {/* Request Leave */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Request Leave</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Select type</option>
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="earned">Earned Leave</option>
              <option value="parental">Parental Leave</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input type="text" placeholder="Reason for leave" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Submit Request
        </button>
      </div>

      {/* Recent Requests */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">My Leave Requests</h3>
        <div className="space-y-3">
          {leaveRequests.map((request: any) => (
            <div key={request.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 capitalize">{request.leaveType?.replace('_', ' ')}</p>
                <p className="text-sm text-gray-500">{request.startDate} - {request.endDate}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                request.status === 'approved' ? 'bg-green-100 text-green-700' :
                request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
              }`}>
                {request.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ATTENDANCE VIEW
// ============================================================

function AttendanceView({ records, onCheckIn }: { records: any[]; onCheckIn: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const todayRecord = records.find((r: any) => r.date === today);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>

      {/* Check In/Out Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Today's Attendance</h3>
            <p className="text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-4">
            {todayRecord?.checkIn && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Checked In</p>
                <p className="font-semibold text-green-600">{new Date(todayRecord.checkIn).toLocaleTimeString()}</p>
              </div>
            )}
            {todayRecord?.checkOut && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Checked Out</p>
                <p className="font-semibold text-red-600">{new Date(todayRecord.checkOut).toLocaleTimeString()}</p>
              </div>
            )}
            <button
              onClick={onCheckIn}
              disabled={!!todayRecord?.checkIn}
              className={`px-6 py-3 rounded-lg font-medium ${
                todayRecord?.checkIn
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {todayRecord?.checkIn ? 'Checked In' : 'Check In'}
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Attendance</h3>
        <div className="space-y-3">
          {records.slice(0, 10).map((record: any) => (
            <div key={record.date} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{new Date(record.date).toLocaleDateString()}</p>
                <p className="text-sm text-gray-500">
                  {record.checkIn ? `In: ${new Date(record.checkIn).toLocaleTimeString()}` : 'No check-in'}
                  {record.checkOut ? ` | Out: ${new Date(record.checkOut).toLocaleTimeString()}` : ''}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                record.checkIn && record.checkOut ? 'bg-green-100 text-green-700' :
                record.checkIn ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {record.checkIn && record.checkOut ? 'Complete' : record.checkIn ? 'In Progress' : 'Absent'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAYROLL VIEW
// ============================================================

function PayrollView({ records }: { records: any[] }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>

      {/* Payslips */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">My Payslips</h3>
        <div className="space-y-3">
          {records.length > 0 ? records.map((record: any) => (
            <div key={record.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{record.month}/{record.year}</p>
                <p className="text-sm text-gray-500">Net Pay: ₹{(record.netPay || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                  record.status === 'paid' ? 'bg-green-100 text-green-700' :
                  record.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {record.status}
                </span>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Download
                </button>
              </div>
            </div>
          )) : (
            <p className="text-gray-500 text-center py-8">No payslip records found</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BENEFITS VIEW
// ============================================================

function BenefitsView({ plans }: { plans: any[] }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Benefits & Insurance</h1>

      <div className="grid grid-cols-3 gap-6">
        {plans.map((plan: any, index: number) => (
          <div key={plan.type + index} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Heart className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{plan.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{plan.type}</p>
            <p className="text-2xl font-bold text-gray-900 mb-2">₹{plan.premium?.toLocaleString('en-IN')}</p>
            <p className="text-sm text-gray-500 mb-4">per month</p>
            <ul className="space-y-2 mb-4">
              {plan.features?.slice(0, 3).map((feature: string, i: number) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
            <button className="w-full py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
              Enroll
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TRAINING VIEW
// ============================================================

function TrainingView({ courses }: { courses: any[] }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Training & Development</h1>

      <div className="grid grid-cols-3 gap-6">
        {courses.map((course: any) => (
          <div key={course.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <GraduationCap className="w-12 h-12 text-white" />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  course.level === 'beginner' ? 'bg-green-100 text-green-700' :
                  course.level === 'advanced' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {course.level}
                </span>
                <span className="text-xs text-gray-500">{course.duration}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{course.title}</h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{course.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium">{course.rating || 4.5}</span>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  Enroll
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// EXPENSES VIEW
// ============================================================

function ExpensesView() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Submit Expense</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Select category</option>
              <option value="travel">Travel</option>
              <option value="meals">Meals</option>
              <option value="accommodation">Accommodation</option>
              <option value="office_supplies">Office Supplies</option>
              <option value="software">Software</option>
              <option value="training">Training</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input type="number" placeholder="₹0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" placeholder="Expense description" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Submit Expense
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ORG VIEW
// ============================================================

function OrgView({ chart }: { chart: any }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Organization</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Org Chart</h3>
        <div className="text-center py-8">
          <div className="inline-block bg-blue-100 rounded-lg p-4 mb-4">
            <p className="font-semibold text-blue-900">{chart?.title || 'CEO'}</p>
            <p className="text-sm text-blue-700">{chart?.department || 'Executive'}</p>
          </div>
          <p className="text-gray-500">Organization chart visualization coming soon</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ANALYTICS VIEW
// ============================================================

function AnalyticsView() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Headcount Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[
                { month: 'Jan', value: 85 },
                { month: 'Feb', value: 88 },
                { month: 'Mar', value: 90 },
                { month: 'Apr', value: 93 },
                { month: 'May', value: 97 },
                { month: 'Jun', value: 100 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Department Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { dept: 'Engineering', value: 55 },
                { dept: 'Sales', value: 20 },
                { dept: 'Marketing', value: 12 },
                { dept: 'Finance', value: 8 },
                { dept: 'Operations', value: 5 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dept" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COPILOT VIEW
// ============================================================

function CopilotView({
  message,
  setMessage,
  response,
  onSend,
  loading,
}: {
  message: string;
  setMessage: (msg: string) => void;
  response: any;
  onSend: () => void;
  loading: boolean;
}) {
  const suggestions = [
    'How much leave do I have?',
    'Show my latest payslip',
    'What are the WFH policies?',
    'Enroll in health insurance',
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">AI HR Copilot</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        {/* Suggestions */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-3">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setMessage(suggestion)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Input */}
        <div className="flex gap-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSend()}
            placeholder="Ask me anything about HR..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={onSend}
            disabled={loading || !message.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </div>

        {/* Response */}
        {response && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Bot className="w-6 h-6 text-blue-600 mt-1" />
              <div className="flex-1">
                <p className="text-gray-900 whitespace-pre-wrap">{response.response}</p>
                {response.actions?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Quick Actions:</p>
                    {response.actions.map((action: any, i: number) => (
                      <button
                        key={i}
                        className="block w-full text-left px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Add Star icon to imports
function Star({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

/**
 * PeopleOS State Store (Zustand)
 *
 * Global state management for PeopleOS
 */

import { create } from 'zustand';

// Types
interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  position: string;
  role: 'employee' | 'manager' | 'hr' | 'admin';
}

interface LeaveBalance {
  casual: number;
  sick: number;
  earned: number;
  parental: number;
  bereavement: number;
  lop: number;
}

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Leave Balance (cached)
  leaveBalance: LeaveBalance | null;
  setLeaveBalance: (balance: LeaveBalance | null) => void;

  // Attendance
  checkedIn: boolean;
  checkInTime: string | null;
  setCheckedIn: (checked: boolean, time?: string) => void;

  // Active Tab
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Loading States
  loading: Record<string, boolean>;
  setLoading: (key: string, loading: boolean) => void;

  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>;
  addNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  removeNotification: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
  // User
  user: null,
  setUser: (user) => set({ user }),

  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Leave Balance
  leaveBalance: null,
  setLeaveBalance: (balance) => set({ leaveBalance: balance }),

  // Attendance
  checkedIn: false,
  checkInTime: null,
  setCheckedIn: (checked, time) => set({
    checkedIn: checked,
    checkInTime: time || null
  }),

  // Active Tab
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Loading
  loading: {},
  setLoading: (key, isLoading) => set((state) => ({
    loading: { ...state.loading, [key]: isLoading }
  })),

  // Notifications
  notifications: [],
  addNotification: (type, message) => set((state) => ({
    notifications: [
      ...state.notifications,
      {
        id: `notif-${Date.now()}`,
        type,
        message,
        timestamp: Date.now()
      }
    ]
  })),
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
}));

// Demo user for testing
export const demoUser: User = {
  id: 'EMP001',
  employeeId: 'EMP001',
  name: 'Rajesh Kumar',
  email: 'rajesh.kumar@rtmn.com',
  department: 'Engineering',
  position: 'Senior Software Engineer',
  role: 'employee'
};

export const demoManager: User = {
  id: 'EMP003',
  employeeId: 'EMP003',
  name: 'Amit Patel',
  email: 'amit.patel@rtmn.com',
  department: 'Engineering',
  position: 'Engineering Manager',
  role: 'manager'
};

export const demoHR: User = {
  id: 'EMP005',
  employeeId: 'EMP005',
  name: 'Vikram Singh',
  email: 'vikram.singh@rtmn.com',
  department: 'Human Resources',
  position: 'HR Manager',
  role: 'hr'
};

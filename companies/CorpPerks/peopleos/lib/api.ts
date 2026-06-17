/**
 * PeopleOS API Client
 *
 * Connects to RTMN Workforce OS services:
 * - Workforce OS Core (5065) - Employee, Leave, Attendance, Payroll, Benefits
 * - Learning OS (5068) - Training, Skills, Certifications
 * - Organization OS (5072) - Org Chart, Headcount
 * - Workforce Intelligence (5073) - Analytics, Insights
 */

import axios, { AxiosInstance } from 'axios';

// API Base URLs
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5065';
const LEARNING_URL = process.env.NEXT_PUBLIC_LEARNING_API_URL || 'http://localhost:5068';
const ORG_URL = process.env.NEXT_PUBLIC_ORG_API_URL || 'http://localhost:5072';
const INTELLIGENCE_URL = process.env.NEXT_PUBLIC_INTELLIGENCE_API_URL || 'http://localhost:5073';

// Create axios instances with defaults
const createClient = (baseURL: string): AxiosInstance => {
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// API Clients
export const workforceApi = createClient(API_URL);
export const learningApi = createClient(LEARNING_URL);
export const orgApi = createClient(ORG_URL);
export const intelligenceApi = createClient(INTELLIGENCE_URL);

// ============================================================
// EMPLOYEE MODULE
// ============================================================

export const employeeApi = {
  // List employees with filters
  list: async (params?: {
    status?: string;
    department?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const { data } = await workforceApi.get('/api/employees', { params });
    return data;
  },

  // Get single employee
  get: async (id: string) => {
    const { data } = await workforceApi.get(`/api/employees/${id}`);
    return data;
  },

  // Create employee
  create: async (employee: any) => {
    const { data } = await workforceApi.post('/api/employees', employee);
    return data;
  },

  // Update employee
  update: async (id: string, updates: any) => {
    const { data } = await workforceApi.patch(`/api/employees/${id}`, updates);
    return data;
  },

  // Terminate employee
  terminate: async (id: string) => {
    const { data } = await workforceApi.delete(`/api/employees/${id}`);
    return data;
  },

  // Get direct reports
  getDirectReports: async (id: string) => {
    const { data } = await workforceApi.get(`/api/employees/${id}/direct-reports`);
    return data;
  },
};

// ============================================================
// DEPARTMENTS MODULE
// ============================================================

export const departmentApi = {
  list: async () => {
    const { data } = await workforceApi.get('/api/departments');
    return data;
  },

  create: async (department: any) => {
    const { data } = await workforceApi.post('/api/departments', department);
    return data;
  },
};

// ============================================================
// LEAVE MANAGEMENT
// ============================================================

export const leaveApi = {
  // Get leave types
  getTypes: async () => {
    const { data } = await workforceApi.get('/api/leave/types');
    return data;
  },

  // Get employee leave balance
  getBalance: async (employeeId: string) => {
    const { data } = await workforceApi.get(`/api/leave/balance/${employeeId}`);
    return data;
  },

  // Request leave
  request: async (request: {
    employeeId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }) => {
    const { data } = await workforceApi.post('/api/leave/request', request);
    return data;
  },

  // List leave requests
  listRequests: async (params?: {
    employeeId?: string;
    status?: string;
    leaveType?: string;
  }) => {
    const { data } = await workforceApi.get('/api/leave/requests', { params });
    return data;
  },

  // Approve/reject leave
  updateRequest: async (id: string, status: 'approved' | 'rejected', notes?: string) => {
    const { data } = await workforceApi.patch(`/api/leave/requests/${id}`, { status, managerNotes: notes });
    return data;
  },
};

// ============================================================
// ATTENDANCE MODULE
// ============================================================

export const attendanceApi = {
  // Check in
  checkIn: async (data: { employeeId: string; location?: string; device?: string }) => {
    const response = await workforceApi.post('/api/attendance/checkin', data);
    return response.data;
  },

  // Check out
  checkOut: async (employeeId: string) => {
    const { data } = await workforceApi.post('/api/attendance/checkout', { employeeId });
    return data;
  },

  // Get attendance records
  getRecords: async (employeeId: string, params?: { startDate?: string; endDate?: string }) => {
    const { data } = await workforceApi.get(`/api/attendance/${employeeId}`, { params });
    return data;
  },
};

// ============================================================
// PAYROLL MODULE
// ============================================================

export const payrollApi = {
  // Get payroll records
  listRecords: async (params?: {
    employeeId?: string;
    month?: string;
    year?: string;
    status?: string;
  }) => {
    const { data } = await workforceApi.get('/api/payroll/records', { params });
    return data;
  },

  // Calculate payroll
  calculate: async (data: { employeeId: string; month: string; year: string }) => {
    const response = await workforceApi.post('/api/payroll/calculate', data);
    return response.data;
  },

  // Process payroll batch
  processBatch: async (month: string, year: string) => {
    const { data } = await workforceApi.post('/api/payroll/process', { month, year });
    return data;
  },

  // Get payroll runs
  getRuns: async () => {
    const { data } = await workforceApi.get('/api/payroll/runs');
    return data;
  },
};

// ============================================================
// BENEFITS MODULE
// ============================================================

export const benefitsApi = {
  // Get available plans
  getPlans: async () => {
    const { data } = await workforceApi.get('/api/benefits/plans');
    return data;
  },

  // Get enrollments
  getEnrollments: async (employeeId?: string) => {
    const { data } = await workforceApi.get('/api/benefits/enrollments', {
      params: { employeeId }
    });
    return data;
  },

  // Enroll in plan
  enroll: async (data: {
    employeeId: string;
    planType: string;
    planId: string;
    dependents?: any[];
  }) => {
    const response = await workforceApi.post('/api/benefits/enroll', data);
    return response.data;
  },
};

// ============================================================
// EXPENSES MODULE
// ============================================================

export const expensesApi = {
  // Get expense categories
  getCategories: async () => {
    const { data } = await workforceApi.get('/api/expenses/categories');
    return data;
  },

  // Submit expense
  submit: async (data: {
    employeeId: string;
    category: string;
    description: string;
    amount: number;
    date: string;
    receipt?: string;
  }) => {
    const response = await workforceApi.post('/api/expenses', data);
    return response.data;
  },

  // List expenses
  list: async (params?: { employeeId?: string; status?: string; category?: string }) => {
    const { data } = await workforceApi.get('/api/expenses', { params });
    return data;
  },

  // Approve expense
  approve: async (id: string, approverId: string) => {
    const { data } = await workforceApi.post(`/api/expenses/${id}/approve`, { approverId });
    return data;
  },
};

// ============================================================
// TRAINING & LEARNING MODULE
// ============================================================

export const trainingApi = {
  // Get courses
  getCourses: async (params?: {
    category?: string;
    type?: string;
    level?: string;
    search?: string;
  }) => {
    const { data } = await learningApi.get('/api/courses', { params });
    return data;
  },

  // Get course details
  getCourse: async (id: string) => {
    const { data } = await learningApi.get(`/api/courses/${id}`);
    return data;
  },

  // Enroll in course
  enroll: async (courseId: string, employeeId: string) => {
    const { data } = await learningApi.post(`/api/courses/${courseId}/enroll`, { employeeId });
    return data;
  },

  // Get my enrollments
  getMyEnrollments: async (employeeId: string) => {
    const { data } = await learningApi.get('/api/enrollments', { params: { employeeId } });
    return data;
  },

  // Update progress
  updateProgress: async (enrollmentId: string, progress: number, currentModule: number) => {
    const { data } = await learningApi.patch(`/api/enrollments/${enrollmentId}/progress`, { progress, currentModule });
    return data;
  },

  // Get learning paths
  getLearningPaths: async () => {
    const { data } = await learningApi.get('/api/learning/paths');
    return data;
  },

  // Get skills
  getSkills: async (employeeId: string) => {
    const { data } = await learningApi.get(`/api/skills/${employeeId}`);
    return data;
  },

  // Get skills graph
  getSkillsGraph: async () => {
    const { data } = await learningApi.get('/api/skills/graph');
    return data;
  },

  // Get certifications
  getCertifications: async (employeeId: string) => {
    const { data } = await learningApi.get(`/api/certifications/${employeeId}`);
    return data;
  },

  // AI recommendations
  getRecommendations: async (employeeId: string) => {
    const { data } = await learningApi.post('/api/ai/recommendations', { employeeId });
    return data;
  },
};

// ============================================================
// ORGANIZATION MODULE
// ============================================================

export const organizationApi = {
  // Get org chart
  getOrgChart: async () => {
    const { data } = await orgApi.get('/api/org/chart');
    return data;
  },

  // Get employee org position
  getOrgPosition: async (employeeId: string) => {
    const { data } = await orgApi.get(`/api/org/chart/${employeeId}`);
    return data;
  },

  // Get headcount
  getHeadcount: async (params?: { department?: string }) => {
    const { data } = await orgApi.get('/api/headcount', { params });
    return data;
  },

  // Get positions
  getPositions: async () => {
    const { data } = await orgApi.get('/api/positions');
    return data;
  },
};

// ============================================================
// ANALYTICS MODULE
// ============================================================

export const analyticsApi = {
  // Get HR dashboard
  getDashboard: async () => {
    const { data } = await workforceApi.get('/api/analytics/dashboard');
    return data;
  },

  // Get CEO overview
  getOverview: async () => {
    const { data } = await intelligenceApi.get('/api/analytics/overview');
    return data;
  },

  // Get HR dashboard
  getHRDashboard: async () => {
    const { data } = await intelligenceApi.get('/api/analytics/hr-dashboard');
    return data;
  },

  // Get org health
  getOrgHealth: async () => {
    const { data } = await intelligenceApi.get('/api/analytics/health');
    return data;
  },
};

// ============================================================
// PREDICTIONS MODULE
// ============================================================

export const predictionsApi = {
  // Get attrition predictions
  getAttrition: async () => {
    const { data } = await intelligenceApi.get('/api/predictions/attrition');
    return data;
  },

  // Get flight risk
  getFlightRisk: async (minRisk: number = 50) => {
    const { data } = await intelligenceApi.get('/api/predictions/flight-risk', {
      params: { minRisk }
    });
    return data;
  },

  // Get burnout predictions
  getBurnout: async () => {
    const { data } = await intelligenceApi.get('/api/predictions/burnout');
    return data;
  },
};

// ============================================================
// AI COPILOT
// ============================================================

export const copilotApi = {
  // Chat with HR copilot
  chat: async (message: string, employeeId?: string, context?: any) => {
    const { data } = await workforceApi.post('/api/copilot/chat', {
      message,
      employeeId,
      context,
    });
    return data;
  },
};

// ============================================================
// INTELLIGENCE MODULE
// ============================================================

export const intelligenceApiModule = {
  // Get sentiment
  getSentiment: async () => {
    const { data } = await intelligenceApi.get('/api/intelligence/sentiment');
    return data;
  },

  // Get culture intelligence
  getCulture: async () => {
    const { data } = await intelligenceApi.get('/api/intelligence/culture');
    return data;
  },

  // Get skills intelligence
  getSkills: async () => {
    const { data } = await intelligenceApi.get('/api/intelligence/skills');
    return data;
  },

  // Get insights cards
  getInsights: async () => {
    const { data } = await intelligenceApi.get('/api/insights/cards');
    return data;
  },

  // Get recommendations
  getRecommendations: async () => {
    const { data } = await intelligenceApi.get('/api/insights/recommendations');
    return data;
  },

  // Get alerts
  getAlerts: async (params?: { severity?: string; type?: string }) => {
    const { data } = await intelligenceApi.get('/api/analytics/alerts', { params });
    return data;
  },
};

export default {
  employee: employeeApi,
  department: departmentApi,
  leave: leaveApi,
  attendance: attendanceApi,
  payroll: payrollApi,
  benefits: benefitsApi,
  expenses: expensesApi,
  training: trainingApi,
  organization: organizationApi,
  analytics: analyticsApi,
  predictions: predictionsApi,
  copilot: copilotApi,
  intelligence: intelligenceApiModule,
};

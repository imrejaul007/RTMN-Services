/**
 * RTMN TwinOS Hub Integration
 *
 * Syncs Workforce OS data with TwinOS Hub (Port 4705)
 * for Digital Twins synchronization
 */

import axios from 'axios';

const TWINOS_URL = process.env.TWINOS_URL || 'http://localhost:4705';

// Twin types for Workforce OS
export const TWIN_TYPES = {
  EMPLOYEE: 'employee',
  PAYROLL: 'payroll',
  LEAVE: 'leave',
  ATTENDANCE: 'attendance',
  BENEFITS: 'benefits',
  SKILLS: 'skills',
  POSITION: 'position',
  DEPARTMENT: 'department',
  TRAINING: 'training',
  PERFORMANCE: 'performance',
  CANDIDATE: 'candidate',
  COMPLIANCE: 'compliance',
};

// TwinOS Client
class TwinOSClient {
  constructor() {
    this.baseURL = TWINOS_URL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 5000,
    });
    this.connected = false;
  }

  async healthCheck() {
    try {
      const { data } = await this.client.get('/health');
      this.connected = data.status === 'healthy';
      return this.connected;
    } catch (error) {
      this.connected = false;
      console.warn('TwinOS Hub not available');
      return false;
    }
  }

  // Create or update twin
  async upsertTwin(twinType, entityId, data) {
    if (!this.connected) {
      console.warn('TwinOS not connected, skipping twin sync');
      return null;
    }

    try {
      const { result } = await this.client.post('/api/twins/upsert', {
        type: twinType,
        entityId,
        data,
        source: 'workforce-os',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      console.error('Twin upsert failed:', error.message);
      return null;
    }
  }

  // Get twin by entity ID
  async getTwin(twinType, entityId) {
    if (!this.connected) {
      return null;
    }

    try {
      const { data } = await this.client.get(`/api/twins/${twinType}/${entityId}`);
      return data;
    } catch (error) {
      return null;
    }
  }

  // Sync all twins of a type
  async syncAll(twinType, entities) {
    if (!this.connected) {
      console.warn('TwinOS not connected, skipping bulk sync');
      return null;
    }

    try {
      const twins = entities.map(entity => ({
        type: twinType,
        entityId: entity.id || entity._id,
        data: entity,
        source: 'workforce-os',
        timestamp: new Date().toISOString(),
      }));

      const { data } = await this.client.post('/api/twins/bulk', { twins });
      return data;
    } catch (error) {
      console.error('Bulk sync failed:', error.message);
      return null;
    }
  }

  // Delete twin
  async deleteTwin(twinType, entityId) {
    if (!this.connected) {
      return null;
    }

    try {
      await this.client.delete(`/api/twins/${twinType}/${entityId}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Search twins
  async search(query) {
    if (!this.connected) {
      return [];
    }

    try {
      const { data } = await this.client.get('/api/twins/search', { params: query });
      return data.twins || [];
    } catch (error) {
      return [];
    }
  }
}

export const twinOSClient = new TwinOSClient();

// Twin Sync Service
class TwinSyncService {
  constructor() {
    this.client = twinOSClient;
  }

  // Sync employee twin
  async syncEmployee(employee) {
    const twinData = {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      name: `${employee.firstName} ${employee.lastName}`,
      email: employee.email,
      phone: employee.phone,
      department: employee.departmentId,
      position: employee.positionId,
      manager: employee.managerId,
      employmentType: employee.employmentType,
      status: employee.status,
      workLocation: employee.workLocation,
      joiningDate: employee.joiningDate,
      skills: employee.skills || [],
      certifications: employee.certifications || [],
      avatar: employee.avatar,
      salary: employee.salary,
    };

    return this.client.upsertTwin(TWIN_TYPES.EMPLOYEE, employee.id, twinData);
  }

  // Sync payroll twin
  async syncPayroll(employeeId, payrollRecord) {
    const twinData = {
      employeeId,
      month: payrollRecord.month,
      year: payrollRecord.year,
      earnings: payrollRecord.earnings,
      deductions: payrollRecord.deductions,
      gross: payrollRecord.gross,
      netPay: payrollRecord.netPay,
      status: payrollRecord.status,
    };

    return this.client.upsertTwin(TWIN_TYPES.PAYROLL, payrollRecord.id, twinData);
  }

  // Sync leave twin
  async syncLeave(employeeId, leaveBalance) {
    const twinData = {
      employeeId,
      casual: leaveBalance.casual,
      sick: leaveBalance.sick,
      earned: leaveBalance.earned,
      parental: leaveBalance.parental,
      bereavement: leaveBalance.bereavement,
      lop: leaveBalance.lop,
      lastUpdated: leaveBalance.lastUpdated,
    };

    return this.client.upsertTwin(TWIN_TYPES.LEAVE, employeeId, twinData);
  }

  // Sync attendance twin
  async syncAttendance(employeeId, attendanceRecord) {
    const twinData = {
      employeeId,
      date: attendanceRecord.date,
      checkIn: attendanceRecord.checkIn,
      checkOut: attendanceRecord.checkOut,
      location: attendanceRecord.location,
      hours: attendanceRecord.checkOut && attendanceRecord.checkIn
        ? (new Date(attendanceRecord.checkOut) - new Date(attendanceRecord.checkIn)) / 3600000
        : 0,
    };

    return this.client.upsertTwin(TWIN_TYPES.ATTENDANCE, `${employeeId}-${attendanceRecord.date}`, twinData);
  }

  // Sync benefits twin
  async syncBenefits(employeeId, enrollments) {
    const twinData = {
      employeeId,
      enrollments: enrollments.map(e => ({
        planType: e.planType,
        planId: e.planId,
        status: e.status,
        enrolledAt: e.enrolledAt,
      })),
    };

    return this.client.upsertTwin(TWIN_TYPES.BENEFITS, employeeId, twinData);
  }

  // Sync skills twin
  async syncSkills(employeeId, skills) {
    const twinData = {
      employeeId,
      skills: skills.map(s => ({
        name: s.name,
        level: s.level,
        endorsements: s.endorsements || 0,
      })),
      lastUpdated: new Date().toISOString(),
    };

    return this.client.upsertTwin(TWIN_TYPES.SKILLS, employeeId, twinData);
  }

  // Sync training twin
  async syncTraining(employeeId, enrollments, certifications) {
    const twinData = {
      employeeId,
      enrollments: enrollments.map(e => ({
        courseId: e.courseId,
        courseName: e.courseName,
        progress: e.progress,
        status: e.status,
      })),
      certifications: certifications.map(c => ({
        name: c.name,
        provider: c.provider,
        obtainedAt: c.obtainedAt,
        validUntil: c.validUntil,
      })),
    };

    return this.client.upsertTwin(TWIN_TYPES.TRAINING, employeeId, twinData);
  }

  // Sync performance twin
  async syncPerformance(employeeId, reviews, goals) {
    const twinData = {
      employeeId,
      reviews: reviews.map(r => ({
        cycle: r.cycle,
        rating: r.rating,
        status: r.status,
      })),
      goals: goals.map(g => ({
        title: g.title,
        progress: g.progress,
        status: g.status,
      })),
      lastUpdated: new Date().toISOString(),
    };

    return this.client.upsertTwin(TWIN_TYPES.PERFORMANCE, employeeId, twinData);
  }

  // Sync candidate twin
  async syncCandidate(candidate) {
    const twinData = {
      id: candidate.id,
      name: `${candidate.firstName} ${candidate.lastName}`,
      email: candidate.email,
      phone: candidate.phone,
      currentCompany: candidate.currentCompany,
      currentTitle: candidate.currentTitle,
      experience: candidate.experience,
      skills: candidate.skills || [],
      score: candidate.score,
      status: candidate.status,
      stage: candidate.stage,
      source: candidate.source,
    };

    return this.client.upsertTwin(TWIN_TYPES.CANDIDATE, candidate.id, twinData);
  }

  // Sync all employees
  async syncAllEmployees(employees) {
    const twins = employees.map(emp => ({
      type: TWIN_TYPES.EMPLOYEE,
      entityId: emp.id,
      data: {
        id: emp.id,
        employeeNumber: emp.employeeNumber,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
        department: emp.departmentId,
        position: emp.positionId,
        status: emp.status,
        employmentType: emp.employmentType,
        skills: emp.skills || [],
      },
      source: 'workforce-os',
      timestamp: new Date().toISOString(),
    }));

    return this.client.syncAll(TWIN_TYPES.EMPLOYEE, twins);
  }

  // Delete employee twin
  async deleteEmployee(employeeId) {
    return this.client.deleteTwin(TWIN_TYPES.EMPLOYEE, employeeId);
  }
}

export const twinSyncService = new TwinSyncService();

// Initialize twin sync
export async function initializeTwinSync() {
  const connected = await twinOSClient.healthCheck();
  console.log(`TwinOS Hub connected: ${connected}`);
  return connected;
}

export default {
  twinOSClient,
  twinSyncService,
  TWIN_TYPES,
  initializeTwinSync,
};

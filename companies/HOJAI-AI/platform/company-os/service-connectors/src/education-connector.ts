/**
 * Education Service Connector
 *
 * Connects to education services for schools and training centers.
 */

import { BaseConnector, ServiceResponse } from './base-connector';
import { TenantContext } from './shared/types';

// ============================================
// Service URLs
// ============================================

const EDUCATION_SERVICES = {
  lms: process.env.EDU_LMS_URL || 'http://localhost:3070',
  enrollment: process.env.EDU_ENROLLMENT_URL || 'http://localhost:3071',
  assessment: process.env.EDU_ASSESSMENT_URL || 'http://localhost:3072',
  certificates: process.env.EDU_CERTIFICATES_URL || 'http://localhost:3073',
  payments: process.env.EDU_PAYMENTS_URL || 'http://localhost:3074',
};

// ============================================
// Types
// ============================================

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  enrollmentDate: string;
  status: 'active' | 'inactive' | 'graduated' | 'suspended';
}

export interface Course {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: number; // hours
  fee: number;
  maxStudents: number;
  currentStudents: number;
  prerequisites?: string[];
  syllabus: string[];
  isActive: boolean;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: string;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
  progress: number; // percentage
  completionDate?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  courseId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string;
  maxMarks: number;
  submissions: {
    studentId: string;
    marks?: number;
    submittedAt: string;
    feedback?: string;
  }[];
}

export interface Certificate {
  id: string;
  studentId: string;
  courseId: string;
  certificateNumber: string;
  issuedAt: string;
  verificationCode: string;
  pdfUrl?: string;
}

// ============================================
// Education Connector
// ============================================

export class EducationConnector {
  private lmsService: BaseConnector;
  private enrollmentService: BaseConnector;
  private assessmentService: BaseConnector;
  private certificatesService: BaseConnector;
  private paymentsService: BaseConnector;
  private tenant?: TenantContext;

  constructor(tenant?: TenantContext) {
    this.lmsService = new BaseConnector({ baseUrl: EDUCATION_SERVICES.lms });
    this.enrollmentService = new BaseConnector({ baseUrl: EDUCATION_SERVICES.enrollment });
    this.assessmentService = new BaseConnector({ baseUrl: EDUCATION_SERVICES.assessment });
    this.certificatesService = new BaseConnector({ baseUrl: EDUCATION_SERVICES.certificates });
    this.paymentsService = new BaseConnector({ baseUrl: EDUCATION_SERVICES.payments });

    if (tenant) this.setTenant(tenant);
  }

  setTenant(tenant: TenantContext): void {
    this.tenant = tenant;
    this.lmsService.setTenant(tenant);
    this.enrollmentService.setTenant(tenant);
    this.assessmentService.setTenant(tenant);
    this.certificatesService.setTenant(tenant);
    this.paymentsService.setTenant(tenant);
  }

  // ========================================
  // STUDENT OPERATIONS
  // ========================================

  async createStudent(student: Omit<Student, 'id'>): Promise<ServiceResponse<Student>> {
    return this.lmsService.post<Student>('/api/students', student);
  }

  async getStudent(id: string): Promise<ServiceResponse<Student>> {
    return this.lmsService.get<Student>(`/api/students/${id}`);
  }

  async listStudents(filters?: { status?: string }): Promise<ServiceResponse<Student[]>> {
    const query = filters?.status ? `?status=${filters.status}` : '';
    return this.lmsService.get<Student[]>(`/api/students${query}`);
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<ServiceResponse<Student>> {
    return this.lmsService.put<Student>(`/api/students/${id}`, updates);
  }

  // ========================================
  // COURSE OPERATIONS
  // ========================================

  async createCourse(course: Omit<Course, 'id'>): Promise<ServiceResponse<Course>> {
    return this.lmsService.post<Course>('/api/courses', course);
  }

  async getCourse(id: string): Promise<ServiceResponse<Course>> {
    return this.lmsService.get<Course>(`/api/courses/${id}`);
  }

  async listCourses(filters?: { category?: string; isActive?: boolean }): Promise<ServiceResponse<Course[]>> {
    const query = new URLSearchParams(filters as any).toString();
    return this.lmsService.get<Course[]>(`/api/courses${query ? `?${query}` : ''}`);
  }

  async updateCourse(id: string, updates: Partial<Course>): Promise<ServiceResponse<Course>> {
    return this.lmsService.put<Course>(`/api/courses/${id}`, updates);
  }

  // ========================================
  // ENROLLMENT OPERATIONS
  // ========================================

  async enrollStudent(enrollment: {
    studentId: string;
    courseId: string;
  }): Promise<ServiceResponse<Enrollment>> {
    return this.enrollmentService.post<Enrollment>('/api/enrollments', enrollment);
  }

  async getEnrollment(id: string): Promise<ServiceResponse<Enrollment>> {
    return this.enrollmentService.get<Enrollment>(`/api/enrollments/${id}`);
  }

  async listEnrollments(filters?: { studentId?: string; courseId?: string; status?: string }): Promise<ServiceResponse<Enrollment[]>> {
    const query = new URLSearchParams(filters as any).toString();
    return this.enrollmentService.get<Enrollment[]>(`/api/enrollments${query ? `?${query}` : ''}`);
  }

  async updateProgress(id: string, progress: number): Promise<ServiceResponse<Enrollment>> {
    return this.enrollmentService.patch<Enrollment>(`/api/enrollments/${id}/progress`, { progress });
  }

  // ========================================
  // ATTENDANCE OPERATIONS
  // ========================================

  async markAttendance(attendance: {
    studentId: string;
    courseId: string;
    date: string;
    status: Attendance['status'];
  }): Promise<ServiceResponse<Attendance>> {
    return this.lmsService.post<Attendance>('/api/attendance', attendance);
  }

  async getAttendance(courseId: string, date: string): Promise<ServiceResponse<Attendance[]>> {
    return this.lmsService.get<Attendance[]>(`/api/attendance?courseId=${courseId}&date=${date}`);
  }

  async getStudentAttendance(studentId: string, courseId?: string): Promise<ServiceResponse<Attendance[]>> {
    const query = courseId ? `?courseId=${courseId}` : '';
    return this.lmsService.get<Attendance[]>(`/api/students/${studentId}/attendance${query}`);
  }

  // ========================================
  // ASSESSMENT OPERATIONS
  // ========================================

  async createAssignment(assignment: {
    courseId: string;
    title: string;
    description: string;
    dueDate: string;
    maxMarks: number;
  }): Promise<ServiceResponse<Assignment>> {
    return this.assessmentService.post<Assignment>('/api/assignments', assignment);
  }

  async submitAssignment(assignmentId: string, studentId: string): Promise<ServiceResponse<{ submittedAt: string }>> {
    return this.assessmentService.post<{ submittedAt: string }>(
      `/api/assignments/${assignmentId}/submit`,
      { studentId }
    );
  }

  async gradeSubmission(assignmentId: string, studentId: string, marks: number, feedback?: string): Promise<ServiceResponse<Assignment>> {
    return this.assessmentService.patch<Assignment>(
      `/api/assignments/${assignmentId}/grade`,
      { studentId, marks, feedback }
    );
  }

  // ========================================
  // CERTIFICATE OPERATIONS
  // ========================================

  async issueCertificate(certificate: {
    studentId: string;
    courseId: string;
  }): Promise<ServiceResponse<Certificate>> {
    return this.certificatesService.post<Certificate>('/api/certificates', certificate);
  }

  async getCertificate(id: string): Promise<ServiceResponse<Certificate>> {
    return this.certificatesService.get<Certificate>(`/api/certificates/${id}`);
  }

  async verifyCertificate(code: string): Promise<ServiceResponse<Certificate | null>> {
    return this.certificatesService.get<Certificate>(`/api/certificates/verify/${code}`);
  }

  // ========================================
  // PAYMENT OPERATIONS
  // ========================================

  async recordPayment(payment: {
    studentId: string;
    courseId?: string;
    amount: number;
    method: 'cash' | 'card' | 'upi' | 'bank_transfer';
    reference?: string;
  }): Promise<ServiceResponse<{ receiptId: string; amount: number }>> {
    return this.paymentsService.post<{ receiptId: string; amount: number }>('/api/payments', payment);
  }

  async getStudentPayments(studentId: string): Promise<ServiceResponse<any[]>> {
    return this.paymentsService.get<any[]>(`/api/payments?studentId=${studentId}`);
  }

  // ========================================
  // HEALTH CHECK
  // ========================================

  async healthCheck(): Promise<Record<string, string>> {
    const checks = await Promise.all([
      this.lmsService.healthCheck(),
      this.enrollmentService.healthCheck(),
      this.assessmentService.healthCheck(),
      this.certificatesService.healthCheck(),
      this.paymentsService.healthCheck(),
    ]);

    return {
      lms: checks[0].status,
      enrollment: checks[1].status,
      assessment: checks[2].status,
      certificates: checks[3].status,
      payments: checks[4].status,
    };
  }
}

export function createEducationConnector(tenant?: TenantContext): EducationConnector {
  return new EducationConnector(tenant);
}

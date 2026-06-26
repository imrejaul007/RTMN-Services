/**
 * Employee Types for Employee Twin Service
 */

/**
 * Employee status
 */
export type EmployeeStatus = 'onboarding' | 'active' | 'inactive' | 'terminated';

/**
 * Employee type
 */
export type EmployeeType = 'full_time' | 'part_time' | 'contractor' | 'intern';

/**
 * Employee level
 */
export type EmployeeLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8' | 'L9' | 'L10';

/**
 * Employee location
 */
export interface EmployeeLocation {
  city?: string;
  state?: string;
  country: string;
  remote: boolean;
  timezone?: string;
}

/**
 * Employee compensation
 */
export interface EmployeeCompensation {
  salary: number;
  currency: string;
  bonus: number;
  stock?: number;
}

/**
 * Employee health metrics
 */
export interface EmployeeHealth {
  overall: number;      // 0-100
  engagement: number;  // 0-100
  productivity: number; // 0-100
  satisfaction: number; // 0-100
}

/**
 * Employee skill
 */
export interface EmployeeSkill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
  certified?: boolean;
  lastUsed?: string;
}

/**
 * Employee certification
 */
export interface EmployeeCertification {
  id: string;
  name: string;
  issuer: string;
  issuedAt: string;
  expiresAt?: string;
  verified: boolean;
}

/**
 * Employee emergency contact
 */
export interface EmployeeEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

/**
 * Employee performance review
 */
export interface EmployeePerformance {
  id: string;
  employeeId: string;
  reviewDate: string;
  reviewerId: string;
  rating: number;        // 1-5
  strengths: string[];
  improvements: string[];
  goals: string[];
  comments?: string;
}

/**
 * Primary Employee interface
 */
export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  title: string;
  level: EmployeeLevel;
  manager?: string | null;
  status: EmployeeStatus;
  type: EmployeeType;
  location: EmployeeLocation;
  compensation: EmployeeCompensation;
  hireDate: string;
  startDate?: string | null;
  skills: string[];
  languages?: string[];
  emergencyContact?: EmployeeEmergencyContact;
  certifications?: EmployeeCertification[];
  health: EmployeeHealth;
  metadata?: Record<string, any>;
  avatar?: string;
  bio?: string;
  timezone?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Employee summary (for listings)
 */
export interface EmployeeSummary {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  title: string;
  level: EmployeeLevel;
  status: EmployeeStatus;
  avatar?: string;
}

/**
 * Employee list response
 */
export interface EmployeeListResponse {
  employees: EmployeeSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * Create employee request
 */
export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department?: string;
  title?: string;
  level?: EmployeeLevel;
  type?: EmployeeType;
  hireDate?: string;
  location?: Partial<EmployeeLocation>;
  compensation?: Partial<EmployeeCompensation>;
  skills?: string[];
  languages?: string[];
  manager?: string;
}

/**
 * Update employee request
 */
export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  department?: string;
  title?: string;
  level?: EmployeeLevel;
  manager?: string | null;
  status?: EmployeeStatus;
  type?: EmployeeType;
  location?: Partial<EmployeeLocation>;
  compensation?: Partial<EmployeeCompensation>;
  skills?: string[];
  languages?: string[];
  emergencyContact?: Partial<EmployeeEmergencyContact>;
  metadata?: Record<string, any>;
}

/**
 * Employee search filters
 */
export interface EmployeeSearchFilters {
  department?: string;
  status?: EmployeeStatus;
  type?: EmployeeType;
  level?: EmployeeLevel;
  search?: string;
  manager?: string;
  location?: string;
  skills?: string[];
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  accountType: 'checking' | 'savings';
}

export interface PayStructure {
  baseSalary: number;
  payFrequency: 'weekly' | 'biweekly' | 'monthly' | 'semimonthly';
  currency: string;
  overtimeEligible: boolean;
  overtimeRate?: number;
}

export interface BenefitsPackage {
  healthInsurance: {
    provider: string;
    planName: string;
    coverageType: 'individual' | 'family' | 'spouse';
    monthlyPremium: number;
    deductible: number;
  };
  dentalInsurance?: {
    provider: string;
    planName: string;
    monthlyPremium: number;
  };
  visionInsurance?: {
    provider: string;
    planName: string;
    monthlyPremium: number;
  };
  lifeInsurance?: {
    provider: string;
    coverageAmount: number;
    monthlyPremium: number;
  };
  retirement401k?: {
    provider: string;
    contributionPercentage: number;
    employerMatch: number;
  };
}

export interface LeaveBalance {
  type: 'vacation' | 'sick' | 'personal' | 'bereavement' | 'parental';
  total: number;
  used: number;
  pending: number;
  available: number;
}

export interface TaxInformation {
  ssn: string;
  filingStatus: 'single' | 'married' | 'married_separate' | 'head_of_household';
  allowances: number;
  additionalWithholding: number;
  stateTaxExempt: boolean;
  localTaxExempt: boolean;
}

export interface EmployeeProfile {
  // Core identification
  employeeId: string;
  employeeNumber: string;

  // Personal information
  firstName: string;
  lastName: string;
  middleName?: string;
  preferredName?: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender?: string;

  // Employment details
  companyId: string;
  companyName: string;
  department: string;
  division?: string;
  jobTitle: string;
  jobCode?: string;
  jobLevel?: string;
  employmentType: 'full-time' | 'part-time' | 'contractor' | 'intern' | 'temporary';

  // Work information
  workLocation: string;
  workAddress?: Address;
  workPhone?: string;
  workEmail?: string;
  workSchedule?: {
    days: string[];
    hoursPerDay: number;
    startTime: string;
    endTime: string;
  };

  // Manager information
  managerId?: string;
  managerName?: string;
  managerEmail?: string;
  directReports?: string[];

  // Compensation
  payStructure: PayStructure;
  bankAccount: BankAccount;
  taxInformation: TaxInformation;

  // Benefits
  benefitsPackage?: BenefitsPackage;
  leaveBalances?: LeaveBalance[];

  // Emergency contact
  emergencyContact: EmergencyContact;

  // Status tracking
  status: 'active' | 'on-leave' | 'terminated' | 'suspended' | 'pending';
  hireDate: string;
  startDate?: string;
  terminationDate?: string;
  terminationReason?: string;

  // Digital twins integration
  twins: {
    employeeTwinId?: string;
    paymentTwinId?: string;
    industryTwinId?: string;
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  version: number;
}

export interface EmployeeCreateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyId: string;
  department: string;
  jobTitle: string;
  employmentType: EmployeeProfile['employmentType'];
  workLocation: string;
  managerId?: string;
  payStructure: PayStructure;
  bankAccount: BankAccount;
  taxInformation: TaxInformation;
  emergencyContact: EmergencyContact;
  benefitsPackage?: BenefitsPackage;
}

export interface EmployeeUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  workLocation?: string;
  managerId?: string;
  employmentType?: EmployeeProfile['employmentType'];
  status?: EmployeeProfile['status'];
  payStructure?: PayStructure;
  bankAccount?: BankAccount;
  taxInformation?: TaxInformation;
  emergencyContact?: EmergencyContact;
  benefitsPackage?: BenefitsPackage;
}

export interface EmployeeQueryParams {
  companyId?: string;
  department?: string;
  status?: EmployeeProfile['status'];
  employmentType?: EmployeeProfile['employmentType'];
  managerId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EmployeeListResponse {
  employees: EmployeeProfile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Validation helper
export function validateEmployeeProfile(profile: Partial<EmployeeProfile>): string[] {
  const errors: string[] = [];

  if (!profile.firstName?.trim()) {
    errors.push('First name is required');
  }

  if (!profile.lastName?.trim()) {
    errors.push('Last name is required');
  }

  if (!profile.email?.trim()) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    errors.push('Invalid email format');
  }

  if (!profile.companyId?.trim()) {
    errors.push('Company ID is required');
  }

  if (!profile.department?.trim()) {
    errors.push('Department is required');
  }

  if (!profile.jobTitle?.trim()) {
    errors.push('Job title is required');
  }

  if (!profile.employmentType) {
    errors.push('Employment type is required');
  }

  if (!profile.workLocation?.trim()) {
    errors.push('Work location is required');
  }

  return errors;
}

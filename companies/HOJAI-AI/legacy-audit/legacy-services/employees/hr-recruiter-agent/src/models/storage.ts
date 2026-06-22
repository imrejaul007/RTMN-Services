/**
 * HR Recruiter Agent - Database Models & Storage
 * MongoDB-like in-memory storage with persistence support
 */

import type {
  Candidate,
  Job,
  Resume,
  InterviewSchedule,
  OnboardingWorkflow,
  ScreeningResult,
  QualificationResult,
} from '../types';

// ============================================
// STORAGE INTERFACES
// ============================================

interface StorageOptions {
  persistToDisk?: boolean;
  storagePath?: string;
}

interface QueryOptions<T> {
  filters?: Partial<Record<keyof T, any>>;
  sort?: { field: keyof T; order: 'asc' | 'desc' };
  page?: number;
  limit?: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================
// BASE STORAGE CLASS
// ============================================

abstract class BaseStorage<T extends { id: string }> {
  protected items: Map<string, T> = new Map();
  protected indexFields: (keyof T)[] = [];

  constructor(indexFields: (keyof T)[] = []) {
    this.indexFields = indexFields;
  }

  // CRUD Operations
  create(id: string, data: T): T {
    this.items.set(id, data);
    return data;
  }

  get(id: string): T | undefined {
    return this.items.get(id);
  }

  update(id: string, data: Partial<T>): T | undefined {
    const existing = this.items.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...data, id: existing.id };
    this.items.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }

  getAll(): T[] {
    return Array.from(this.items.values());
  }

  find(predicate: (item: T) => boolean): T[] {
    return Array.from(this.items.values()).filter(predicate);
  }

  query(options: QueryOptions<T>): PaginatedResult<T> {
    let results = Array.from(this.items.values());

    // Apply filters
    if (options.filters) {
      for (const [field, value] of Object.entries(options.filters)) {
        if (value !== undefined && value !== null) {
          results = results.filter(item => {
            const itemValue = item[field as keyof T];
            if (Array.isArray(value)) {
              return value.includes(itemValue as any);
            }
            return itemValue === value;
          });
        }
      }
    }

    // Apply sorting
    if (options.sort) {
      const { field, order } = options.sort;
      results.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];

        if (aVal === bVal) return 0;
        if (aVal === undefined) return 1;
        if (bVal === undefined) return -1;
        if (aVal === null) return 1;
        if (bVal === null) return -1;

        const comparison = (aVal as any) < (bVal as any) ? -1 : 1;
        return order === 'desc' ? -comparison : comparison;
      });
    }

    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 20;
    const startIndex = (page - 1) * limit;
    const paginatedResults = results.slice(startIndex, startIndex + limit);

    return {
      data: paginatedResults,
      total: results.length,
      page,
      limit,
      hasMore: startIndex + limit < results.length,
    };
  }

  count(predicate?: (item: T) => boolean): number {
    if (!predicate) return this.items.size;
    return Array.from(this.items.values()).filter(predicate).length;
  }

  clear(): void {
    this.items.clear();
  }

  // Serialization for persistence
  serialize(): string {
    return JSON.stringify(Array.from(this.items.entries()));
  }

  deserialize(data: string): void {
    try {
      const entries = JSON.parse(data) as [string, T][];
      this.items = new Map(entries);
    } catch (error) {
      console.error('Failed to deserialize storage:', error);
    }
  }
}

// ============================================
// CANDIDATE STORAGE
// ============================================

export class CandidateStorage extends BaseStorage<Candidate> {
  constructor() {
    super(['tenantId', 'status', 'jobId', 'source']);
  }

  findByStatus(status: Candidate['status']): Candidate[] {
    return this.find(c => c.status === status);
  }

  findByJob(jobId: string): Candidate[] {
    return this.find(c => c.jobId === jobId);
  }

  findByTenant(tenantId: string): Candidate[] {
    return this.find(c => c.tenantId === tenantId);
  }

  findBySkills(skills: string[]): Candidate[] {
    return this.find(c =>
      c.skills.some(s => skills.includes(s.name))
    );
  }

  search(query: string): Candidate[] {
    const lowerQuery = query.toLowerCase();
    return this.find(c =>
      c.firstName.toLowerCase().includes(lowerQuery) ||
      c.lastName.toLowerCase().includes(lowerQuery) ||
      c.contact.email.toLowerCase().includes(lowerQuery) ||
      (c.headline ? c.headline.toLowerCase().includes(lowerQuery) : false)
    );
  }

  withMinimumRating(rating: number): Candidate[] {
    return this.find(c => (c.rating || 0) >= rating);
  }
}

// ============================================
// JOB STORAGE
// ============================================

export class JobStorage extends BaseStorage<Job> {
  constructor() {
    super(['tenantId', 'status', 'department', 'location']);
  }

  findActive(): Job[] {
    return this.find(j => j.status === 'active');
  }

  findByDepartment(department: string): Job[] {
    return this.find(j =>
      j.department.toLowerCase().includes(department.toLowerCase())
    );
  }

  findByLocation(location: string): Job[] {
    return this.find(j =>
      j.location.toLowerCase().includes(location.toLowerCase())
    );
  }

  findByHiringManager(managerId: string): Job[] {
    return this.find(j => j.hiringManagerId === managerId);
  }
}

// ============================================
// RESUME STORAGE
// ============================================

export class ResumeStorage extends BaseStorage<Resume> {
  constructor() {
    super(['candidateId']);
  }

  findByCandidate(candidateId: string): Resume | undefined {
    return this.find(r => r.candidateId === candidateId)[0];
  }

  findWithScreeningResult(): Resume[] {
    return this.find(r => r.screeningResult !== undefined);
  }

  findByRecommendation(recommendation: ScreeningResult['recommendation']): Resume[] {
    return this.find(r =>
      r.screeningResult?.recommendation === recommendation
    );
  }
}

// ============================================
// INTERVIEW STORAGE
// ============================================

export class InterviewStorage extends BaseStorage<InterviewSchedule> {
  constructor() {
    super(['candidateId', 'jobId', 'status']);
  }

  findByCandidate(candidateId: string): InterviewSchedule[] {
    return this.find(i => i.candidateId === candidateId);
  }

  findByJob(jobId: string): InterviewSchedule[] {
    return this.find(i => i.jobId === jobId);
  }

  findByStatus(status: InterviewSchedule['status']): InterviewSchedule[] {
    return this.find(i => i.status === status);
  }

  findUpcoming(days: number = 7): InterviewSchedule[] {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.find(i => {
      const scheduledAt = new Date(i.scheduledAt);
      return scheduledAt >= now && scheduledAt <= future;
    });
  }

  findByDateRange(from: Date, to: Date): InterviewSchedule[] {
    return this.find(i => {
      const scheduledAt = new Date(i.scheduledAt);
      return scheduledAt >= from && scheduledAt <= to;
    });
  }

  findByInterviewer(interviewerId: string): InterviewSchedule[] {
    return this.find(i =>
      i.interviewers.some(interviewer => interviewer.interviewerId === interviewerId)
    );
  }
}

// ============================================
// ONBOARDING STORAGE
// ============================================

export class OnboardingStorage extends BaseStorage<OnboardingWorkflow> {
  constructor() {
    super(['candidateId', 'jobId', 'status']);
  }

  findByCandidate(candidateId: string): OnboardingWorkflow | undefined {
    return this.find(o => o.candidateId === candidateId)[0];
  }

  findByJob(jobId: string): OnboardingWorkflow[] {
    return this.find(o => o.jobId === jobId);
  }

  findByStatus(status: OnboardingWorkflow['status']): OnboardingWorkflow[] {
    return this.find(o => o.status === status);
  }

  findByManager(managerId: string): OnboardingWorkflow[] {
    return this.find(o => o.managerId === managerId);
  }

  findInProgress(): OnboardingWorkflow[] {
    return this.find(o =>
      o.status !== 'completed' && o.status !== 'failed'
    );
  }

  findCompleted(): OnboardingWorkflow[] {
    return this.find(o => o.status === 'completed');
  }

  findPendingDocuments(): OnboardingWorkflow[] {
    return this.find(o =>
      o.documents.some(d => d.required && d.status === 'pending')
    );
  }
}

// ============================================
// STORAGE REGISTRY
// ============================================

export class StorageRegistry {
  private static instance: StorageRegistry;
  private storage: {
    candidates: CandidateStorage;
    jobs: JobStorage;
    resumes: ResumeStorage;
    interviews: InterviewStorage;
    onboardings: OnboardingStorage;
  };

  private constructor() {
    this.storage = {
      candidates: new CandidateStorage(),
      jobs: new JobStorage(),
      resumes: new ResumeStorage(),
      interviews: new InterviewStorage(),
      onboardings: new OnboardingStorage(),
    };
  }

  static getInstance(): StorageRegistry {
    if (!StorageRegistry.instance) {
      StorageRegistry.instance = new StorageRegistry();
    }
    return StorageRegistry.instance;
  }

  get candidates(): CandidateStorage {
    return this.storage.candidates;
  }

  get jobs(): JobStorage {
    return this.storage.jobs;
  }

  get resumes(): ResumeStorage {
    return this.storage.resumes;
  }

  get interviews(): InterviewStorage {
    return this.storage.interviews;
  }

  get onboardings(): OnboardingStorage {
    return this.storage.onboardings;
  }

  // Serialization
  serialize(): string {
    return JSON.stringify({
      candidates: this.storage.candidates.serialize(),
      jobs: this.storage.jobs.serialize(),
      resumes: this.storage.resumes.serialize(),
      interviews: this.storage.interviews.serialize(),
      onboardings: this.storage.onboardings.serialize(),
    });
  }

  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.candidates) this.storage.candidates.deserialize(parsed.candidates);
      if (parsed.jobs) this.storage.jobs.deserialize(parsed.jobs);
      if (parsed.resumes) this.storage.resumes.deserialize(parsed.resumes);
      if (parsed.interviews) this.storage.interviews.deserialize(parsed.interviews);
      if (parsed.onboardings) this.storage.onboardings.deserialize(parsed.onboardings);
    } catch (error) {
      console.error('Failed to deserialize storage registry:', error);
    }
  }

  clearAll(): void {
    this.storage.candidates.clear();
    this.storage.jobs.clear();
    this.storage.resumes.clear();
    this.storage.interviews.clear();
    this.storage.onboardings.clear();
  }
}

// Export singleton instance
export const storage = StorageRegistry.getInstance();

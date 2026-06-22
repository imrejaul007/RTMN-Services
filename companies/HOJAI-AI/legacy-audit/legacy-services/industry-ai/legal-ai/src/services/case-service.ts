/**
 * Case Service
 * Business logic for case management
 */

import { v4 as uuidv4 } from 'uuid';

export interface Case {
  caseId: string;
  clientId: string;
  caseType: string;
  title: string;
  description?: string;
  court?: string;
  judge?: string;
  filingDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'pending' | 'closed' | 'archived';
  stage: string;
  deadlines: Deadline[];
  documents: string[];
  hearings: Hearing[];
  expenses: Expense[];
  createdAt: string;
  updatedAt: string;
}

export interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  type: string;
  priority: string;
  status: 'pending' | 'completed' | 'missed';
  completedAt?: string;
}

export interface Hearing {
  id: string;
  date: string;
  time?: string;
  court: string;
  judge?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'adjourned';
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  status: 'pending' | 'approved' | 'paid';
}

export class CaseService {
  private cases: Map<string, Case> = new Map();

  async createCase(input: Partial<Case>): Promise<Case> {
    const caseId = uuidv4();
    const now = new Date().toISOString();

    const newCase: Case = {
      caseId,
      clientId: input.clientId || '',
      caseType: input.caseType || 'general',
      title: input.title || 'Untitled Case',
      description: input.description,
      court: input.court,
      judge: input.judge,
      filingDate: input.filingDate || now,
      priority: input.priority || 'medium',
      status: 'active',
      stage: input.stage || 'intake',
      deadlines: [],
      documents: [],
      hearings: [],
      expenses: [],
      createdAt: now,
      updatedAt: now
    };

    this.cases.set(caseId, newCase);
    return newCase;
  }

  async getCase(caseId: string): Promise<Case | null> {
    return this.cases.get(caseId) || null;
  }

  async updateCase(caseId: string, updates: Partial<Case>): Promise<Case | null> {
    const existingCase = this.cases.get(caseId);
    if (!existingCase) return null;

    const updatedCase: Case = {
      ...existingCase,
      ...updates,
      caseId: existingCase.caseId,
      updatedAt: new Date().toISOString()
    };

    this.cases.set(caseId, updatedCase);
    return updatedCase;
  }

  async addDeadline(caseId: string, deadline: Partial<Deadline>): Promise<Deadline | null> {
    const existingCase = this.cases.get(caseId);
    if (!existingCase) return null;

    const newDeadline: Deadline = {
      id: uuidv4(),
      title: deadline.title || 'Untitled Deadline',
      dueDate: deadline.dueDate || new Date().toISOString(),
      type: deadline.type || 'general',
      priority: deadline.priority || 'medium',
      status: 'pending'
    };

    existingCase.deadlines.push(newDeadline);
    existingCase.updatedAt = new Date().toISOString();
    this.cases.set(caseId, existingCase);

    return newDeadline;
  }

  async addHearing(caseId: string, hearing: Partial<Hearing>): Promise<Hearing | null> {
    const existingCase = this.cases.get(caseId);
    if (!existingCase) return null;

    const newHearing: Hearing = {
      id: uuidv4(),
      date: hearing.date || new Date().toISOString(),
      time: hearing.time,
      court: hearing.court || '',
      judge: hearing.judge,
      notes: hearing.notes,
      status: 'scheduled'
    };

    existingCase.hearings.push(newHearing);
    existingCase.updatedAt = new Date().toISOString();
    this.cases.set(caseId, existingCase);

    return newHearing;
  }

  async getUpcomingDeadlines(caseId?: string): Promise<Deadline[]> {
    const now = new Date();
    const upcoming: Deadline[] = [];

    this.cases.forEach((caseData, id) => {
      if (caseId && id !== caseId) return;

      caseData.deadlines.forEach(deadline => {
        if (deadline.status === 'pending') {
          const dueDate = new Date(deadline.dueDate);
          if (dueDate >= now) {
            upcoming.push({ ...deadline, id: `case:${id}:deadline:${deadline.id}` });
          }
        }
      });
    });

    return upcoming.sort((a, b) =>
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }

  async getUpcomingHearings(caseId?: string): Promise<Hearing[]> {
    const now = new Date();
    const upcoming: Hearing[] = [];

    this.cases.forEach((caseData, id) => {
      if (caseId && id !== caseId) return;

      caseData.hearings.forEach(hearing => {
        if (hearing.status === 'scheduled') {
          const hearingDate = new Date(hearing.date);
          if (hearingDate >= now) {
            upcoming.push({ ...hearing, id: `case:${id}:hearing:${hearing.id}` });
          }
        }
      });
    });

    return upcoming.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  async searchCases(query: string): Promise<Case[]> {
    const results: Case[] = [];
    const lowerQuery = query.toLowerCase();

    this.cases.forEach(caseData => {
      if (
        caseData.title.toLowerCase().includes(lowerQuery) ||
        caseData.description?.toLowerCase().includes(lowerQuery) ||
        caseData.caseType.toLowerCase().includes(lowerQuery)
      ) {
        results.push(caseData);
      }
    });

    return results;
  }

  async getCaseStats(): Promise<any> {
    let totalCases = 0;
    let activeCases = 0;
    let pendingDeadlines = 0;
    let upcomingHearings = 0;

    this.cases.forEach(caseData => {
      totalCases++;
      if (caseData.status === 'active') activeCases++;
      pendingDeadlines += caseData.deadlines.filter(d => d.status === 'pending').length;
      upcomingHearings += caseData.hearings.filter(h => h.status === 'scheduled').length;
    });

    return {
      totalCases,
      activeCases,
      pendingDeadlines,
      upcomingHearings
    };
  }
}

export default CaseService;

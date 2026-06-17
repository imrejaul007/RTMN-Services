/**
 * TalentAI API Client
 *
 * Connects to RTMN Talent OS (Port 5066):
 * - Jobs Management
 * - Candidate Pipeline
 * - AI Matching
 * - Interview Scheduling
 * - Pipeline Analytics
 */

import axios, { AxiosInstance } from 'axios';

const TALENT_API_URL = process.env.NEXT_PUBLIC_TALENT_API_URL || 'http://localhost:5066';

const talentApi = axios.create({
  baseURL: TALENT_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================
// JOBS MODULE
// ============================================================

export const jobsApi = {
  // List jobs
  list: async (params?: {
    status?: string;
    department?: string;
    location?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const { data } = await talentApi.get('/api/jobs', { params });
    return data;
  },

  // Get job details
  get: async (id: string) => {
    const { data } = await talentApi.get(`/api/jobs/${id}`);
    return data;
  },

  // Create job
  create: async (job: any) => {
    const { data } = await talentApi.post('/api/jobs', job);
    return data;
  },

  // Update job
  update: async (id: string, updates: any) => {
    const { data } = await talentApi.patch(`/api/jobs/${id}`, updates);
    return data;
  },

  // Publish job
  publish: async (id: string) => {
    const { data } = await talentApi.post(`/api/jobs/${id}/publish`);
    return data;
  },

  // Close job
  close: async (id: string, reason?: string) => {
    const { data } = await talentApi.post(`/api/jobs/${id}/close`, { reason });
    return data;
  },

  // Get job analytics
  getAnalytics: async (id: string) => {
    const { data } = await talentApi.get(`/api/jobs/${id}/analytics`);
    return data;
  },
};

// ============================================================
// CANDIDATES MODULE
// ============================================================

export const candidatesApi = {
  // List candidates
  list: async (params?: {
    jobId?: string;
    status?: string;
    stage?: string;
    source?: string;
    minScore?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const { data } = await talentApi.get('/api/candidates', { params });
    return data;
  },

  // Get candidate details
  get: async (id: string) => {
    const { data } = await talentApi.get(`/api/candidates/${id}`);
    return data;
  },

  // Add candidate
  create: async (candidate: any) => {
    const { data } = await talentApi.post('/api/candidates', candidate);
    return data;
  },

  // Update candidate
  update: async (id: string, updates: any) => {
    const { data } = await talentApi.patch(`/api/candidates/${id}`, updates);
    return data;
  },

  // Move candidate in pipeline
  move: async (id: string, stage: string, notes?: string, movedBy?: string) => {
    const { data } = await talentApi.post(`/api/candidates/${id}/move`, { stage, notes, movedBy });
    return data;
  },

  // AI score candidate
  score: async (id: string) => {
    const { data } = await talentApi.post(`/api/candidates/${id}/score`);
    return data;
  },

  // Schedule interview
  scheduleInterview: async (id: string, interview: {
    type: string;
    scheduledAt: string;
    duration?: number;
    interviewers?: string[];
    notes?: string;
  }) => {
    const { data } = await talentApi.post(`/api/candidates/${id}/interview`, interview);
    return data;
  },

  // Add note
  addNote: async (id: string, text: string, author: string) => {
    const { data } = await talentApi.post(`/api/candidates/${id}/notes`, { text, author });
    return data;
  },
};

// ============================================================
// PIPELINE MODULE
// ============================================================

export const pipelineApi = {
  // Get kanban view
  getKanban: async (jobId?: string) => {
    const { data } = await talentApi.get('/api/pipeline/kanban', {
      params: jobId ? { jobId } : {},
    });
    return data;
  },

  // Get pipeline stats
  getStats: async (params?: { jobId?: string; startDate?: string; endDate?: string }) => {
    const { data } = await talentApi.get('/api/pipeline/stats', { params });
    return data;
  },

  // Get time-to-hire metrics
  getTimeline: async () => {
    const { data } = await talentApi.get('/api/pipeline/timeline');
    return data;
  },
};

// ============================================================
// TALENT POOL
// ============================================================

export const talentPoolApi = {
  // Get talent pool
  list: async (params?: {
    skills?: string;
    experience?: string;
    location?: string;
    search?: string;
  }) => {
    const { data } = await talentApi.get('/api/talent-pool', { params });
    return data;
  },

  // Add to pool
  add: async (candidate: any) => {
    const { data } = await talentApi.post('/api/talent-pool', candidate);
    return data;
  },

  // Get candidate
  get: async (id: string) => {
    const { data } = await talentApi.get(`/api/talent-pool/${id}`);
    return data;
  },
};

// ============================================================
// AI MODULE
// ============================================================

export const aiApi = {
  // Match candidates to jobs
  match: async (candidateId: string, jobIds?: string[]) => {
    const { data } = await talentApi.post('/api/ai/match', { candidateId, jobIds });
    return data;
  },

  // Generate interview questions
  generateQuestions: async (jobId: string, stage: string) => {
    const { data } = await talentApi.post('/api/ai/questions', { jobId, stage });
    return data;
  },

  // Sourcing suggestions
  sourcing: async (jobId: string) => {
    const { data } = await talentApi.post('/api/ai/sourcing', { jobId });
    return data;
  },
};

// ============================================================
// ANALYTICS MODULE
// ============================================================

export const analyticsApi = {
  // Get recruitment dashboard
  getDashboard: async () => {
    const { data } = await talentApi.get('/api/analytics/recruitment');
    return data;
  },
};

export default {
  jobs: jobsApi,
  candidates: candidatesApi,
  pipeline: pipelineApi,
  talentPool: talentPoolApi,
  ai: aiApi,
  analytics: analyticsApi,
};

// API Client for HOJAI Studio services

const AI_ARCHITECT_URL = process.env.NEXT_PUBLIC_AI_ARCHITECT_URL || 'http://localhost:4390';
const BLUEPRINT_COMPILER_URL = process.env.NEXT_PUBLIC_BLUEPRINT_COMPILER_URL || 'http://localhost:4391';
const HOJAI_CLOUD_URL = process.env.NEXT_PUBLIC_HOJAI_CLOUD_URL || 'http://localhost:4380';

async function apiRequest<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// AI Architect API
export const architectApi = {
  // Start interview
  startInterview: (idea: string) =>
    apiRequest<any>(AI_ARCHITECT_URL, '/api/v1/interview/start', {
      method: 'POST',
      body: JSON.stringify({ idea }),
    }),

  // Submit answer
  submitAnswer: (interviewId: string, questionId: number, answer: any) =>
    apiRequest<any>(AI_ARCHITECT_URL, `/api/v1/interview/${interviewId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ questionId, answer }),
    }),

  // Skip question
  skipQuestion: (interviewId: string, questionId: number) =>
    apiRequest<any>(AI_ARCHITECT_URL, `/api/v1/interview/${interviewId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ questionId, answer: null, skip: true }),
    }),

  // Get interview
  getInterview: (interviewId: string) =>
    apiRequest<any>(AI_ARCHITECT_URL, `/api/v1/interview/${interviewId}`),

  // Complete interview
  completeInterview: (interviewId: string) =>
    apiRequest<any>(AI_ARCHITECT_URL, `/api/v1/interview/${interviewId}/complete`, {
      method: 'POST',
    }),

  // Get blueprint
  getBlueprint: (interviewId: string) =>
    apiRequest<any>(AI_ARCHITECT_URL, `/api/v1/blueprint/${interviewId}`),

  // Get blueprint summary
  getBlueprintSummary: (interviewId: string) =>
    apiRequest<any>(AI_ARCHITECT_URL, `/api/v1/blueprint/${interviewId}/summary`),

  // Health check
  health: () => apiRequest<any>(AI_ARCHITECT_URL, '/health'),
};

// Blueprint Compiler API
export const compilerApi = {
  // Start compilation
  compile: (blueprint: any) =>
    apiRequest<any>(BLUEPRINT_COMPILER_URL, '/api/v1/compile', {
      method: 'POST',
      body: JSON.stringify({ blueprint }),
    }),

  // Get compile status
  getStatus: (jobId: string) =>
    apiRequest<any>(BLUEPRINT_COMPILER_URL, `/api/v1/compile/${jobId}/status`),

  // Get compile job
  getJob: (jobId: string) =>
    apiRequest<any>(BLUEPRINT_COMPILER_URL, `/api/v1/compile/${jobId}`),

  // Deploy to cloud
  deploy: (jobId: string) =>
    apiRequest<any>(BLUEPRINT_COMPILER_URL, `/api/v1/compile/${jobId}/deploy`, {
      method: 'POST',
    }),

  // Download files
  download: (jobId: string) =>
    apiRequest<any>(BLUEPRINT_COMPILER_URL, `/api/v1/compile/${jobId}/download`),

  // Health check
  health: () => apiRequest<any>(BLUEPRINT_COMPILER_URL, '/health'),
};

// HOJAI Cloud API
export const cloudApi = {
  // List deployments
  listDeployments: () =>
    apiRequest<any>(HOJAI_CLOUD_URL, '/api/v1/deployments'),

  // Get deployment
  getDeployment: (deploymentId: string) =>
    apiRequest<any>(HOJAI_CLOUD_URL, `/api/v1/deployments/${deploymentId}`),

  // Delete deployment
  deleteDeployment: (deploymentId: string) =>
    apiRequest<any>(HOJAI_CLOUD_URL, `/api/v1/deployments/${deploymentId}`, {
      method: 'DELETE',
    }),

  // Health check
  health: () => apiRequest<any>(HOJAI_CLOUD_URL, '/api/v1/health'),
};

// Blueprint Diff Engine API
const DIFF_ENGINE_URL = process.env.NEXT_PUBLIC_DIFF_ENGINE_URL || 'http://localhost:4147';

export const diffApi = {
  // Compute diff between blueprints
  computeDiff: (oldBlueprint: any, newBlueprint: any) =>
    apiRequest<any>(DIFF_ENGINE_URL, '/api/v1/diff', {
      method: 'POST',
      body: JSON.stringify({ oldBlueprint, newBlueprint }),
    }),

  // Apply diff
  applyDiff: (blueprint: any, diff: any) =>
    apiRequest<any>(DIFF_ENGINE_URL, '/api/v1/apply', {
      method: 'POST',
      body: JSON.stringify({ blueprint, diff }),
    }),

  // Check equality
  areEqual: (blueprintA: any, blueprintB: any) =>
    apiRequest<any>(DIFF_ENGINE_URL, '/api/v1/equal', {
      method: 'POST',
      body: JSON.stringify({ blueprintA, blueprintB }),
    }),

  // Health check
  health: () => apiRequest<any>(DIFF_ENGINE_URL, '/health'),
};

// Blueprint Evolution API
const EVOLUTION_URL = process.env.NEXT_PUBLIC_EVOLUTION_URL || 'http://localhost:4148';

export const evolutionApi = {
  // Run evolution analysis
  evolve: (blueprint: any, metrics?: any, config?: any) =>
    apiRequest<any>(EVOLUTION_URL, '/api/v1/evolve', {
      method: 'POST',
      body: JSON.stringify({ blueprint, metrics: metrics || {}, config: config || {} }),
    }),

  // Get evolution job
  getJob: (jobId: string) =>
    apiRequest<any>(EVOLUTION_URL, `/api/v1/jobs/${jobId}`),

  // List evolution jobs
  listJobs: () =>
    apiRequest<any>(EVOLUTION_URL, '/api/v1/jobs'),

  // Health check
  health: () => apiRequest<any>(EVOLUTION_URL, '/health'),
};

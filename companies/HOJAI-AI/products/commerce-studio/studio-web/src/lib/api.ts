/**
 * Studio Frontend API Client
 * Communicates with Studio Backend
 */

const API_BASE = process.env.NEXT_PUBLIC_STUDIO_API_URL || 'http://localhost:5750';

export async function apiGet(path: string) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

export async function apiPost(path: string, data: any) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

export async function apiPut(path: string, data: any) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

// Studio API functions
export const StudioAPI = {
  // Templates
  listTemplates: () => apiGet('/api/studio/templates'),
  getTemplate: (id: string) => apiGet(`/api/studio/templates/${id}`),
  listCategories: () => apiGet('/api/studio/templates/categories/all'),

  // Pools
  listPools: () => apiGet('/api/studio/templates/pools/all'),
  getPoolVendors: (id: string, params?: any) =>
    apiGet(`/api/studio/templates/pools/${id}/vendors${params ? `?${new URLSearchParams(params)}` : ''}`),

  // Builder
  createSession: () => apiPost('/api/studio/builder/sessions', {}),
  getSession: (id: string) => apiGet(`/api/studio/builder/sessions/${id}`),
  updateSessionStep: (id: string, step: number, data: any) =>
    apiPut(`/api/studio/builder/sessions/${id}/step/${step}`, data),
  validateSession: (id: string) => apiPost(`/api/studio/builder/sessions/${id}/validate`, {}),
  reviewSession: (id: string) => apiGet(`/api/studio/builder/sessions/${id}/review`),

  // Deploy
  deploy: (data: any) => apiPost('/api/studio/deploy', data),
  getDeployment: (id: string) => apiGet(`/api/studio/deploy/${id}`),
  listDeployments: () => apiGet('/api/studio/deploy'),
  cancelDeployment: (id: string) => apiPost(`/api/studio/deploy/${id}/cancel`, {}),

  // Dashboard
  getDashboard: (nexhaId: string) => apiGet(`/api/studio/dashboard/${nexhaId}`),
  getStats: (nexhaId: string) => apiGet(`/api/studio/dashboard/${nexhaId}/stats`),
  getOrders: (nexhaId: string) => apiGet(`/api/studio/dashboard/${nexhaId}/orders`),
  getWorkers: (nexhaId: string) => apiGet(`/api/studio/dashboard/${nexhaId}/workers`),

  // Wizards
  getCommerceModules: () => apiGet('/api/studio/wizards/commerce-modules'),
  getPricingStrategies: () => apiGet('/api/studio/wizards/pricing-strategies'),
  getPaymentMethods: () => apiGet('/api/studio/wizards/payment-methods'),
  getRegions: () => apiGet('/api/studio/wizards/regions'),
  getLanguages: () => apiGet('/api/studio/wizards/languages'),
};
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4770';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('brandpulse_token');
  if (token) {
    config.headers['X-API-Key'] = token;
  }
  return config;
});

// Brand API
export const brandAPI = {
  getBrand: async (brandId: string) => {
    const response = await api.get(`/api/v1/brands/${brandId}`);
    return response.data;
  },

  getBrandBySlug: async (slug: string) => {
    const response = await api.get(`/api/v1/brands/slug/${slug}`);
    return response.data;
  },

  createBrand: async (data: any) => {
    const response = await api.post('/api/v1/brands', data);
    return response.data;
  },

  updateBrand: async (brandId: string, data: any) => {
    const response = await api.patch(`/api/v1/brands/${brandId}`, data);
    return response.data;
  },
};

// Review API
export const reviewAPI = {
  getReviews: async (brandId: string, params?: any) => {
    const response = await api.get(`/api/v1/reviews/brand/${brandId}`, { params });
    return response.data;
  },

  getReview: async (reviewId: string) => {
    const response = await api.get(`/api/v1/reviews/${reviewId}`);
    return response.data;
  },

  createReview: async (data: any) => {
    const response = await api.post('/api/v1/reviews', data);
    return response.data;
  },

  moderateReview: async (reviewId: string, status: string, moderatorId: string) => {
    const response = await api.patch(`/api/v1/reviews/${reviewId}/moderate`, {
      status,
      moderatorId,
    });
    return response.data;
  },

  getStats: async (brandId: string) => {
    const response = await api.get(`/api/v1/reviews/stats/${brandId}`);
    return response.data;
  },
};

// Analytics API
export const analyticsAPI = {
  getOverview: async (brandId: string) => {
    const response = await api.get(`/api/v1/analytics/brand/${brandId}/overview`);
    return response.data;
  },

  getSentimentTrend: async (brandId: string, period?: string, days?: number) => {
    const response = await api.get(`/api/v1/analytics/brand/${brandId}/sentiment`, {
      params: { period, days },
    });
    return response.data;
  },

  getVolumeTrend: async (brandId: string, period?: string, days?: number) => {
    const response = await api.get(`/api/v1/analytics/brand/${brandId}/volume`, {
      params: { period, days },
    });
    return response.data;
  },

  getRatings: async (brandId: string) => {
    const response = await api.get(`/api/v1/analytics/brand/${brandId}/ratings`);
    return response.data;
  },

  getSources: async (brandId: string) => {
    const response = await api.get(`/api/v1/analytics/brand/${brandId}/sources`);
    return response.data;
  },

  getAspects: async (brandId: string) => {
    const response = await api.get(`/api/v1/analytics/brand/${brandId}/aspects`);
    return response.data;
  },

  getAlerts: async (brandId: string, severity?: string) => {
    const response = await api.get(`/api/v1/analytics/brand/${brandId}/alerts`, {
      params: { severity },
    });
    return response.data;
  },

  acknowledgeAlert: async (alertId: string, userId: string) => {
    const response = await api.patch(`/api/v1/analytics/alerts/${alertId}/acknowledge`, {
      userId,
    });
    return response.data;
  },

  resolveAlert: async (alertId: string, userId: string) => {
    const response = await api.patch(`/api/v1/analytics/alerts/${alertId}/resolve`, {
      userId,
    });
    return response.data;
  },
};

// Sentiment API
export const sentimentAPI = {
  analyze: async (text: string) => {
    const response = await api.post('/api/v1/sentiment/analyze', { text });
    return response.data;
  },

  analyzeBatch: async (texts: string[]) => {
    const response = await api.post('/api/v1/sentiment/analyze/batch', { texts });
    return response.data;
  },
};

// Health check
export const healthAPI = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;

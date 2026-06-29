/**
 * HTTP client for inter-service communication
 */

import axios from 'axios';

interface ServiceRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  params?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export async function callService<T = any>(req: ServiceRequest): Promise<T | null> {
  try {
    const response = await axios({
      method: req.method,
      url: req.url,
      data: req.data,
      params: req.params,
      headers: {
        'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '',
        ...req.headers,
      },
      timeout: req.timeout || 10000,
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      console.warn(`[callService] ${req.method} ${req.url} -> ${response.status}`);
      return null;
    }

    return response.data?.data || response.data;
  } catch (error: any) {
    console.warn(`[callService] Failed: ${req.method} ${req.url} - ${error.message}`);
    return null;
  }
}

// Service URLs
export const SERVICE_URLS = {
  genieGateway: process.env.GENIE_GATEWAY_URL || 'http://localhost:4701',
  genieBrain: process.env.GENIE_BRAIN_URL || 'http://localhost:7100',
  calendar: process.env.GENIE_CALENDAR_URL || 'http://localhost:4709',
  wellness: process.env.GENIE_WELLNESS_URL || 'http://localhost:4723',
  money: process.env.GENIE_MONEY_URL || 'http://localhost:4724',
  memory: process.env.GENIE_MEMORYOS_URL || 'http://localhost:4703',
  twinos: process.env.GENIE_TWINOS_URL || 'http://localhost:4705',
  razzo: process.env.RAZO_URL || 'http://localhost:4299',
  llm: process.env.GENIE_LLM_URL || 'http://localhost:4520',

  // New services (built)
  decisionIntelligence: process.env.DECISION_INTELLIGENCE_URL || 'http://localhost:4740',
  learningLoop: process.env.LEARNING_LOOP_URL || 'http://localhost:4742',
  anticipation: process.env.ANTICIPATION_URL || 'http://localhost:4745',
  ambient: process.env.AMBIENT_URL || 'http://localhost:4746',
  constitution: process.env.CONSTITUTION_URL || 'http://localhost:4743',
  financialLife: process.env.FINANCIAL_LIFE_URL || 'http://localhost:4747',
  health: process.env.HEALTH_URL || 'http://localhost:4748',
  household: process.env.HOUSEHOLD_URL || 'http://localhost:4749',
  travel: process.env.TRAVEL_URL || 'http://localhost:4750',
  spiritual: process.env.SPIRITUAL_URL || 'http://localhost:4751',
  lifeSimulation: process.env.LIFE_SIMULATION_URL || 'http://localhost:4752',
  focus: process.env.FOCUS_URL || 'http://localhost:4753',
  dreams: process.env.DREAMS_URL || 'http://localhost:4754',
  legacy: process.env.LEGACY_URL || 'http://localhost:4755',
};

// Health check helper
export async function checkServiceHealth(url: string, timeout = 5000): Promise<boolean> {
  try {
    const response = await axios.get(`${url}/health`, { timeout, validateStatus: () => true });
    return response.status === 200;
  } catch {
    return false;
  }
}
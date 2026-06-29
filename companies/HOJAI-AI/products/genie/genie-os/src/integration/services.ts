/**
 * Genie Services Router — Unifies all 14 Genie services
 * Mounts at /api/genie/* in Genie OS Runtime (port 7100)
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';

const SERVICE_URLS = {
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

async function proxy(req: Request, res: Response, serviceUrl: string) {
  try {
    const targetPath = req.originalUrl.replace(/^\/api\/genie\/[^/]+/, '');
    const url = `${serviceUrl}${targetPath}`;

    const response = await axios({
      method: req.method as any,
      url,
      data: req.body,
      params: req.query,
      headers: {
        'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '',
        'content-type': 'application/json',
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error(`[Genie Services Router] ${req.method} ${req.originalUrl} failed:`, error.message);
    res.status(502).json({
      success: false,
      error: { code: 'DOWNSTREAM', message: 'Service unavailable' },
      meta: { timestamp: new Date().toISOString() },
    });
  }
}

export function createGenieServicesRouter(): Router {
  const router = Router();

  // Decision Intelligence (4740)
  router.use('/decisions/:path(*)', (req, res) => proxy(req, res, SERVICE_URLS.decisionIntelligence));
  router.use('/decisions', (req, res) => proxy(req, res, SERVICE_URLS.decisionIntelligence));

  // Learning Loop (4742)
  router.use('/learning/:path(*)', (req, res) => proxy(req, res, SERVICE_URLS.learningLoop));
  router.use('/learning', (req, res) => proxy(req, res, SERVICE_URLS.learningLoop));

  // Anticipation (4745)
  router.use('/anticipation/:path(*)', (req, res) => proxy(req, res, SERVICE_URLS.anticipation));
  router.use('/anticipation', (req, res) => proxy(req, res, SERVICE_URLS.anticipation));

  // Ambient (4746)
  router.use('/ambient/:path(*)', (req, res) => proxy(req, res, SERVICE_URLS.ambient));
  router.use('/ambient', (req, res) => proxy(req, res, SERVICE_URLS.ambient));

  // Constitution (4743)
  router.use('/constitution/:path(*)', (req, res) => proxy(req, res, SERVICE_URLS.constitution));
  router.use('/constitution', (req, res) => proxy(req, res, SERVICE_URLS.constitution));

  // Financial Life (4747)
  router.use('/financial/:path(*)', (req, res) => proxy(req, res, SERVICE_URLS.financialLife));
  router.use('/financial', (req, res) => proxy(req, res, SERVICE_URLS.financialLife));

  // Health Intelligence (4748)
  router.use('/health-intel/:path(*)', (req, res) => proxy(req, res, SERVICE_URLS.health));
  router.use('/health-intel', (req, res) => proxy(req, res, SERVICE_URLS.health));

  // Household (4749)
  router.use('/household/:path(*)', (req, res) => proxy(req, res, SERVICE_URLS.household));
  router.use('/household', (req, res) => proxy(req, res, SERVICE_URLS.household));

  // Travel (4750)
  router.use('/travel/:path(*)', (req, res) => proxy(req, res, SERVICE_URLS.travel));
  router.use('/travel', (req, res) => proxy(req, res, SERVICE_URLS.travel));

  // Spiritual (4751)
  router.use('/spiritual/:path(*)', (req, res) => proxy(req, res, SERVICE_URLS.spiritual));
  router.use('/spiritual', (req, res) => proxy(req, res, SERVICE_URLS.spiritual));

  // Life Simulation (4752)
  router.use('/simulation/:path(*)', (req, res) => proxy(req, res, SERVICE_URLS.lifeSimulation));
  router.use('/simulation', (req, res) => proxy(req, res, SERVICE_URLS.lifeSimulation));

  // Focus (4753)
  router.use('/focus/:path(*)', (req, res) => proxy(req, res, SERVICE_URLS.focus));
  router.use('/focus', (req, res) => proxy(req, res, SERVICE_URLS.focus));

  // Dreams (4754)
  router.use('/dreams/:path(*)', (req, res) => proxy(req, res, SERVICE_URLS.dreams));
  router.use('/dreams', (req, res) => proxy(req, res, SERVICE_URLS.dreams));

  // Legacy (4755)
  router.use('/legacy/:path(*)', (req, res) => proxy(req, res, SERVICE_URLS.legacy));
  router.use('/legacy', (req, res) => proxy(req, res, SERVICE_URLS.legacy));

  return router;
}

export const SERVICE_LIST = [
  { name: 'Decision Intelligence', port: 4740, prefix: '/decisions' },
  { name: 'Learning Loop', port: 4742, prefix: '/learning' },
  { name: 'Anticipation', port: 4745, prefix: '/anticipation' },
  { name: 'Ambient', port: 4746, prefix: '/ambient' },
  { name: 'Constitution', port: 4743, prefix: '/constitution' },
  { name: 'Financial Life', port: 4747, prefix: '/financial' },
  { name: 'Health Intelligence', port: 4748, prefix: '/health-intel' },
  { name: 'Household', port: 4749, prefix: '/household' },
  { name: 'Travel', port: 4750, prefix: '/travel' },
  { name: 'Spiritual', port: 4751, prefix: '/spiritual' },
  { name: 'Life Simulation', port: 4752, prefix: '/simulation' },
  { name: 'Focus', port: 4753, prefix: '/focus' },
  { name: 'Dreams', port: 4754, prefix: '/dreams' },
  { name: 'Legacy', port: 4755, prefix: '/legacy' },
];
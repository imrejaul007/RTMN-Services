import { Router } from 'express';
import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import { createResponse, createErrorResponse, SimulationResult, WhatIfScenario } from '../types/index.js';

const logger = createLogger('hojai-business-copilot:simulation');
const router = Router();

const SIMULATION_OS_URL = process.env.SIMULATION_OS_URL || 'http://localhost:4241';

// List simulations
router.get('/list', async (req, res) => {
  try {
    const { type, status, page = '1', limit = '20', tenantId } = req.query;

    const params = new URLSearchParams();
    if (type) params.append('type', type as string);
    if (status) params.append('status', status as string);
    params.append('page', page as string);
    params.append('limit', limit as string);

    const response = await axios.get(`${SIMULATION_OS_URL}/api/simulations?${params}`, {
      headers: {
        'X-Tenant-Id': tenantId as string || req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    res.json(createResponse(response.data as SimulationResult[]));
  } catch (error: any) {
    logger.error('simulation_list_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('SIMULATION_SERVICE_ERROR', error.message || 'Failed to list simulations')
    );
  }
});

// Get simulation by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const response = await axios.get(`${SIMULATION_OS_URL}/api/simulations/${id}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    res.json(createResponse(response.data as SimulationResult));
  } catch (error: any) {
    logger.error('simulation_fetch_error', { error: error.message, simulationId: req.params.id });
    res.status(error.response?.status || 500).json(
      createErrorResponse('SIMULATION_SERVICE_ERROR', error.message || 'Failed to fetch simulation')
    );
  }
});

// Run what-if scenario
router.post('/what-if', async (req, res) => {
  try {
    const { name, parameters, scope, tenantId, userId } = req.body as WhatIfScenario & { tenantId?: string; userId?: string };

    if (!name || !parameters) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'name and parameters are required'));
      return;
    }

    const validScopes = ['company', 'team', 'product', 'customer'];
    if (scope && !validScopes.includes(scope)) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', `Invalid scope. Must be one of: ${validScopes.join(', ')}`));
      return;
    }

    const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger.info('whatif_simulation_started', { simulationId, name, scope });

    const response = await axios.post(`${SIMULATION_OS_URL}/api/simulations/what-if`, {
      simulationId,
      name,
      parameters,
      scope: scope || 'company',
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId || req.headers['x-tenant-id'] as string || '',
        'X-User-Id': userId || req.headers['x-user-id'] as string || '',
      },
      timeout: 120000,
    });

    logger.info('whatif_simulation_completed', { simulationId, name });
    res.status(201).json(createResponse(response.data as SimulationResult));
  } catch (error: any) {
    logger.error('whatif_simulation_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('SIMULATION_SERVICE_ERROR', error.message || 'Failed to run what-if simulation')
    );
  }
});

// Run scenario simulation
router.post('/run', async (req, res) => {
  try {
    const { scenarioId, parameters, tenantId, userId } = req.body;

    if (!scenarioId) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'scenarioId is required'));
      return;
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger.info('scenario_run_started', { scenarioId, runId });

    const response = await axios.post(`${SIMULATION_OS_URL}/api/simulations/${scenarioId}/run`, {
      runId,
      parameters,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId || req.headers['x-tenant-id'] as string || '',
        'X-User-Id': userId || req.headers['x-user-id'] as string || '',
      },
      timeout: 180000,
    });

    logger.info('scenario_run_completed', { scenarioId, runId });
    res.status(201).json(createResponse(response.data));
  } catch (error: any) {
    logger.error('scenario_run_error', { error: error.message, scenarioId: req.body.scenarioId });
    res.status(error.response?.status || 500).json(
      createErrorResponse('SIMULATION_SERVICE_ERROR', error.message || 'Failed to run scenario')
    );
  }
});

// Get simulation results
router.get('/:id/results', async (req, res) => {
  try {
    const { id } = req.params;

    const response = await axios.get(`${SIMULATION_OS_URL}/api/simulations/${id}/results`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('simulation_results_error', { error: error.message, simulationId: req.params.id });
    res.status(error.response?.status || 500).json(
      createErrorResponse('SIMULATION_SERVICE_ERROR', error.message || 'Failed to fetch simulation results')
    );
  }
});

// Create scenario template
router.post('/scenarios', async (req, res) => {
  try {
    const { name, description, type, defaultParameters, scope, tenantId, userId } = req.body;

    if (!name || !type) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'name and type are required'));
      return;
    }

    const response = await axios.post(`${SIMULATION_OS_URL}/api/scenarios`, {
      name,
      description,
      type,
      defaultParameters,
      scope,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId || req.headers['x-tenant-id'] as string || '',
        'X-User-Id': userId || req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    logger.info('scenario_template_created', { scenarioId: response.data.id, name });
    res.status(201).json(createResponse(response.data));
  } catch (error: any) {
    logger.error('scenario_template_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('SIMULATION_SERVICE_ERROR', error.message || 'Failed to create scenario template')
    );
  }
});

// List scenario templates
router.get('/scenarios/list', async (req, res) => {
  try {
    const { type, scope, tenantId } = req.query;

    const params = new URLSearchParams();
    if (type) params.append('type', type as string);
    if (scope) params.append('scope', scope as string);

    const response = await axios.get(`${SIMULATION_OS_URL}/api/scenarios?${params}`, {
      headers: {
        'X-Tenant-Id': tenantId as string || req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('scenario_list_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('SIMULATION_SERVICE_ERROR', error.message || 'Failed to list scenarios')
    );
  }
});

// Compare simulation results
router.post('/compare', async (req, res) => {
  try {
    const { simulationIds, tenantId, userId } = req.body;

    if (!simulationIds || !Array.isArray(simulationIds) || simulationIds.length < 2) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'At least 2 simulationIds are required for comparison'));
      return;
    }

    const response = await axios.post(`${SIMULATION_OS_URL}/api/simulations/compare`, {
      simulationIds,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId || req.headers['x-tenant-id'] as string || '',
        'X-User-Id': userId || req.headers['x-user-id'] as string || '',
      },
      timeout: 30000,
    });

    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('simulation_compare_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('SIMULATION_SERVICE_ERROR', error.message || 'Failed to compare simulations')
    );
  }
});

export default router;

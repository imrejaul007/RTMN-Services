/**
 * Blueprint routes — GET /api/v1/blueprint/*
 */

import express from 'express';
import { getInterviewWithBlueprint } from '../interview-store.js';
import { exportBlueprintYaml, exportBlueprintJson } from '../blueprint-generator.js';

const router = express.Router();

/**
 * GET /api/v1/blueprint/:id
 * Get blueprint by interview ID
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { format } = req.query;

    const interview = getInterviewWithBlueprint(id);

    if (!interview) {
      return res.status(404).json({
        error: 'Not found',
        message: `Interview not found: ${id}`
      });
    }

    if (!interview.blueprint) {
      return res.status(400).json({
        error: 'Blueprint not ready',
        message: 'Interview not completed yet'
      });
    }

    // Return in requested format
    if (format === 'yaml') {
      return res.set('Content-Type', 'text/plain').send(exportBlueprintYaml(interview.blueprint));
    }

    if (format === 'json') {
      return res.set('Content-Type', 'application/json').send(exportBlueprintJson(interview.blueprint));
    }

    res.json({
      success: true,
      blueprint: interview.blueprint,
      nextSteps: interview.nextSteps
    });
  } catch (error) {
    console.error('Error getting blueprint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/blueprint/:id/summary
 * Get a summary of the blueprint for display
 */
router.get('/:id/summary', (req, res) => {
  try {
    const { id } = req.params;

    const interview = getInterviewWithBlueprint(id);

    if (!interview) {
      return res.status(404).json({
        error: 'Not found',
        message: `Interview not found: ${id}`
      });
    }

    if (!interview.blueprint) {
      return res.status(400).json({
        error: 'Blueprint not ready',
        message: 'Interview not completed yet'
      });
    }

    const { blueprint } = interview;

    // Generate a summary card
    const summary = {
      company: {
        name: blueprint.config.name,
        type: blueprint.config.type,
        tagline: `AI-native ${blueprint.config.type} for ${blueprint.config.regions.join(', ')}`
      },
      whatYouGet: {
        apps: {
          buyerPortal: blueprint.apps.buyerPortal,
          sellerPortal: blueprint.apps.sellerPortal,
          adminDashboard: blueprint.apps.adminDashboard,
          mobileApp: blueprint.apps.mobileApp
        },
        agents: blueprint.agents.map(a => a.name),
        integrations: blueprint.integrations
      },
      specs: {
        regions: blueprint.config.regions,
        languages: blueprint.config.languages,
        currency: blueprint.config.currency,
        commerce: blueprint.config.commerce ? blueprint.config.commerceType : 'none',
        federation: blueprint.config.federation
      },
      compliance: blueprint.config.compliance
    };

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error getting blueprint summary:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;

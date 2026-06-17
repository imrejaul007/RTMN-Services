import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { installerService } from '../services/installer';
import { Installation } from '../models/Installation';
import logger from '../logger';

const router = Router();

// Validation schema for installation
const InstallSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  config: z.record(z.unknown()).optional(),
});

/**
 * POST /api/marketplace/:workflowId/install
 * Install a workflow for a client
 */
router.post('/:workflowId/install', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;

    // Validate request body
    const validationResult = InstallSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validationResult.error.errors,
      });
    }

    const { clientId, config } = validationResult.data;

    // Install workflow
    const result = await installerService.installWorkflow(workflowId, {
      clientId,
      config,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    logger.info(`Workflow ${workflowId} installed for client ${clientId}`);

    res.status(201).json({
      success: true,
      data: {
        installationId: result.installation?.installationId,
        workflowId,
        clientId,
        status: result.installation?.status,
        installedAt: result.installation?.installedAt,
      },
    });
  } catch (error) {
    logger.error('Error installing workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to install workflow',
    });
  }
});

/**
 * DELETE /api/marketplace/:workflowId/install
 * Uninstall a workflow
 */
router.delete('/:workflowId/install', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { clientId } = req.query;

    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Client ID is required',
      });
    }

    const result = await installerService.uninstallWorkflow(
      workflowId,
      clientId
    );

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error,
      });
    }

    logger.info(`Workflow ${workflowId} uninstalled for client ${clientId}`);

    res.json({
      success: true,
      message: 'Workflow uninstalled successfully',
    });
  } catch (error) {
    logger.error('Error uninstalling workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to uninstall workflow',
    });
  }
});

/**
 * GET /api/marketplace/installations
 * Get all installations for a client
 */
router.get('/installations', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.query;

    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Client ID is required',
      });
    }

    const installations = await installerService.getClientInstallations(clientId);

    res.json({
      success: true,
      data: installations,
    });
  } catch (error) {
    logger.error('Error fetching installations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch installations',
    });
  }
});

/**
 * GET /api/marketplace/installations/:installationId
 * Get installation details
 */
router.get(
  '/installations/:installationId',
  async (req: Request, res: Response) => {
    try {
      const { installationId } = req.params;

      const installation = await Installation.findOne({ installationId });

      if (!installation) {
        return res.status(404).json({
          success: false,
          error: 'Installation not found',
        });
      }

      res.json({
        success: true,
        data: installation,
      });
    } catch (error) {
      logger.error('Error fetching installation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch installation',
      });
    }
  }
);

/**
 * PATCH /api/marketplace/installations/:installationId/status
 * Update installation status
 */
router.patch(
  '/installations/:installationId/status',
  async (req: Request, res: Response) => {
    try {
      const { installationId } = req.params;
      const { status } = req.body;

      if (!['pending', 'active', 'paused', 'failed'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
        });
      }

      const installation = await installerService.updateStatus(
        installationId,
        status
      );

      if (!installation) {
        return res.status(404).json({
          success: false,
          error: 'Installation not found',
        });
      }

      res.json({
        success: true,
        data: installation,
      });
    } catch (error) {
      logger.error('Error updating installation status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update installation status',
      });
    }
  }
);

/**
 * POST /api/marketplace/installations/:installationId/trigger
 * Record workflow trigger
 */
router.post(
  '/installations/:installationId/trigger',
  async (req: Request, res: Response) => {
    try {
      const { installationId } = req.params;

      const installation = await Installation.findOne({ installationId });

      if (!installation) {
        return res.status(404).json({
          success: false,
          error: 'Installation not found',
        });
      }

      await installerService.recordTrigger(installationId);

      res.json({
        success: true,
        message: 'Trigger recorded',
      });
    } catch (error) {
      logger.error('Error recording trigger:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record trigger',
      });
    }
  }
);

export default router;

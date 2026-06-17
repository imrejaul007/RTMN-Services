import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Knowledge } from '../models/Knowledge';
import { Installation } from '../models/Installation';
import { installerService } from '../services/installer';
import { ApiResponse, InstallRequest, InstallationDocument } from '../types';

const router = Router();

// Validation schema
const InstallSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientName: z.string().min(1, 'Client name is required')
});

// POST /api/marketplace/:knowledgeId/install - Install knowledge
router.post('/:knowledgeId/install', async (req: Request, res: Response) => {
  try {
    const { knowledgeId } = req.params;
    const body = InstallSchema.parse(req.body);

    // Check if knowledge exists
    const knowledge = await Knowledge.findOne({ knowledgeId, isPublished: true });
    if (!knowledge) {
      const response: ApiResponse<null> = { success: false, error: 'Knowledge not found' };
      return res.status(404).json(response);
    }

    // Check if already installed
    const existingInstall = await Installation.findOne({
      knowledgeId,
      clientId: body.clientId,
      status: 'active'
    });

    if (existingInstall) {
      const response: ApiResponse<InstallationDocument> = {
        success: true,
        data: existingInstall,
        message: 'Knowledge already installed'
      };
      return res.json(response);
    }

    // Perform installation
    const installation = await installerService.install({
      knowledgeId,
      clientId: body.clientId,
      clientName: body.clientName
    });

    // Update install count
    await Knowledge.updateOne(
      { knowledgeId },
      { $inc: { installs: 1 } }
    );

    const response: ApiResponse<InstallationDocument> = {
      success: true,
      data: installation,
      message: 'Knowledge installed successfully'
    };
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      console.error('Install error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
});

// GET /api/marketplace/installs/:clientId - Get client's installations
router.get('/installs/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { status = 'active' } = req.query;

    const installations = await Installation.find({
      clientId,
      status: status as string
    }).populate('knowledgeId');

    const response: ApiResponse<typeof installations> = { success: true, data: installations };
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/marketplace/:knowledgeId/uninstall - Uninstall knowledge
router.delete('/:knowledgeId/uninstall', async (req: Request, res: Response) => {
  try {
    const { knowledgeId } = req.params;
    const { clientId } = req.body;

    if (!clientId) {
      return res.status(400).json({ success: false, error: 'Client ID is required' });
    }

    const installation = await installerService.uninstall(knowledgeId, clientId);

    if (!installation) {
      return res.status(404).json({ success: false, error: 'Installation not found' });
    }

    const response: ApiResponse<InstallationDocument> = {
      success: true,
      data: installation,
      message: 'Knowledge uninstalled successfully'
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/marketplace/:knowledgeId/track-usage - Track usage
router.post('/:knowledgeId/track-usage', async (req: Request, res: Response) => {
  try {
    const { knowledgeId } = req.params;
    const { clientId } = req.body;

    if (!clientId) {
      return res.status(400).json({ success: false, error: 'Client ID is required' });
    }

    const updated = await Installation.findOneAndUpdate(
      { knowledgeId, clientId, status: 'active' },
      {
        $inc: { usageCount: 1 },
        $set: { lastUsedAt: new Date() }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Installation not found' });
    }

    const response: ApiResponse<InstallationDocument> = {
      success: true,
      data: updated
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;

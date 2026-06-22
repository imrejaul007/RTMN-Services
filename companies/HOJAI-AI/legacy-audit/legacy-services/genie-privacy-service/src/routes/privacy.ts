import { Router, Response } from 'express';
import {
  AuthenticatedRequest,
  requireUser
} from '../middleware/tenant';
import { strictRateLimit } from '../middleware/security';
import { PrivacyService } from '../services/privacyService';
import {
  UpdatePrivacySettingsSchema,
  IncognitoToggleSchema,
  AuditQuerySchema,
  ExportDataSchema,
  Storage
} from '../types';

export const createPrivacyRouter = (storage: Storage): Router => {
  const router = Router();
  const privacyService = new PrivacyService(storage);

  // All routes require user authentication
  router.use(requireUser);

  /**
   * GET /api/privacy/settings
   * Get privacy settings for the authenticated user
   */
  router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.tenant!.userId!;
      const settings = await privacyService.getOrCreateSettings(userId);

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error getting privacy settings:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve privacy settings'
        }
      });
    }
  });

  /**
   * PUT /api/privacy/settings
   * Update privacy settings
   */
  router.put(
    '/settings',
    strictRateLimit,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.tenant!.userId!;

        const parseResult = UpdatePrivacySettingsSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: parseResult.error.errors
            }
          });
          return;
        }

        const updated = await privacyService.updateSettings(
          userId,
          parseResult.data
        );

        res.json({
          success: true,
          data: updated,
          message: 'Privacy settings updated successfully'
        });
      } catch (error) {
        console.error('Error updating privacy settings:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update privacy settings'
          }
        });
      }
    }
  );

  /**
   * POST /api/privacy/incognito
   * Toggle incognito mode
   */
  router.post(
    '/incognito',
    strictRateLimit,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.tenant!.userId!;

        const parseResult = IncognitoToggleSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: parseResult.error.errors
            }
          });
          return;
        }

        const { enabled, duration_minutes } = parseResult.data;
        const updated = await privacyService.toggleIncognito(
          userId,
          enabled,
          duration_minutes
        );

        res.json({
          success: true,
          data: {
            incognito_mode: updated.incognito_mode
          },
          message: enabled
            ? 'Incognito mode enabled'
            : 'Incognito mode disabled'
        });
      } catch (error) {
        console.error('Error toggling incognito:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to toggle incognito mode'
          }
        });
      }
    }
  );

  /**
   * POST /api/privacy/memory/:id/delete
   * Delete a specific memory
   */
  router.post(
    '/memory/:id/delete',
    strictRateLimit,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.tenant!.userId!;
        const memoryId = req.params.id;
        const reason = req.body?.reason as string | undefined;

        if (!memoryId) {
          res.status(400).json({
            success: false,
            error: {
              code: 'MISSING_MEMORY_ID',
              message: 'Memory ID is required'
            }
          });
          return;
        }

        const deleted = await privacyService.deleteMemory(
          userId,
          memoryId,
          reason
        );

        if (!deleted) {
          res.status(404).json({
            success: false,
            error: {
              code: 'MEMORY_NOT_FOUND',
              message: 'Memory not found'
            }
          });
          return;
        }

        res.json({
          success: true,
          message: 'Memory deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting memory:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete memory'
          }
        });
      }
    }
  );

  /**
   * POST /api/privacy/export
   * Export all user data
   */
  router.post(
    '/export',
    strictRateLimit,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.tenant!.userId!;

        const parseResult = ExportDataSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: parseResult.error.errors
            }
          });
          return;
        }

        const exportedData = await privacyService.exportData(userId, {
          includeMemories: parseResult.data.include_memories,
          includeSettings: parseResult.data.include_settings,
          includeAuditLog: parseResult.data.include_audit_log,
          format: parseResult.data.format
        });

        res.json({
          success: true,
          data: exportedData,
          message: 'Data exported successfully'
        });
      } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to export data'
          }
        });
      }
    }
  );

  /**
   * DELETE /api/privacy/delete-all
   * Delete all user data
   */
  router.delete(
    '/delete-all',
    strictRateLimit,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.tenant!.userId!;

        const result = await privacyService.deleteAllData(userId);

        res.json({
          success: true,
          data: result,
          message: 'All data deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting all data:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete all data'
          }
        });
      }
    }
  );

  /**
   * GET /api/privacy/audit
   * Get audit log
   */
  router.get('/audit', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.tenant!.userId!;

      const parseResult = AuditQuerySchema.safeParse({
        event_type: req.query.event_type,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50
      });

      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: parseResult.error.errors
          }
        });
        return;
      }

      const logs = await privacyService.getAuditLog(userId, parseResult.data);

      res.json({
        success: true,
        data: logs,
        count: logs.length
      });
    } catch (error) {
      console.error('Error getting audit log:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve audit log'
        }
      });
    }
  });

  return router;
};

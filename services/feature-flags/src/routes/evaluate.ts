import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FlagModel } from '../models/Flag';
import { EvaluationService } from '../services/evaluator';
import { TargetingService } from '../services/targeting';
import { flags, evaluationLogs, EvaluationContext, EvaluationLog } from '../index';

const router = Router();

// Initialize services
const evaluationService = new EvaluationService();
const targetingService = new TargetingService();

/**
 * POST /api/evaluate
 * Evaluate a single flag for a given context
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { flagKey, context } = req.body as {
      flagKey: string;
      context: EvaluationContext;
    };

    if (!flagKey || !context) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'flagKey and context are required'
      });
    }

    const flag = FlagModel.findByKey(flagKey, context.environment);

    if (!flag) {
      // Return default value for non-existent flags
      return res.json({
        success: true,
        data: {
          result: false,
          reason: 'FLAG_NOT_FOUND',
          flagKey,
          flagId: null
        }
      });
    }

    const evaluation = evaluationService.evaluate(flag, context);

    // Log evaluation
    const log: EvaluationLog = {
      id: uuidv4(),
      flagKey,
      flagId: flag.id,
      context,
      result: evaluation.result,
      reason: evaluation.reason,
      evaluatedAt: new Date().toISOString(),
      environment: context.environment
    };
    evaluationLogs.push(log);

    res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to evaluate flag',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/evaluate/batch
 * Evaluate multiple flags for a given context
 */
router.post('/batch', (req: Request, res: Response) => {
  try {
    const { flagKeys, context } = req.body as {
      flagKeys: string[];
      context: EvaluationContext;
    };

    if (!flagKeys || !Array.isArray(flagKeys) || flagKeys.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'flagKeys array is required'
      });
    }

    if (!context) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'context is required'
      });
    }

    const results: Record<string, {
      result: boolean | string | number | object;
      reason: string;
      flagId: string | null;
      enabled: boolean;
    }> = {};

    for (const flagKey of flagKeys) {
      const flag = FlagModel.findByKey(flagKey, context.environment);

      if (!flag) {
        results[flagKey] = {
          result: false,
          reason: 'FLAG_NOT_FOUND',
          flagId: null,
          enabled: false
        };
        continue;
      }

      const evaluation = evaluationService.evaluate(flag, context);
      results[flagKey] = {
        ...evaluation,
        enabled: flag.enabled
      };

      // Log evaluation
      const log: EvaluationLog = {
        id: uuidv4(),
        flagKey,
        flagId: flag.id,
        context,
        result: evaluation.result,
        reason: evaluation.reason,
        evaluatedAt: new Date().toISOString(),
        environment: context.environment
      };
      evaluationLogs.push(log);
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to evaluate flags',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/evaluate/all
 * Evaluate all flags for a given context
 */
router.post('/all', (req: Request, res: Response) => {
  try {
    const { context, onlyEnabled = true } = req.body as {
      context: EvaluationContext;
      onlyEnabled?: boolean;
    };

    if (!context) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'context is required'
      });
    }

    let flagsList = FlagModel.findAll({ environment: context.environment });

    if (onlyEnabled) {
      flagsList = flagsList.filter(f => f.enabled);
    }

    const results: Record<string, {
      result: boolean | string | number | object;
      reason: string;
      flagId: string;
      enabled: boolean;
    }> = {};

    for (const flag of flagsList) {
      const evaluation = evaluationService.evaluate(flag, context);
      results[flag.key] = {
        ...evaluation,
        enabled: flag.enabled,
        flagId: flag.id
      };

      // Log evaluation
      const log: EvaluationLog = {
        id: uuidv4(),
        flagKey: flag.key,
        flagId: flag.id,
        context,
        result: evaluation.result,
        reason: evaluation.reason,
        evaluatedAt: new Date().toISOString(),
        environment: context.environment
      };
      evaluationLogs.push(log);
    }

    res.json({
      success: true,
      data: results,
      count: flagsList.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to evaluate flags',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/evaluate/sdk-keys
 * Get list of all flag keys for SDK initialization
 */
router.get('/sdk-keys', (req: Request, res: Response) => {
  try {
    const { environment } = req.query;

    const flagsList = FlagModel.findAll(
      environment ? { environment: environment as string } : undefined
    );

    const keys = flagsList.map(f => f.key);

    res.json({
      success: true,
      data: keys,
      count: keys.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SDK keys',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/evaluate/variant
 * Evaluate a multi-variant flag and return specific variant
 */
router.post('/variant', (req: Request, res: Response) => {
  try {
    const { flagKey, context } = req.body as {
      flagKey: string;
      context: EvaluationContext;
    };

    if (!flagKey || !context) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'flagKey and context are required'
      });
    }

    const flag = FlagModel.findByKey(flagKey, context.environment);

    if (!flag) {
      return res.json({
        success: true,
        data: {
          variantKey: 'default',
          value: null,
          reason: 'FLAG_NOT_FOUND'
        }
      });
    }

    if (flag.variantType === 'boolean') {
      const evaluation = evaluationService.evaluate(flag, context);
      return res.json({
        success: true,
        data: {
          variantKey: evaluation.result ? 'enabled' : 'disabled',
          value: evaluation.result,
          reason: evaluation.reason
        }
      });
    }

    const variantKey = targetingService.determineVariant(flag, context);

    res.json({
      success: true,
      data: {
        variantKey,
        value: flag.variants?.[variantKey] ?? flag.defaultValue,
        reason: `TARGETING_RULE_MATCH: ${variantKey}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to evaluate variant',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

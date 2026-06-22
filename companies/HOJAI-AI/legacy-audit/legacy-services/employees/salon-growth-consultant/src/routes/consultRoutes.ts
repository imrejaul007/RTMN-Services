import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  StaffConsultSchema,
  BookingConsultSchema,
  MembershipConsultSchema,
  PackageConsultSchema,
  ScheduleConsultSchema,
  GrowthConsultSchema,
} from '../types';
import { staffAnalyzerService } from '../services/staffAnalyzer';
import { bookingOptimizerService } from '../services/bookingOptimizer';
import { membershipManagerService } from '../services/membershipManager';
import { packageAdvisorService } from '../services/packageAdvisor';
import { scheduleOptimizerService } from '../services/scheduleOptimizer';
import { growthAdvisorService } from '../services/growthAdvisor';

const router = Router();

// ============================================
// Health Check
// ============================================

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: 'Salon Growth Consultant',
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  });
});

// ============================================
// Staff Utilization
// ============================================

/**
 * POST /api/consult/staff
 * Analyze staff utilization and provide optimization recommendations
 */
router.post('/staff', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const validatedData = StaffConsultSchema.parse(req.body);
    const result = await staffAnalyzerService.analyzeStaff(validatedData);

    res.json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'staff-analyzer-v1',
        confidence: 0.92,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
      return;
    }

    console.error('Staff analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to analyze staff utilization',
      },
    });
  }
});

// ============================================
// Booking Optimization
// ============================================

/**
 * POST /api/consult/bookings
 * Analyze booking patterns and provide optimization recommendations
 */
router.post('/bookings', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const validatedData = BookingConsultSchema.parse(req.body);
    const result = await bookingOptimizerService.analyze(validatedData);

    res.json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'booking-optimizer-v1',
        confidence: 0.89,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
      return;
    }

    console.error('Booking analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to analyze booking optimization',
      },
    });
  }
});

// ============================================
// Membership Setup
// ============================================

/**
 * POST /api/consult/memberships
 * Design or optimize membership program
 */
router.post('/memberships', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const validatedData = MembershipConsultSchema.parse(req.body);
    const result = await membershipManagerService.designProgram(validatedData);

    res.json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'membership-manager-v1',
        confidence: 0.88,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
      return;
    }

    console.error('Membership design error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to design membership program',
      },
    });
  }
});

// ============================================
// Package Recommendations
// ============================================

/**
 * POST /api/consult/packages
 * Generate beauty package recommendations
 */
router.post('/packages', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const validatedData = PackageConsultSchema.parse(req.body);
    const result = await packageAdvisorService.recommend(validatedData);

    res.json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'package-advisor-v1',
        confidence: 0.87,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
      return;
    }

    console.error('Package recommendation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate package recommendations',
      },
    });
  }
});

// ============================================
// Staff Scheduling
// ============================================

/**
 * POST /api/consult/scheduling
 * Optimize staff scheduling
 */
router.post('/scheduling', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const validatedData = ScheduleConsultSchema.parse(req.body);
    const result = await scheduleOptimizerService.optimize(validatedData);

    res.json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'schedule-optimizer-v1',
        confidence: 0.86,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
      return;
    }

    console.error('Schedule optimization error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to optimize schedule',
      },
    });
  }
});

// ============================================
// Growth Recommendations
// ============================================

/**
 * GET /api/consult/growth
 * Get comprehensive salon growth recommendations
 */
router.get('/growth', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Support both GET and POST for growth endpoint
    const body = req.method === 'POST' ? req.body : req.query;

    if (!body.salonId || !body.salonProfile || !body.financialMetrics || !body.clientMetrics) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: salonId, salonProfile, financialMetrics, clientMetrics',
        },
      });
      return;
    }

    const validatedData = GrowthConsultSchema.parse(body);
    const result = await growthAdvisorService.advise(validatedData);

    res.json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'growth-advisor-v1',
        confidence: 0.90,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
      return;
    }

    console.error('Growth recommendations error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate growth recommendations',
      },
    });
  }
});

/**
 * POST /api/consult/growth
 * Get comprehensive salon growth recommendations (POST method)
 */
router.post('/growth', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    if (!req.body.salonId || !req.body.salonProfile || !req.body.financialMetrics || !req.body.clientMetrics) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: salonId, salonProfile, financialMetrics, clientMetrics',
        },
      });
      return;
    }

    const validatedData = GrowthConsultSchema.parse(req.body);
    const result = await growthAdvisorService.advise(validatedData);

    res.json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'growth-advisor-v1',
        confidence: 0.90,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
      return;
    }

    console.error('Growth recommendations error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate growth recommendations',
      },
    });
  }
});

// ============================================
// Analytics Summary
// ============================================

/**
 * GET /api/consult/analytics
 * Get analytics summary for all modules
 */
router.get('/analytics', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { salonId } = req.query;

    if (!salonId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required field: salonId',
        },
      });
      return;
    }

    // Return a summary of available analytics
    const analytics = {
      modules: [
        {
          name: 'Staff Utilization',
          endpoint: 'POST /api/consult/staff',
          metrics: ['utilization', 'revenue_per_hour', 'top_performers'],
        },
        {
          name: 'Booking Optimization',
          endpoint: 'POST /api/consult/bookings',
          metrics: ['repeat_rate', 'upsell_rate', 'no_show_rate'],
        },
        {
          name: 'Membership',
          endpoint: 'POST /api/consult/memberships',
          metrics: ['members', 'mrr', 'churn_rate'],
        },
        {
          name: 'Packages',
          endpoint: 'POST /api/consult/packages',
          metrics: ['conversion', 'avg_value', 'margin'],
        },
        {
          name: 'Scheduling',
          endpoint: 'POST /api/consult/scheduling',
          metrics: ['utilization', 'buffer_time', 'peak_coverage'],
        },
        {
          name: 'Growth',
          endpoint: 'GET/POST /api/consult/growth',
          metrics: ['revenue', 'clients', 'growth_rate'],
        },
      ],
      availableFilters: ['dateRange', 'staffId', 'serviceCategory'],
    };

    res.json({
      success: true,
      data: analytics,
      metadata: {
        processingTime: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get analytics summary',
      },
    });
  }
});

export default router;

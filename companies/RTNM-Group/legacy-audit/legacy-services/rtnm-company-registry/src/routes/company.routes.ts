import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import companyService from '../services/company.service';
import logger from '../utils/logger';

const router = Router();

// Validation schemas
const registerCompanySchema = Joi.object({
  corpId: Joi.string().required().min(3).max(50),
  name: Joi.string().required().min(2).max(200),
  type: Joi.string().required(),
  industry: Joi.string().required(),
  registrationNumber: Joi.string().optional(),
  taxId: Joi.string().optional(),
  aiAgentId: Joi.string().optional(),
  creditLimit: Joi.number().optional().min(0),
  walletId: Joi.string().optional(),
  metadata: Joi.object().optional(),
});

const updateCompanySchema = Joi.object({
  name: Joi.string().optional().min(2).max(200),
  type: Joi.string().optional(),
  industry: Joi.string().optional(),
  registrationNumber: Joi.string().optional().allow(''),
  taxId: Joi.string().optional().allow(''),
  aiAgentId: Joi.string().optional().allow(''),
  creditLimit: Joi.number().optional().min(0),
  walletId: Joi.string().optional().allow(''),
  status: Joi.string().optional().valid('active', 'inactive', 'suspended', 'pending', 'archived'),
  trustScore: Joi.number().optional().min(0).max(100),
  metadata: Joi.object().optional(),
}).min(1);

const addServiceSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().required(),
  port: Joi.number().optional(),
  endpoint: Joi.string().optional(),
  status: Joi.string().optional().valid('active', 'inactive', 'maintenance', 'deprecated'),
  version: Joi.string().optional(),
  healthCheckUrl: Joi.string().optional(),
  isInternal: Joi.boolean().optional().default(true),
  isExternal: Joi.boolean().optional().default(false),
  tier: Joi.string().optional().valid('core', 'support', 'utility'),
  monthlyCalls: Joi.number().optional().default(0),
});

const ledgerEntrySchema = Joi.object({
  type: Joi.string().required().valid('credit', 'debit'),
  amount: Joi.number().required().min(0),
  currency: Joi.string().optional().default('INR'),
  description: Joi.string().required(),
  referenceId: Joi.string().optional(),
  relatedCorpId: Joi.string().optional(),
});

// Validation middleware
const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }
    next();
  };
};

// Error handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * @route   POST /companies
 * @desc    Register a new company
 * @access  Public (in production, add authentication)
 */
router.post(
  '/',
  validate(registerCompanySchema),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('POST /companies - Registering new company');

    const company = await companyService.registerCompany(req.body);

    res.status(201).json({
      success: true,
      message: 'Company registered successfully',
      data: company,
    });
  })
);

/**
 * @route   GET /companies
 * @desc    Get all companies with filters and pagination
 * @access  Public
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('GET /companies - Getting all companies');

    const filters = {
      type: req.query.type as string,
      industry: req.query.industry as string,
      status: req.query.status as string,
      minTrustScore: req.query.minTrustScore ? parseFloat(req.query.minTrustScore as string) : undefined,
      maxTrustScore: req.query.maxTrustScore ? parseFloat(req.query.maxTrustScore as string) : undefined,
      minCreditLimit: req.query.minCreditLimit ? parseFloat(req.query.minCreditLimit as string) : undefined,
      maxCreditLimit: req.query.maxCreditLimit ? parseFloat(req.query.maxCreditLimit as string) : undefined,
      search: req.query.search as string,
    };

    const pagination = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await companyService.getAllCompanies(filters, pagination);

    res.json({
      success: true,
      data: result.companies,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  })
);

/**
 * @route   GET /companies/stats
 * @desc    Get network statistics
 * @access  Public
 */
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('GET /companies/stats - Getting network statistics');

    const stats = await companyService.getNetworkStats();

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * @route   GET /companies/:corpId
 * @desc    Get company by corpId
 * @access  Public
 */
router.get(
  '/:corpId',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`GET /companies/:corpId - Getting company ${req.params.corpId}`);

    const company = await companyService.getCompany(req.params.corpId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: `Company not found: ${req.params.corpId}`,
      });
    }

    res.json({
      success: true,
      data: company,
    });
  })
);

/**
 * @route   PUT /companies/:corpId
 * @desc    Update company
 * @access  Public
 */
router.put(
  '/:corpId',
  validate(updateCompanySchema),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`PUT /companies/:corpId - Updating company ${req.params.corpId}`);

    const company = await companyService.updateCompany(req.params.corpId, req.body);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: `Company not found: ${req.params.corpId}`,
      });
    }

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: company,
    });
  })
);

/**
 * @route   DELETE /companies/:corpId
 * @desc    Deactivate company
 * @access  Public
 */
router.delete(
  '/:corpId',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`DELETE /companies/:corpId - Deactivating company ${req.params.corpId}`);

    const company = await companyService.deactivateCompany(req.params.corpId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: `Company not found: ${req.params.corpId}`,
      });
    }

    res.json({
      success: true,
      message: 'Company deactivated successfully',
      data: company,
    });
  })
);

/**
 * @route   PATCH /companies/:corpId/activate
 * @desc    Activate company
 * @access  Public
 */
router.patch(
  '/:corpId/activate',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`PATCH /companies/:corpId/activate - Activating company ${req.params.corpId}`);

    const company = await companyService.activateCompany(req.params.corpId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: `Company not found: ${req.params.corpId}`,
      });
    }

    res.json({
      success: true,
      message: 'Company activated successfully',
      data: company,
    });
  })
);

/**
 * @route   PATCH /companies/:corpId/trust-score
 * @desc    Update trust score
 * @access  Public
 */
router.patch(
  '/:corpId/trust-score',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`PATCH /companies/:corpId/trust-score - Updating trust score ${req.params.corpId}`);

    const { score } = req.body;

    if (score === undefined || typeof score !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Trust score is required and must be a number',
      });
    }

    const company = await companyService.updateTrustScore(req.params.corpId, score);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: `Company not found: ${req.params.corpId}`,
      });
    }

    res.json({
      success: true,
      message: 'Trust score updated successfully',
      data: { trustScore: company.trustScore },
    });
  })
);

/**
 * @route   PATCH /companies/:corpId/revenue
 * @desc    Update monthly revenue
 * @access  Public
 */
router.patch(
  '/:corpId/revenue',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`PATCH /companies/:corpId/revenue - Updating revenue ${req.params.corpId}`);

    const { revenue } = req.body;

    if (revenue === undefined || typeof revenue !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Revenue is required and must be a number',
      });
    }

    const company = await companyService.updateMonthlyRevenue(req.params.corpId, revenue);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: `Company not found: ${req.params.corpId}`,
      });
    }

    res.json({
      success: true,
      message: 'Monthly revenue updated successfully',
      data: { monthlyRevenue: company.monthlyRevenue },
    });
  })
);

/**
 * @route   GET /companies/:corpId/services
 * @desc    Get company services
 * @access  Public
 */
router.get(
  '/:corpId/services',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`GET /companies/:corpId/services - Getting services for ${req.params.corpId}`);

    const services = await companyService.getCompanyServices(req.params.corpId);

    res.json({
      success: true,
      data: services,
    });
  })
);

/**
 * @route   POST /companies/:corpId/services/provided
 * @desc    Add a service provided by the company
 * @access  Public
 */
router.post(
  '/:corpId/services/provided',
  validate(addServiceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`POST /companies/:corpId/services/provided - Adding service to ${req.params.corpId}`);

    const company = await companyService.addServiceProvided(req.params.corpId, req.body);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: `Company not found: ${req.params.corpId}`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Service added successfully',
      data: {
        servicesProvided: company.servicesProvided,
      },
    });
  })
);

/**
 * @route   POST /companies/:corpId/services/consumed
 * @desc    Add a service consumed by the company
 * @access  Public
 */
router.post(
  '/:corpId/services/consumed',
  validate(addServiceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`POST /companies/:corpId/services/consumed - Adding consumed service to ${req.params.corpId}`);

    const company = await companyService.addServiceConsumed(req.params.corpId, req.body);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: `Company not found: ${req.params.corpId}`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Consumed service added successfully',
      data: {
        servicesConsumed: company.servicesConsumed,
      },
    });
  })
);

/**
 * @route   GET /companies/:corpId/ledger
 * @desc    Get company ledger
 * @access  Public
 */
router.get(
  '/:corpId/ledger',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`GET /companies/:corpId/ledger - Getting ledger for ${req.params.corpId}`);

    const options = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const ledger = await companyService.getCompanyLedger(req.params.corpId, options);

    res.json({
      success: true,
      data: ledger.entries,
      summary: ledger.summary,
      pagination: {
        total: ledger.total,
        page: ledger.page,
        limit: ledger.limit,
        totalPages: ledger.totalPages,
      },
    });
  })
);

/**
 * @route   POST /companies/:corpId/ledger
 * @desc    Add ledger entry
 * @access  Public
 */
router.post(
  '/:corpId/ledger',
  validate(ledgerEntrySchema),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`POST /companies/:corpId/ledger - Adding ledger entry to ${req.params.corpId}`);

    const entry = await companyService.addLedgerEntry(req.params.corpId, req.body);

    res.status(201).json({
      success: true,
      message: 'Ledger entry added successfully',
      data: entry,
    });
  })
);

/**
 * @route   DELETE /companies/:corpId
 * @desc    Hard delete company
 * @access  Public
 */
router.delete(
  '/:corpId/hard',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`DELETE /companies/:corpId/hard - Hard deleting company ${req.params.corpId}`);

    try {
      await companyService.deleteCompany(req.params.corpId);

      res.json({
        success: true,
        message: 'Company deleted successfully',
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: `Company not found: ${req.params.corpId}`,
      });
    }
  })
);

export default router;
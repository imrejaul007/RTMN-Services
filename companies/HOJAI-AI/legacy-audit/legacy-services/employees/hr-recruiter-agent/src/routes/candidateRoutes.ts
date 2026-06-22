/**
 * HR Recruiter Agent - Candidate Routes
 * Candidate management endpoints
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { candidateQualifier } from '../services/candidateQualifier';
import { skillsMatcher } from '../services/skillsMatcher';
import {
  CreateCandidateSchema,
  UpdateCandidateSchema,
  CandidateQuerySchema,
  QualifyCandidateSchema,
} from '../schemas';
import {
  CandidateStatus,
  SalaryCurrency,
  Candidate,
  QualificationResult,
  SkillsAnalysis,
} from '../types';

const router = Router();

// In-memory storage (replace with database in production)
const candidates = new Map<string, Candidate>();
const qualifications = new Map<string, QualificationResult>();
const skillsAnalyses = new Map<string, SkillsAnalysis>();

/**
 * POST /api/candidates
 * Create a new candidate
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = CreateCandidateSchema.parse(req.body);

    const candidate: Candidate = {
      id: uuidv4(),
      tenantId: 'default',
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      contact: validatedData.contact,
      headline: validatedData.headline,
      summary: validatedData.summary,
      experience: validatedData.experience || [],
      education: validatedData.education || [],
      skills: validatedData.skills || [],
      certifications: validatedData.certifications || [],
      languages: validatedData.languages,
      source: validatedData.source,
      referredBy: validatedData.referredBy,
      jobId: validatedData.jobId,
      tags: validatedData.tags,
      notes: validatedData.notes,
      rating: validatedData.rating,
      salaryExpectation: validatedData.salaryExpectation,
      noticePeriod: validatedData.noticePeriod,
      availableFrom: validatedData.availableFrom,
      status: CandidateStatus.NEW,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.headers['x-user-id']?.toString() || 'system',
    };

    candidates.set(candidate.id, candidate);

    const response = {
      success: true,
      data: candidate,
    };

    res.status(201).json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create candidate',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * GET /api/candidates
 * List candidates with filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const queryParams = {
      ...req.query,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const query = CandidateQuerySchema.parse(queryParams);

    let filteredCandidates = Array.from(candidates.values());

    // Apply filters
    if (query.status && query.status.length > 0) {
      filteredCandidates = filteredCandidates.filter(c => query.status!.includes(c.status));
    }

    if (query.jobId) {
      filteredCandidates = filteredCandidates.filter(c => c.jobId === query.jobId);
    }

    if (query.source) {
      filteredCandidates = filteredCandidates.filter(c => c.source === query.source);
    }

    if (query.minRating) {
      filteredCandidates = filteredCandidates.filter(c => (c.rating || 0) >= query.minRating!);
    }

    if (query.skills && query.skills.length > 0) {
      filteredCandidates = filteredCandidates.filter(c =>
        c.skills.some(s => query.skills!.includes(s.name))
      );
    }

    // Sort
    const sortMultiplier = query.sortOrder === 'desc' ? -1 : 1;
    filteredCandidates.sort((a, b) => {
      switch (query.sortBy) {
        case 'firstName':
          return sortMultiplier * a.firstName.localeCompare(b.firstName);
        case 'rating':
          return sortMultiplier * ((a.rating || 0) - (b.rating || 0));
        case 'updatedAt':
        case 'createdAt':
          const aDate = a[query.sortBy as keyof Candidate];
          const bDate = b[query.sortBy as keyof Candidate];
          return sortMultiplier * (new Date(aDate as string).getTime() - new Date(bDate as string).getTime());
        default:
          return 0;
      }
    });

    // Paginate
    const total = filteredCandidates.length;
    const page = query.page;
    const limit = query.limit;
    const startIndex = (page - 1) * limit;
    const paginatedCandidates = filteredCandidates.slice(startIndex, startIndex + limit);

    const response = {
      success: true,
      data: paginatedCandidates,
      meta: {
        page,
        limit,
        total,
        hasMore: startIndex + limit < total,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: 'LIST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list candidates',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * GET /api/candidates/:id
 * Get candidate by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const candidate = candidates.get(id);

    if (!candidate) {
      const response = {
        success: false,
        error: {
          code: 'CANDIDATE_NOT_FOUND',
          message: 'Candidate not found',
        },
      };
      return res.status(404).json(response);
    }

    const response = {
      success: true,
      data: candidate,
    };

    res.status(200).json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: 'GET_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get candidate',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * PUT /api/candidates/:id
 * Update candidate
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existingCandidate = candidates.get(id);

    if (!existingCandidate) {
      const response = {
        success: false,
        error: {
          code: 'CANDIDATE_NOT_FOUND',
          message: 'Candidate not found',
        },
      };
      return res.status(404).json(response);
    }

    const validatedData = UpdateCandidateSchema.parse(req.body);

    const updatedCandidate: Candidate = {
      ...existingCandidate,
      ...validatedData,
      id: existingCandidate.id,
      tenantId: existingCandidate.tenantId,
      updatedAt: new Date().toISOString(),
    };

    candidates.set(id, updatedCandidate);

    const response = {
      success: true,
      data: updatedCandidate,
    };

    res.status(200).json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update candidate',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * DELETE /api/candidates/:id
 * Delete candidate
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!candidates.has(id)) {
      const response = {
        success: false,
        error: {
          code: 'CANDIDATE_NOT_FOUND',
          message: 'Candidate not found',
        },
      };
      return res.status(404).json(response);
    }

    candidates.delete(id);

    const response = {
      success: true,
      data: { deleted: true, id },
    };

    res.status(200).json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete candidate',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * POST /api/candidates/qualify
 * Qualify a candidate
 */
router.post('/qualify', async (req: Request, res: Response) => {
  try {
    const validatedData = QualifyCandidateSchema.parse(req.body);

    const candidate = candidates.get(validatedData.candidateId);
    if (!candidate) {
      const response = {
        success: false,
        error: {
          code: 'CANDIDATE_NOT_FOUND',
          message: 'Candidate not found',
        },
      };
      return res.status(404).json(response);
    }

    const qualification = candidateQualifier.qualifyCandidate(
      candidate,
      validatedData.criteria,
      undefined,
      req.headers['x-user-id']?.toString() || 'system'
    );

    qualifications.set(candidate.id, qualification);

    // Update candidate status based on qualification
    if (qualification.qualificationStatus === 'highly_qualified' || qualification.qualificationStatus === 'qualified') {
      candidate.status = CandidateStatus.QUALIFIED;
    } else if (qualification.qualificationStatus === 'marginally_qualified') {
      candidate.status = CandidateStatus.SCREENING;
    } else {
      candidate.status = CandidateStatus.REJECTED;
    }
    candidate.qualifications = qualification;
    candidate.updatedAt = new Date().toISOString();

    const response = {
      success: true,
      data: qualification,
    };

    res.status(200).json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: 'QUALIFICATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to qualify candidate',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * GET /api/candidates/:id/skills
 * Get skills analysis for a candidate
 */
router.get('/:id/skills', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { jobId } = req.query;

    const candidate = candidates.get(id);
    if (!candidate) {
      const response = {
        success: false,
        error: {
          code: 'CANDIDATE_NOT_FOUND',
          message: 'Candidate not found',
        },
      };
      return res.status(404).json(response);
    }

    const analysis = skillsMatcher.analyzeSkills(candidate, undefined);
    skillsAnalyses.set(`${id}-${jobId || 'general'}`, analysis);

    const response = {
      success: true,
      data: analysis,
    };

    res.status(200).json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: 'SKILLS_ANALYSIS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to analyze skills',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * POST /api/candidates/:id/rate
 * Rate a candidate
 */
router.post('/:id/rate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, notes } = req.body;

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      const response = {
        success: false,
        error: {
          code: 'INVALID_RATING',
          message: 'Rating must be a number between 1 and 5',
        },
      };
      return res.status(400).json(response);
    }

    const candidate = candidates.get(id);
    if (!candidate) {
      const response = {
        success: false,
        error: {
          code: 'CANDIDATE_NOT_FOUND',
          message: 'Candidate not found',
        },
      };
      return res.status(404).json(response);
    }

    candidate.rating = rating;
    if (notes) {
      candidate.notes = (candidate.notes || '') + '\n' + `[${new Date().toISOString()}] Rating: ${notes}`;
    }
    candidate.updatedAt = new Date().toISOString();

    const response = {
      success: true,
      data: candidate,
    };

    res.status(200).json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: 'RATING_ERROR',
        message: error instanceof Error ? error.message : 'Failed to rate candidate',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * GET /api/candidates/:id/qualification
 * Get qualification result for a candidate
 */
router.get('/:id/qualification', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const qualification = qualifications.get(id);

    if (!qualification) {
      const response = {
        success: false,
        error: {
          code: 'QUALIFICATION_NOT_FOUND',
          message: 'Qualification not found. Run /qualify first.',
        },
      };
      return res.status(404).json(response);
    }

    const response = {
      success: true,
      data: qualification,
    };

    res.status(200).json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: 'GET_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get qualification',
      },
    };
    res.status(400).json(response);
  }
});

export default router;

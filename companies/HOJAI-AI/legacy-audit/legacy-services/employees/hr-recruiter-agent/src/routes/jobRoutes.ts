/**
 * HR Recruiter Agent - Job Routes
 * Job management and candidate matching endpoints
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { skillsMatcher } from '../services/skillsMatcher';
import { candidateQualifier } from '../services/candidateQualifier';
import {
  CreateJobSchema,
  UpdateJobSchema,
  MatchCandidatesSchema,
} from '../schemas';
import type {
  ApiResponse,
  Job,
  JobRequirement,
  Candidate,
  CandidateJobMatch,
} from '../types';

const router = Router();

// In-memory storage
const jobs = new Map<string, Job>();
const candidates = new Map<string, Candidate>();

/**
 * POST /api/jobs
 * Create a new job
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = CreateJobSchema.parse(req.body);

    const job: Job = {
      id: uuidv4(),
      tenantId: 'default',
      ...validatedData,
      status: 'draft',
      hiringManagerId: req.headers['x-user-id']?.toString() || 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    jobs.set(job.id, job);

    const response: ApiResponse<Job> = {
      success: true,
      data: job,
    };

    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create job',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * GET /api/jobs
 * List jobs
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, department, location, page = '1', limit = '20' } = req.query;

    let filteredJobs = Array.from(jobs.values());

    // Apply filters
    if (status) {
      filteredJobs = filteredJobs.filter(j => j.status === status);
    }

    if (department) {
      filteredJobs = filteredJobs.filter(j =>
        j.department.toLowerCase().includes((department as string).toLowerCase())
      );
    }

    if (location) {
      filteredJobs = filteredJobs.filter(j =>
        j.location.toLowerCase().includes((location as string).toLowerCase())
      );
    }

    // Sort by creation date
    filteredJobs.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Paginate
    const total = filteredJobs.length;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + limitNum);

    const response: ApiResponse<Job[]> = {
      success: true,
      data: paginatedJobs,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: startIndex + limitNum < total,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'LIST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list jobs',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * GET /api/jobs/:id
 * Get job by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = jobs.get(id);

    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        },
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Job> = {
      success: true,
      data: job,
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'GET_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get job',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * PUT /api/jobs/:id
 * Update job
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existingJob = jobs.get(id);

    if (!existingJob) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        },
      };
      return res.status(404).json(response);
    }

    const validatedData = UpdateJobSchema.parse(req.body);

    const updatedJob: Job = {
      ...existingJob,
      ...validatedData,
      id: existingJob.id,
      tenantId: existingJob.tenantId,
      updatedAt: new Date().toISOString(),
    };

    jobs.set(id, updatedJob);

    const response: ApiResponse<Job> = {
      success: true,
      data: updatedJob,
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update job',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * DELETE /api/jobs/:id
 * Delete job
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!jobs.has(id)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        },
      };
      return res.status(404).json(response);
    }

    // Soft delete - just mark as closed
    const job = jobs.get(id)!;
    job.status = 'closed';
    job.closedAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();
    jobs.set(id, job);

    const response: ApiResponse = {
      success: true,
      data: { closed: true, id },
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete job',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * POST /api/jobs/match
 * Match candidates to a job
 */
router.post('/match', async (req: Request, res: Response) => {
  try {
    const validatedData = MatchCandidatesSchema.parse(req.body);

    const job = jobs.get(validatedData.jobId);
    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        },
      };
      return res.status(404).json(response);
    }

    // Get candidates to match
    let candidatesToMatch = Array.from(candidates.values());

    // Filter by provided IDs
    if (validatedData.candidateIds && validatedData.candidateIds.length > 0) {
      candidatesToMatch = candidatesToMatch.filter(c =>
        validatedData.candidateIds!.includes(c.id)
      );
    }

    // Filter by status
    if (validatedData.filters?.status && validatedData.filters.status.length > 0) {
      candidatesToMatch = candidatesToMatch.filter(c =>
        validatedData.filters!.status!.includes(c.status)
      );
    }

    // Match candidates
    const matches = skillsMatcher.rankCandidatesForJob(candidatesToMatch, job);

    // Apply minimum match score filter
    let filteredMatches = matches;
    if (validatedData.filters?.minMatchScore) {
      filteredMatches = matches.filter(m =>
        m.overallMatchScore >= validatedData.filters!.minMatchScore!
      );
    }

    const response: ApiResponse<CandidateJobMatch[]> = {
      success: true,
      data: filteredMatches,
      meta: {
        total: filteredMatches.length,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'MATCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to match candidates',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * GET /api/jobs/:id/matches
 * Get all matches for a job
 */
router.get('/:id/matches', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { minMatchScore, status } = req.query;

    const job = jobs.get(id);
    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        },
      };
      return res.status(404).json(response);
    }

    let candidatesToMatch = Array.from(candidates.values());

    // Filter by status
    if (status) {
      const statuses = (status as string).split(',');
      candidatesToMatch = candidatesToMatch.filter(c => statuses.includes(c.status));
    }

    const matches = skillsMatcher.rankCandidatesForJob(candidatesToMatch, job);

    // Apply minimum match score filter
    let filteredMatches = matches;
    if (minMatchScore) {
      const minScore = parseInt(minMatchScore as string);
      filteredMatches = matches.filter(m => m.overallMatchScore >= minScore);
    }

    const response: ApiResponse<CandidateJobMatch[]> = {
      success: true,
      data: filteredMatches,
      meta: {
        total: filteredMatches.length,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'MATCHES_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get matches',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * POST /api/jobs/:id/skills-suggestions
 * Get skill suggestions for a job title
 */
router.post('/:id/skills-suggestions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { jobTitle } = req.body;

    const suggestions = skillsMatcher.getSkillSuggestions(jobTitle);

    const response: ApiResponse<string[]> = {
      success: true,
      data: suggestions,
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'SUGGESTIONS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get suggestions',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * GET /api/jobs/:id/requirements
 * Get job requirements breakdown
 */
router.get('/:id/requirements', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = jobs.get(id);

    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        },
      };
      return res.status(404).json(response);
    }

    const breakdown = {
      mustHave: job.requirements.filter(r => r.priority === 'must_have'),
      shouldHave: job.requirements.filter(r => r.priority === 'should_have'),
      niceToHave: job.requirements.filter(r => r.priority === 'nice_to_have'),
      total: job.requirements.length,
      byCategory: categorizeRequirements(job.requirements),
    };

    const response: ApiResponse<typeof breakdown> = {
      success: true,
      data: breakdown,
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'REQUIREMENTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get requirements',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * Categorize requirements by skill type
 */
function categorizeRequirements(requirements: JobRequirement[]): Record<string, number> {
  const categories: Record<string, string[]> = {
    'Programming Languages': ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php'],
    'Frontend': ['react', 'vue', 'angular', 'html', 'css', 'next.js', 'svelte'],
    'Backend': ['node.js', 'django', 'flask', 'spring', 'rails', 'laravel', 'fastapi'],
    'Database': ['sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra'],
    'Cloud': ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform'],
    'Tools': ['git', 'jira', 'jenkins', 'linux', 'agile', 'scrum'],
    'Soft Skills': ['communication', 'leadership', 'teamwork', 'problem solving', 'management'],
  };

  const result: Record<string, number> = {
    'Technical': 0,
    'Soft Skills': 0,
    'Other': 0,
  };

  for (const req of requirements) {
    const skillLower = req.skill.toLowerCase();
    let categorized = false;

    for (const [category, skills] of Object.entries(categories)) {
      if (skills.some(s => skillLower.includes(s))) {
        if (category === 'Soft Skills') {
          result['Soft Skills']++;
        } else {
          result['Technical']++;
        }
        categorized = true;
        break;
      }
    }

    if (!categorized) {
      result['Other']++;
    }
  }

  return result;
}

// Export storage setters
export const setJobStorage = (key: string, value: any) => {
  if (key === 'candidates') {
    Object.assign(candidates, value);
  }
};

export default router;

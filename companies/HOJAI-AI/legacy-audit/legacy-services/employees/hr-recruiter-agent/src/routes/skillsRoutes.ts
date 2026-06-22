/**
 * HR Recruiter Agent - Skills Routes
 * Skills analysis and benchmarking endpoints
 */

import { Router, Request, Response } from 'express';
import { skillsMatcher } from '../services/skillsMatcher';
import { candidateQualifier } from '../services/candidateQualifier';
import {
  AnalyzeSkillsSchema,
  GetSalaryBenchmarkSchema,
} from '../schemas';
import type {
  ApiResponse,
  SkillsAnalysis,
  SalaryBenchmark,
  Candidate,
} from '../types';

const router = Router();

// In-memory storage
const candidates = new Map<string, Candidate>();

/**
 * POST /api/skills/analyze
 * Analyze candidate skills against requirements
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const validatedData = AnalyzeSkillsSchema.parse(req.body);

    const candidate = candidates.get(validatedData.candidateId);
    if (!candidate) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'CANDIDATE_NOT_FOUND',
          message: 'Candidate not found',
        },
      };
      return res.status(404).json(response);
    }

    const analysis = skillsMatcher.analyzeSkills(candidate, validatedData.jobId as any);

    const response: ApiResponse<SkillsAnalysis> = {
      success: true,
      data: analysis,
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'ANALYSIS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to analyze skills',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * POST /api/skills/suggest
 * Get skill suggestions for a job title
 */
router.post('/suggest', async (req: Request, res: Response) => {
  try {
    const { jobTitle } = req.body;

    if (!jobTitle) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'MISSING_JOB_TITLE',
          message: 'jobTitle is required',
        },
      };
      return res.status(400).json(response);
    }

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
        code: 'SUGGESTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get suggestions',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * GET /api/skills/benchmark
 * Get salary benchmark for a job
 */
router.get('/benchmark', async (req: Request, res: Response) => {
  try {
    const queryParams = {
      jobTitle: req.query.jobTitle as string,
      location: req.query.location as string,
      experienceLevel: req.query.experienceLevel as any,
      currency: req.query.currency as any,
    };

    const validatedData = GetSalaryBenchmarkSchema.parse(queryParams);

    const benchmark = candidateQualifier.getSalaryBenchmark(
      validatedData.jobTitle,
      validatedData.location,
      validatedData.experienceLevel,
      validatedData.currency
    );

    if (!benchmark) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'BENCHMARK_NOT_FOUND',
          message: 'Salary benchmark not found for the given criteria',
        },
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<SalaryBenchmark> = {
      success: true,
      data: benchmark,
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'BENCHMARK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get salary benchmark',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * POST /api/skills/compare
 * Compare skills of two candidates
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { candidateId1, candidateId2, jobId } = req.body;

    if (!candidateId1 || !candidateId2) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'MISSING_CANDIDATE_IDS',
          message: 'Both candidateId1 and candidateId2 are required',
        },
      };
      return res.status(400).json(response);
    }

    const candidate1 = candidates.get(candidateId1);
    const candidate2 = candidates.get(candidateId2);

    if (!candidate1 || !candidate2) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'CANDIDATE_NOT_FOUND',
          message: 'One or both candidates not found',
        },
      };
      return res.status(404).json(response);
    }

    const comparison = skillsMatcher.compareCandidates(candidate1, candidate2, jobId);

    const response: ApiResponse<typeof comparison> = {
      success: true,
      data: comparison,
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'COMPARE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to compare candidates',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * GET /api/skills/taxonomy
 * Get skill taxonomy for related skills
 */
router.get('/taxonomy', async (req: Request, res: Response) => {
  try {
    // Return skill relationships
    const taxonomy: Record<string, string[]> = {
      'JavaScript': ['TypeScript', 'Node.js', 'React', 'Vue.js', 'Angular', 'React Native', 'Next.js'],
      'Python': ['Django', 'Flask', 'FastAPI', 'TensorFlow', 'Pandas', 'PyTorch', 'Machine Learning'],
      'Java': ['Spring', 'Spring Boot', 'Kotlin', 'Scala', 'Hibernate', 'JVM'],
      'React': ['React Native', 'Next.js', 'Redux', 'Gatsby', 'TypeScript'],
      'AWS': ['Amazon Web Services', 'AWS Lambda', 'AWS S3', 'AWS EC2', 'CloudFormation'],
      'Docker': ['Kubernetes', 'Docker Swarm', 'Containerization', 'CI/CD'],
      'SQL': ['MySQL', 'PostgreSQL', 'MongoDB', 'Database', 'NoSQL', 'Redis'],
      'Machine Learning': ['Deep Learning', 'Data Science', 'AI', 'ML', 'TensorFlow', 'PyTorch', 'NLP'],
      'Agile': ['Scrum', 'Kanban', 'Sprint', 'Jira', 'Continuous Integration'],
    };

    const response: ApiResponse<typeof taxonomy> = {
      success: true,
      data: taxonomy,
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'TAXONOMY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get taxonomy',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * POST /api/skills/match-to-job
 * Match a candidate to a specific job
 */
router.post('/match-to-job', async (req: Request, res: Response) => {
  try {
    const { candidateId, jobId, job } = req.body;

    if (!candidateId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'MISSING_CANDIDATE_ID',
          message: 'candidateId is required',
        },
      };
      return res.status(400).json(response);
    }

    const candidate = candidates.get(candidateId);
    if (!candidate) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'CANDIDATE_NOT_FOUND',
          message: 'Candidate not found',
        },
      };
      return res.status(404).json(response);
    }

    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'MISSING_JOB',
          message: 'job object is required for matching',
        },
      };
      return res.status(400).json(response);
    }

    const match = skillsMatcher.matchCandidateToJob(candidate, job);

    const response: ApiResponse<typeof match> = {
      success: true,
      data: match,
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'MATCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to match candidate to job',
      },
    };
    res.status(400).json(response);
  }
});

/**
 * POST /api/skills/find-best-jobs
 * Find best matching jobs for a candidate
 */
router.post('/find-best-jobs', async (req: Request, res: Response) => {
  try {
    const { candidateId, jobs: jobList } = req.body;

    if (!candidateId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'MISSING_CANDIDATE_ID',
          message: 'candidateId is required',
        },
      };
      return res.status(400).json(response);
    }

    const candidate = candidates.get(candidateId);
    if (!candidate) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'CANDIDATE_NOT_FOUND',
          message: 'Candidate not found',
        },
      };
      return res.status(404).json(response);
    }

    if (!jobList || !Array.isArray(jobList)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'MISSING_JOBS',
          message: 'jobs array is required',
        },
      };
      return res.status(400).json(response);
    }

    const matches = skillsMatcher.findBestMatchingJobs(candidate, jobList);

    const response: ApiResponse<typeof matches> = {
      success: true,
      data: matches,
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FIND_JOBS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to find matching jobs',
      },
    };
    res.status(400).json(response);
  }
});

// Export storage setter
export const setSkillsStorage = (key: string, value: any) => {
  if (key === 'candidates') {
    Object.assign(candidates, value);
  }
};

export default router;

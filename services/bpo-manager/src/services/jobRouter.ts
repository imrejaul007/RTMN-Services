import { Job, IJob, JobStatus, JobPriority } from '../models/Job';
import { Worker, IWorker, WorkerStatus, ServiceType } from '../models/Worker';

// Interface for auto-assignment result
interface AssignmentResult {
  success: boolean;
  job?: IJob;
  worker?: IWorker;
  message: string;
}

// Interface for matching criteria
interface MatchCriteria {
  requiredSkills?: ServiceType[];
  requiredLanguages?: string[];
  minRating?: number;
  requiredCertifications?: string[];
}

/**
 * Find the best available worker for a job based on:
 * 1. Matching skills
 * 2. Matching languages
 * 3. Minimum rating requirements
 * 4. Required certifications
 * 5. Current workload (prefer workers with fewer active jobs)
 * 6. Performance stats (prefer workers with higher ratings and more completed jobs)
 */
export const findBestWorker = async (
  job: IJob,
  criteria: MatchCriteria
): Promise<IWorker | null> => {
  // Start with available workers
  let workers = await Worker.find({
    tenantId: job.tenantId,
    status: WorkerStatus.AVAILABLE,
  });

  // Filter by skills if required
  if (criteria.requiredSkills && criteria.requiredSkills.length > 0) {
    workers = workers.filter((worker) =>
      criteria.requiredSkills!.some((skill) => worker.skills.includes(skill))
    );
  }

  // Filter by languages if required
  if (criteria.requiredLanguages && criteria.requiredLanguages.length > 0) {
    workers = workers.filter((worker) =>
      criteria.requiredLanguages!.some((lang) => worker.languages.includes(lang))
    );
  }

  // Filter by minimum rating
  if (criteria.minRating !== undefined) {
    workers = workers.filter(
      (worker) => worker.stats.averageRating >= criteria.minRating!
    );
  }

  // Filter by certifications
  if (criteria.requiredCertifications && criteria.requiredCertifications.length > 0) {
    workers = workers.filter((worker) =>
      criteria.requiredCertifications!.every((cert) =>
        worker.certifications.includes(cert)
      )
    );
  }

  if (workers.length === 0) {
    return null;
  }

  // Score workers based on multiple factors
  const scoredWorkers = workers.map((worker) => {
    let score = 0;

    // Primary: Higher rating = higher score
    score += worker.stats.averageRating * 10;

    // Secondary: More completed jobs = higher score (experience)
    score += Math.log(worker.stats.totalJobsCompleted + 1) * 5;

    // Tertiary: Fewer current jobs = higher score (availability)
    const currentJobs = worker.stats.totalJobsAssigned - worker.stats.totalJobsCompleted;
    score += Math.max(0, 10 - currentJobs);

    // Bonus: Exact skill match
    if (job.type && worker.skills.includes(job.type)) {
      score += 20;
    }

    // Bonus: Language match for voice jobs
    if (job.type === ServiceType.VOICE && criteria.requiredLanguages) {
      const hasLanguage = criteria.requiredLanguages.some((lang) =>
        worker.languages.includes(lang)
      );
      if (hasLanguage) score += 10;
    }

    return { worker, score };
  });

  // Sort by score (highest first)
  scoredWorkers.sort((a, b) => b.score - a.score);

  return scoredWorkers[0].worker;
};

/**
 * Auto-assign a job to the best available worker
 */
export const autoAssignJob = async (job: IJob): Promise<AssignmentResult> => {
  // Only assign pending jobs
  if (job.status !== JobStatus.PENDING) {
    return {
      success: false,
      message: `Job is not pending. Current status: ${job.status}`,
    };
  }

  // Build matching criteria from job requirements
  const criteria: MatchCriteria = {
    requiredSkills: job.requirements?.skills || [job.type],
    requiredLanguages: job.requirements?.languages,
    minRating: job.requirements?.minRating,
    requiredCertifications: job.requirements?.certifications,
  };

  // Find the best worker
  const worker = await findBestWorker(job, criteria);

  if (!worker) {
    return {
      success: false,
      message: 'No available worker found matching job requirements',
    };
  }

  // Assign job to worker
  job.worker = worker._id as unknown as typeof job.worker;
  job.workerName = worker.name;
  job.status = JobStatus.ASSIGNED;
  await job.save();

  // Update worker status
  worker.status = WorkerStatus.BUSY;
  worker.stats.totalJobsAssigned += 1;
  await worker.save();

  return {
    success: true,
    job,
    worker,
    message: `Job ${job.jobId} assigned to worker ${worker.name}`,
  };
};

/**
 * Batch auto-assign multiple pending jobs
 */
export const batchAutoAssign = async (
  tenantId: string,
  limit = 10
): Promise<{ assigned: number; failed: number; results: AssignmentResult[] }> => {
  const results: AssignmentResult[] = { assigned: 0, failed: 0, results: [] };

  // Get pending jobs sorted by priority (highest first)
  const pendingJobs = await Job.find({
    tenantId,
    status: JobStatus.PENDING,
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit);

  for (const job of pendingJobs) {
    const result = await autoAssignJob(job);
    results.results.push(result);

    if (result.success) {
      results.assigned++;
    } else {
      results.failed++;
    }
  }

  return results;
};

/**
 * Reassign a job (e.g., if worker is unavailable)
 */
export const reassignJob = async (jobId: string, tenantId: string): Promise<AssignmentResult> => {
  const job = await Job.findOne({ _id: jobId, tenantId });

  if (!job) {
    return {
      success: false,
      message: 'Job not found',
    };
  }

  if (![JobStatus.ASSIGNED, JobStatus.IN_PROGRESS].includes(job.status)) {
    return {
      success: false,
      message: `Cannot reassign job with status: ${job.status}`,
    };
  }

  // Mark current worker as available if exists
  if (job.worker) {
    await Worker.findByIdAndUpdate(job.worker, {
      status: WorkerStatus.AVAILABLE,
    });
  }

  // Reset job to pending
  job.status = JobStatus.PENDING;
  job.worker = undefined;
  job.workerName = undefined;
  await job.save();

  // Try to auto-assign
  return autoAssignJob(job);
};

/**
 * Balance workload across workers
 * Redistributes jobs from overloaded workers to underutilized ones
 */
export const balanceWorkload = async (tenantId: string): Promise<{
  movedJobs: number;
  message: string;
}> => {
  // Find workers with too many active jobs
  const overloadedWorkers = await Worker.find({
    tenantId,
    status: WorkerStatus.BUSY,
  });

  const MAX_ACTIVE_JOBS = 5; // Threshold for overload
  let movedJobs = 0;

  for (const worker of overloadedWorkers) {
    const activeJobs = await Job.countDocuments({
      worker: worker._id,
      status: { $in: [JobStatus.ASSIGNED, JobStatus.IN_PROGRESS] },
    });

    if (activeJobs > MAX_ACTIVE_JOBS) {
      // Find pending jobs and reassign some
      const excessJobs = activeJobs - MAX_ACTIVE_JOBS;
      const workerJobs = await Job.find({
        worker: worker._id,
        status: { $in: [JobStatus.ASSIGNED, JobStatus.IN_PROGRESS] },
      })
        .sort({ priority: 1, createdAt: 1 }) // Get lowest priority first
        .limit(excessJobs);

      for (const job of workerJobs) {
        const result = await reassignJob(job._id.toString(), tenantId);
        if (result.success) {
          movedJobs++;
        }
      }

      // Update worker status
      worker.status = WorkerStatus.AVAILABLE;
      await worker.save();
    }
  }

  return {
    movedJobs,
    message: `Moved ${movedJobs} jobs from overloaded workers`,
  };
};

/**
 * Get assignment recommendations for a job
 */
export const getRecommendations = async (jobId: string, tenantId: string): Promise<{
  recommendations: Array<{
    worker: IWorker;
    score: number;
    reasons: string[];
  }>;
}> => {
  const job = await Job.findOne({ _id: jobId, tenantId });

  if (!job) {
    throw new Error('Job not found');
  }

  const criteria: MatchCriteria = {
    requiredSkills: job.requirements?.skills || [job.type],
    requiredLanguages: job.requirements?.languages,
    minRating: job.requirements?.minRating,
    requiredCertifications: job.requirements?.certifications,
  };

  const workers = await Worker.find({
    tenantId,
    status: WorkerStatus.AVAILABLE,
  });

  const recommendations: Array<{
    worker: IWorker;
    score: number;
    reasons: string[];
  }> = [];

  for (const worker of workers) {
    const reasons: string[] = [];
    let score = 0;

    // Check skill match
    if (job.type && worker.skills.includes(job.type)) {
      score += 20;
      reasons.push(`Has ${job.type} skill`);
    }

    // Check rating
    if (worker.stats.averageRating > 0) {
      score += worker.stats.averageRating * 10;
      reasons.push(`${worker.stats.averageRating.toFixed(1)} star rating`);
    }

    // Check experience
    if (worker.stats.totalJobsCompleted > 0) {
      score += Math.log(worker.stats.totalJobsCompleted + 1) * 5;
      reasons.push(`${worker.stats.totalJobsCompleted} jobs completed`);
    }

    // Check language match
    if (criteria.requiredLanguages) {
      const hasLanguage = criteria.requiredLanguages.some((lang) =>
        worker.languages.includes(lang)
      );
      if (hasLanguage) {
        score += 10;
        reasons.push('Speaks required language');
      }
    }

    // Check certification match
    if (criteria.requiredCertifications) {
      const hasCerts = criteria.requiredCertifications.every((cert) =>
        worker.certifications.includes(cert)
      );
      if (hasCerts) {
        score += 15;
        reasons.push('Has required certifications');
      }
    }

    // Only recommend if score is reasonable
    if (score > 10) {
      recommendations.push({ worker, score, reasons });
    }
  }

  // Sort by score
  recommendations.sort((a, b) => b.score - a.score);

  return { recommendations: recommendations.slice(0, 5) };
};

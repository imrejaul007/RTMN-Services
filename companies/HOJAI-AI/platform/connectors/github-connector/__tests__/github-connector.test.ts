import { describe, it, expect } from 'vitest';

// GitHub Connector Constants
const ISSUE_STATES = ['open', 'closed'];
const PR_STATES = ['open', 'closed', 'merged'];
const REPO_LANGUAGES = ['TypeScript', 'JavaScript', 'Python', 'Java', 'Go', 'Rust', 'Ruby', 'C++', 'C#'];
const GITHUB_OBJECT_TYPES = ['repo', 'issue', 'pull_request', 'commit', 'branch', 'release', 'package'];

describe('GitHub Connector', () => {
  describe('Issue States', () => {
    it('should have all issue states', () => {
      expect(ISSUE_STATES).toContain('open');
      expect(ISSUE_STATES).toContain('closed');
    });

    it('should have 2 issue states', () => {
      expect(ISSUE_STATES).toHaveLength(2);
    });
  });

  describe('Pull Request States', () => {
    it('should have all PR states', () => {
      expect(PR_STATES).toContain('open');
      expect(PR_STATES).toContain('closed');
      expect(PR_STATES).toContain('merged');
    });

    it('should have 3 PR states', () => {
      expect(PR_STATES).toHaveLength(3);
    });
  });

  describe('GitHub Object Types', () => {
    it('should support all major object types', () => {
      GITHUB_OBJECT_TYPES.forEach(type => {
        expect(['repo', 'issue', 'pull_request', 'commit', 'branch', 'release', 'package']).toContain(type);
      });
    });
  });

  describe('Repository Validation', () => {
    const validateRepo = (repo: {
      name?: string;
      full_name?: string;
      private?: boolean;
      description?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!repo.name) errors.push('name is required');
      if (repo.name && !/^[a-zA-Z0-9._-]+$/.test(repo.name)) {
        errors.push('name contains invalid characters');
      }
      if (repo.full_name && !/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo.full_name)) {
        errors.push('full_name must be in owner/repo format');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct repository', () => {
      const result = validateRepo({
        name: 'my-repo',
        full_name: 'owner/my-repo',
        private: false,
        description: 'My awesome project'
      });
      expect(result.valid).toBe(true);
    });

    it('should require name', () => {
      const result = validateRepo({ full_name: 'owner/repo' });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid full_name format', () => {
      const result = validateRepo({ name: 'repo', full_name: 'invalid-format' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('owner/repo'))).toBe(true);
    });
  });

  describe('Issue Validation', () => {
    const validateIssue = (issue: {
      title?: string;
      body?: string;
      state?: string;
      assignee?: string;
      labels?: string[];
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!issue.title) errors.push('title is required');
      if (issue.title && issue.title.length > 256) {
        errors.push('title exceeds 256 characters');
      }
      if (issue.state && !ISSUE_STATES.includes(issue.state)) {
        errors.push(`Invalid state: ${issue.state}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct issue', () => {
      const result = validateIssue({
        title: 'Bug: Login fails',
        body: 'Steps to reproduce...',
        state: 'open',
        labels: ['bug', 'priority']
      });
      expect(result.valid).toBe(true);
    });

    it('should require title', () => {
      const result = validateIssue({ body: 'Description' });
      expect(result.valid).toBe(false);
    });

    it('should reject oversized titles', () => {
      const result = validateIssue({ title: 'x'.repeat(257) });
      expect(result.valid).toBe(false);
    });
  });

  describe('Pull Request Validation', () => {
    const validatePR = (pr: {
      title?: string;
      body?: string;
      head?: string;
      base?: string;
      state?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!pr.title) errors.push('title is required');
      if (!pr.head) errors.push('head branch is required');
      if (!pr.base) errors.push('base branch is required');
      if (pr.head && pr.base && pr.head === pr.base) {
        errors.push('head and base cannot be the same');
      }
      if (pr.state && !PR_STATES.includes(pr.state)) {
        errors.push(`Invalid state: ${pr.state}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct PR', () => {
      const result = validatePR({
        title: 'feat: Add new feature',
        head: 'feature-branch',
        base: 'main',
        state: 'open'
      });
      expect(result.valid).toBe(true);
    });

    it('should require head and base branches', () => {
      const result = validatePR({ title: 'PR Title' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('head branch is required');
      expect(result.errors).toContain('base branch is required');
    });

    it('should reject same head and base', () => {
      const result = validatePR({
        title: 'PR',
        head: 'main',
        base: 'main'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('head and base cannot be the same');
    });
  });

  describe('Commit Validation', () => {
    const validateCommit = (commit: {
      sha?: string;
      message?: string;
      author?: string;
      date?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!commit.sha) errors.push('sha is required');
      if (commit.sha && !/^[a-f0-9]{7,40}$/i.test(commit.sha)) {
        errors.push('sha must be a valid git hash');
      }
      if (!commit.message) errors.push('message is required');
      if (commit.message && commit.message.length > 500) {
        errors.push('message exceeds 500 characters');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct commit', () => {
      const result = validateCommit({
        sha: 'abc1234def5678',
        message: 'feat: Add new feature',
        author: 'developer@example.com',
        date: '2026-06-27T10:00:00Z'
      });
      expect(result.valid).toBe(true);
    });

    it('should require valid sha', () => {
      const result = validateCommit({ sha: 'invalid', message: 'test' });
      expect(result.valid).toBe(false);
    });
  });

  describe('Code Review Metrics', () => {
    const calculateReviewMetrics = (pr: {
      additions: number;
      deletions: number;
      comments: number;
      reviewTime: number; // in hours
    }): {
      size: 'xs' | 's' | 'm' | 'l' | 'xl';
      complexity: number;
      reviewBurden: number;
    } => {
      const linesChanged = pr.additions + pr.deletions;
      const size = linesChanged < 50 ? 'xs' :
                   linesChanged < 200 ? 's' :
                   linesChanged < 500 ? 'm' :
                   linesChanged < 1000 ? 'l' : 'xl';

      const complexity = Math.min(100, (pr.deletions / Math.max(1, pr.additions)) * 50 + pr.comments);

      const reviewBurden = linesChanged * 0.1 + pr.comments * 0.5 + pr.reviewTime * 0.2;

      return { size, complexity: Math.round(complexity), reviewBurden: Math.round(reviewBurden) };
    };

    it('should categorize PR size correctly', () => {
      expect(calculateReviewMetrics({ additions: 30, deletions: 10, comments: 2, reviewTime: 2 }).size).toBe('xs');
      expect(calculateReviewMetrics({ additions: 300, deletions: 100, comments: 5, reviewTime: 4 }).size).toBe('m');
      expect(calculateReviewMetrics({ additions: 1200, deletions: 300, comments: 10, reviewTime: 8 }).size).toBe('xl');
    });

    it('should calculate review burden', () => {
      const metrics = calculateReviewMetrics({ additions: 100, deletions: 50, comments: 5, reviewTime: 3 });
      expect(metrics.reviewBurden).toBeGreaterThan(0);
    });
  });

  describe('Repository Health Score', () => {
    const calculateHealthScore = (repo: {
      openIssues: number;
      closedIssues: number;
      openPRs: number;
      mergedPRs: number;
      stars: number;
      forks: number;
    }): number => {
      // Issue resolution rate
      const totalIssues = repo.openIssues + repo.closedIssues;
      const issueResolution = totalIssues > 0 ? (repo.closedIssues / totalIssues) * 30 : 30;

      // PR merge rate
      const totalPRs = repo.openPRs + repo.mergedPRs;
      const prMergeRate = totalPRs > 0 ? (repo.mergedPRs / totalPRs) * 30 : 30;

      // Community engagement (logarithmic scale)
      const engagement = Math.min(20, Math.log10(Math.max(1, repo.stars)) * 5 +
                                     Math.log10(Math.max(1, repo.forks)) * 5);

      // Maintenance indicator (lower open issues = better maintenance)
      const maintenance = Math.max(0, 20 - repo.openIssues * 0.5);

      return Math.round(issueResolution + prMergeRate + engagement + maintenance);
    };

    it('should score healthy repos higher', () => {
      const healthy = { openIssues: 5, closedIssues: 100, openPRs: 2, mergedPRs: 50, stars: 100, forks: 20 };
      const unhealthy = { openIssues: 50, closedIssues: 10, openPRs: 20, mergedPRs: 5, stars: 5, forks: 1 };

      expect(calculateHealthScore(healthy)).toBeGreaterThan(calculateHealthScore(unhealthy));
    });

    it('should return score between 0 and 100', () => {
      const metrics = { openIssues: 10, closedIssues: 50, openPRs: 5, mergedPRs: 30, stars: 25, forks: 5 };
      const score = calculateHealthScore(metrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Code Churn Analysis', () => {
    const calculateCodeChurn = (
      commits: Array<{ additions: number; deletions: number; date: string }>,
      days: number = 30
    ): {
      totalAdditions: number;
      totalDeletions: number;
      netChange: number;
      commitsPerDay: number;
      churnRate: number;
    } => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const recentCommits = commits.filter(c => new Date(c.date) >= cutoff);

      const totalAdditions = recentCommits.reduce((sum, c) => sum + c.additions, 0);
      const totalDeletions = recentCommits.reduce((sum, c) => sum + c.deletions, 0);
      const commitsPerDay = recentCommits.length / days;
      const churnRate = (totalAdditions + totalDeletions) / days;

      return {
        totalAdditions,
        totalDeletions,
        netChange: totalAdditions - totalDeletions,
        commitsPerDay: Math.round(commitsPerDay * 100) / 100,
        churnRate: Math.round(churnRate)
      };
    };

    it('should calculate churn metrics', () => {
      const now = new Date();
      const commits = [
        { additions: 100, deletions: 20, date: now.toISOString() },
        { additions: 50, deletions: 10, date: now.toISOString() },
        { additions: 80, deletions: 30, date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString() }
      ];
      const result = calculateCodeChurn(commits, 30);
      expect(result.totalAdditions).toBe(230);
      expect(result.totalDeletions).toBe(60);
      expect(result.netChange).toBe(170);
    });
  });

  describe('Contributor Analysis', () => {
    const analyzeContributors = (
      commits: Array<{ author: string; additions: number; deletions: number }>
    ): Array<{
      author: string;
      commits: number;
      additions: number;
      deletions: number;
      percentage: number;
    }> => {
      const authorStats = new Map<string, { commits: number; additions: number; deletions: number }>();
      const totalCommits = commits.length;

      commits.forEach(commit => {
        const stats = authorStats.get(commit.author) || { commits: 0, additions: 0, deletions: 0 };
        stats.commits++;
        stats.additions += commit.additions;
        stats.deletions += commit.deletions;
        authorStats.set(commit.author, stats);
      });

      return Array.from(authorStats.entries())
        .map(([author, stats]) => ({
          author,
          commits: stats.commits,
          additions: stats.additions,
          deletions: stats.deletions,
          percentage: totalCommits > 0 ? Math.round((stats.commits / totalCommits) * 100) : 0
        }))
        .sort((a, b) => b.commits - a.commits);
    };

    it('should rank contributors by commits', () => {
      const commits = [
        { author: 'alice', additions: 100, deletions: 20 },
        { author: 'bob', additions: 50, deletions: 10 },
        { author: 'alice', additions: 80, deletions: 15 }
      ];
      const contributors = analyzeContributors(commits);
      expect(contributors[0].author).toBe('alice');
      expect(contributors[0].commits).toBe(2);
      expect(contributors[0].percentage).toBe(67);
    });
  });

  describe('Branch Protection Analysis', () => {
    const evaluateBranchProtection = (rules: {
      requiresReviews: boolean;
      requiredReviewers: number;
      requiresStatusChecks: boolean;
      requiredChecks: string[];
      dismissesStaleReviews: boolean;
      restrictsForcePush: boolean;
    }): { score: number; level: 'basic' | 'intermediate' | 'strong' | 'enterprise' } => {
      let score = 0;

      if (rules.requiresReviews) score += 20;
      if (rules.requiredReviewers >= 2) score += 15;
      else if (rules.requiredReviewers >= 1) score += 10;

      if (rules.requiresStatusChecks) score += 20;
      if (rules.requiredChecks.length >= 3) score += 10;
      else if (rules.requiredChecks.length >= 1) score += 5;

      if (rules.dismissesStaleReviews) score += 15;
      if (rules.restrictsForcePush) score += 20;

      const level = score >= 80 ? 'enterprise' :
                    score >= 60 ? 'strong' :
                    score >= 40 ? 'intermediate' : 'basic';

      return { score, level };
    };

    it('should evaluate enterprise-level protection', () => {
      const rules = {
        requiresReviews: true,
        requiredReviewers: 2,
        requiresStatusChecks: true,
        requiredChecks: ['lint', 'test', 'build'],
        dismissesStaleReviews: true,
        restrictsForcePush: true
      };
      const result = evaluateBranchProtection(rules);
      expect(result.level).toBe('enterprise');
    });

    it('should identify basic protection', () => {
      const rules = {
        requiresReviews: false,
        requiredReviewers: 0,
        requiresStatusChecks: false,
        requiredChecks: [],
        dismissesStaleReviews: false,
        restrictsForcePush: false
      };
      const result = evaluateBranchProtection(rules);
      expect(result.level).toBe('basic');
    });
  });
});

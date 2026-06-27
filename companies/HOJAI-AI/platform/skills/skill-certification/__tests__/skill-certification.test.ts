import { describe, it, expect } from 'vitest';

// Skill Certification Constants
const CERTIFICATION_LEVELS = ['community', 'verified', 'professional', 'enterprise', 'official'];
const CERTIFICATION_STATUSES = ['pending', 'approved', 'rejected'];

describe('Skill Certification', () => {
  describe('Certification Levels', () => {
    it('should have all certification levels', () => {
      expect(CERTIFICATION_LEVELS).toContain('community');
      expect(CERTIFICATION_LEVELS).toContain('verified');
      expect(CERTIFICATION_LEVELS).toContain('professional');
      expect(CERTIFICATION_LEVELS).toContain('enterprise');
      expect(CERTIFICATION_LEVELS).toContain('official');
    });

    it('should have 5 certification levels', () => {
      expect(CERTIFICATION_LEVELS).toHaveLength(5);
    });
  });

  describe('Certification Statuses', () => {
    it('should have all certification statuses', () => {
      expect(CERTIFICATION_STATUSES).toContain('pending');
      expect(CERTIFICATION_STATUSES).toContain('approved');
      expect(CERTIFICATION_STATUSES).toContain('rejected');
    });
  });

  describe('Certification Validation', () => {
    const validateCertification = (cert: {
      skillId?: string;
      level?: string;
      status?: string;
      reviewerId?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!cert.skillId) errors.push('skillId is required');
      if (cert.level && !CERTIFICATION_LEVELS.includes(cert.level)) {
        errors.push(`invalid level: ${cert.level}`);
      }
      if (cert.status && !CERTIFICATION_STATUSES.includes(cert.status)) {
        errors.push(`invalid status: ${cert.status}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct certification', () => {
      const result = validateCertification({
        skillId: 'skill-123',
        level: 'professional',
        status: 'approved',
        reviewerId: 'reviewer-456'
      });
      expect(result.valid).toBe(true);
    });

    it('should require skillId', () => {
      const result = validateCertification({ level: 'verified' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('skillId is required');
    });

    it('should reject invalid level', () => {
      const result = validateCertification({ skillId: 'skill-1', level: 'invalid' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid level'))).toBe(true);
    });
  });

  describe('Level Progression', () => {
    const getNextLevel = (currentLevel: string): string | null => {
      const index = CERTIFICATION_LEVELS.indexOf(currentLevel);
      if (index === -1 || index === CERTIFICATION_LEVELS.length - 1) return null;
      return CERTIFICATION_LEVELS[index + 1];
    };

    it('should get next level', () => {
      expect(getNextLevel('community')).toBe('verified');
      expect(getNextLevel('verified')).toBe('professional');
      expect(getNextLevel('official')).toBe(null);
    });

    it('should return null for invalid level', () => {
      expect(getNextLevel('invalid')).toBe(null);
    });
  });

  describe('Reviewer Assignment', () => {
    const assignReviewer = (
      certifications: Array<{ status: string; reviewerId?: string; level: string }>,
      reviewerId: string,
      maxLoad: number
    ): { assigned: string[]; rejected: string[] } => {
      const pending = certifications.filter(c => c.status === 'pending' && !c.reviewerId);
      const assigned: string[] = [];
      const rejected: string[] = [];

      for (const cert of pending) {
        if (assigned.length >= maxLoad) {
          rejected.push(cert.level);
        } else {
          assigned.push(cert.level);
        }
      }

      return { assigned, rejected };
    };

    it('should assign reviewers up to max load', () => {
      const certs = [
        { status: 'pending', level: 'community', reviewerId: undefined },
        { status: 'pending', level: 'verified', reviewerId: undefined },
        { status: 'pending', level: 'professional', reviewerId: undefined },
        { status: 'approved', level: 'enterprise', reviewerId: 'r1' }
      ];
      const result = assignReviewer(certs, 'reviewer-1', 2);
      expect(result.assigned).toHaveLength(2);
      expect(result.rejected).toHaveLength(1);
    });
  });

  describe('Certification Filtering', () => {
    const filterCertifications = (
      certs: Array<{ status: string; level: string; skillId: string }>,
      filters: { status?: string; level?: string }
    ) => {
      let filtered = [...certs];
      if (filters.status) filtered = filtered.filter(c => c.status === filters.status);
      if (filters.level) filtered = filtered.filter(c => c.level === filters.level);
      return filtered;
    };

    it('should filter by status', () => {
      const certs = [
        { status: 'approved', level: 'verified', skillId: 's1' },
        { status: 'pending', level: 'community', skillId: 's2' }
      ];
      expect(filterCertifications(certs, { status: 'approved' })).toHaveLength(1);
    });
  });

  describe('Certification Metrics', () => {
    const calculateMetrics = (
      certs: Array<{ status: string; level: string; createdAt: string }>
    ) => {
      const byStatus = { pending: 0, approved: 0, rejected: 0 };
      const byLevel: Record<string, number> = {};

      certs.forEach(c => {
        byStatus[c.status] = (byStatus[c.status] || 0) + 1;
        byLevel[c.level] = (byLevel[c.level] || 0) + 1;
      });

      const approvalRate = certs.length > 0 ? (byStatus.approved / certs.length) * 100 : 0;

      return { byStatus, byLevel, total: certs.length, approvalRate };
    };

    it('should calculate certification metrics', () => {
      const certs = [
        { status: 'approved', level: 'verified', createdAt: '2026-06-01' },
        { status: 'approved', level: 'verified', createdAt: '2026-06-02' },
        { status: 'pending', level: 'community', createdAt: '2026-06-03' },
        { status: 'rejected', level: 'community', createdAt: '2026-06-04' }
      ];
      const metrics = calculateMetrics(certs);
      expect(metrics.total).toBe(4);
      expect(metrics.approvalRate).toBe(50);
      expect(metrics.byLevel['verified']).toBe(2);
    });
  });

  describe('Expiration Check', () => {
    const isExpired = (createdAt: string, validityDays: number): boolean => {
      const created = new Date(createdAt).getTime();
      const expiry = created + validityDays * 24 * 60 * 60 * 1000;
      return Date.now() > expiry;
    };

    it('should detect expired certifications', () => {
      const oldDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
      expect(isExpired(oldDate, 365)).toBe(true);
    });

    it('should allow valid certifications', () => {
      const recentDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
      expect(isExpired(recentDate, 365)).toBe(false);
    });
  });
});
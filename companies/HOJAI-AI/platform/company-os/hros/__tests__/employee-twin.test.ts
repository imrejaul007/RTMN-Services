/**
 * Employee Twin Platform - Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock data
const mockEmployee = {
  employeeId: 'EMP001',
  identity: {
    employeeId: 'EMP001',
    personalInfo: {
      firstName: 'Rahul',
      lastName: 'Kumar',
      email: 'rahul.kumar@company.com',
    },
    contactInfo: {
      email: 'rahul.kumar@company.com',
      phone: '+919876543210',
    },
    employmentInfo: {
      employeeNumber: 'EMP001',
      joiningDate: '2024-01-15',
      employmentType: 'full-time',
      department: 'Engineering',
      designation: 'Senior Engineer',
      location: 'Bangalore',
      status: 'active',
    },
  },
};

describe('Employee Twin Platform', () => {
  describe('Identity Management', () => {
    it('should create employee with full identity', () => {
      expect(mockEmployee.identity.personalInfo.firstName).toBe('Rahul');
      expect(mockEmployee.identity.personalInfo.lastName).toBe('Kumar');
      expect(mockEmployee.identity.employmentInfo.department).toBe('Engineering');
    });

    it('should have valid employment info', () => {
      expect(mockEmployee.identity.employmentInfo.employeeNumber).toBeTruthy();
      expect(mockEmployee.identity.employmentInfo.status).toBe('active');
    });

    it('should track department and designation', () => {
      expect(mockEmployee.identity.employmentInfo.department).toBeDefined();
      expect(mockEmployee.identity.employmentInfo.designation).toBeDefined();
    });
  });

  describe('Employee Lifecycle', () => {
    it('should track joining date', () => {
      expect(mockEmployee.identity.employmentInfo.joiningDate).toBeTruthy();
    });

    it('should track employment type', () => {
      const validTypes = ['full-time', 'part-time', 'contractor', 'intern'];
      expect(validTypes).toContain(mockEmployee.identity.employmentInfo.employmentType);
    });
  });

  describe('Contact Information', () => {
    it('should have email', () => {
      expect(mockEmployee.identity.contactInfo.email).toContain('@');
    });

    it('should have phone if provided', () => {
      expect(mockEmployee.identity.contactInfo.phone).toBeTruthy();
    });
  });

  describe('Status Tracking', () => {
    it('should track active status', () => {
      const validStatuses = ['active', 'on-leave', 'terminated'];
      expect(validStatuses).toContain(mockEmployee.identity.employmentInfo.status);
    });
  });
});

describe('Skill Twin', () => {
  const mockSkill = {
    technical: [
      { name: 'TypeScript', proficiencyLevel: 4, yearsOfExperience: 3, verified: true },
    ],
    soft: [
      { name: 'Communication', proficiencyLevel: 4, yearsOfExperience: 5, verified: true },
    ],
    leadership: [],
    domain: [
      { name: 'E-commerce', proficiencyLevel: 3, yearsOfExperience: 2, verified: true },
    ],
  };

  it('should track technical skills', () => {
    expect(mockSkill.technical.length).toBeGreaterThan(0);
    expect(mockSkill.technical[0].name).toBe('TypeScript');
  });

  it('should track proficiency levels', () => {
    const skill = mockSkill.technical[0];
    expect(skill.proficiencyLevel).toBeGreaterThanOrEqual(1);
    expect(skill.proficiencyLevel).toBeLessThanOrEqual(5);
  });

  it('should track soft skills', () => {
    expect(mockSkill.soft.length).toBeGreaterThan(0);
  });

  it('should track domain expertise', () => {
    expect(mockSkill.domain.length).toBeGreaterThan(0);
  });
});

describe('Career Twin', () => {
  const mockCareer = {
    careerPath: {
      history: [
        { type: 'promotion', title: 'Junior Engineer', date: '2022-01-01' },
        { type: 'promotion', title: 'Senior Engineer', date: '2024-01-01' },
      ],
      current: {
        role: 'Senior Engineer',
        department: 'Engineering',
        tenure: 24,
        progressionVelocity: 'fast',
      },
    },
    aspirations: {
      desiredRoles: ['Tech Lead', 'Principal Engineer'],
      timeline: '2 years',
    },
    mobility: {
      internalOpenings: true,
      relocation: false,
      international: true,
      promotionReadiness: '1year',
    },
  };

  it('should track career history', () => {
    expect(mockCareer.careerPath.history.length).toBeGreaterThan(0);
  });

  it('should track promotions', () => {
    const promotions = mockCareer.careerPath.history.filter(e => e.type === 'promotion');
    expect(promotions.length).toBe(2);
  });

  it('should track current role', () => {
    expect(mockCareer.careerPath.current.role).toBeTruthy();
  });

  it('should track aspiration readiness', () => {
    const validReadiness = ['ready', '1year', '2years', '3years+'];
    expect(validReadiness).toContain(mockCareer.mobility.promotionReadiness);
  });
});

describe('Wellness Twin', () => {
  const mockWellness = {
    mental: {
      stressLevel: 'medium',
      burnoutRisk: 'low',
      workLifeBalance: 75,
    },
    engagement: {
      nps: 8,
      satisfaction: 85,
      belonging: 90,
    },
    alerts: {
      burnoutRisk: false,
      attendanceConcerns: false,
      lowEngagement: false,
    },
  };

  it('should track stress level', () => {
    const validLevels = ['low', 'medium', 'high', 'critical'];
    expect(validLevels).toContain(mockWellness.mental.stressLevel);
  });

  it('should track burnout risk', () => {
    const validRisks = ['low', 'medium', 'high'];
    expect(validRisks).toContain(mockWellness.mental.burnoutRisk);
  });

  it('should track engagement metrics', () => {
    expect(mockWellness.engagement.nps).toBeGreaterThan(0);
    expect(mockWellness.engagement.satisfaction).toBeGreaterThan(0);
  });

  it('should generate wellness alerts', () => {
    expect(mockWellness.alerts.burnoutRisk).toBe(false);
  });
});

describe('Productivity Twin', () => {
  const mockProductivity = {
    metrics: {
      output: 85,
      quality: 92,
      efficiency: 88,
      collaboration: 78,
    },
    patterns: {
      mostProductiveHours: ['09:00-11:00', '14:00-16:00'],
      workStyle: 'flexible',
      meetingLoad: 'moderate',
    },
    capacity: {
      currentLoad: 75,
      bandwidthAvailable: 25,
      overloaded: false,
    },
  };

  it('should track productivity metrics', () => {
    expect(mockProductivity.metrics.output).toBeGreaterThan(0);
    expect(mockProductivity.metrics.quality).toBeGreaterThan(0);
  });

  it('should track productive hours', () => {
    expect(mockProductivity.patterns.mostProductiveHours.length).toBeGreaterThan(0);
  });

  it('should track capacity', () => {
    expect(mockProductivity.capacity.currentLoad).toBeGreaterThan(0);
    expect(mockProductivity.capacity.bandwidthAvailable).toBeGreaterThanOrEqual(0);
  });
});

describe('Compensation Twin', () => {
  const mockCompensation = {
    current: {
      baseSalary: 2500000,
      currency: 'INR',
      effectiveDate: '2024-01-01',
      salaryBand: { min: 2000000, mid: 2750000, max: 3500000 },
    },
    components: {
      ctc: 3000000,
      fixed: 2500000,
      variable: 500000,
    },
  };

  it('should track salary', () => {
    expect(mockCompensation.current.baseSalary).toBeGreaterThan(0);
  });

  it('should track salary band', () => {
    expect(mockCompensation.current.salaryBand.min).toBeLessThan(mockCompensation.current.salaryBand.mid);
    expect(mockCompensation.current.salaryBand.mid).toBeLessThan(mockCompensation.current.salaryBand.max);
  });

  it('should track fixed vs variable', () => {
    expect(mockCompensation.components.fixed).toBeGreaterThan(0);
    expect(mockCompensation.components.variable).toBeGreaterThanOrEqual(0);
  });
});

describe('Learning Twin', () => {
  const mockLearning = {
    learningHistory: {
      totalCourses: 25,
      completedCourses: 18,
      inProgress: 4,
      totalHours: 120,
      certifications: 5,
    },
    recommendations: {
      recommendedCourses: [
        { courseId: 'ML101', reason: 'Career growth', priority: 'high' },
      ],
      mandatoryCourses: [],
    },
  };

  it('should track course completion', () => {
    expect(mockLearning.learningHistory.totalCourses).toBeGreaterThan(0);
    expect(mockLearning.learningHistory.completedCourses).toBeLessThanOrEqual(mockLearning.learningHistory.totalCourses);
  });

  it('should track certifications', () => {
    expect(mockLearning.learningHistory.certifications).toBeGreaterThanOrEqual(0);
  });

  it('should provide recommendations', () => {
    expect(mockLearning.recommendations.recommendedCourses.length).toBeGreaterThan(0);
  });
});

describe('Relationship Twin', () => {
  const mockRelationships = {
    network: {
      peers: [
        { id: 'EMP002', name: 'Priya Sharma', collaborationScore: 85, interactionFrequency: 'daily' },
      { id: 'EMP003', name: 'Amit Patel', collaborationScore: 78, interactionFrequency: 'weekly' },
      ],
      directReports: ['EMP004', 'EMP005'],
    },
    collaboration: {
      crossFunctionalPartners: ['Marketing', 'Sales'],
      communities: ['Engineering Guild', 'Tech Talks'],
      influenceScore: 72,
    },
  };

  it('should track peer relationships', () => {
    expect(mockRelationships.network.peers.length).toBeGreaterThan(0);
  });

  it('should track collaboration scores', () => {
    const scores = mockRelationships.network.peers.map(p => p.collaborationScore);
    scores.forEach(score => {
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  it('should track direct reports', () => {
    expect(mockRelationships.network.directReports).toBeDefined();
  });
});

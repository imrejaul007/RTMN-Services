/**
 * HR Recruiter Agent - Skills Matcher Service
 * AI-powered skills matching and gap analysis
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Candidate,
  Job,
  JobRequirement,
  SkillsAnalysis,
  SkillMatch,
  SkillGap,
  RecommendedTraining,
  CandidateJobMatch,
  Skill,
  WorkExperience,
} from '../types';

interface SkillsMatcherConfig {
  weightExperience: number;
  weightCertifications: number;
  weightEndorsements: number;
  levelEquivalents: Record<string, number>;
}

interface SkillLevelScore {
  beginner: number;
  intermediate: number;
  advanced: number;
  expert: number;
}

export class SkillsMatcher {
  private config: SkillsMatcherConfig;

  // Skill taxonomy for related skills mapping
  private skillTaxonomy: Map<string, string[]> = new Map([
    ['JavaScript', ['TypeScript', 'Node.js', 'React', 'Vue.js', 'Angular']],
    ['Python', ['Django', 'Flask', 'FastAPI', 'TensorFlow', 'Pandas', 'PyTorch']],
    ['Java', ['Spring', 'Spring Boot', 'Kotlin', 'Scala', 'Hibernate']],
    ['React', ['React Native', 'Next.js', 'Redux', 'Gatsby']],
    ['AWS', ['Amazon Web Services', 'AWS Lambda', 'AWS S3', 'AWS EC2', 'Amazon AWS']],
    ['Docker', ['Kubernetes', 'Docker Swarm', 'Containerization', 'Container']],
    ['SQL', ['MySQL', 'PostgreSQL', 'MongoDB', 'Database', 'NoSQL']],
    ['Machine Learning', ['Deep Learning', 'Data Science', 'AI', 'ML', 'TensorFlow', 'PyTorch']],
    ['Agile', ['Scrum', 'Kanban', 'Sprint', 'Jira']],
  ]);

  // Training recommendations by skill
  private trainingRecommendations: Map<string, RecommendedTraining[]> = new Map([
    ['JavaScript', [
      { trainingName: 'JavaScript Advanced Concepts', provider: 'Udemy', duration: '20 hours', priority: 'medium', reason: 'Deep dive into closures, prototypes, async patterns' },
      { trainingName: 'TypeScript Fundamentals', provider: 'Pluralsight', duration: '15 hours', priority: 'high', reason: 'Type safety for better code quality' },
    ]],
    ['Python', [
      { trainingName: 'Python for Data Science', provider: 'Coursera', duration: '40 hours', priority: 'high', reason: 'Essential for data-driven roles' },
      { trainingName: 'Django Web Development', provider: 'Udemy', duration: '25 hours', priority: 'medium', reason: 'Full-stack web development' },
    ]],
    ['Machine Learning', [
      { trainingName: 'Machine Learning by Stanford', provider: 'Coursera', duration: '60 hours', priority: 'high', reason: 'Comprehensive ML fundamentals' },
      { trainingName: 'Deep Learning Specialization', provider: 'Coursera', duration: '80 hours', priority: 'medium', reason: 'Neural networks and deep learning' },
    ]],
    ['AWS', [
      { trainingName: 'AWS Solutions Architect', provider: 'AWS Training', duration: '40 hours', priority: 'high', reason: 'Cloud architecture certification' },
      { trainingName: 'AWS Developer Associate', provider: 'AWS Training', duration: '30 hours', priority: 'medium', reason: 'Application development on AWS' },
    ]],
    ['Docker', [
      { trainingName: 'Docker Certified Associate', provider: 'Docker', duration: '30 hours', priority: 'high', reason: 'Containerization fundamentals' },
      { trainingName: 'Kubernetes Administration', provider: 'CNCF', duration: '35 hours', priority: 'medium', reason: 'Container orchestration' },
    ]],
    ['SQL', [
      { trainingName: 'Advanced SQL', provider: 'LeetCode', duration: '20 hours', priority: 'high', reason: 'Complex queries and optimization' },
      { trainingName: 'Database Design', provider: 'Stanford Online', duration: '15 hours', priority: 'medium', reason: 'Proper schema design' },
    ]],
    ['Leadership', [
      { trainingName: 'Leadership Fundamentals', provider: 'Harvard Business School Online', duration: '20 hours', priority: 'medium', reason: 'Management and team leadership' },
    ]],
  ]);

  // Skill levels score mapping
  private skillLevelScores: SkillLevelScore = {
    beginner: 25,
    intermediate: 50,
    advanced: 75,
    expert: 100,
  };

  constructor(config?: Partial<SkillsMatcherConfig>) {
    this.config = {
      weightExperience: 0.3,
      weightCertifications: 0.3,
      weightEndorsements: 0.1,
      levelEquivalents: {
        'fresher': 0,
        'junior': 1,
        'middle': 3,
        'senior': 5,
        'lead': 7,
        'principal': 10,
        'director': 12,
        'vp': 15,
      },
      ...config,
    };
  }

  /**
   * Analyze skills for a candidate against job requirements
   */
  analyzeSkills(
    candidate: Candidate,
    job?: Job
  ): SkillsAnalysis {
    const requiredSkills = job?.requirements.map(r => r.skill) || [];
    const candidateSkills = candidate.skills;

    // Match skills
    const matchedSkills = this.matchSkills(candidateSkills, requiredSkills, job?.requirements);

    // Find missing skills
    const missingSkills = this.findMissingSkills(candidateSkills, requiredSkills);

    // Calculate skill gaps
    const skillGaps = this.calculateSkillGaps(candidateSkills, job?.requirements || []);

    // Calculate skill coverage
    const skillCoveragePercent = this.calculateSkillCoverage(candidateSkills, requiredSkills);

    // Calculate skill relevance score
    const skillRelevanceScore = this.calculateSkillRelevanceScore(candidateSkills, job);

    // Get recommended trainings
    const recommendedTrainings = this.getRecommendedTrainings(candidateSkills, missingSkills);

    return {
      candidateId: candidate.id,
      jobId: job?.id,
      currentSkills: candidateSkills,
      requiredSkills,
      matchedSkills,
      missingSkills,
      skillGaps,
      skillCoveragePercent,
      skillRelevanceScore,
      recommendedTrainings,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Match candidate skills against required skills
   */
  private matchSkills(
    candidateSkills: Skill[],
    requiredSkills: string[],
    requirements?: JobRequirement[]
  ): SkillMatch[] {
    const matches: SkillMatch[] = [];

    for (const requiredSkill of requiredSkills) {
      const requirement = requirements?.find(r => r.skill === requiredSkill);
      const required = requirement?.required ?? true;
      const minYears = requirement?.minYears || 0;

      // Find matching skill in candidate's skill list
      const matchingCandidateSkill = candidateSkills.find(cs =>
        this.areSkillsRelated(cs.name, requiredSkill) ||
        cs.name.toLowerCase() === requiredSkill.toLowerCase()
      );

      if (matchingCandidateSkill) {
        const matchPercent = this.calculateMatchPercent(matchingCandidateSkill, requiredSkill, minYears);

        matches.push({
          skill: requiredSkill,
          candidateLevel: matchingCandidateSkill.level,
          requiredLevel: requirement?.priority || 'must_have',
          matchPercent,
          isRequired: required,
        });
      }
    }

    return matches;
  }

  /**
   * Check if two skills are related
   */
  private areSkillsRelated(skill1: string, skill2: string): boolean {
    const s1Lower = skill1.toLowerCase();
    const s2Lower = skill2.toLowerCase();

    // Direct match
    if (s1Lower === s2Lower) return true;

    // Check taxonomy
    for (const [, relatedSkills] of this.skillTaxonomy) {
      const allSkills = [skill1, ...relatedSkills].map(s => s.toLowerCase());
      if (allSkills.includes(s1Lower) && allSkills.includes(s2Lower)) {
        return true;
      }
    }

    // Partial match
    if (s1Lower.includes(s2Lower) || s2Lower.includes(s1Lower)) {
      return true;
    }

    return false;
  }

  /**
   * Calculate match percentage
   */
  private calculateMatchPercent(
    candidateSkill: Skill,
    requiredSkill: string,
    minYears: number
  ): number {
    // Base match from skill level
    let percent = this.skillLevelScores[candidateSkill.level] || 50;

    // Bonus for years of experience
    if (candidateSkill.yearsOfExperience && minYears > 0) {
      if (candidateSkill.yearsOfExperience >= minYears) {
        percent = Math.min(100, percent + 10);
      } else {
        percent = Math.round(percent * (candidateSkill.yearsOfExperience / minYears));
      }
    }

    // Bonus for verified skills
    if (candidateSkill.verified) {
      percent = Math.min(100, percent + 5);
    }

    // Bonus for endorsements
    if (candidateSkill.endorsements && candidateSkill.endorsements >= 5) {
      percent = Math.min(100, percent + 5);
    }

    return Math.round(percent);
  }

  /**
   * Find missing skills
   */
  private findMissingSkills(candidateSkills: Skill[], requiredSkills: string[]): string[] {
    return requiredSkills.filter(required =>
      !candidateSkills.some(cs => this.areSkillsRelated(cs.name, required))
    );
  }

  /**
   * Calculate skill gaps
   */
  private calculateSkillGaps(
    candidateSkills: Skill[],
    requirements: JobRequirement[]
  ): SkillGap[] {
    const gaps: SkillGap[] = [];

    for (const requirement of requirements) {
      const candidateSkill = candidateSkills.find(cs =>
        this.areSkillsRelated(cs.name, requirement.skill)
      );

      const requiredLevel = requirement.priority === 'must_have' ? 3 :
                           requirement.priority === 'should_have' ? 2 : 1;

      const currentLevelScore = candidateSkill
        ? this.getSkillLevelScore(candidateSkill.level)
        : 0;

      const gap = requiredLevel - currentLevelScore;

      if (gap > 0) {
        gaps.push({
          skill: requirement.skill,
          currentLevel: candidateSkill?.level || 'none',
          requiredLevel: requirement.priority || 'should_have',
          gapSeverity: gap >= 2 ? 'critical' : gap >= 1 ? 'major' : 'minor',
          recommendedTraining: this.getTrainingForSkill(requirement.skill),
        });
      }
    }

    return gaps.sort((a, b) => {
      const severityOrder = { critical: 0, major: 1, minor: 2, none: 3 };
      return severityOrder[a.gapSeverity] - severityOrder[b.gapSeverity];
    });
  }

  /**
   * Get skill level score
   */
  private getSkillLevelScore(level: string): number {
    const scores: Record<string, number> = {
      'none': 0,
      'beginner': 1,
      'intermediate': 2,
      'advanced': 3,
      'expert': 4,
    };
    return scores[level] || 0;
  }

  /**
   * Calculate skill coverage percentage
   */
  private calculateSkillCoverage(candidateSkills: Skill[], requiredSkills: string[]): number {
    if (requiredSkills.length === 0) return 100;

    const matched = requiredSkills.filter(required =>
      candidateSkills.some(cs => this.areSkillsRelated(cs.name, required))
    ).length;

    return Math.round((matched / requiredSkills.length) * 100);
  }

  /**
   * Calculate skill relevance score
   */
  private calculateSkillRelevanceScore(candidateSkills: Skill[], job?: Job): number {
    if (!job) {
      // Score based on skill diversity and level
      const avgLevel = candidateSkills.reduce((sum, s) =>
        sum + this.skillLevelScores[s.level], 0
      ) / (candidateSkills.length || 1);

      const diversityBonus = Math.min(candidateSkills.length * 2, 20);

      return Math.round(Math.min(100, avgLevel + diversityBonus));
    }

    // Score based on job requirements match
    const requiredSkills = job.requirements.map(r => r.skill);
    const coverage = this.calculateSkillCoverage(candidateSkills, requiredSkills);

    // Bonus for preferred skills
    const preferredMatch = candidateSkills.filter(cs =>
      job.requirements.some(r =>
        r.priority === 'should_have' && this.areSkillsRelated(cs.name, r.skill)
      )
    ).length;
    const preferredBonus = (preferredMatch / (job.requirements.filter(r => r.priority === 'should_have').length || 1)) * 10;

    return Math.round(Math.min(100, coverage * 0.7 + preferredBonus * 0.3));
  }

  /**
   * Get recommended trainings for missing skills
   */
  private getRecommendedTrainings(
    candidateSkills: Skill[],
    missingSkills: string[]
  ): RecommendedTraining[] {
    const recommendations: RecommendedTraining[] = [];
    const coveredSkills = candidateSkills.map(s => s.name.toLowerCase());

    for (const skill of missingSkills) {
      // Get training for this skill
      const trainings = this.trainingRecommendations.get(skill) ||
                       this.trainingRecommendations.get(skill.toLowerCase()) ||
                       [];

      for (const training of trainings) {
        recommendations.push({
          ...training,
          priority: coveredSkills.some(cs => this.areSkillsRelated(cs, skill)) ? 'low' : training.priority,
        });
      }

      // If no specific training found, add generic recommendation
      if (trainings.length === 0) {
        recommendations.push({
          trainingName: `${skill} Fundamentals`,
          provider: 'Udemy',
          duration: '10 hours',
          priority: 'medium',
          reason: `Learn ${skill} basics and fundamentals`,
        });
      }
    }

    // Deduplicate and sort by priority
    const seen = new Set<string>();
    const unique = recommendations.filter(r => {
      const key = r.trainingName.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return unique.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Get training for a specific skill
   */
  private getTrainingForSkill(skill: string): string | undefined {
    const trainings = this.trainingRecommendations.get(skill);
    return trainings?.[0]?.trainingName;
  }

  /**
   * Match candidate to job
   */
  matchCandidateToJob(candidate: Candidate, job: Job): CandidateJobMatch {
    const skillsAnalysis = this.analyzeSkills(candidate, job);

    // Calculate overall match score
    const skillsMatchScore = skillsAnalysis.skillCoveragePercent;
    const experienceMatchScore = this.calculateExperienceMatch(candidate, job);
    const cultureMatchScore = this.calculateCultureMatch(candidate, job);
    const salaryMatchScore = this.calculateSalaryMatch(candidate, job);

    const overallMatchScore = Math.round(
      skillsMatchScore * 0.4 +
      experienceMatchScore * 0.25 +
      cultureMatchScore * 0.2 +
      salaryMatchScore * 0.15
    );

    // Identify matched and missing requirements
    const matchedRequirements = skillsAnalysis.matchedSkills
      .filter(s => s.isRequired)
      .map(s => s.skill);

    const missingRequirements = skillsAnalysis.missingSkills;

    // Make recommendation
    const recommendation = this.makeMatchRecommendation(overallMatchScore, skillsMatchScore, missingRequirements);

    return {
      candidateId: candidate.id,
      jobId: job.id,
      overallMatchScore,
      skillsMatchScore,
      experienceMatchScore,
      cultureMatchScore,
      salaryMatchScore,
      matchedSkills: skillsAnalysis.matchedSkills.map(s => s.skill),
      missingSkills: skillsAnalysis.missingSkills,
      matchedRequirements,
      missingRequirements,
      recommendation,
      recommendationReason: this.generateMatchReason(recommendation, overallMatchScore, skillsAnalysis),
      rank: 0, // Will be set when ranking multiple candidates
      matchedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate experience match score
   */
  private calculateExperienceMatch(candidate: Candidate, job: Job): number {
    const candidateYears = this.calculateTotalYears(candidate.experience);
    const experienceLevel = job.experienceLevel;

    const expectedYears = this.config.levelEquivalents[experienceLevel] || 3;

    if (candidateYears >= expectedYears * 1.5) {
      return 100; // Overqualified but acceptable
    }

    if (candidateYears >= expectedYears) {
      return 90 + Math.min(10, (candidateYears - expectedYears) * 5);
    }

    // Gap penalty
    const gap = expectedYears - candidateYears;
    if (gap <= 1) return 70;
    if (gap <= 2) return 60;
    if (gap <= 3) return 50;
    return Math.max(20, 40 - gap * 10);
  }

  /**
   * Calculate total years of experience
   */
  private calculateTotalYears(experience: WorkExperience[]): number {
    const currentYear = new Date().getFullYear();
    let total = 0;

    for (const exp of experience) {
      const startYear = parseInt(exp.startDate) || currentYear - 1;
      const endYear = exp.current ? currentYear : (parseInt(exp.endDate || String(currentYear)) || currentYear);
      total += endYear - startYear;
    }

    return total;
  }

  /**
   * Calculate culture match score
   */
  private calculateCultureMatch(candidate: Candidate, job: Job): number {
    let score = 60;

    // Remote work preference
    if (job.remotePolicy === 'remote' && candidate.contact.location) {
      // Adjust based on location
      score += candidate.contact.location.toLowerCase().includes('remote') ? 15 : 0;
    }

    // Employment type
    if (job.employmentType === 'full_time' || candidate.experience.every(e => e.current)) {
      score += 10;
    }

    // Notice period (availability)
    const noticeShort = ['immediate', '15 days', '30 days'].some(np =>
      candidate.noticePeriod?.toLowerCase().includes(np)
    );
    if (noticeShort) score += 15;

    // Availability
    if (candidate.availableFrom) {
      const availableDate = new Date(candidate.availableFrom);
      const now = new Date();
      const daysUntil = Math.ceil((availableDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 30) score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate salary match score
   */
  private calculateSalaryMatch(candidate: Candidate, job: Job): number {
    if (!candidate.salaryExpectation || !job.salary) {
      return 70; // Neutral if no data
    }

    const expected = candidate.salaryExpectation.min;
    const budgetMin = job.salary.min;
    const budgetMax = job.salary.max;

    if (expected <= budgetMax) {
      if (expected <= budgetMin) {
        return 100; // Below budget - great!
      }
      const inRange = (expected - budgetMin) / (budgetMax - budgetMin);
      return Math.round(100 - inRange * 20); // 80-100 range
    }

    // Above budget
    const overage = (expected - budgetMax) / budgetMax;
    if (overage <= 0.1) return 50; // 10% over - negotiate
    if (overage <= 0.2) return 30; // 20% over - stretch
    return 10; // Significantly over budget
  }

  /**
   * Make match recommendation
   */
  private makeMatchRecommendation(
    overallScore: number,
    skillsScore: number,
    missingRequirements: string[]
  ): CandidateJobMatch['recommendation'] {
    // Critical missing skills
    if (missingRequirements.length >= 4) {
      return overallScore >= 70 ? 'neutral' : 'no';
    }

    if (overallScore >= 85) return 'strong_yes';
    if (overallScore >= 70) return 'yes';
    if (overallScore >= 50) return 'neutral';
    return 'no';
  }

  /**
   * Generate match reason
   */
  private generateMatchReason(
    recommendation: CandidateJobMatch['recommendation'],
    score: number,
    analysis: SkillsAnalysis
  ): string {
    switch (recommendation) {
      case 'strong_yes':
        return `Excellent match (${score}%). ${analysis.skillCoveragePercent}% skill coverage. Strong candidate with ${analysis.matchedSkills.length} matching skills.`;

      case 'yes':
        return `Good match (${score}%). ${analysis.skillCoveragePercent}% skill coverage. ${analysis.missingSkills.length > 0 ? `Consider training for: ${analysis.missingSkills.slice(0, 3).join(', ')}.` : ''}`;

      case 'neutral':
        return `Moderate match (${score}%). ${analysis.skillCoveragePercent}% skill coverage. ${analysis.missingSkills.length} skills gap. Manual review recommended.`;

      case 'no':
        return `Poor match (${score}%). Significant skill gaps (${analysis.missingSkills.slice(0, 3).join(', ')}). Consider for other positions.`;
    }
  }

  /**
   * Rank candidates for a job
   */
  rankCandidatesForJob(
    candidates: Candidate[],
    job: Job
  ): CandidateJobMatch[] {
    const matches = candidates.map(candidate => this.matchCandidateToJob(candidate, job));

    // Sort by overall match score
    matches.sort((a, b) => b.overallMatchScore - a.overallMatchScore);

    // Assign ranks
    matches.forEach((match, index) => {
      match.rank = index + 1;
    });

    return matches;
  }

  /**
   * Find best matching jobs for a candidate
   */
  findBestMatchingJobs(
    candidate: Candidate,
    jobs: Job[]
  ): CandidateJobMatch[] {
    const matches = jobs
      .filter(j => j.status === 'active')
      .map(job => this.matchCandidateToJob(candidate, job))
      .sort((a, b) => b.overallMatchScore - a.overallMatchScore);

    // Assign ranks
    matches.forEach((match, index) => {
      match.rank = index + 1;
    });

    return matches;
  }

  /**
   * Compare two candidates
   */
  compareCandidates(
    candidate1: Candidate,
    candidate2: Candidate,
    job?: Job
  ): {
    overallWinner: 'candidate1' | 'candidate2' | 'tie';
    skillWinner: 'candidate1' | 'candidate2' | 'tie';
    experienceWinner: 'candidate1' | 'candidate2' | 'tie';
    comparison: {
      skillScores: { candidate1: number; candidate2: number };
      experienceYears: { candidate1: number; candidate2: number };
      certificationCounts: { candidate1: number; candidate2: number };
    };
  } {
    const skills1 = this.analyzeSkills(candidate1, job);
    const skills2 = this.analyzeSkills(candidate2, job);

    const experience1 = this.calculateTotalYears(candidate1.experience);
    const experience2 = this.calculateTotalYears(candidate2.experience);

    // Skill comparison
    const skillScores = { candidate1: skills1.skillRelevanceScore, candidate2: skills2.skillRelevanceScore };
    const skillWinner = skillScores.candidate1 > skillScores.candidate2 ? 'candidate1' :
                       skillScores.candidate2 > skillScores.candidate1 ? 'candidate2' : 'tie';

    // Experience comparison
    const experienceYears = { candidate1: experience1, candidate2: experience2 };
    const experienceWinner = experience1 > experience2 ? 'candidate1' :
                            experience2 > experience1 ? 'candidate2' : 'tie';

    // Overall comparison
    const overallScore1 = skills1.skillRelevanceScore * 0.6 + (experience1 > 5 ? 80 : experience1 * 15) * 0.4;
    const overallScore2 = skills2.skillRelevanceScore * 0.6 + (experience2 > 5 ? 80 : experience2 * 15) * 0.4;

    const overallWinner = overallScore1 > overallScore2 ? 'candidate1' :
                         overallScore2 > overallScore1 ? 'candidate2' : 'tie';

    return {
      overallWinner,
      skillWinner,
      experienceWinner,
      comparison: {
        skillScores,
        experienceYears,
        certificationCounts: {
          candidate1: candidate1.certifications.length,
          candidate2: candidate2.certifications.length,
        },
      },
    };
  }

  /**
   * Get skill suggestions based on job trends
   */
  getSkillSuggestions(jobTitle: string): string[] {
    // Common skills for different job titles
    const suggestions: Record<string, string[]> = {
      'software engineer': ['JavaScript', 'Python', 'SQL', 'Git', 'Docker', 'AWS', 'React', 'Node.js'],
      'data scientist': ['Python', 'Machine Learning', 'SQL', 'TensorFlow', 'Pandas', 'Statistics', 'Deep Learning'],
      'frontend developer': ['JavaScript', 'React', 'HTML', 'CSS', 'TypeScript', 'Next.js', 'GraphQL'],
      'backend developer': ['Node.js', 'Python', 'Java', 'SQL', 'Redis', 'Docker', 'AWS'],
      'devops engineer': ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Linux', 'Python', 'Ansible'],
      'product manager': ['Agile', 'SQL', 'Product Strategy', 'Data Analysis', 'Communication', 'Jira'],
      'designer': ['Figma', 'UI/UX', 'Prototyping', 'User Research', 'Design Systems', 'Adobe XD'],
      'marketing manager': ['SEO', 'Google Analytics', 'Content Marketing', 'Social Media', 'CRM', 'Data Analysis'],
    };

    const titleLower = jobTitle.toLowerCase();

    for (const [key, skills] of Object.entries(suggestions)) {
      if (titleLower.includes(key)) {
        return skills;
      }
    }

    return ['Communication', 'Problem Solving', 'Teamwork', 'Time Management', 'Adaptability'];
  }
}

export const skillsMatcher = new SkillsMatcher();

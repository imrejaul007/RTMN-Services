/**
 * HR Recruiter Agent - Resume Screener Service
 * AI-powered resume screening with ATS scoring and keyword matching
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Resume,
  ScreeningCriteria,
  ScreeningResult,
  ParsedResumeData,
  JobRequirement,
} from '../types';

interface ResumeScreenerConfig {
  minSkillsMatch: number;
  minAtsScore: number;
  autoRejectThreshold: number;
  autoApproveThreshold: number;
}

export class ResumeScreener {
  private config: ResumeScreenerConfig;

  constructor(config?: Partial<ResumeScreenerConfig>) {
    this.config = {
      minSkillsMatch: 60,
      minAtsScore: 50,
      autoRejectThreshold: 30,
      autoApproveThreshold: 80,
      ...config,
    };
  }

  /**
   * Parse raw resume text into structured data
   */
  parseResume(resumeText: string, candidateId: string, fileName?: string): Resume {
    const parsedData = this.extractResumeData(resumeText);

    const resume: Resume = {
      id: uuidv4(),
      candidateId,
      fileName: fileName || 'resume.txt',
      extractedText: resumeText,
      parsedData,
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return resume;
  }

  /**
   * Extract structured data from resume text using NLP-like patterns
   */
  private extractResumeData(resumeText: string): ParsedResumeData {
    const text = resumeText.toLowerCase();
    const lines = resumeText.split('\n').map(l => l.trim()).filter(Boolean);

    // Extract name (usually first substantial line)
    const name = this.extractName(lines);

    // Extract email
    const emailMatch = resumeText.match(/[\w.-]+@[\w.-]+\.\w+/);
    const email = emailMatch ? emailMatch[0] : undefined;

    // Extract phone
    const phoneMatch = resumeText.match(/(\+?91[\s-]?)?[6-9]\d{9}/);
    const phone = phoneMatch ? phoneMatch[0] : undefined;

    // Extract skills
    const skills = this.extractSkills(resumeText);

    // Extract experience
    const experience = this.extractExperience(resumeText);

    // Extract education
    const education = this.extractEducation(resumeText);

    // Extract summary
    const summary = this.extractSummary(resumeText);

    return {
      name,
      email,
      phone,
      summary,
      experience,
      education,
      skills,
      certifications: [],
      languages: [],
      projects: [],
      awards: [],
      publications: [],
    };
  }

  /**
   * Extract candidate name from resume
   */
  private extractName(lines: string[]): string {
    // First non-empty line that's likely a name
    for (const line of lines.slice(0, 5)) {
      const cleaned = line.trim();
      // Skip lines that look like emails, phones, or headers
      if (
        cleaned.includes('@') ||
        /\d{10}/.test(cleaned) ||
        /^(resume|curriculum vitae|cv)/i.test(cleaned) ||
        cleaned.length < 2 ||
        cleaned.length > 50
      ) {
        continue;
      }
      // Looks like a name (2-4 words, mostly letters)
      if (/^[a-zA-Z\s.]{2,50}$/.test(cleaned)) {
        return cleaned;
      }
    }
    return 'Unknown';
  }

  /**
   * Extract skills from resume text
   */
  private extractSkills(text: string): string[] {
    const commonSkills = [
      // Programming languages
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust',
      'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl', 'shell', 'bash',
      // Frontend
      'react', 'angular', 'vue', 'svelte', 'next.js', 'nuxt', 'html', 'css', 'sass',
      'tailwind', 'bootstrap', 'jquery', 'redux', 'graphql', 'rest api',
      // Backend
      'node.js', 'express', 'django', 'flask', 'fastapi', 'spring', 'spring boot',
      'rails', 'laravel', 'asp.net', 'django rest framework',
      // Databases
      'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'sqlite',
      'oracle', 'sql server', 'dynamodb', 'firebase', 'supabase',
      // Cloud & DevOps
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform',
      'ansible', 'linux', 'git', 'github', 'gitlab',
      // Data & ML
      'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy',
      'scikit-learn', 'data science', 'data analysis', 'data engineering',
      'tableau', 'power bi', 'etl', 'spark', 'hadoop',
      // Project Management
      'agile', 'scrum', 'kanban', 'jira', 'confluence', 'asana', 'trello',
      // Soft skills
      'communication', 'leadership', 'problem solving', 'teamwork', 'project management',
      'time management', 'critical thinking', 'adaptability',
      // Other
      'excel', 'powerpoint', 'word', 'salesforce', 'sap', 'figma', 'sketch',
    ];

    const foundSkills: string[] = [];
    const textLower = text.toLowerCase();

    for (const skill of commonSkills) {
      if (textLower.includes(skill.toLowerCase())) {
        // Normalize skill name
        const normalizedSkill = this.normalizeSkillName(skill);
        if (!foundSkills.includes(normalizedSkill)) {
          foundSkills.push(normalizedSkill);
        }
      }
    }

    return foundSkills;
  }

  /**
   * Normalize skill names for consistency
   */
  private normalizeSkillName(skill: string): string {
    const mapping: Record<string, string> = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'python': 'Python',
      'java': 'Java',
      'c++': 'C++',
      'c#': 'C#',
      'react': 'React',
      'angular': 'Angular',
      'vue': 'Vue.js',
      'node.js': 'Node.js',
      'mongodb': 'MongoDB',
      'postgresql': 'PostgreSQL',
      'mysql': 'MySQL',
      'aws': 'AWS',
      'gcp': 'Google Cloud',
      'machine learning': 'Machine Learning',
      'deep learning': 'Deep Learning',
      'data science': 'Data Science',
      'data analysis': 'Data Analysis',
      'html': 'HTML',
      'css': 'CSS',
      'rest api': 'REST API',
      'graphql': 'GraphQL',
      'docker': 'Docker',
      'kubernetes': 'Kubernetes',
      'ci/cd': 'CI/CD',
      'linux': 'Linux',
      'git': 'Git',
    };

    return mapping[skill.toLowerCase()] || skill.charAt(0).toUpperCase() + skill.slice(1);
  }

  /**
   * Extract work experience from resume text
   */
  private extractExperience(text: string): ParsedResumeData['experience'] {
    const experience: ParsedResumeData['experience'] = [];

    // Look for experience patterns
    const expPatterns = [
      /(?:experience|work history|employment)[\s:]*\n([\s\S]*?)(?=\n\n|education|skills|certifications|$)/gi,
    ];

    for (const pattern of expPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const expText = match[1];
        const companies = this.extractCompanies(expText);
        for (const company of companies) {
          experience.push({
            company,
            title: 'Professional Experience',
            startDate: 'Unknown',
            current: expText.includes('present'),
          });
        }
      }
    }

    // Try to extract years of experience
    const yearsMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)/i);
    if (yearsMatch && experience.length === 0) {
      // Add placeholder experience based on years
      experience.push({
        company: 'Previous Company',
        title: 'Professional',
        startDate: `${new Date().getFullYear() - parseInt(yearsMatch[1])}`,
        current: true,
      });
    }

    return experience;
  }

  /**
   * Extract company names from experience text
   */
  private extractCompanies(text: string): string[] {
    const companies: string[] = [];

    // Common patterns for company mentions
    const companyPatterns = [
      /(?:at|@|,)\s+([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Ltd|Pvt|Limited|Technologies|Software|Solutions|Services))/g,
      /([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Ltd|Pvt|Limited|Technologies|Software|Solutions|Services))/g,
    ];

    for (const pattern of companyPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const company = match[1].trim();
        if (company.length > 2 && !companies.includes(company)) {
          companies.push(company);
        }
      }
    }

    return companies;
  }

  /**
   * Extract education from resume text
   */
  private extractEducation(text: string): ParsedResumeData['education'] {
    const education: ParsedResumeData['education'] = [];

    // Common degree patterns
    const degreePatterns = [
      { pattern: /b\.?t\.?e\.?|bachelor.*technology|b\.?s\.?\s*(?:c\.)?/i, degree: 'B.Tech/B.E', field: 'Engineering' },
      { pattern: /b\.?s\.?\s*(?:c\.?s\.?|computer)/i, degree: 'B.Sc', field: 'Computer Science' },
      { pattern: /m\.?b\.?a\.?/i, degree: 'MBA', field: 'Business Administration' },
      { pattern: /m\.?s\.?|master.*science/i, degree: 'M.S', field: 'Science' },
      { pattern: /m\.?t\.?e\.?|master.*technology/i, degree: 'M.Tech', field: 'Engineering' },
      { pattern: /ph\.?d\.?|doctor.*philosophy/i, degree: 'Ph.D', field: 'Research' },
      { pattern: /12th|higher.*secondary|intermediate/i, degree: '12th', field: 'Secondary Education' },
      { pattern: /10th|secondary|matriculation/i, degree: '10th', field: 'Secondary Education' },
    ];

    // Common Indian universities/institutes
    const institutions = [
      'iit', 'nit', 'bits', 'iiit', 'vit', 'anna university', 'jnu', 'du',
      'iim', 'xlri', 'iimc', 'isb', 'imi', 'sp jain', 'iit bombay', 'iit delhi',
      'iit madras', 'iit kanpur', 'iit roorkee', 'iit kgp', 'nit trichy', 'nit surathkal',
    ];

    for (const { pattern, degree, field } of degreePatterns) {
      if (pattern.test(text)) {
        let institution = 'University';

        for (const inst of institutions) {
          if (text.includes(inst)) {
            institution = inst.toUpperCase();
            break;
          }
        }

        education.push({
          degree,
          field,
          institution,
        });
      }
    }

    return education;
  }

  /**
   * Extract summary/objective from resume
   */
  private extractSummary(text: string): string | undefined {
    const summaryPatterns = [
      /(?:summary|objective|profile|about)[\s:]*\n([\s\S]*?)(?=\n\n|experience|skills|education|$)/gi,
    ];

    for (const pattern of summaryPatterns) {
      const match = text.match(pattern);
      if (match) {
        const summary = match[0].replace(/(?:summary|objective|profile|about)[\s:]*\n?/gi, '').trim();
        return summary.substring(0, 500);
      }
    }

    return undefined;
  }

  /**
   * Screen a resume against criteria
   */
  screenResume(
    resume: Resume,
    criteria?: ScreeningCriteria,
    screenedBy: string = 'system'
  ): ScreeningResult {
    const candidateId = resume.candidateId;
    const resumeId = resume.id;
    const parsedData = resume.parsedData;

    // Calculate scores
    const skillsScore = this.calculateSkillsScore(parsedData.skills, criteria);
    const experienceScore = this.calculateExperienceScore(parsedData.experience, criteria);
    const educationScore = this.calculateEducationScore(parsedData.education, criteria);
    const cultureFitScore = this.calculateCultureFitScore(parsedData);

    // Overall score is weighted average
    const overallScore = Math.round(
      skillsScore * 0.35 +
      experienceScore * 0.30 +
      educationScore * 0.20 +
      cultureFitScore * 0.15
    );

    // ATS scoring
    const atsScore = this.calculateAtsScore(resume.extractedText, criteria);
    const keywordMatches = this.calculateKeywordMatches(resume.extractedText, criteria);

    // Match skills
    const matchedSkills = criteria?.requiredSkills
      ? parsedData.skills.filter(s =>
          criteria.requiredSkills!.some(rs => rs.toLowerCase() === s.toLowerCase())
        )
      : parsedData.skills;

    const missingSkills = criteria?.requiredSkills
      ? criteria.requiredSkills.filter(rs =>
          !parsedData.skills.some(s => s.toLowerCase() === rs.toLowerCase())
        )
      : [];

    // Highlight strengths
    const strengths = this.identifyStrengths(parsedData, matchedSkills);

    // Identify concerns
    const concerns = this.identifyConcerns(parsedData, missingSkills, criteria);

    // Make recommendation
    const recommendation = this.makeRecommendation(overallScore, atsScore, missingSkills);

    return {
      candidateId,
      resumeId,
      overallScore,
      skillsScore,
      experienceScore,
      educationScore,
      cultureFitScore,
      matchedSkills,
      missingSkills,
      highlightedStrengths: strengths,
      concerns,
      recommendation,
      recommendationReason: this.generateRecommendationReason(recommendation, overallScore, matchedSkills, missingSkills),
      atsScore,
      keywordMatches,
      screenedAt: new Date().toISOString(),
      screenedBy,
    };
  }

  /**
   * Screen multiple resumes and rank them
   */
  screenResumes(
    resumes: Resume[],
    criteria: ScreeningCriteria
  ): ScreeningResult[] {
    return resumes
      .map(resume => this.screenResume(resume, criteria))
      .sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Calculate skills match score
   */
  private calculateSkillsScore(
    skills: string[],
    criteria?: ScreeningCriteria
  ): number {
    if (!criteria?.requiredSkills?.length) {
      return skills.length > 5 ? 80 : skills.length > 2 ? 60 : 40;
    }

    const matched = skills.filter(s =>
      criteria.requiredSkills!.some(rs => rs.toLowerCase() === s.toLowerCase())
    );

    const matchPercent = (matched.length / criteria.requiredSkills!.length) * 100;

    // Also check preferred skills
    let preferredMatch = 0;
    if (criteria.preferredSkills?.length) {
      preferredMatch = skills.filter(s =>
        criteria.preferredSkills!.some(ps => ps.toLowerCase() === s.toLowerCase())
      ).length;
      const preferredPercent = (preferredMatch / criteria.preferredSkills!.length) * 100;
      return Math.round((matchPercent * 0.7) + (preferredPercent * 0.3));
    }

    return Math.round(matchPercent);
  }

  /**
   * Calculate experience score
   */
  private calculateExperienceScore(
    experience: ParsedResumeData['experience'],
    criteria?: ScreeningCriteria
  ): number {
    let yearsOfExperience = 0;

    for (const exp of experience) {
      if (exp.current) {
        const startYear = parseInt(exp.startDate) || new Date().getFullYear() - 1;
        yearsOfExperience += new Date().getFullYear() - startYear;
      } else if (exp.endDate) {
        const startYear = parseInt(exp.startDate) || 2020;
        const endYear = parseInt(exp.endDate) || new Date().getFullYear();
        yearsOfExperience += endYear - startYear;
      }
    }

    if (criteria?.minYearsExperience) {
      if (yearsOfExperience >= criteria.minYearsExperience) {
        const excess = yearsOfExperience - criteria.minYearsExperience;
        return Math.min(100, 70 + excess * 5);
      }
      return Math.round((yearsOfExperience / criteria.minYearsExperience) * 50);
    }

    // Score based on years of experience
    if (yearsOfExperience >= 10) return 90;
    if (yearsOfExperience >= 7) return 80;
    if (yearsOfExperience >= 5) return 70;
    if (yearsOfExperience >= 3) return 60;
    if (yearsOfExperience >= 1) return 50;
    return 40;
  }

  /**
   * Calculate education score
   */
  private calculateEducationScore(
    education: ParsedResumeData['education'],
    criteria?: ScreeningCriteria
  ): number {
    if (!education.length) return 50;

    // Score based on highest degree
    let degreeScore = 50;

    for (const edu of education) {
      if (/ph\.?d\.?|doctor/i.test(edu.degree)) {
        degreeScore = 100;
        break;
      }
      if (/m\.?b\.?a\.?|m\.?s\.?|m\.?t\.?e\.?|master/i.test(edu.degree)) {
        degreeScore = 85;
      } else if (/b\.?t\.?e\.?|b\.?e\.?|b\.?s\.?|bachelor/i.test(edu.degree)) {
        degreeScore = 70;
      } else if (/12th|intermediate/i.test(edu.degree)) {
        degreeScore = 55;
      }
    }

    // Check against education requirements
    if (criteria?.educationRequirements?.length) {
      const meetsRequirements = criteria.educationRequirements.some(req => {
        return education.some(edu =>
          edu.degree.toLowerCase().includes(req.toLowerCase()) ||
          edu.field.toLowerCase().includes(req.toLowerCase())
        );
      });
      if (!meetsRequirements) {
        degreeScore = Math.round(degreeScore * 0.7);
      }
    }

    return degreeScore;
  }

  /**
   * Calculate culture fit score based on resume content
   */
  private calculateCultureFitScore(parsedData: ParsedResumeData): number {
    let score = 60;

    // Check for achievements
    const achievementIndicators = ['achieved', 'led', 'managed', 'improved', 'increased', 'reduced', 'delivered'];
    const text = parsedData.summary || '';
    const achievements = achievementIndicators.filter(ind => text.toLowerCase().includes(ind));

    if (achievements.length >= 3) score += 15;
    else if (achievements.length >= 1) score += 10;

    // Check for variety (multiple companies = adaptable)
    if (parsedData.experience.length > 3) score += 10;
    else if (parsedData.experience.length > 1) score += 5;

    // Check for continuous learning (certifications)
    if (parsedData.certifications.length >= 3) score += 10;
    else if (parsedData.certifications.length >= 1) score += 5;

    // Check for languages (international exposure)
    if (parsedData.languages && parsedData.languages.length > 1) score += 5;

    return Math.min(100, score);
  }

  /**
   * Calculate ATS (Applicant Tracking System) score
   */
  private calculateAtsScore(resumeText: string, criteria?: ScreeningCriteria): number {
    let score = 50;

    const text = resumeText.toLowerCase();

    // Check for key sections
    const sections = ['experience', 'education', 'skills', 'contact'];
    const foundSections = sections.filter(s => text.includes(s));
    score += foundSections.length * 8;

    // Check for action verbs
    const actionVerbs = [
      'achieved', 'managed', 'led', 'developed', 'implemented', 'improved',
      'increased', 'reduced', 'created', 'designed', 'analyzed', 'coordinated'
    ];
    const actionVerbCount = actionVerbs.filter(v => text.includes(v)).length;
    score += Math.min(actionVerbCount * 3, 15);

    // Check formatting indicators (bullet points, numbers)
    const bulletPoints = (resumeText.match(/[•·\-\*]\s/g) || []).length;
    const hasNumbers = /\d+/.test(resumeText);
    if (bulletPoints > 5) score += 5;
    if (hasNumbers) score += 3;

    // Check against required keywords
    if (criteria?.requiredSkills?.length) {
      const keywordMatch = criteria.requiredSkills.filter(skill =>
        text.includes(skill.toLowerCase())
      ).length;
      const keywordPercent = (keywordMatch / criteria.requiredSkills.length) * 20;
      score = score * 0.7 + keywordPercent * 0.3;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Calculate keyword matches
   */
  private calculateKeywordMatches(
    resumeText: string,
    criteria?: ScreeningCriteria
  ): ScreeningResult['keywordMatches'] {
    const text = resumeText.toLowerCase();
    const allKeywords = [
      ...(criteria?.requiredSkills || []),
      ...(criteria?.preferredSkills || []),
      ...(criteria?.certificationsRequired || []),
    ];

    if (!allKeywords.length) {
      return { matched: [], missing: [], density: 0 };
    }

    const matched = allKeywords.filter(kw =>
      text.includes(kw.toLowerCase())
    );

    const missing = allKeywords.filter(kw =>
      !text.includes(kw.toLowerCase())
    );

    // Calculate keyword density
    const totalWords = text.split(/\s+/).length;
    const matchedWordCount = matched.reduce((count, kw) => {
      const regex = new RegExp(kw.toLowerCase(), 'gi');
      return count + (text.match(regex)?.length || 0);
    }, 0);

    const density = totalWords > 0
      ? Math.round((matchedWordCount / totalWords) * 1000) / 10
      : 0;

    return { matched, missing, density };
  }

  /**
   * Identify candidate strengths
   */
  private identifyStrengths(
    parsedData: ParsedResumeData,
    matchedSkills: string[]
  ): string[] {
    const strengths: string[] = [];

    // Strong skill match
    if (matchedSkills.length >= 5) {
      strengths.push(`Strong skill match with ${matchedSkills.length} relevant technologies`);
    }

    // Seniority
    const totalYears = parsedData.experience.reduce((sum, exp) => {
      if (exp.current) {
        return sum + (new Date().getFullYear() - (parseInt(exp.startDate) || new Date().getFullYear() - 1));
      }
      return sum + (parseInt(exp.endDate || '0') - parseInt(exp.startDate));
    }, 0);

    if (totalYears >= 7) {
      strengths.push(`${totalYears}+ years of professional experience`);
    }

    // Education
    if (parsedData.education.some(e => /master|mba|ph\.?d/i.test(e.degree))) {
      strengths.push('Advanced degree holder');
    }

    // Certifications
    if (parsedData.certifications.length >= 2) {
      strengths.push(`Has ${parsedData.certifications.length} professional certifications`);
    }

    // Diversity
    if (parsedData.experience.length >= 3) {
      strengths.push('Diverse work experience across multiple organizations');
    }

    return strengths;
  }

  /**
   * Identify concerns in the resume
   */
  private identifyConcerns(
    parsedData: ParsedResumeData,
    missingSkills: string[],
    criteria?: ScreeningCriteria
  ): string[] {
    const concerns: string[] = [];

    // Missing required skills
    if (missingSkills.length > 0) {
      concerns.push(`Missing ${missingSkills.length} required skills: ${missingSkills.slice(0, 3).join(', ')}${missingSkills.length > 3 ? '...' : ''}`);
    }

    // Limited experience
    const totalYears = parsedData.experience.reduce((sum, exp) => {
      if (exp.current) return sum + 1;
      return sum + (parseInt(exp.endDate || '0') - parseInt(exp.startDate));
    }, 0);

    if (totalYears < 2 && criteria?.minYearsExperience && criteria.minYearsExperience >= 2) {
      concerns.push('Limited professional experience');
    }

    // No education listed
    if (parsedData.education.length === 0) {
      concerns.push('Education details not provided');
    }

    // Career gaps
    if (this.hasCareerGaps(parsedData.experience)) {
      concerns.push('Potential career gaps detected');
    }

    // No achievements
    if (!parsedData.summary && parsedData.experience.length > 0) {
      concerns.push('Limited achievement documentation');
    }

    return concerns;
  }

  /**
   * Check for career gaps
   */
  private hasCareerGaps(experience: ParsedResumeData['experience']): boolean {
    if (experience.length <= 1) return false;

    const sorted = [...experience].sort((a, b) =>
      parseInt(a.startDate) - parseInt(b.startDate)
    );

    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = parseInt(sorted[i - 1].endDate || sorted[i - 1].startDate);
      const currStart = parseInt(sorted[i].startDate);
      if (currStart - prevEnd > 1) return true;
    }

    return false;
  }

  /**
   * Make screening recommendation
   */
  private makeRecommendation(
    overallScore: number,
    atsScore: number,
    missingSkills: string[]
  ): ScreeningResult['recommendation'] {
    // Critical missing skills
    if (missingSkills.length >= 5) {
      return overallScore >= 70 ? 'neutral' : 'no';
    }

    // Strong yes
    if (overallScore >= this.config.autoApproveThreshold && atsScore >= 70) {
      return 'strong_yes';
    }

    // Yes
    if (overallScore >= 60 && atsScore >= 50) {
      return 'yes';
    }

    // Neutral
    if (overallScore >= 40) {
      return 'neutral';
    }

    // No
    if (overallScore >= this.config.autoRejectThreshold) {
      return 'no';
    }

    // Strong no
    return 'strong_no';
  }

  /**
   * Generate recommendation reason
   */
  private generateRecommendationReason(
    recommendation: ScreeningResult['recommendation'],
    overallScore: number,
    matchedSkills: string[],
    missingSkills: string[]
  ): string {
    switch (recommendation) {
      case 'strong_yes':
        return `Highly recommended. Strong overall score of ${overallScore} with excellent skill match (${matchedSkills.length} skills matched) and good ATS compatibility.`;

      case 'yes':
        return `Recommended. Overall score of ${overallScore} with ${matchedSkills.length} matching skills. Candidate meets most requirements.`;

      case 'neutral':
        const concerns = missingSkills.length > 0
          ? `Missing ${missingSkills.length} skills. `
          : 'May require additional evaluation. ';
        return `Proceed with caution. Score of ${overallScore}. ${concerns}Manual review recommended.`;

      case 'no':
        return `Not recommended. Score of ${overallScore} with significant gaps in requirements. Consider for alternative positions.`;

      case 'strong_no':
        return `Strongly not recommended. Score of ${overallScore} falls below minimum threshold. Multiple critical requirements not met.`;
    }
  }

  /**
   * Match resume skills against job requirements
   */
  matchAgainstJobRequirements(
    resume: Resume,
    requirements: JobRequirement[]
  ): {
    matchedRequirements: string[];
    missingRequirements: string[];
    matchScore: number;
  } {
    const resumeSkills = resume.parsedData.skills.map(s => s.toLowerCase());

    const matchedRequirements: string[] = [];
    const missingRequirements: string[] = [];

    for (const req of requirements) {
      const hasSkill = resumeSkills.some(s =>
        s.includes(req.skill.toLowerCase()) ||
        req.skill.toLowerCase().includes(s)
      );

      if (hasSkill) {
        matchedRequirements.push(req.skill);
      } else {
        missingRequirements.push(req.skill);
      }
    }

    const matchScore = requirements.length > 0
      ? Math.round((matchedRequirements.length / requirements.length) * 100)
      : 0;

    return { matchedRequirements, missingRequirements, matchScore };
  }
}

export const resumeScreener = new ResumeScreener();

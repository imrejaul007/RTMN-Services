import { requireAuth } from '@rtmn/shared/auth';
import express, { type Request, type Response, type NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  description?: string;
  employeeId?: string;
  certifications: Certification[];
  endorsements: Endorsement[];
  yearsOfExperience: number;
  proficiencyScore: number;
  lastValidated?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface SkillCreate {
  name: string;
  category?: SkillCategory;
  level?: SkillLevel;
  description?: string;
  employeeId?: string;
  certifications?: Certification[];
  endorsements?: Endorsement[];
  yearsOfExperience?: number;
  proficiencyScore?: number;
  metadata?: Record<string, any>;
}

export interface SkillUpdate {
  name?: string;
  category?: SkillCategory;
  level?: SkillLevel;
  description?: string;
  employeeId?: string;
  certifications?: Certification[];
  endorsements?: Endorsement[];
  yearsOfExperience?: number;
  proficiencyScore?: number;
  metadata?: Record<string, any>;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialUrl?: string;
  verified: boolean;
}

export interface Endorsement {
  id: string;
  endorserId: string;
  endorserName: string;
  comment?: string;
  createdAt: string;
}

export interface SkillSearch {
  query?: string;
  category?: SkillCategory;
  level?: SkillLevel;
  minProficiencyScore?: number;
  employeeId?: string;
}

export type SkillCategory =
  | 'technical'
  | 'soft'
  | 'domain'
  | 'leadership'
  | 'communication'
  | 'analytical'
  | 'creative'
  | 'operational';

export type SkillLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert'
  | 'master';

// Validation helpers
function validateSkillCategory(category: string): category is SkillCategory {
  return ['technical', 'soft', 'domain', 'leadership', 'communication', 'analytical', 'creative', 'operational'].includes(category);
}

function validateSkillLevel(level: string): level is SkillLevel {
  return ['beginner', 'intermediate', 'advanced', 'expert', 'master'].includes(level);
}

function calculateProficiencyScore(level: SkillLevel, yearsOfExperience: number): number {
  const baseScores: Record<SkillLevel, number> = {
    beginner: 20,
    intermediate: 40,
    advanced: 60,
    expert: 80,
    master: 95
  };
  const base = baseScores[level];
  const experienceBonus = Math.min(yearsOfExperience * 2, 5);
  return Math.min(base + experienceBonus, 100);
}

// Create SkillTwin service
export function createSkillTwinService() {
  // In-memory storage (instance-level to allow testing)
  const skills: Map<string, Skill> = new Map();

  const app = express();
  app.use(express.json());

  // Helper to send response
  const sendResponse = (res: Response, statusCode: number, data: any) => {
    res.status(statusCode).json(data);
  };

  // Routes
  app.post('/api/skills',requireAuth,  (req: Request, res: Response) => {
    const { name, category, level, description, employeeId, certifications, endorsements, yearsOfExperience, proficiencyScore, metadata } = req.body;

    if (!name) {
      return sendResponse(res, 400, { error: 'Skill name is required' });
    }

    const finalCategory: SkillCategory = category || 'technical';
    const finalLevel: SkillLevel = level || 'intermediate';
    const exp = yearsOfExperience || 0;
    const score = proficiencyScore ?? calculateProficiencyScore(finalLevel, exp);

    const skill: Skill = {
      id: uuidv4(),
      name,
      category: finalCategory,
      level: finalLevel,
      description,
      employeeId,
      certifications: certifications || [],
      endorsements: endorsements || [],
      yearsOfExperience: exp,
      proficiencyScore: score,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata
    };

    skills.set(skill.id, skill);
    sendResponse(res, 201, skill);
  });

  app.get('/api/skills/:id', (req: Request, res: Response) => {
    const skill = skills.get(req.params.id);
    if (!skill) {
      return sendResponse(res, 404, { error: 'Skill not found' });
    }
    sendResponse(res, 200, skill);
  });

  app.put('/api/skills/:id',requireAuth,  (req: Request, res: Response) => {
    const skill = skills.get(req.params.id);
    if (!skill) {
      return sendResponse(res, 404, { error: 'Skill not found' });
    }

    const { name, category, level, description, employeeId, certifications, endorsements, yearsOfExperience, proficiencyScore, metadata } = req.body;

    if (name) skill.name = name;
    if (category) {
      if (!validateSkillCategory(category)) {
        return sendResponse(res, 400, { error: 'Invalid skill category' });
      }
      skill.category = category;
    }
    if (level) {
      if (!validateSkillLevel(level)) {
        return sendResponse(res, 400, { error: 'Invalid skill level' });
      }
      skill.level = level;
    }
    if (description !== undefined) skill.description = description;
    if (employeeId !== undefined) skill.employeeId = employeeId;
    if (certifications) skill.certifications = certifications;
    if (endorsements) skill.endorsements = endorsements;
    if (yearsOfExperience !== undefined) skill.yearsOfExperience = yearsOfExperience;
    if (proficiencyScore !== undefined) skill.proficiencyScore = proficiencyScore;
    if (metadata) skill.metadata = metadata;
    skill.updatedAt = new Date().toISOString();

    skills.set(skill.id, skill);
    sendResponse(res, 200, skill);
  });

  app.delete('/api/skills/:id',requireAuth,  (req: Request, res: Response) => {
    if (!skills.has(req.params.id)) {
      return sendResponse(res, 404, { error: 'Skill not found' });
    }
    skills.delete(req.params.id);
    sendResponse(res, 204, null);
  });

  app.get('/api/skills', (req: Request, res: Response) => {
    const { query, category, level, minProficiencyScore, employeeId } = req.query;

    let filtered = Array.from(skills.values());

    if (query) {
      const q = (query as string).toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      );
    }

    if (category) {
      if (!validateSkillCategory(category as string)) {
        return sendResponse(res, 400, { error: 'Invalid skill category' });
      }
      filtered = filtered.filter(s => s.category === category);
    }

    if (level) {
      if (!validateSkillLevel(level as string)) {
        return sendResponse(res, 400, { error: 'Invalid skill level' });
      }
      filtered = filtered.filter(s => s.level === level);
    }

    if (minProficiencyScore) {
      const minScore = parseFloat(minProficiencyScore as string);
      filtered = filtered.filter(s => s.proficiencyScore >= minScore);
    }

    if (employeeId) {
      filtered = filtered.filter(s => s.employeeId === employeeId);
    }

    sendResponse(res, 200, { skills: filtered, total: filtered.length });
  });

  // Endorsements
  app.post('/api/skills/:id/endorse',requireAuth,  (req: Request, res: Response) => {
    const skill = skills.get(req.params.id);
    if (!skill) {
      return sendResponse(res, 404, { error: 'Skill not found' });
    }

    const { endorserId, endorserName, comment } = req.body;
    if (!endorserId || !endorserName) {
      return sendResponse(res, 400, { error: 'endorserId and endorserName are required' });
    }

    const endorsement: Endorsement = {
      id: uuidv4(),
      endorserId,
      endorserName,
      comment,
      createdAt: new Date().toISOString()
    };

    skill.endorsements.push(endorsement);
    skill.updatedAt = new Date().toISOString();
    skills.set(skill.id, skill);

    sendResponse(res, 201, endorsement);
  });

  // Certifications
  app.post('/api/skills/:id/certifications',requireAuth,  (req: Request, res: Response) => {
    const skill = skills.get(req.params.id);
    if (!skill) {
      return sendResponse(res, 404, { error: 'Skill not found' });
    }

    const { name, issuer, issueDate, expiryDate, credentialUrl } = req.body;
    if (!name || !issuer || !issueDate) {
      return sendResponse(res, 400, { error: 'name, issuer, and issueDate are required' });
    }

    const certification: Certification = {
      id: uuidv4(),
      name,
      issuer,
      issueDate,
      expiryDate,
      credentialUrl,
      verified: false
    };

    skill.certifications.push(certification);
    skill.updatedAt = new Date().toISOString();
    skills.set(skill.id, skill);

    sendResponse(res, 201, certification);
  });

  // Analytics
  app.get('/api/skills/analytics/summary', (_req: Request, res: Response) => {
    const allSkills = Array.from(skills.values());

    const byCategory: Record<string, number> = {};
    const byLevel: Record<string, number> = {};
    let totalEndorsements = 0;
    let totalCertifications = 0;

    allSkills.forEach(skill => {
      byCategory[skill.category] = (byCategory[skill.category] || 0) + 1;
      byLevel[skill.level] = (byLevel[skill.level] || 0) + 1;
      totalEndorsements += skill.endorsements.length;
      totalCertifications += skill.certifications.length;
    });

    sendResponse(res, 200, {
      total: allSkills.length,
      byCategory,
      byLevel,
      totalEndorsements,
      totalCertifications,
      avgProficiencyScore: allSkills.length > 0
        ? allSkills.reduce((sum, s) => sum + s.proficiencyScore, 0) / allSkills.length
        : 0
    });
  });

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    sendResponse(res, 200, {
      status: 'healthy',
      service: 'skill-twin',
      timestamp: new Date().toISOString(),
      skills: skills.size
    });
  });

  return app;
}

export default createSkillTwinService;

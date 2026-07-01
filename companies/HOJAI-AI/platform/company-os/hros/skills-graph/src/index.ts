/**
 * HROS Skills Graph
 *
 * The graph-based skills intelligence system for all employees
 * Inspired by Eightfold AI and LinkedIn Skills Graph
 *
 * Features:
 * - Skill taxonomy
 * - Skill relationships
 * - Skill gap analysis
 * - AI skill recommendations
 * - Team capability maps
 * - Career path recommendations
 */

import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

// ============================================================
// SKILL TYPES
// ============================================================

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  subcategory?: string;
  level: SkillLevel;
  description?: string;
  keywords: string[];
  relatedSkills: string[];
  growthDemand?: 'rising' | 'stable' | 'declining';
  createdAt: Date;
  updatedAt: Date;
}

export type SkillCategory =
  | 'technical'
  | 'leadership'
  | 'domain'
  | 'soft'
  | 'tool'
  | 'language'
  | 'certification'
  | 'emerging';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'thought-leader';

export interface EmployeeSkillProfile {
  employeeId: string;
  skills: {
    skillId: string;
    proficiency: 1 | 2 | 3 | 4 | 5; // 1=Novice, 5=Expert
    yearsOfExperience: number;
    lastUsed?: Date;
    verified: boolean;
    verifiedBy?: string;
    endorsements: number;
    aiConfidence: number; // AI assessment confidence 0-100
  }[];
  skillGraph: {
    currentSkills: string[];
    learningSkills: string[];
    adjacentSkills: string[];
    futureSkills: string[];
  };
  certifications: {
    skillId: string;
    certificationId: string;
    issuedBy: string;
    issuedAt: Date;
    expiryDate?: Date;
    status: 'valid' | 'expiring' | 'expired';
  }[];
  assessments: {
    skillId: string;
    score: number;
    maxScore: number;
    date: Date;
    assessor: string;
    type: 'peer' | 'manager' | 'ai' | 'certification';
  }[];
  lastUpdated: Date;
}

export interface SkillGap {
  id: string;
  employeeId: string;
  requiredSkill: string;
  currentLevel: 1 | 2 | 3 | 4 | 5;
  requiredLevel: 1 | 2 | 3 | 4 | 5;
  priority: 'critical' | 'high' | 'medium' | 'low';
  deadline?: Date;
  recommendedActions: {
    type: 'course' | 'mentorship' | 'project' | 'certification' | 'training';
    resourceId?: string;
    estimatedHours: number;
  }[];
  status: 'identified' | 'in-progress' | 'addressed' | 'verified';
}

export interface TeamCapabilityMap {
  teamId: string;
  teamName: string;
  skills: {
    skillId: string;
    count: number;
    avgProficiency: number;
    coverage: 'low' | 'medium' | 'high' | 'expert';
  }[];
  gaps: {
    skillId: string;
    coverage: number;
    required: number;
    gap: number;
  }[];
  strengths: {
    skillId: string;
    coverage: number;
    isDifferentiation: boolean;
  }[];
  lastUpdated: Date;
}

export interface CareerPath {
  id: string;
  fromRole: string;
  toRole: string;
  skills: {
    required: string[];
    recommended: string[];
    optional: string[];
  };
  typicalTimeline: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
}

export interface SkillRelationship {
  id: string;
  skillA: string;
  skillB: string;
  relationshipType: 'prerequisite' | 'adjacent' | 'evolves-from' | 'enhances' | 'substitutes';
  strength: number; // 0-100
}

// ============================================================
// IN-MEMORY STORAGE
// ============================================================

const skills = new Map<string, Skill>();
const employeeProfiles = new Map<string, EmployeeSkillProfile>();
const skillGaps = new Map<string, SkillGap>();
const teamMaps = new Map<string, TeamCapabilityMap>();
const skillRelationships = new Map<string, SkillRelationship>();
const careerPaths = new Map<string, CareerPath>();

// ============================================================
// DEFAULT SKILL TAXONOMY
// ============================================================

function initializeDefaultSkills() {
  const defaultSkills: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>[] = [
    // Technical Skills
    { name: 'JavaScript', category: 'technical', level: 'intermediate', keywords: ['js', 'ecmascript'], relatedSkills: ['TypeScript', 'Node.js'] },
    { name: 'TypeScript', category: 'technical', level: 'intermediate', keywords: ['ts', 'microsoft'], relatedSkills: ['JavaScript', 'React'] },
    { name: 'Python', category: 'technical', level: 'intermediate', keywords: ['py', 'django', 'flask'], relatedSkills: ['Machine Learning', 'Data Science'] },
    { name: 'React', category: 'technical', level: 'intermediate', keywords: ['reactjs', 'facebook'], relatedSkills: ['TypeScript', 'Next.js'] },
    { name: 'Node.js', category: 'technical', level: 'intermediate', keywords: ['nodejs', 'express'], relatedSkills: ['JavaScript', 'TypeScript'] },
    { name: 'SQL', category: 'technical', level: 'intermediate', keywords: ['database', 'mysql', 'postgresql'], relatedSkills: ['NoSQL', 'Data Modeling'] },
    { name: 'Machine Learning', category: 'technical', level: 'advanced', keywords: ['ml', 'ai', 'tensorflow'], relatedSkills: ['Python', 'Data Science'] },
    { name: 'AWS', category: 'tool', level: 'intermediate', keywords: ['amazon', 'cloud', 'ec2', 's3'], relatedSkills: ['Docker', 'Kubernetes'] },
    { name: 'Docker', category: 'tool', level: 'intermediate', keywords: ['container', 'devops'], relatedSkills: ['Kubernetes', 'CI/CD'] },
    { name: 'Kubernetes', category: 'tool', level: 'advanced', keywords: ['k8s', 'container', 'orchestration'], relatedSkills: ['Docker', 'AWS'] },

    // Leadership Skills
    { name: 'Team Leadership', category: 'leadership', level: 'intermediate', keywords: ['management', 'people'], relatedSkills: ['Strategic Thinking', 'Communication'] },
    { name: 'Strategic Thinking', category: 'leadership', level: 'advanced', keywords: ['strategy', 'planning'], relatedSkills: ['Decision Making', 'Business Acumen'] },
    { name: 'Mentoring', category: 'soft', level: 'intermediate', keywords: ['coaching', 'development'], relatedSkills: ['Teaching', 'Leadership'] },
    { name: 'Conflict Resolution', category: 'soft', level: 'intermediate', keywords: ['negotiation', 'mediation'], relatedSkills: ['Communication', 'Emotional Intelligence'] },
    { name: 'Decision Making', category: 'leadership', level: 'advanced', keywords: ['judgment', 'choices'], relatedSkills: ['Strategic Thinking', 'Risk Assessment'] },

    // Domain Skills
    { name: 'Product Management', category: 'domain', level: 'intermediate', keywords: ['pm', 'product', 'roadmap'], relatedSkills: ['User Research', 'Agile'] },
    { name: 'Data Analysis', category: 'domain', level: 'intermediate', keywords: ['analytics', 'bi', 'reporting'], relatedSkills: ['SQL', 'Python'] },
    { name: 'Sales Strategy', category: 'domain', level: 'intermediate', keywords: ['sales', 'revenue', 'crm'], relatedSkills: ['Negotiation', 'Business Development'] },
    { name: 'Marketing Strategy', category: 'domain', level: 'intermediate', keywords: ['marketing', 'campaigns'], relatedSkills: ['Data Analysis', 'Content Strategy'] },
    { name: 'Financial Modeling', category: 'domain', level: 'advanced', keywords: ['finance', 'excel', 'valuation'], relatedSkills: ['Data Analysis', 'Business Intelligence'] },

    // Soft Skills
    { name: 'Communication', category: 'soft', level: 'intermediate', keywords: ['writing', 'speaking', 'presentation'], relatedSkills: ['Leadership', 'Negotiation'] },
    { name: 'Emotional Intelligence', category: 'soft', level: 'advanced', keywords: ['eq', 'empathy'], relatedSkills: ['Leadership', 'Conflict Resolution'] },
    { name: 'Critical Thinking', category: 'soft', level: 'advanced', keywords: ['analysis', 'logic'], relatedSkills: ['Problem Solving', 'Decision Making'] },
    { name: 'Adaptability', category: 'soft', level: 'intermediate', keywords: ['flexibility', 'change'], relatedSkills: ['Learning Agility', 'Resilience'] },

    // Certifications
    { name: 'AWS Solutions Architect', category: 'certification', level: 'advanced', keywords: ['aws', 'cloud', 'architect'], relatedSkills: ['AWS', 'System Design'] },
    { name: 'PMP', category: 'certification', level: 'advanced', keywords: ['project', 'management', 'pmi'], relatedSkills: ['Agile', 'Scrum'] },
    { name: 'Google Data Analytics', category: 'certification', level: 'intermediate', keywords: ['google', 'data', 'analytics'], relatedSkills: ['SQL', 'Data Analysis'] },
    { name: 'MBA', category: 'certification', level: 'expert', keywords: ['business', 'management'], relatedSkills: ['Strategic Thinking', 'Leadership'] },

    // Emerging Skills
    { name: 'Generative AI', category: 'emerging', level: 'intermediate', keywords: ['llm', 'gpt', 'openai'], relatedSkills: ['Machine Learning', 'Python'], growthDemand: 'rising' },
    { name: 'Web3', category: 'emerging', level: 'beginner', keywords: ['blockchain', 'crypto', 'nft'], relatedSkills: ['Security', 'Distributed Systems'] },
    { name: 'Quantum Computing', category: 'emerging', level: 'beginner', keywords: ['quantum', 'qubits'], relatedSkills: ['Physics', 'Mathematics'], growthDemand: 'rising' },
    { name: 'AR/VR Development', category: 'emerging', level: 'intermediate', keywords: ['metaverse', 'unity'], relatedSkills: ['3D Modeling', 'JavaScript'], growthDemand: 'rising' },
  ];

  defaultSkills.forEach(skill => {
    const id = crypto.randomUUID();
    skills.set(id, {
      ...skill,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  console.log(`✅ Initialized ${skills.size} default skills`);
}

initializeDefaultSkills();

// ============================================================
// ROUTES
// ============================================================

/**
 * Get all skills with optional filtering
 */
router.get('/skills', async (req, res) => {
  try {
    const { category, search, level, trending } = req.query;

    let result = Array.from(skills.values());

    if (category) {
      result = result.filter(s => s.category === category);
    }

    if (search) {
      const searchLower = (search as string).toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(searchLower) ||
        s.keywords.some(k => k.toLowerCase().includes(searchLower))
      );
    }

    if (level) {
      result = result.filter(s => s.level === level);
    }

    if (trending === 'true') {
      result = result
        .filter(s => s.growthDemand === 'rising')
        .sort((a, b) => (b.growthDemand === 'rising' ? 1 : 0) - (a.growthDemand === 'rising' ? 1 : 0));
    }

    res.json({ success: true, skills: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get skill by ID with related skills
 */
router.get('/skills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const skill = skills.get(id);

    if (!skill) {
      return res.status(404).json({ success: false, error: 'Skill not found' });
    }

    // Get related skills
    const relatedSkillsData = skill.relatedSkills.map(name =>
      Array.from(skills.values()).find(s => s.name.toLowerCase() === name.toLowerCase())
    ).filter(Boolean);

    res.json({ success: true, skill, relatedSkills: relatedSkillsData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create new skill
 */
router.post('/skills', async (req, res) => {
  try {
    const { name, category, subcategory, level, description, keywords } = req.body;

    if (!name || !category || !level) {
      return res.status(400).json({
        success: false,
        error: 'name, category, and level are required'
      });
    }

    const id = crypto.randomUUID();
    const skill: Skill = {
      id,
      name,
      category,
      subcategory,
      level,
      description,
      keywords: keywords || [],
      relatedSkills: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    skills.set(id, skill);

    res.status(201).json({ success: true, skill });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get employee skill profile
 */
router.get('/profiles/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    let profile = employeeProfiles.get(employeeId);

    if (!profile) {
      // Create empty profile
      profile = {
        employeeId,
        skills: [],
        skillGraph: { currentSkills: [], learningSkills: [], adjacentSkills: [], futureSkills: [] },
        certifications: [],
        assessments: [],
        lastUpdated: new Date(),
      };
      employeeProfiles.set(employeeId, profile);
    }

    // Calculate insights
    const insights = calculateSkillInsights(profile);

    res.json({ success: true, profile, insights });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update employee skill profile
 */
router.patch('/profiles/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const updates = req.body;

    let profile = employeeProfiles.get(employeeId) || {
      employeeId,
      skills: [],
      skillGraph: { currentSkills: [], learningSkills: [], adjacentSkills: [], futureSkills: [] },
      certifications: [],
      assessments: [],
      lastUpdated: new Date(),
    };

    // Add new skill
    if (updates.addSkill) {
      const { skillId, proficiency, yearsOfExperience, verified } = updates.addSkill;
      profile.skills.push({
        skillId,
        proficiency,
        yearsOfExperience: yearsOfExperience || 0,
        verified: verified || false,
        endorsements: 0,
        aiConfidence: 50,
      });
    }

    // Update existing skill
    if (updates.updateSkill) {
      const { skillId, proficiency, verified, endorsements } = updates.updateSkill;
      const skillIndex = profile.skills.findIndex(s => s.skillId === skillId);
      if (skillIndex >= 0) {
        profile.skills[skillIndex] = {
          ...profile.skills[skillIndex],
          ...(proficiency && { proficiency }),
          ...(verified !== undefined && { verified }),
          ...(endorsements !== undefined && { endorsements }),
        };
      }
    }

    profile.lastUpdated = new Date();
    employeeProfiles.set(employeeId, profile);

    res.json({ success: true, profile });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Identify skill gaps for employee
 */
router.get('/gaps/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { targetRole } = req.query;

    const gaps = Array.from(skillGaps.values())
      .filter(g => g.employeeId === employeeId);

    res.json({ success: true, gaps, count: gaps.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Analyze team capability map
 */
router.get('/teams/:teamId/capabilities', async (req, res) => {
  try {
    const { teamId } = req.params;

    // Get all employee profiles for team (simplified - would query real data)
    const teamMembers = Array.from(employeeProfiles.values())
      .filter(p => p.employeeId.startsWith(teamId));

    if (teamMembers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Team not found or no members'
      });
    }

    // Calculate team capabilities
    const skillCounts = new Map<string, { total: number; proficiencySum: number }>();

    teamMembers.forEach(profile => {
      profile.skills.forEach(skill => {
        const current = skillCounts.get(skill.skillId) || { total: 0, proficiencySum: 0 };
        current.total++;
        current.proficiencySum += skill.proficiency;
        skillCounts.set(skill.skillId, current);
      });
    });

    const teamSkills = Array.from(skillCounts.entries()).map(([skillId, data]) => {
      const skill = skills.get(skillId);
      const coverage = data.total / teamMembers.length;
      return {
        skillId,
        skillName: skill?.name || 'Unknown',
        count: data.total,
        avgProficiency: data.proficiencySum / data.total,
        coverage: coverage < 0.3 ? 'low' : coverage < 0.7 ? 'medium' : coverage < 0.9 ? 'high' : 'expert',
      };
    });

    res.json({ success: true, teamSkills });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get career paths for role
 */
router.get('/career-paths/:fromRole', async (req, res) => {
  try {
    const { fromRole } = req.params;

    const paths = Array.from(careerPaths.values())
      .filter(p => p.fromRole.toLowerCase() === fromRole.toLowerCase());

    res.json({ success: true, paths, count: paths.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * AI-powered skill recommendations
 */
router.get('/recommendations/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const profile = employeeProfiles.get(employeeId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Employee profile not found'
      });
    }

    // AI recommendations based on current skills and trends
    const recommendations: {
      skillId: string;
      skillName: string;
      reason: string;
      priority: 'critical' | 'high' | 'medium';
      learningPath: string[];
    }[] = [];

    profile.skills.forEach(employeeSkill => {
      const skill = skills.get(employeeSkill.skillId);
      if (!skill) return;

      // Recommend related skills
      skill.relatedSkills.forEach(relatedSkillName => {
        const relatedSkill = Array.from(skills.values())
          .find(s => s.name.toLowerCase() === relatedSkillName.toLowerCase());

        if (relatedSkill && !profile.skills.some(s => s.skillId === relatedSkill.id)) {
          recommendations.push({
            skillId: relatedSkill.id,
            skillName: relatedSkill.name,
            reason: `Natural progression from ${skill.name}`,
            priority: skill.growthDemand === 'rising' ? 'high' : 'medium',
            learningPath: [skill.name, relatedSkill.name],
          });
        }
      });

      // Recommend emerging skills
      if (skill.category === 'technical' && skill.level === 'advanced') {
        const emergingSkill = Array.from(skills.values())
          .find(s => s.category === 'emerging' && s.relatedSkills.includes(skill.name));

        if (emergingSkill) {
          recommendations.push({
            skillId: emergingSkill.id,
            skillName: emergingSkill.name,
            reason: 'Stay ahead with emerging technology aligned with your expertise',
            priority: 'high',
            learningPath: [skill.name, emergingSkill.name],
          });
        }
      }
    });

    res.json({
      success: true,
      recommendations: recommendations.slice(0, 10) // Top 10
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function calculateSkillInsights(profile: EmployeeSkillProfile) {
  const insights = {
    topSkills: [] as string[],
    skillGaps: [] as string[],
    trendingSkills: [] as string[],
    certificationsNeeded: [] as string[],
    careerReadiness: 0 as number,
  };

  // Top skills (proficiency >= 4)
  insights.topSkills = profile.skills
    .filter(s => s.proficiency >= 4)
    .map(s => {
      const skill = skills.get(s.skillId);
      return skill?.name || s.skillId;
    });

  // Certifications needed (based on role/industry trends)
  insights.certificationsNeeded = profile.certifications
    .filter(c => c.status === 'expiring' || c.status === 'expired')
    .map(c => c.certificationId);

  // Career readiness (based on skill coverage)
  const skillCount = profile.skills.length;
  const avgProficiency = profile.skills.length > 0
    ? profile.skills.reduce((sum, s) => sum + s.proficiency, 0) / profile.skills.length
    : 0;

  insights.careerReadiness = Math.round(
    Math.min(100, (skillCount * 5 + avgProficiency * 10) / 2)
  );

  return insights;
}

export default router;

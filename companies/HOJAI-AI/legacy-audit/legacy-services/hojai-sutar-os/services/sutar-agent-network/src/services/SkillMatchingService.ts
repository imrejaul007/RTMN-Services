// ============================================================================
// SUTAR Agent Network - Skill Matching Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { Agent, AgentCapability, AgentCapabilityDetail, SkillMatchRequest } from '../types/index.js';
import { capabilityRegistryService } from './CapabilityRegistryService.js';
import { agentProfileService } from './AgentProfileService.js';

export interface MatchResult {
  agent: Agent;
  score: number;
  matchedCapabilities: string[];
  matchedSkills: string[];
  reasons: string[];
  confidence: number;
  estimatedCompatibility: number;
}

export interface TeamMatchResult {
  teamId?: string;
  teamName?: string;
  agents: MatchResult[];
  combinedScore: number;
  coverage: {
    capabilities: { required: string; covered: boolean; coveredBy: string[] }[];
    skills: { required: string; covered: boolean; coveredBy: string[] }[];
  };
  totalCost: number;
  estimatedDuration: number;
}

export class SkillMatchingService {
  private matchHistory: Map<string, { timestamp: string; results: MatchResult[] }> = new Map();

  /**
   * Match agents to a task based on requirements
   */
  matchAgentsToTask(
    agents: Agent[],
    requirements: SkillMatchRequest,
    limit: number = 10
  ): MatchResult[] {
    const results: MatchResult[] = [];

    for (const agent of agents) {
      if (agent.status !== 'available') continue;

      const matchResult = this.calculateMatchScore(agent, requirements);
      if (matchResult.score > 0) {
        results.push(matchResult);
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Calculate match score for a single agent
   */
  calculateMatchScore(agent: Agent, requirements: SkillMatchRequest): MatchResult {
    let score = 0;
    const matchedCapabilities: string[] = [];
    const matchedSkills: string[] = [];
    const reasons: string[] = [];

    // Capability matching (40% weight)
    if (requirements.requiredCapabilities && requirements.requiredCapabilities.length > 0) {
      const capMatches = agent.capabilities.filter(cap =>
        requirements.requiredCapabilities!.includes(cap)
      );
      matchedCapabilities.push(...capMatches);

      const capScore = (capMatches.length / requirements.requiredCapabilities.length) * 40;
      score += capScore;

      if (capMatches.length === requirements.requiredCapabilities.length) {
        reasons.push('All required capabilities matched');
      } else if (capMatches.length > 0) {
        reasons.push(`${capMatches.length}/${requirements.requiredCapabilities.length} capabilities matched`);
      }
    } else {
      score += 20; // Base score for no specific requirements
    }

    // Skill matching (30% weight)
    if (requirements.requiredSkills && requirements.requiredSkills.length > 0) {
      const skillMatches = agent.skills.filter(skill =>
        requirements.requiredSkills!.includes(skill)
      );
      matchedSkills.push(...skillMatches);

      const skillScore = (skillMatches.length / requirements.requiredSkills.length) * 30;
      score += skillScore;

      if (skillMatches.length > 0) {
        reasons.push(`${skillMatches.length} skills matched`);
      }
    } else {
      score += 15; // Base score for no specific requirements
    }

    // Rating factor (15% weight)
    const ratingScore = (agent.rating / 5) * 15;
    score += ratingScore;
    if (agent.rating >= 4.5) {
      reasons.push('High rating agent');
    }

    // Success rate factor (10% weight)
    const successScore = (agent.successRate / 100) * 10;
    score += successScore;
    if (agent.successRate >= 95) {
      reasons.push('Excellent success rate');
    }

    // Price factor (5% weight)
    if (requirements.maxHourlyRate && agent.hourlyRate) {
      if (agent.hourlyRate <= requirements.maxHourlyRate) {
        score += 5;
        reasons.push('Within budget');
      }
    } else {
      score += 2.5; // No price constraint
    }

    // Experience factor (bonus points)
    const profile = agentProfileService.getProfile(agent.id);
    if (profile && requirements.minExperience) {
      if (profile.yearsOfExperience >= requirements.minExperience) {
        score += 5;
        reasons.push('Meets experience requirements');
      }
    }

    // Calculate confidence based on coverage
    let totalRequirements = 0;
    let matchedRequirements = 0;

    if (requirements.requiredCapabilities) {
      totalRequirements += requirements.requiredCapabilities.length;
      matchedRequirements += matchedCapabilities.length;
    }

    if (requirements.requiredSkills) {
      totalRequirements += requirements.requiredSkills.length;
      matchedRequirements += matchedSkills.length;
    }

    const confidence = totalRequirements > 0 ? matchedRequirements / totalRequirements : 0.5;

    // Calculate estimated compatibility
    const estimatedCompatibility = Math.min(100, score);

    return {
      agent,
      score: Math.min(100, score),
      matchedCapabilities,
      matchedSkills,
      reasons,
      confidence,
      estimatedCompatibility,
    };
  }

  /**
   * Find best agent for a task
   */
  findBestAgent(agents: Agent[], requirements: SkillMatchRequest): MatchResult | null {
    const matches = this.matchAgentsToTask(agents, requirements, 1);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Match agents to form a team
   */
  matchAgentsForTeam(
    agents: Agent[],
    requirements: {
      requiredCapabilities: AgentCapability[];
      requiredSkills: string[];
      teamSize: number;
    }
  ): TeamMatchResult {
    const coverage = {
      capabilities: requirements.requiredCapabilities.map(cap => ({
        required: cap,
        covered: false,
        coveredBy: [] as string[],
      })),
      skills: requirements.requiredSkills.map(skill => ({
        required: skill,
        covered: false,
        coveredBy: [] as string[],
      })),
    };

    const selectedAgents: MatchResult[] = [];
    const remainingRequirements = { ...requirements };

    // Greedy selection of agents
    while (selectedAgents.length < requirements.teamSize) {
      const availableAgents = agents.filter(
        a => a.status === 'available' && !selectedAgents.some(s => s.agent.id === a.id)
      );

      if (availableAgents.length === 0) break;

      const matches = this.matchAgentsToTask(
        availableAgents,
        {
          requiredCapabilities: remainingRequirements.requiredCapabilities,
          requiredSkills: remainingRequirements.requiredSkills,
        },
        5
      );

      if (matches.length === 0) break;

      const bestMatch = matches[0];
      selectedAgents.push(bestMatch);

      // Update coverage
      bestMatch.matchedCapabilities.forEach(cap => {
        const capCoverage = coverage.capabilities.find(c => c.required === cap);
        if (capCoverage) {
          capCoverage.covered = true;
          if (!capCoverage.coveredBy.includes(bestMatch.agent.id)) {
            capCoverage.coveredBy.push(bestMatch.agent.id);
          }
        }
      });

      bestMatch.matchedSkills.forEach(skill => {
        const skillCoverage = coverage.skills.find(s => s.required === skill);
        if (skillCoverage) {
          skillCoverage.covered = true;
          if (!skillCoverage.coveredBy.includes(bestMatch.agent.id)) {
            skillCoverage.coveredBy.push(bestMatch.agent.id);
          }
        }
      });

      // Remove covered requirements
      remainingRequirements.requiredCapabilities = remainingRequirements.requiredCapabilities.filter(
        cap => !bestMatch.matchedCapabilities.includes(cap)
      );
      remainingRequirements.requiredSkills = remainingRequirements.requiredSkills.filter(
        skill => !bestMatch.matchedSkills.includes(skill)
      );
    }

    // Calculate combined score
    const combinedScore =
      selectedAgents.reduce((sum, m) => sum + m.score, 0) / selectedAgents.length;

    // Calculate total cost
    const totalCost = selectedAgents.reduce(
      (sum, m) => sum + (m.agent.hourlyRate || 0),
      0
    );

    // Estimate duration based on team size and complexity
    const estimatedDuration = Math.max(
      60,
      (requirements.requiredCapabilities.length + requirements.requiredSkills.length) *
        30 /
        Math.max(1, selectedAgents.length)
    );

    return {
      agents: selectedAgents,
      combinedScore,
      coverage,
      totalCost,
      estimatedDuration,
    };
  }

  /**
   * Record match in history
   */
  recordMatch(requestId: string, results: MatchResult[]): void {
    this.matchHistory.set(requestId, {
      timestamp: new Date().toISOString(),
      results,
    });

    // Clean up old entries (keep last 1000)
    if (this.matchHistory.size > 1000) {
      const entries = Array.from(this.matchHistory.entries());
      entries.slice(0, entries.length - 1000).forEach(([key]) => {
        this.matchHistory.delete(key);
      });
    }
  }

  /**
   * Get match history
   */
  getMatchHistory(requestId?: string): { timestamp: string; results: MatchResult[] } | Map<string, { timestamp: string; results: MatchResult[] }> {
    if (requestId) {
      return this.matchHistory.get(requestId) || { timestamp: '', results: [] };
    }
    return this.matchHistory;
  }

  /**
   * Find complementary agents
   */
  findComplementaryAgents(
    primaryAgent: Agent,
    allAgents: Agent[],
    requirements: SkillMatchRequest
  ): MatchResult[] {
    // Find agents that fill gaps in primary agent's capabilities
    const primaryCapabilities = new Set(primaryAgent.capabilities);
    const primarySkills = new Set(primaryAgent.skills);

    const complementaryRequirements: SkillMatchRequest = {
      ...requirements,
      requiredCapabilities: requirements.requiredCapabilities?.filter(
        cap => !primaryCapabilities.has(cap)
      ),
      requiredSkills: requirements.requiredSkills?.filter(
        skill => !primarySkills.has(skill)
      ),
    };

    if (
      (!complementaryRequirements.requiredCapabilities ||
        complementaryRequirements.requiredCapabilities.length === 0) &&
      (!complementaryRequirements.requiredSkills ||
        complementaryRequirements.requiredSkills.length === 0)
    ) {
      return [];
    }

    return this.matchAgentsToTask(allAgents, complementaryRequirements, 5);
  }

  /**
   * Calculate similarity between two agents
   */
  calculateAgentSimilarity(agent1: Agent, agent2: Agent): number {
    const capIntersection = agent1.capabilities.filter(cap =>
      agent2.capabilities.includes(cap)
    ).length;
    const capUnion =
      new Set([...agent1.capabilities, ...agent2.capabilities]).size;
    const capSimilarity = capUnion > 0 ? capIntersection / capUnion : 0;

    const skillIntersection = agent1.skills.filter(skill =>
      agent2.skills.includes(skill)
    ).length;
    const skillUnion = new Set([...agent1.skills, ...agent2.skills]).size;
    const skillSimilarity = skillUnion > 0 ? skillIntersection / skillUnion : 0;

    return (capSimilarity * 0.6 + skillSimilarity * 0.4) * 100;
  }

  /**
   * Find similar agents
   */
  findSimilarAgents(agent: Agent, allAgents: Agent[], limit: number = 5): Agent[] {
    const similarities = allAgents
      .filter(a => a.id !== agent.id)
      .map(a => ({
        agent: a,
        similarity: this.calculateAgentSimilarity(agent, a),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, limit).map(s => s.agent);
  }

  /**
   * Get match statistics
   */
  getMatchStatistics(): {
    totalMatches: number;
    averageScore: number;
    topCapabilities: Array<{ capability: string; count: number }>;
    topSkills: Array<{ skill: string; count: number }>;
  } {
    let totalScore = 0;
    const capabilityCounts: Map<string, number> = new Map();
    const skillCounts: Map<string, number> = new Map();

    this.matchHistory.forEach(({ results }) => {
      results.forEach(result => {
        totalScore += result.score;

        result.matchedCapabilities.forEach(cap => {
          capabilityCounts.set(cap, (capabilityCounts.get(cap) || 0) + 1);
        });

        result.matchedSkills.forEach(skill => {
          skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
        });
      });
    });

    const totalMatches = Array.from(this.matchHistory.values()).reduce(
      (sum, { results }) => sum + results.length,
      0
    );

    return {
      totalMatches,
      averageScore: totalMatches > 0 ? totalScore / totalMatches : 0,
      topCapabilities: Array.from(capabilityCounts.entries())
        .map(([capability, count]) => ({ capability, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topSkills: Array.from(skillCounts.entries())
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }
}

// Singleton instance
export const skillMatchingService = new SkillMatchingService();

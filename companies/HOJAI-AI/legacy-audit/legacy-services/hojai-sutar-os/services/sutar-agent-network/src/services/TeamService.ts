// ============================================================================
// SUTAR Agent Network - Team Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { Team, TeamMembership, TeamRole, AgentCapability, Agent, ApiResponse } from '../types/index.js';
import { skillMatchingService, MatchResult } from './SkillMatchingService.js';

export class TeamService {
  private teams: Map<string, Team> = new Map();
  private memberships: Map<string, Map<string, TeamMembership>> = new Map();

  /**
   * Create a new team
   */
  createTeam(data: {
    name: string;
    description: string;
    leaderId: string;
    projectDescription?: string;
    requiredCapabilities: AgentCapability[];
    requiredSkills: string[];
    maxTeamSize: number;
  }): Team {
    const now = new Date().toISOString();
    const team: Team = {
      id: `team-${uuidv4()}`,
      name: data.name,
      description: data.description,
      leaderId: data.leaderId,
      memberIds: [data.leaderId],
      consultants: [],
      status: 'forming',
      projectDescription: data.projectDescription,
      requiredCapabilities: data.requiredCapabilities,
      requiredSkills: data.requiredSkills,
      maxTeamSize: data.maxTeamSize,
      createdAt: now,
      updatedAt: now,
      completedTasks: 0,
      successRate: 100,
    };

    this.teams.set(team.id, team);

    // Add leader as member
    this.addMembership(team.id, data.leaderId, 'lead');

    return team;
  }

  /**
   * Get team by ID
   */
  getTeam(teamId: string): Team | undefined {
    return this.teams.get(teamId);
  }

  /**
   * Get all teams
   */
  getAllTeams(): Team[] {
    return Array.from(this.teams.values());
  }

  /**
   * Get teams by status
   */
  getTeamsByStatus(status: Team['status']): Team[] {
    return Array.from(this.teams.values()).filter(t => t.status === status);
  }

  /**
   * Get teams for an agent
   */
  getTeamsForAgent(agentId: string): Team[] {
    return Array.from(this.teams.values()).filter(
      t => t.memberIds.includes(agentId) || t.consultants.includes(agentId)
    );
  }

  /**
   * Update team
   */
  updateTeam(teamId: string, updates: Partial<Team>): Team | undefined {
    const team = this.teams.get(teamId);
    if (!team) {
      return undefined;
    }

    const updatedTeam: Team = {
      ...team,
      ...updates,
      id: team.id,
      createdAt: team.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.teams.set(teamId, updatedTeam);
    return updatedTeam;
  }

  /**
   * Add member to team
   */
  addMember(teamId: string, agentId: string, role: TeamRole = 'member'): TeamMembership | undefined {
    const team = this.teams.get(teamId);
    if (!team) {
      return undefined;
    }

    if (team.memberIds.length >= team.maxTeamSize) {
      return undefined;
    }

    if (team.memberIds.includes(agentId) || team.consultants.includes(agentId)) {
      return undefined;
    }

    if (role === 'consultant') {
      team.consultants.push(agentId);
    } else {
      team.memberIds.push(agentId);
    }

    team.updatedAt = new Date().toISOString();
    this.teams.set(teamId, team);

    return this.addMembership(teamId, agentId, role);
  }

  /**
   * Add membership record
   */
  private addMembership(teamId: string, agentId: string, role: TeamRole): TeamMembership {
    if (!this.memberships.has(teamId)) {
      this.memberships.set(teamId, new Map());
    }

    const membership: TeamMembership = {
      teamId,
      agentId,
      role,
      joinedAt: new Date().toISOString(),
      contributions: 0,
      rating: 5.0,
    };

    this.memberships.get(teamId)!.set(agentId, membership);
    return membership;
  }

  /**
   * Remove member from team
   */
  removeMember(teamId: string, agentId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) {
      return false;
    }

    if (agentId === team.leaderId) {
      return false; // Cannot remove team leader
    }

    const memberIndex = team.memberIds.indexOf(agentId);
    if (memberIndex > -1) {
      team.memberIds.splice(memberIndex, 1);
    }

    const consultantIndex = team.consultants.indexOf(agentId);
    if (consultantIndex > -1) {
      team.consultants.splice(consultantIndex, 1);
    }

    team.updatedAt = new Date().toISOString();
    this.teams.set(teamId, team);

    // Remove membership
    this.memberships.get(teamId)?.delete(agentId);

    return true;
  }

  /**
   * Get membership for agent in team
   */
  getMembership(teamId: string, agentId: string): TeamMembership | undefined {
    return this.memberships.get(teamId)?.get(agentId);
  }

  /**
   * Get all memberships for a team
   */
  getTeamMemberships(teamId: string): TeamMembership[] {
    return Array.from(this.memberships.get(teamId)?.values() || []);
  }

  /**
   * Update member contribution
   */
  updateContribution(teamId: string, agentId: string, increment: number): void {
    const membership = this.memberships.get(teamId)?.get(agentId);
    if (membership) {
      membership.contributions += increment;
    }
  }

  /**
   * Update member rating
   */
  updateMemberRating(teamId: string, agentId: string, rating: number): void {
    const membership = this.memberships.get(teamId)?.get(agentId);
    if (membership) {
      // Calculate new average rating
      const currentTotal = membership.rating * membership.contributions;
      membership.rating = (currentTotal + rating) / (membership.contributions + 1);
    }
  }

  /**
   * Change team leader
   */
  changeLeader(teamId: string, newLeaderId: string): Team | undefined {
    const team = this.teams.get(teamId);
    if (!team) {
      return undefined;
    }

    if (!team.memberIds.includes(newLeaderId)) {
      return undefined;
    }

    // Update old leader's role
    const oldLeaderMembership = this.memberships.get(teamId)?.get(team.leaderId);
    if (oldLeaderMembership) {
      oldLeaderMembership.role = 'member';
    }

    // Update new leader's role
    const newLeaderMembership = this.memberships.get(teamId)?.get(newLeaderId);
    if (newLeaderMembership) {
      newLeaderMembership.role = 'lead';
    }

    team.leaderId = newLeaderId;
    team.updatedAt = new Date().toISOString();
    this.teams.set(teamId, team);

    return team;
  }

  /**
   * Record task completion for team
   */
  recordTaskCompletion(teamId: string, success: boolean): void {
    const team = this.teams.get(teamId);
    if (!team) {
      return;
    }

    team.completedTasks += 1;
    const currentSuccessCount = Math.round(
      (team.successRate / 100) * (team.completedTasks - 1)
    );
    team.successRate = success
      ? ((currentSuccessCount + 1) / team.completedTasks) * 100
      : (currentSuccessCount / team.completedTasks) * 100;

    team.updatedAt = new Date().toISOString();
    this.teams.set(teamId, team);
  }

  /**
   * Disband team
   */
  disbandTeam(teamId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) {
      return false;
    }

    team.status = 'disbanded';
    team.updatedAt = new Date().toISOString();
    this.teams.set(teamId, team);

    return true;
  }

  /**
   * Complete team project
   */
  completeTeam(teamId: string): Team | undefined {
    const team = this.teams.get(teamId);
    if (!team) {
      return undefined;
    }

    team.status = 'completed';
    team.updatedAt = new Date().toISOString();
    this.teams.set(teamId, team);

    return team;
  }

  /**
   * Activate team
   */
  activateTeam(teamId: string): Team | undefined {
    const team = this.teams.get(teamId);
    if (!team) {
      return undefined;
    }

    team.status = 'active';
    team.updatedAt = new Date().toISOString();
    this.teams.set(teamId, team);

    return team;
  }

  /**
   * Find optimal team composition
   */
  findOptimalTeam(
    allAgents: Agent[],
    requirements: {
      requiredCapabilities: AgentCapability[];
      requiredSkills: string[];
      maxTeamSize: number;
    }
  ): { team: Team; matches: MatchResult[] } | null {
    const matchResult = skillMatchingService.matchAgentsForTeam(allAgents, {
      ...requirements,
      teamSize: Math.min(requirements.maxTeamSize, 5),
    });

    if (matchResult.agents.length === 0) {
      return null;
    }

    // Create a temporary team for the match
    const teamData = {
      name: `Auto-team-${Date.now()}`,
      description: 'Auto-generated team based on requirements',
      leaderId: matchResult.agents[0].agent.id,
      projectDescription: 'Team for matched requirements',
      requiredCapabilities: requirements.requiredCapabilities,
      requiredSkills: requirements.requiredSkills,
      maxTeamSize: requirements.maxTeamSize,
    };

    const team = this.createTeam(teamData);

    // Add other agents as members
    for (let i = 1; i < matchResult.agents.length; i++) {
      this.addMember(team.id, matchResult.agents[i].agent.id, 'member');
    }

    return { team, matches: matchResult.agents };
  }

  /**
   * Get team statistics
   */
  getTeamStatistics(): {
    totalTeams: number;
    activeTeams: number;
    averageTeamSize: number;
    averageSuccessRate: number;
    topTeams: Array<{ teamId: string; name: string; successRate: number }>;
  } {
    const teams = Array.from(this.teams.values());
    const activeTeams = teams.filter(t => t.status === 'active');

    const totalTeamSize = teams.reduce((sum, t) => sum + t.memberIds.length, 0);
    const totalSuccessRate = teams.reduce((sum, t) => sum + t.successRate, 0);

    return {
      totalTeams: teams.length,
      activeTeams: activeTeams.length,
      averageTeamSize: teams.length > 0 ? totalTeamSize / teams.length : 0,
      averageSuccessRate: teams.length > 0 ? totalSuccessRate / teams.length : 0,
      topTeams: teams
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 5)
        .map(t => ({
          teamId: t.id,
          name: t.name,
          successRate: t.successRate,
        })),
    };
  }

  /**
   * Check capability coverage for team
   */
  checkCapabilityCoverage(teamId: string, agentCapabilities: Map<string, Agent[]>): {
    covered: AgentCapability[];
    missing: AgentCapability[];
  } {
    const team = this.teams.get(teamId);
    if (!team) {
      return { covered: [], missing: [] };
    }

    const covered: AgentCapability[] = [];
    const teamCapabilities = new Set<string>();

    // Get all capabilities from team members
    team.memberIds.forEach(agentId => {
      const agents = agentCapabilities.get(agentId);
      if (agents && agents.length > 0) {
        agents[0].capabilities.forEach(cap => teamCapabilities.add(cap));
      }
    });

    // Check coverage
    team.requiredCapabilities.forEach(required => {
      if (teamCapabilities.has(required)) {
        covered.push(required);
      }
    });

    const missing = team.requiredCapabilities.filter(cap => !covered.includes(cap));

    return { covered, missing };
  }

  /**
   * Export team data
   */
  exportTeam(teamId: string): Record<string, unknown> | undefined {
    const team = this.teams.get(teamId);
    if (!team) {
      return undefined;
    }

    const memberships = this.getTeamMemberships(teamId);

    return {
      ...team,
      memberships,
      exportDate: new Date().toISOString(),
    };
  }

  /**
   * Delete team
   */
  deleteTeam(teamId: string): boolean {
    this.memberships.delete(teamId);
    return this.teams.delete(teamId);
  }
}

// Singleton instance
export const teamService = new TeamService();

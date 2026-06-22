// ============================================================================
// SUTAR Agent Network - Capability Registry Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  Capability,
  AgentCapabilityDetail,
  AgentCapability,
  CertificationLevel,
  Endorsement,
  ApiResponse,
} from '../types/index.js';

export class CapabilityRegistryService {
  private capabilities: Map<string, Capability> = new Map();
  private agentCapabilities: Map<string, Map<string, AgentCapabilityDetail>> = new Map();

  constructor() {
    this.initializeDefaultCapabilities();
  }

  /**
   * Initialize default capabilities
   */
  private initializeDefaultCapabilities(): void {
    const defaultCapabilities: Omit<Capability, 'id'>[] = [
      {
        name: 'reasoning',
        description: 'Logical reasoning, problem solving, and decision making',
        category: 'cognitive',
        level: 'intermediate',
        tags: ['logic', 'problem-solving', 'decision-making'],
        examples: ['Mathematical reasoning', 'Strategic planning', 'Cause-effect analysis'],
      },
      {
        name: 'execution',
        description: 'Execute tasks and commands efficiently',
        category: 'operational',
        level: 'intermediate',
        tags: ['task-execution', 'automation', 'workflow'],
        examples: ['Code execution', 'System commands', 'Workflow automation'],
      },
      {
        name: 'analysis',
        description: 'Analyze data, documents, and information',
        category: 'cognitive',
        level: 'intermediate',
        tags: ['data-analysis', 'document-analysis', 'pattern-recognition'],
        examples: ['Data mining', 'Document review', 'Trend analysis'],
      },
      {
        name: 'creation',
        description: 'Create content, code, designs, and other creative works',
        category: 'creative',
        level: 'intermediate',
        tags: ['content-creation', 'coding', 'design'],
        examples: ['Content writing', 'Code generation', 'UI/UX design'],
      },
      {
        name: 'communication',
        description: 'Communicate with users and other agents',
        category: 'social',
        level: 'basic',
        tags: ['messaging', 'clarification', 'explanation'],
        examples: ['User support', 'Status updates', 'Technical writing'],
      },
      {
        name: 'coordination',
        description: 'Coordinate multiple agents and tasks',
        category: 'management',
        level: 'advanced',
        tags: ['team-management', 'task-coordination', 'resource-allocation'],
        examples: ['Multi-agent coordination', 'Project management', 'Task delegation'],
      },
      {
        name: 'planning',
        description: 'Create and execute plans',
        category: 'cognitive',
        level: 'intermediate',
        tags: ['strategic-planning', 'task-planning', 'scheduling'],
        examples: ['Project planning', 'Roadmap creation', 'Schedule optimization'],
      },
      {
        name: 'research',
        description: 'Research and gather information',
        category: 'cognitive',
        level: 'intermediate',
        tags: ['web-research', 'literature-review', 'fact-checking'],
        examples: ['Market research', 'Competitor analysis', 'Technical research'],
      },
      {
        name: 'coding',
        description: 'Write, review, and debug code',
        category: 'technical',
        level: 'advanced',
        tags: ['programming', 'code-review', 'debugging'],
        examples: ['Software development', 'Code refactoring', 'Bug fixing'],
      },
      {
        name: 'data_processing',
        description: 'Process and transform data',
        category: 'technical',
        level: 'intermediate',
        tags: ['etl', 'data-transformation', 'formatting'],
        examples: ['Data cleaning', 'Format conversion', 'Data aggregation'],
      },
      {
        name: 'language',
        description: 'Understand and generate natural language',
        category: 'cognitive',
        level: 'intermediate',
        tags: ['nlp', 'translation', 'summarization'],
        examples: ['Language translation', 'Text summarization', 'Sentiment analysis'],
      },
      {
        name: 'vision',
        description: 'Process and analyze images and videos',
        category: 'technical',
        level: 'advanced',
        tags: ['image-recognition', 'video-analysis', 'ocr'],
        examples: ['Object detection', 'Image classification', 'OCR processing'],
      },
      {
        name: 'audio',
        description: 'Process and analyze audio',
        category: 'technical',
        level: 'advanced',
        tags: ['speech-recognition', 'text-to-speech', 'audio-analysis'],
        examples: ['Voice commands', 'Audio transcription', 'Sound classification'],
      },
      {
        name: 'security',
        description: 'Security operations and threat analysis',
        category: 'technical',
        level: 'expert',
        tags: ['cybersecurity', 'threat-analysis', 'compliance'],
        examples: ['Vulnerability scanning', 'Security auditing', 'Compliance checking'],
      },
      {
        name: 'optimization',
        description: 'Optimize systems and processes',
        category: 'technical',
        level: 'advanced',
        tags: ['performance-tuning', 'resource-optimization', 'efficiency'],
        examples: ['Query optimization', 'System tuning', 'Cost optimization'],
      },
    ];

    defaultCapabilities.forEach(cap => {
      const capability: Capability = {
        id: `cap-${uuidv4()}`,
        ...cap,
      };
      this.capabilities.set(capability.name, capability);
    });
  }

  /**
   * Register a new capability
   */
  registerCapability(data: Omit<Capability, 'id'>): Capability {
    const capability: Capability = {
      id: `cap-${uuidv4()}`,
      ...data,
    };
    this.capabilities.set(capability.name, capability);
    return capability;
  }

  /**
   * Get capability by name
   */
  getCapability(name: string): Capability | undefined {
    return this.capabilities.get(name);
  }

  /**
   * Get all capabilities
   */
  getAllCapabilities(): Capability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Get capabilities by category
   */
  getCapabilitiesByCategory(category: string): Capability[] {
    return Array.from(this.capabilities.values()).filter(
      cap => cap.category === category
    );
  }

  /**
   * Get capabilities by tags
   */
  getCapabilitiesByTags(tags: string[]): Capability[] {
    return Array.from(this.capabilities.values()).filter(cap =>
      tags.some(tag => cap.tags.includes(tag))
    );
  }

  /**
   * Register agent capability
   */
  registerAgentCapability(
    agentId: string,
    capabilityId: string,
    data: {
      proficiencyLevel: CertificationLevel;
      experienceMonths?: number;
      certified?: boolean;
      certificationId?: string;
    }
  ): AgentCapabilityDetail {
    if (!this.agentCapabilities.has(agentId)) {
      this.agentCapabilities.set(agentId, new Map());
    }

    const agentCapMap = this.agentCapabilities.get(agentId)!;
    const detail: AgentCapabilityDetail = {
      capabilityId,
      agentId,
      proficiencyLevel: data.proficiencyLevel,
      certified: data.certified || false,
      certificationId: data.certificationId,
      experienceMonths: data.experienceMonths || 0,
      projectsCompleted: 0,
      successRate: 100,
      averageRating: 5.0,
      endorsements: [],
      registeredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    agentCapMap.set(capabilityId, detail);
    return detail;
  }

  /**
   * Get agent capability details
   */
  getAgentCapability(agentId: string, capabilityId: string): AgentCapabilityDetail | undefined {
    return this.agentCapabilities.get(agentId)?.get(capabilityId);
  }

  /**
   * Get all capabilities for an agent
   */
  getAgentCapabilities(agentId: string): AgentCapabilityDetail[] {
    return Array.from(this.agentCapabilities.get(agentId)?.values() || []);
  }

  /**
   * Update agent capability proficiency
   */
  updateAgentCapability(
    agentId: string,
    capabilityId: string,
    updates: Partial<AgentCapabilityDetail>
  ): AgentCapabilityDetail | undefined {
    const detail = this.agentCapabilities.get(agentId)?.get(capabilityId);
    if (!detail) {
      return undefined;
    }

    const updated: AgentCapabilityDetail = {
      ...detail,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.agentCapabilities.get(agentId)!.set(capabilityId, updated);
    return updated;
  }

  /**
   * Add endorsement to agent capability
   */
  addEndorsement(
    agentId: string,
    capabilityId: string,
    endorsement: Omit<Endorsement, 'id' | 'createdAt'>
  ): AgentCapabilityDetail | undefined {
    const detail = this.agentCapabilities.get(agentId)?.get(capabilityId);
    if (!detail) {
      return undefined;
    }

    const newEndorsement: Endorsement = {
      id: `endorsement-${uuidv4()}`,
      ...endorsement,
      createdAt: new Date().toISOString(),
    };

    detail.endorsements.push(newEndorsement);
    detail.averageRating =
      detail.endorsements.reduce((sum, e) => sum + e.rating, 0) / detail.endorsements.length;
    detail.updatedAt = new Date().toISOString();

    this.agentCapabilities.get(agentId)!.set(capabilityId, detail);
    return detail;
  }

  /**
   * Record completed project for capability
   */
  recordProjectCompletion(
    agentId: string,
    capabilityId: string,
    success: boolean,
    rating?: number
  ): void {
    const detail = this.agentCapabilities.get(agentId)?.get(capabilityId);
    if (!detail) {
      return;
    }

    detail.projectsCompleted += 1;
    if (success) {
      const currentSuccessCount = Math.round((detail.successRate / 100) * (detail.projectsCompleted - 1));
      detail.successRate = ((currentSuccessCount + 1) / detail.projectsCompleted) * 100;
    } else {
      const currentSuccessCount = Math.round((detail.successRate / 100) * (detail.projectsCompleted - 1));
      detail.successRate = (currentSuccessCount / detail.projectsCompleted) * 100;
    }

    if (rating !== undefined) {
      const totalRating = detail.averageRating * (detail.projectsCompleted - 1) + rating;
      detail.averageRating = totalRating / detail.projectsCompleted;
    }

    detail.lastUsed = new Date().toISOString();
    detail.updatedAt = new Date().toISOString();

    this.agentCapabilities.get(agentId)!.set(capabilityId, detail);
  }

  /**
   * Find agents with specific capabilities
   */
  findAgentsWithCapabilities(
    capabilityIds: string[],
    minProficiency?: CertificationLevel
  ): Array<{ agentId: string; details: AgentCapabilityDetail }> {
    const results: Array<{ agentId: string; details: AgentCapabilityDetail }> = [];
    const proficiencyOrder: CertificationLevel[] = ['basic', 'intermediate', 'advanced', 'expert'];

    this.agentCapabilities.forEach((capMap, agentId) => {
      capMap.forEach((detail, capId) => {
        if (capabilityIds.includes(capId)) {
          if (minProficiency) {
            const agentLevel = proficiencyOrder.indexOf(detail.proficiencyLevel);
            const requiredLevel = proficiencyOrder.indexOf(minProficiency);
            if (agentLevel >= requiredLevel) {
              results.push({ agentId, details: detail });
            }
          } else {
            results.push({ agentId, details: detail });
          }
        }
      });
    });

    return results;
  }

  /**
   * Get capability statistics
   */
  getCapabilityStats(capabilityId: string): {
    totalAgents: number;
    averageProficiency: number;
    averageSuccessRate: number;
    averageRating: number;
    certifiedCount: number;
  } {
    let totalAgents = 0;
    let totalProficiency = 0;
    let totalSuccessRate = 0;
    let totalRating = 0;
    let certifiedCount = 0;
    const proficiencyOrder: CertificationLevel[] = ['basic', 'intermediate', 'advanced', 'expert'];

    this.agentCapabilities.forEach(capMap => {
      const detail = capMap.get(capabilityId);
      if (detail) {
        totalAgents++;
        totalProficiency += proficiencyOrder.indexOf(detail.proficiencyLevel);
        totalSuccessRate += detail.successRate;
        totalRating += detail.averageRating;
        if (detail.certified) certifiedCount++;
      }
    });

    return {
      totalAgents,
      averageProficiency: totalAgents ? totalProficiency / totalAgents : 0,
      averageSuccessRate: totalAgents ? totalSuccessRate / totalAgents : 0,
      averageRating: totalAgents ? totalRating / totalAgents : 0,
      certifiedCount,
    };
  }

  /**
   * Delete capability
   */
  deleteCapability(name: string): boolean {
    return this.capabilities.delete(name);
  }

  /**
   * Remove agent capability
   */
  removeAgentCapability(agentId: string, capabilityId: string): boolean {
    return this.agentCapabilities.get(agentId)?.delete(capabilityId) || false;
  }

  /**
   * Get all registered capability names
   */
  getRegisteredCapabilityNames(): string[] {
    return Array.from(this.capabilities.keys());
  }

  /**
   * Search capabilities by name or description
   */
  searchCapabilities(query: string): Capability[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.capabilities.values()).filter(
      cap =>
        cap.name.toLowerCase().includes(lowerQuery) ||
        cap.description.toLowerCase().includes(lowerQuery) ||
        cap.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
}

// Singleton instance
export const capabilityRegistryService = new CapabilityRegistryService();

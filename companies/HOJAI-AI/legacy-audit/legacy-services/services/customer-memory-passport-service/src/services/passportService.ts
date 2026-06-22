import { v4 as uuidv4 } from 'uuid';
import {
  CustomerMemoryPassportModel,
  ICustomerMemoryPassport,
  IMemoryEntry,
  IMemoryTag,
  ICompanyContext,
  MemoryType,
  MemoryImportance,
  SentimentLabel,
  InteractionChannel,
  InteractionType,
  GraphNodeType,
  GraphRelationshipType,
} from '../models/passport.js';
import { encryptionService } from './encryptionService.js';
import { logger } from '../utils/logger.js';

export interface CreatePassportInput {
  customerId: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  metadata?: Record<string, unknown>;
}

export interface AddMemoryInput {
  type: MemoryType;
  title: string;
  content: string;
  summary?: string;
  importance?: MemoryImportance;
  tags?: IMemoryTag[];
  source: string;
  sourceId?: string;
  channel?: InteractionChannel;
  metadata?: Record<string, unknown>;
  sentiment?: SentimentLabel;
  sentimentScore?: number;
  entities?: string[];
  keywords?: string[];
  expiresAt?: Date;
}

export interface MemoryFilters {
  type?: MemoryType | MemoryType[];
  importance?: MemoryImportance | MemoryImportance[];
  tags?: string[];
  source?: string;
  channel?: InteractionChannel;
  startDate?: Date;
  endDate?: Date;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  types?: MemoryType[];
  companyId?: string;
}

export interface UpdateMemoryInput {
  title?: string;
  content?: string;
  summary?: string;
  importance?: MemoryImportance;
  tags?: IMemoryTag[];
  metadata?: Record<string, unknown>;
  sentiment?: SentimentLabel;
  sentimentScore?: number;
}

class PassportService {
  async createPassport(input: CreatePassportInput): Promise<ICustomerMemoryPassport> {
    const existingPassport = await CustomerMemoryPassportModel.findOne({
      customerId: input.customerId,
    });

    if (existingPassport) {
      logger.warn('Passport already exists for customer', { customerId: input.customerId });
      throw new Error(`Passport already exists for customer: ${input.customerId}`);
    }

    const encryptedPII: Record<string, string> = {};
    if (input.customerEmail || input.customerPhone || input.customerName) {
      const piiData: Record<string, unknown> = {};
      if (input.customerEmail) piiData.email = input.customerEmail;
      if (input.customerPhone) piiData.phone = input.customerPhone;
      if (input.customerName) piiData.name = input.customerName;
      encryptedPII.email = encryptionService.encryptSensitiveData(piiData).email || '';
      encryptedPII.phone = encryptionService.encryptSensitiveData(piiData).phone || '';
      encryptedPII.name = encryptionService.encryptSensitiveData(piiData).name || '';
    }

    const passport = new CustomerMemoryPassportModel({
      customerId: input.customerId,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      customerName: input.customerName,
      encryptedPII,
      linkedCompanies: [],
      memories: [],
      interactions: [],
      graph: {
        customerId: input.customerId,
        nodes: [
          {
            id: uuidv4(),
            type: GraphNodeType.CUSTOMER,
            label: input.customerName || input.customerId,
            properties: {
              customerId: input.customerId,
              createdAt: new Date().toISOString(),
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        edges: [],
        lastUpdated: new Date(),
      },
      healthScore: 100,
      engagementScore: 0,
      churnRisk: 'low',
      lastActivity: new Date(),
      firstActivity: new Date(),
      totalInteractions: 0,
      version: 1,
    });

    await passport.save();
    logger.info('Passport created', { customerId: input.customerId });

    return passport;
  }

  async getPassport(customerId: string): Promise<ICustomerMemoryPassport | null> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      logger.debug('Passport not found', { customerId });
      return null;
    }
    return passport;
  }

  async addMemory(
    customerId: string,
    memoryInput: AddMemoryInput,
    companyId?: string
  ): Promise<IMemoryEntry> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      throw new Error(`Passport not found for customer: ${customerId}`);
    }

    const memoryId = uuidv4();
    const now = new Date();

    const memory: IMemoryEntry = {
      id: memoryId,
      type: memoryInput.type,
      title: memoryInput.title,
      content: memoryInput.content,
      summary: memoryInput.summary,
      importance: memoryInput.importance || MemoryImportance.MEDIUM,
      tags: memoryInput.tags || [],
      source: memoryInput.source,
      sourceId: memoryInput.sourceId,
      channel: memoryInput.channel,
      metadata: memoryInput.metadata,
      sentiment: memoryInput.sentiment,
      sentimentScore: memoryInput.sentimentScore,
      entities: memoryInput.entities,
      keywords: memoryInput.keywords,
      expiresAt: memoryInput.expiresAt,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    passport.memories.push(memory);
    passport.lastActivity = now;

    if (memoryInput.importance === MemoryImportance.CRITICAL ||
        memoryInput.importance === MemoryImportance.HIGH) {
      this.updateEngagementScore(passport, 10);
    } else {
      this.updateEngagementScore(passport, 2);
    }

    if (memoryInput.type === MemoryType.COMPLAINT) {
      this.updateHealthScore(passport, -10);
      this.updateChurnRisk(passport);
    } else if (memoryInput.type === MemoryType.COMPLIMENT) {
      this.updateHealthScore(passport, 5);
    }

    await passport.save();
    logger.info('Memory added', { customerId, memoryId, type: memoryInput.type });

    if (companyId) {
      await this.addGraphNodeForMemory(customerId, memoryId, companyId, memoryInput.type);
    }

    return memory;
  }

  async getMemories(
    customerId: string,
    filters: MemoryFilters = {}
  ): Promise<{ memories: IMemoryEntry[]; total: number }> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      return { memories: [], total: 0 };
    }

    let memories = passport.memories;

    if (!filters.includeDeleted) {
      memories = memories.filter((m) => !m.isDeleted);
    }

    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      memories = memories.filter((m) => types.includes(m.type));
    }

    if (filters.importance) {
      const importances = Array.isArray(filters.importance)
        ? filters.importance
        : [filters.importance];
      memories = memories.filter((m) => importances.includes(m.importance));
    }

    if (filters.tags && filters.tags.length > 0) {
      memories = memories.filter((m) =>
        m.tags.some((tag) => filters.tags!.includes(tag.name))
      );
    }

    if (filters.source) {
      memories = memories.filter((m) => m.source === filters.source);
    }

    if (filters.channel) {
      memories = memories.filter((m) => m.channel === filters.channel);
    }

    if (filters.startDate) {
      memories = memories.filter((m) => m.createdAt >= filters.startDate!);
    }

    if (filters.endDate) {
      memories = memories.filter((m) => m.createdAt <= filters.endDate!);
    }

    memories.sort((a, b) => {
      const importanceOrder = {
        [MemoryImportance.CRITICAL]: 0,
        [MemoryImportance.HIGH]: 1,
        [MemoryImportance.MEDIUM]: 2,
        [MemoryImportance.LOW]: 3,
      };
      const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
      if (importanceDiff !== 0) return importanceDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const total = memories.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;

    return {
      memories: memories.slice(offset, offset + limit),
      total,
    };
  }

  async updateMemory(
    memoryId: string,
    updates: UpdateMemoryInput
  ): Promise<IMemoryEntry | null> {
    const passport = await CustomerMemoryPassportModel.findOne({
      'memories.id': memoryId,
    });

    if (!passport) {
      logger.warn('Memory not found for update', { memoryId });
      return null;
    }

    const memoryIndex = passport.memories.findIndex((m) => m.id === memoryId);
    if (memoryIndex === -1) {
      return null;
    }

    const memory = passport.memories[memoryIndex];

    if (updates.title !== undefined) memory.title = updates.title;
    if (updates.content !== undefined) memory.content = updates.content;
    if (updates.summary !== undefined) memory.summary = updates.summary;
    if (updates.importance !== undefined) memory.importance = updates.importance;
    if (updates.tags !== undefined) memory.tags = updates.tags;
    if (updates.metadata !== undefined) memory.metadata = updates.metadata;
    if (updates.sentiment !== undefined) memory.sentiment = updates.sentiment;
    if (updates.sentimentScore !== undefined) memory.sentimentScore = updates.sentimentScore;
    memory.updatedAt = new Date();

    await passport.save();
    logger.info('Memory updated', { memoryId });

    return memory;
  }

  async deleteMemory(memoryId: string, deletedBy?: string): Promise<boolean> {
    const passport = await CustomerMemoryPassportModel.findOne({
      'memories.id': memoryId,
    });

    if (!passport) {
      return false;
    }

    const memoryIndex = passport.memories.findIndex((m) => m.id === memoryId);
    if (memoryIndex === -1) {
      return false;
    }

    passport.memories[memoryIndex].isDeleted = true;
    passport.memories[memoryIndex].deletedAt = new Date();
    passport.memories[memoryIndex].deletedBy = deletedBy;

    await passport.save();
    logger.info('Memory deleted', { memoryId, deletedBy });

    return true;
  }

  async searchMemories(
    customerId: string,
    options: SearchOptions
  ): Promise<{ memories: IMemoryEntry[]; total: number }> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      return { memories: [], total: 0 };
    }

    const query = options.query.toLowerCase();
    let memories = passport.memories.filter(
      (m) =>
        !m.isDeleted &&
        (m.title.toLowerCase().includes(query) ||
          m.content.toLowerCase().includes(query) ||
          (m.summary && m.summary.toLowerCase().includes(query)) ||
          m.tags.some((t) => t.name.toLowerCase().includes(query)) ||
          (m.keywords && m.keywords.some((k) => k.toLowerCase().includes(query))))
    );

    if (options.types && options.types.length > 0) {
      memories = memories.filter((m) => options.types!.includes(m.type));
    }

    if (options.companyId) {
      const company = passport.linkedCompanies.find(
        (c) => c.companyId === options.companyId
      );
      if (company) {
        const companyMemories = memories.filter((m) => {
          const metadata = m.metadata as Record<string, unknown> || {};
          return metadata.companyId === options.companyId;
        });
        if (companyMemories.length > 0) {
          memories = companyMemories;
        }
      }
    }

    memories.sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a, query);
      const bScore = this.calculateRelevanceScore(b, query);
      return bScore - aScore;
    });

    const total = memories.length;
    const offset = options.offset || 0;
    const limit = options.limit || 50;

    return {
      memories: memories.slice(offset, offset + limit),
      total,
    };
  }

  async getMemoryTimeline(
    customerId: string,
    limit: number = 50
  ): Promise<IMemoryEntry[]> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      return [];
    }

    const memories = passport.memories
      .filter((m) => !m.isDeleted)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return memories;
  }

  async linkToCompany(
    customerId: string,
    companyContext: Omit<ICompanyContext, 'linkedAt' | 'interactionCount'>
  ): Promise<ICompanyContext> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      throw new Error(`Passport not found for customer: ${customerId}`);
    }

    const existingIndex = passport.linkedCompanies.findIndex(
      (c) => c.companyId === companyContext.companyId
    );

    if (existingIndex !== -1) {
      passport.linkedCompanies[existingIndex] = {
        ...passport.linkedCompanies[existingIndex],
        ...companyContext,
        linkedAt: passport.linkedCompanies[existingIndex].linkedAt,
        interactionCount: passport.linkedCompanies[existingIndex].interactionCount,
      };
    } else {
      const newCompany: ICompanyContext = {
        ...companyContext,
        linkedAt: new Date(),
        interactionCount: 0,
      };
      passport.linkedCompanies.push(newCompany);

      const customerNode = passport.graph.nodes.find(
        (n) => n.type === GraphNodeType.CUSTOMER
      );
      if (customerNode) {
        const companyNodeId = uuidv4();
        passport.graph.nodes.push({
          id: companyNodeId,
          type: GraphNodeType.COMPANY,
          label: companyContext.companyName,
          properties: {
            companyId: companyContext.companyId,
            status: companyContext.status,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        passport.graph.edges.push({
          id: uuidv4(),
          sourceId: customerNode.id,
          targetId: companyNodeId,
          relationship: GraphRelationshipType.BELONGS_TO,
          properties: { linkedAt: new Date().toISOString() },
          weight: 1,
          createdAt: new Date(),
        });
      }
    }

    await passport.save();
    logger.info('Company linked to passport', {
      customerId,
      companyId: companyContext.companyId,
    });

    return passport.linkedCompanies.find((c) => c.companyId === companyContext.companyId)!;
  }

  async getCompanyContext(
    customerId: string,
    companyId: string
  ): Promise<ICompanyContext | null> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      return null;
    }

    const company = passport.linkedCompanies.find((c) => c.companyId === companyId);
    return company || null;
  }

  async mergePassports(
    sourceId: string,
    targetId: string,
    strategy: 'source_wins' | 'target_wins' | 'newest' | 'highest_importance' = 'newest'
  ): Promise<ICustomerMemoryPassport | null> {
    const [source, target] = await Promise.all([
      CustomerMemoryPassportModel.findOne({ customerId: sourceId }),
      CustomerMemoryPassportModel.findOne({ customerId: targetId }),
    ]);

    if (!source || !target) {
      logger.error('One or both passports not found for merge', { sourceId, targetId });
      return null;
    }

    const mergedMemories = this.mergeMemories(source.memories, target.memories, strategy);

    const allCompanies = new Map<string, ICompanyContext>();
    for (const company of target.linkedCompanies) {
      allCompanies.set(company.companyId, company);
    }
    for (const company of source.linkedCompanies) {
      if (!allCompanies.has(company.companyId)) {
        allCompanies.set(company.companyId, company);
      }
    }

    const allInteractions = [...target.interactions];
    const existingInteractionIds = new Set(target.interactions.map((i) => i.id));
    for (const interaction of source.interactions) {
      if (!existingInteractionIds.has(interaction.id)) {
        allInteractions.push(interaction);
      }
    }

    allInteractions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    target.memories = mergedMemories;
    target.linkedCompanies = Array.from(allCompanies.values());
    target.interactions = allInteractions;
    target.totalInteractions = allInteractions.length;
    target.healthScore = Math.round((source.healthScore + target.healthScore) / 2);
    target.engagementScore = Math.max(source.engagementScore, target.engagementScore);
    target.lastActivity = new Date();
    target.version += 1;

    await target.save();
    await CustomerMemoryPassportModel.deleteOne({ customerId: sourceId });

    logger.info('Passports merged', {
      sourceId,
      targetId,
      strategy,
      memoryCount: mergedMemories.length,
    });

    return target;
  }

  private mergeMemories(
    sourceMemories: IMemoryEntry[],
    targetMemories: IMemoryEntry[],
    strategy: string
  ): IMemoryEntry[] {
    const memoryMap = new Map<string, IMemoryEntry>();
    const existingIds = new Set<string>();

    for (const memory of targetMemories) {
      memoryMap.set(memory.id, memory);
      existingIds.add(memory.id);
    }

    for (const memory of sourceMemories) {
      if (existingIds.has(memory.id)) {
        const existing = memoryMap.get(memory.id)!;
        memoryMap.set(
          memory.id,
          this.resolveMergeConflict(existing, memory, strategy)
        );
      } else {
        memoryMap.set(memory.id, memory);
      }
    }

    return Array.from(memoryMap.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  private resolveMergeConflict(
    existing: IMemoryEntry,
    incoming: IMemoryEntry,
    strategy: string
  ): IMemoryEntry {
    switch (strategy) {
      case 'source_wins':
        return incoming;
      case 'target_wins':
        return existing;
      case 'newest':
        return incoming.createdAt > existing.createdAt ? incoming : existing;
      case 'highest_importance':
        const importanceOrder = {
          [MemoryImportance.CRITICAL]: 0,
          [MemoryImportance.HIGH]: 1,
          [MemoryImportance.MEDIUM]: 2,
          [MemoryImportance.LOW]: 3,
        };
        return importanceOrder[incoming.importance] < importanceOrder[existing.importance]
          ? incoming
          : existing;
      default:
        return incoming.createdAt > existing.createdAt ? incoming : existing;
    }
  }

  private updateEngagementScore(passport: ICustomerMemoryPassport, delta: number): void {
    passport.engagementScore = Math.max(
      0,
      Math.min(100, passport.engagementScore + delta)
    );
  }

  private updateHealthScore(passport: ICustomerMemoryPassport, delta: number): void {
    passport.healthScore = Math.max(
      0,
      Math.min(100, passport.healthScore + delta)
    );
    this.updateChurnRisk(passport);
  }

  private updateChurnRisk(passport: ICustomerMemoryPassport): void {
    if (passport.healthScore >= 80) {
      passport.churnRisk = 'low';
    } else if (passport.healthScore >= 50) {
      passport.churnRisk = 'medium';
    } else if (passport.healthScore >= 25) {
      passport.churnRisk = 'high';
    } else {
      passport.churnRisk = 'critical';
    }
  }

  private calculateRelevanceScore(memory: IMemoryEntry, query: string): number {
    let score = 0;

    if (memory.title.toLowerCase().includes(query)) score += 10;
    if (memory.content.toLowerCase().includes(query)) score += 5;
    if (memory.summary && memory.summary.toLowerCase().includes(query)) score += 3;
    if (memory.tags.some((t) => t.name.toLowerCase().includes(query))) score += 4;
    if (memory.keywords && memory.keywords.some((k) => k.toLowerCase().includes(query))) {
      score += 2;
    }

    const importanceScores = {
      [MemoryImportance.CRITICAL]: 5,
      [MemoryImportance.HIGH]: 4,
      [MemoryImportance.MEDIUM]: 3,
      [MemoryImportance.LOW]: 1,
    };
    score += importanceScores[memory.importance];

    const daysSinceCreation =
      (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 7) score += 3;
    else if (daysSinceCreation < 30) score += 2;
    else if (daysSinceCreation < 90) score += 1;

    return score;
  }

  private async addGraphNodeForMemory(
    customerId: string,
    memoryId: string,
    companyId: string,
    memoryType: MemoryType
  ): Promise<void> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) return;

    const companyNode = passport.graph.nodes.find(
      (n) => n.type === GraphNodeType.COMPANY &&
      (n.properties as Record<string, unknown>).companyId === companyId
    );

    if (!companyNode) return;

    const memoryNodeId = uuidv4();
    let nodeType: GraphNodeType;
    let label = '';

    switch (memoryType) {
      case MemoryType.SUPPORT:
      case MemoryType.COMPLAINT:
        nodeType = GraphNodeType.ISSUE;
        label = 'Support Issue';
        break;
      case MemoryType.COMPLIMENT:
        nodeType = GraphNodeType.FEEDBACK;
        label = 'Positive Feedback';
        break;
      case MemoryType.PURCHASE:
        nodeType = GraphNodeType.TRANSACTION;
        label = 'Purchase';
        break;
      case MemoryType.PREFERENCE:
        nodeType = GraphNodeType.PREFERENCE;
        label = 'Preference';
        break;
      default:
        nodeType = GraphNodeType.INTERACTION;
        label = memoryType;
    }

    const memoryNode: IGraphNode = {
      id: memoryNodeId,
      type: nodeType,
      label,
      properties: { memoryId, companyId, memoryType },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    passport.graph.nodes.push(memoryNode);

    const relationship = this.getRelationshipForMemoryType(memoryType);
    passport.graph.edges.push({
      id: uuidv4(),
      sourceId: companyNode.id,
      targetId: memoryNodeId,
      relationship,
      weight: 1,
      createdAt: new Date(),
    });

    const customerNode = passport.graph.nodes.find(
      (n) => n.type === GraphNodeType.CUSTOMER
    );
    if (customerNode) {
      passport.graph.edges.push({
        id: uuidv4(),
        sourceId: customerNode.id,
        targetId: memoryNodeId,
        relationship: GraphRelationshipType.INTERACTED_VIA,
        weight: 0.5,
        createdAt: new Date(),
      });
    }

    passport.graph.lastUpdated = new Date();
    await passport.save();
  }

  private getRelationshipForMemoryType(memoryType: MemoryType): GraphRelationshipType {
    switch (memoryType) {
      case MemoryType.COMPLAINT:
        return GraphRelationshipType.COMPLAINED_ABOUT;
      case MemoryType.COMPLIMENT:
        return GraphRelationshipType.SATISFIED_WITH;
      case MemoryType.PURCHASE:
        return GraphRelationshipType.PURCHASED;
      case MemoryType.PREFERENCE:
        return GraphRelationshipType.PREFERRED;
      default:
        return GraphRelationshipType.INTERACTED_VIA;
    }
  }
}

export const passportService = new PassportService();

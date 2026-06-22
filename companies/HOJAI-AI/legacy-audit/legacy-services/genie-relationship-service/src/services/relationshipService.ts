/**
 * GENIE Relationship Service - Relationship Service
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Business logic for relationship management
 */

import { HydratedDocument } from 'mongoose';
import {
  RelationshipModel,
  InteractionModel,
  IRelationship,
  IInteraction,
  RelationshipPlain,
  InteractionPlain,
  updateLastInteraction,
} from '../models/index.js';
import {
  CreateRelationshipInput,
  UpdateRelationshipInput,
  CreateInteractionInput,
  ListRelationshipsQuery,
  ListInteractionsQuery,
  Relationship,
  Interaction,
} from '../types.js';

// ============================================================================
// Response Helpers
// ============================================================================

function toRelationship(doc: RelationshipPlain): Relationship {
  return {
    id: doc._id.toString(),
    user_id: doc.user_id,
    name: doc.name,
    relationship_type: doc.relationship_type,
    importance_score: doc.importance_score,
    last_interaction: doc.last_interaction,
    next_followup: doc.next_followup || undefined,
    birthday: doc.birthday || undefined,
    tags: doc.tags,
    notes: doc.notes,
    context: doc.context,
    created_at: doc.created_at instanceof Date ? doc.created_at.toISOString() : String(doc.created_at),
    updated_at: doc.updated_at instanceof Date ? doc.updated_at.toISOString() : String(doc.updated_at),
  };
}

function toInteraction(doc: InteractionPlain): Interaction {
  return {
    id: doc._id.toString(),
    relationship_id: doc.relationship_id,
    type: doc.type,
    description: doc.description,
    timestamp: doc.timestamp,
  };
}

// ============================================================================
// Relationship Service
// ============================================================================

export class RelationshipService {
  /**
   * Create a new relationship
   */
  async create(
    tenantId: string,
    userId: string,
    input: CreateRelationshipInput
  ): Promise<Relationship> {
    const doc = await RelationshipModel.create({
      user_id: userId,
      tenant_id: tenantId,
      name: input.name,
      relationship_type: input.relationship_type,
      importance_score: input.importance_score || 5,
      last_interaction: new Date().toISOString(),
      next_followup: input.next_followup,
      birthday: input.birthday,
      tags: input.tags || [],
      notes: input.notes || '',
      context: input.context || [],
    });

    return toRelationship(doc as unknown as RelationshipPlain);
  }

  /**
   * List relationships with pagination and filtering
   */
  async list(
    tenantId: string,
    userId: string,
    query: ListRelationshipsQuery
  ): Promise<{
    relationships: Relationship[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page, pageSize, type, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * pageSize;

    // Build filter
    const filter: Record<string, unknown> = {
      tenant_id: tenantId,
      user_id: userId,
    };

    if (type) {
      filter.relationship_type = type;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    // Execute query
    const [relationships, total] = await Promise.all([
      RelationshipModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .lean<RelationshipPlain[]>(),
      RelationshipModel.countDocuments(filter),
    ]);

    return {
      relationships: relationships.map(toRelationship),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get a single relationship by ID
   */
  async get(
    tenantId: string,
    userId: string,
    relationshipId: string
  ): Promise<Relationship | null> {
    const doc = await RelationshipModel.findOne({
      _id: relationshipId,
      tenant_id: tenantId,
      user_id: userId,
    }).lean<RelationshipPlain>();

    return doc ? toRelationship(doc) : null;
  }

  /**
   * Update a relationship
   */
  async update(
    tenantId: string,
    userId: string,
    relationshipId: string,
    input: UpdateRelationshipInput
  ): Promise<Relationship | null> {
    const doc = await RelationshipModel.findOneAndUpdate(
      {
        _id: relationshipId,
        tenant_id: tenantId,
        user_id: userId,
      },
      { $set: input },
      { new: true, lean: true }
    ).lean<RelationshipPlain>();

    return doc ? toRelationship(doc) : null;
  }

  /**
   * Delete a relationship and its interactions
   */
  async delete(
    tenantId: string,
    userId: string,
    relationshipId: string
  ): Promise<boolean> {
    // Delete the relationship
    const result = await RelationshipModel.deleteOne({
      _id: relationshipId,
      tenant_id: tenantId,
      user_id: userId,
    });

    if (result.deletedCount === 0) {
      return false;
    }

    // Delete associated interactions
    await InteractionModel.deleteMany({
      relationship_id: relationshipId,
      tenant_id: tenantId,
      user_id: userId,
    });

    return true;
  }

  /**
   * Get relationship statistics
   */
  async getStats(
    tenantId: string,
    userId: string
  ): Promise<{
    total: number;
    byType: Record<string, number>;
    upcomingFollowups: number;
    upcomingBirthdays: number;
  }> {
    const filter = { tenant_id: tenantId, user_id: userId };

    const [total, byTypeAgg, upcomingFollowups, upcomingBirthdays] =
      await Promise.all([
        RelationshipModel.countDocuments(filter),
        RelationshipModel.aggregate([
          { $match: filter },
          { $group: { _id: '$relationship_type', count: { $sum: 1 } } },
        ]),
        RelationshipModel.countDocuments({
          ...filter,
          next_followup: {
            $gte: new Date().toISOString(),
            $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
        RelationshipModel.countDocuments({
          ...filter,
          birthday: {
            $regex: new Date().toISOString().slice(5, 10),
          },
        }),
      ]);

    const byType: Record<string, number> = {};
    for (const item of byTypeAgg) {
      byType[item._id] = item.count;
    }

    return {
      total,
      byType,
      upcomingFollowups,
      upcomingBirthdays,
    };
  }
}

// ============================================================================
// Interaction Service
// ============================================================================

export class InteractionService {
  /**
   * Log a new interaction
   */
  async create(
    tenantId: string,
    userId: string,
    relationshipId: string,
    input: CreateInteractionInput
  ): Promise<Interaction | null> {
    // Verify relationship exists
    const relationship = await RelationshipModel.findOne({
      _id: relationshipId,
      tenant_id: tenantId,
      user_id: userId,
    });

    if (!relationship) {
      return null;
    }

    // Create interaction
    const timestamp = input.timestamp || new Date().toISOString();
    const doc = await InteractionModel.create({
      relationship_id: relationshipId,
      tenant_id: tenantId,
      user_id: userId,
      type: input.type,
      description: input.description,
      timestamp,
    });

    // Update relationship's last interaction
    await updateLastInteraction(relationshipId);

    return toInteraction(doc as unknown as InteractionPlain);
  }

  /**
   * List interactions for a relationship
   */
  async list(
    tenantId: string,
    userId: string,
    relationshipId: string,
    query: ListInteractionsQuery
  ): Promise<{
    interactions: Interaction[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page, pageSize, type, startDate, endDate } = query;
    const skip = (page - 1) * pageSize;

    // Build filter
    const filter: Record<string, unknown> = {
      tenant_id: tenantId,
      user_id: userId,
      relationship_id: relationshipId,
    };

    if (type) {
      filter.type = type;
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        (filter.timestamp as Record<string, string>).$gte = startDate;
      }
      if (endDate) {
        (filter.timestamp as Record<string, string>).$lte = endDate;
      }
    }

    // Execute query
    const [interactions, total] = await Promise.all([
      InteractionModel.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean<InteractionPlain[]>(),
      InteractionModel.countDocuments(filter),
    ]);

    return {
      interactions: interactions.map(toInteraction),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get interaction by ID
   */
  async get(
    tenantId: string,
    userId: string,
    interactionId: string
  ): Promise<Interaction | null> {
    const doc = await InteractionModel.findOne({
      _id: interactionId,
      tenant_id: tenantId,
      user_id: userId,
    }).lean<InteractionPlain>();

    return doc ? toInteraction(doc) : null;
  }

  /**
   * Delete an interaction
   */
  async delete(
    tenantId: string,
    userId: string,
    interactionId: string
  ): Promise<boolean> {
    const result = await InteractionModel.deleteOne({
      _id: interactionId,
      tenant_id: tenantId,
      user_id: userId,
    });

    return result.deletedCount > 0;
  }

  /**
   * Get interaction statistics
   */
  async getStats(
    tenantId: string,
    userId: string,
    relationshipId?: string
  ): Promise<{
    total: number;
    byType: Record<string, number>;
    thisWeek: number;
    thisMonth: number;
  }> {
    const baseFilter = {
      tenant_id: tenantId,
      user_id: userId,
      ...(relationshipId && { relationship_id: relationshipId }),
    };

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, byTypeAgg, thisWeek, thisMonth] = await Promise.all([
      InteractionModel.countDocuments(baseFilter),
      InteractionModel.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      InteractionModel.countDocuments({
        ...baseFilter,
        timestamp: { $gte: weekAgo.toISOString() },
      }),
      InteractionModel.countDocuments({
        ...baseFilter,
        timestamp: { $gte: monthStart.toISOString() },
      }),
    ]);

    const byType: Record<string, number> = {};
    for (const item of byTypeAgg) {
      byType[item._id] = item.count;
    }

    return {
      total,
      byType,
      thisWeek,
      thisMonth,
    };
  }
}

// ============================================================================
// Export singleton instances
// ============================================================================

export const relationshipService = new RelationshipService();
export const interactionService = new InteractionService();

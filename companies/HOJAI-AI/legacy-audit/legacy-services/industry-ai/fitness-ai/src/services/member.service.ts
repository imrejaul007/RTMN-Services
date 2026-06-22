/**
 * Fitness AI - Member Service
 *
 * Business logic for member management
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Member,
  IMember,
  MemberStatus,
  MembershipTier,
  MEMBERSHIP_PRICING,
  Attendance,
  ClassEnrollment,
} from '../models';
// Simple error class for service layer
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ============================================
// MEMBER SERVICE
// ============================================

export class MemberService {
  /**
   * Create a new member
   */
  async createMember(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    membershipTier: MembershipTier;
    membershipDuration: number; // months
    source?: string;
    dateOfBirth?: Date;
    height?: number;
    weight?: number;
    fitnessGoal?: string;
  }): Promise<IMember> {
    // Check for existing member
    const existing = await Member.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new AppError('Member with this email already exists', 'MEMBER_EXISTS', 400);
    }

    const now = new Date();
    const membershipEnd = new Date(now);
    membershipEnd.setMonth(membershipEnd.getMonth() + data.membershipDuration);

    const member = new Member({
      memberId: `MEM-${uuidv4().substring(0, 8).toUpperCase()}`,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      phone: data.phone,
      membershipTier: data.membershipTier,
      membershipStart: now,
      membershipEnd,
      membershipDuration: data.membershipDuration,
      status: MemberStatus.ACTIVE,
      source: data.source || 'walk_in',
      dateOfBirth: data.dateOfBirth,
      height: data.height,
      weight: data.weight,
      fitnessGoal: data.fitnessGoal,
      totalVisits: 0,
      joinDate: now,
    });

    await member.save();
    return member;
  }

  /**
   * Get member by ID
   */
  async getMemberById(memberId: string): Promise<IMember | null> {
    return Member.findOne({ memberId });
  }

  /**
   * Get member by email
   */
  async getMemberByEmail(email: string): Promise<IMember | null> {
    return Member.findOne({ email: email.toLowerCase() });
  }

  /**
   * Get all members with pagination
   */
  async getMembers(options: {
    page?: number;
    limit?: number;
    status?: MemberStatus;
    tier?: MembershipTier;
    search?: string;
  }): Promise<{ members: IMember[]; total: number; page: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (options.status) {
      query.status = options.status;
    }

    if (options.tier) {
      query.membershipTier = options.tier;
    }

    if (options.search) {
      query.$or = [
        { firstName: { $regex: options.search, $options: 'i' } },
        { lastName: { $regex: options.search, $options: 'i' } },
        { email: { $regex: options.search, $options: 'i' } },
        { memberId: { $regex: options.search, $options: 'i' } },
      ];
    }

    const [members, total] = await Promise.all([
      Member.find(query).skip(skip).limit(limit).sort({ joinDate: -1 }),
      Member.countDocuments(query),
    ]);

    return {
      members,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update member
   */
  async updateMember(
    memberId: string,
    updates: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      membershipTier: MembershipTier;
      membershipEnd: Date;
      status: MemberStatus;
      height: number;
      weight: number;
      fitnessGoal: string;
      emergencyContact: { name: string; phone: string; relationship: string };
      tags: string[];
      notes: string;
    }>
  ): Promise<IMember | null> {
    // If email is being changed, check for duplicates
    if (updates.email) {
      const existing = await Member.findOne({
        email: updates.email.toLowerCase(),
        memberId: { $ne: memberId },
      });
      if (existing) {
        throw new AppError('Email already in use', 'EMAIL_EXISTS', 400);
      }
      updates.email = updates.email.toLowerCase();
    }

    return Member.findOneAndUpdate(
      { memberId },
      { $set: updates },
      { new: true }
    );
  }

  /**
   * Renew membership
   */
  async renewMembership(
    memberId: string,
    durationMonths: number
  ): Promise<IMember | null> {
    const member = await Member.findOne({ memberId });
    if (!member) {
      throw new AppError('Member not found', 'MEMBER_NOT_FOUND', 404);
    }

    const now = new Date();
    let endDate = new Date(member.membershipEnd);

    // If current membership has expired, start from now
    if (endDate < now) {
      endDate = now;
    }

    endDate.setMonth(endDate.getMonth() + durationMonths);

    return Member.findOneAndUpdate(
      { memberId },
      {
        $set: {
          membershipEnd: endDate,
          status: MemberStatus.ACTIVE,
        },
      },
      { new: true }
    );
  }

  /**
   * Upgrade membership tier
   */
  async upgradeTier(
    memberId: string,
    newTier: MembershipTier
  ): Promise<IMember | null> {
    const member = await Member.findOne({ memberId });
    if (!member) {
      throw new AppError('Member not found', 'MEMBER_NOT_FOUND', 404);
    }

    const now = new Date();
    let endDate = new Date(member.membershipEnd);

    // If current membership has expired, start from now
    if (endDate < now) {
      endDate = now;
    }

    // Calculate prorated upgrade
    const currentPricing = MEMBERSHIP_PRICING[member.membershipTier];
    const newPricing = MEMBERSHIP_PRICING[newTier];

    // Simple upgrade: extend by the difference
    const monthsToAdd = Math.ceil(
      (newPricing.monthly - currentPricing.monthly) / newPricing.monthly
    );
    endDate.setMonth(endDate.getMonth() + monthsToAdd);

    return Member.findOneAndUpdate(
      { memberId },
      {
        $set: {
          membershipTier: newTier,
          membershipEnd: endDate,
        },
      },
      { new: true }
    );
  }

  /**
   * Suspend member
   */
  async suspendMember(memberId: string, reason: string): Promise<IMember | null> {
    return Member.findOneAndUpdate(
      { memberId },
      {
        $set: {
          status: MemberStatus.SUSPENDED,
        },
        $push: {
          notes: `Suspended: ${reason} at ${new Date().toISOString()}`,
        },
      },
      { new: true }
    );
  }

  /**
   * Record member visit
   */
  async recordVisit(memberId: string): Promise<void> {
    await Member.findOneAndUpdate(
      { memberId },
      {
        $inc: { totalVisits: 1 },
        $set: { lastVisit: new Date() },
      }
    );
  }

  /**
   * Check membership status and update if expired
   */
  async checkAndUpdateExpiredMemberships(): Promise<number> {
    const now = new Date();

    const result = await Member.updateMany(
      {
        status: MemberStatus.ACTIVE,
        membershipEnd: { $lt: now },
      },
      {
        $set: { status: MemberStatus.EXPIRED },
      }
    );

    return result.modifiedCount;
  }

  /**
   * Get membership statistics
   */
  async getStatistics(): Promise<{
    totalMembers: number;
    activeMembers: number;
    expiredMembers: number;
    byTier: Record<MembershipTier, number>;
    newThisMonth: number;
    avgVisits: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalMembers,
      activeMembers,
      expiredMembers,
      allMembers,
      newThisMonth,
    ] = await Promise.all([
      Member.countDocuments(),
      Member.countDocuments({ status: MemberStatus.ACTIVE }),
      Member.countDocuments({ status: MemberStatus.EXPIRED }),
      Member.find(),
      Member.countDocuments({ joinDate: { $gte: startOfMonth } }),
    ]);

    const byTier: Record<MembershipTier, number> = {
      [MembershipTier.BASIC]: 0,
      [MembershipTier.PREMIUM]: 0,
      [MembershipTier.VIP]: 0,
    };

    let totalVisits = 0;
    allMembers.forEach((m) => {
      byTier[m.membershipTier]++;
      totalVisits += m.totalVisits;
    });

    return {
      totalMembers,
      activeMembers,
      expiredMembers,
      byTier,
      newThisMonth,
      avgVisits: totalMembers > 0 ? totalVisits / totalMembers : 0,
    };
  }

  /**
   * Delete member (soft delete - change status)
   */
  async deleteMember(memberId: string): Promise<boolean> {
    const result = await Member.findOneAndDelete({ memberId });
    return !!result;
  }
}

export const memberService = new MemberService();
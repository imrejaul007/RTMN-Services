/**
 * Fitness AI - Class Service
 *
 * Business logic for fitness class management
 */

import { v4 as uuidv4 } from 'uuid';
import {
  FitnessClass,
  IFitnessClass,
  ClassEnrollment,
  IClassEnrollment,
  ClassType,
  ClassStatus,
  WorkoutDifficulty,
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
// CLASS SERVICE
// ============================================

export class ClassService {
  /**
   * Create a new fitness class
   */
  async createClass(data: {
    name: string;
    type: ClassType;
    description?: string;
    scheduledDate: Date;
    startTime: string;
    endTime: string;
    instructorId?: string;
    instructorName: string;
    capacity: number;
    room?: string;
    equipment?: string[];
    difficulty: WorkoutDifficulty;
    intensity: 1 | 2 | 3 | 4 | 5;
    tags?: string[];
  }): Promise<IFitnessClass> {
    // Calculate duration
    const [startHour, startMin] = data.startTime.split(':').map(Number);
    const [endHour, endMin] = data.endTime.split(':').map(Number);
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    if (duration <= 0) {
      throw new AppError('End time must be after start time', 'INVALID_TIME', 400);
    }

    const fitnessClass = new FitnessClass({
      classId: `CLS-${uuidv4().substring(0, 8).toUpperCase()}`,
      ...data,
      duration,
      enrolled: 0,
      waitlist: 0,
      status: ClassStatus.SCHEDULED,
      tags: data.tags || [],
    });

    await fitnessClass.save();
    return fitnessClass;
  }

  /**
   * Get class by ID
   */
  async getClassById(classId: string): Promise<IFitnessClass | null> {
    return FitnessClass.findOne({ classId });
  }

  /**
   * Get classes with filters
   */
  async getClasses(options: {
    page?: number;
    limit?: number;
    type?: ClassType;
    status?: ClassStatus;
    instructorId?: string;
    startDate?: Date;
    endDate?: Date;
    difficulty?: WorkoutDifficulty;
    availableOnly?: boolean;
  }): Promise<{ classes: IFitnessClass[]; total: number; page: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (options.type) {
      query.type = options.type;
    }

    if (options.status) {
      query.status = options.status;
    }

    if (options.instructorId) {
      query.instructorId = options.instructorId;
    }

    if (options.startDate || options.endDate) {
      query.scheduledDate = {};
      if (options.startDate) {
        query.scheduledDate.$gte = options.startDate;
      }
      if (options.endDate) {
        query.scheduledDate.$lte = options.endDate;
      }
    }

    if (options.difficulty) {
      query.difficulty = options.difficulty;
    }

    if (options.availableOnly) {
      query.status = ClassStatus.SCHEDULED;
      query.$expr = { $lt: ['$enrolled', '$capacity'] };
    }

    const [classes, total] = await Promise.all([
      FitnessClass.find(query).skip(skip).limit(limit).sort({ scheduledDate: 1, startTime: 1 }),
      FitnessClass.countDocuments(query),
    ]);

    return {
      classes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get classes for a specific date
   */
  async getClassesByDate(date: Date): Promise<IFitnessClass[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return FitnessClass.find({
      scheduledDate: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ startTime: 1 });
  }

  /**
   * Get classes by type
   */
  async getClassesByType(type: ClassType, limit: number = 10): Promise<IFitnessClass[]> {
    return FitnessClass.find({
      type,
      scheduledDate: { $gte: new Date() },
      status: ClassStatus.SCHEDULED,
    })
      .sort({ scheduledDate: 1, startTime: 1 })
      .limit(limit);
  }

  /**
   * Update class
   */
  async updateClass(
    classId: string,
    updates: Partial<{
      name: string;
      description: string;
      scheduledDate: Date;
      startTime: string;
      endTime: string;
      instructorId: string;
      instructorName: string;
      capacity: number;
      room: string;
      equipment: string[];
      difficulty: WorkoutDifficulty;
      intensity: 1 | 2 | 3 | 4 | 5;
      tags: string[];
      status: ClassStatus;
    }>
  ): Promise<IFitnessClass | null> {
    // If capacity is being reduced, check if current enrollment exceeds new capacity
    if (updates.capacity) {
      const currentClass = await FitnessClass.findOne({ classId });
      if (currentClass && updates.capacity < currentClass.enrolled) {
        throw new AppError(
          `Cannot reduce capacity below current enrollment (${currentClass.enrolled})`,
          'CAPACITY_ERROR',
          400
        );
      }
    }

    return FitnessClass.findOneAndUpdate(
      { classId },
      { $set: updates },
      { new: true }
    );
  }

  /**
   * Cancel class
   */
  async cancelClass(classId: string, reason: string): Promise<IFitnessClass | null> {
    const fitnessClass = await FitnessClass.findOneAndUpdate(
      { classId, status: ClassStatus.SCHEDULED },
      {
        $set: { status: ClassStatus.CANCELLED },
        $push: { tags: `cancelled: ${reason}` },
      },
      { new: true }
    );

    if (fitnessClass) {
      // Cancel all enrollments
      await ClassEnrollment.updateMany(
        { classId, status: 'enrolled' },
        { $set: { status: 'cancelled', cancelledAt: new Date() } }
      );
    }

    return fitnessClass;
  }

  /**
   * Enroll member in class
   */
  async enrollMember(classId: string, memberId: string): Promise<IClassEnrollment> {
    const fitnessClass = await FitnessClass.findOne({ classId });

    if (!fitnessClass) {
      throw new AppError('Class not found', 'CLASS_NOT_FOUND', 404);
    }

    if (fitnessClass.status !== ClassStatus.SCHEDULED) {
      throw new AppError('Class is not available for enrollment', 'CLASS_NOT_AVAILABLE', 400);
    }

    // Check if already enrolled
    const existingEnrollment = await ClassEnrollment.findOne({
      classId,
      memberId,
      status: { $in: ['enrolled', 'waitlisted'] },
    });

    if (existingEnrollment) {
      throw new AppError('Already enrolled in this class', 'ALREADY_ENROLLED', 400);
    }

    // Check capacity
    if (fitnessClass.enrolled >= fitnessClass.capacity) {
      // Add to waitlist
      const enrollment = new ClassEnrollment({
        enrollmentId: `ENR-${uuidv4().substring(0, 8).toUpperCase()}`,
        classId,
        memberId,
        status: 'waitlisted',
      });
      await enrollment.save();

      await FitnessClass.updateOne(
        { classId },
        { $inc: { waitlist: 1 } }
      );

      return enrollment;
    }

    // Create enrollment
    const enrollment = new ClassEnrollment({
      enrollmentId: `ENR-${uuidv4().substring(0, 8).toUpperCase()}`,
      classId,
      memberId,
      status: 'enrolled',
    });
    await enrollment.save();

    // Update class enrollment count
    await FitnessClass.updateOne(
      { classId },
      { $inc: { enrolled: 1 } }
    );

    return enrollment;
  }

  /**
   * Cancel enrollment
   */
  async cancelEnrollment(classId: string, memberId: string): Promise<boolean> {
    const enrollment = await ClassEnrollment.findOne({
      classId,
      memberId,
      status: { $in: ['enrolled', 'waitlisted'] },
    });

    if (!enrollment) {
      throw new AppError('Enrollment not found', 'ENROLLMENT_NOT_FOUND', 404);
    }

    // Save original status before changing
    const wasEnrolled = enrollment.status === 'enrolled';

    enrollment.status = 'cancelled';
    enrollment.cancelledAt = new Date();
    await enrollment.save();

    // Update class counts based on original status
    const update: any = {};
    if (wasEnrolled) {
      update.$inc = { enrolled: -1 };
    } else {
      update.$inc = { waitlist: -1 };
    }

    await FitnessClass.updateOne({ classId }, update);

    // Promote from waitlist if was enrolled
    if (wasEnrolled) {
      await this.promoteFromWaitlist(classId);
    }

    return true;
  }

  /**
   * Promote first person from waitlist
   */
  async promoteFromWaitlist(classId: string): Promise<void> {
    const fitnessClass = await FitnessClass.findOne({ classId });

    if (!fitnessClass || fitnessClass.enrolled >= fitnessClass.capacity) {
      return;
    }

    const nextInLine = await ClassEnrollment.findOneAndUpdate(
      { classId, status: 'waitlisted' },
      { $set: { status: 'enrolled', enrolledAt: new Date() } },
      { new: true }
    );

    if (nextInLine) {
      await FitnessClass.updateOne(
        { classId },
        { $inc: { enrolled: 1, waitlist: -1 } }
      );
    }
  }

  /**
   * Check in member to class
   */
  async checkInMember(classId: string, memberId: string): Promise<IClassEnrollment | null> {
    const enrollment = await ClassEnrollment.findOneAndUpdate(
      { classId, memberId, status: 'enrolled' },
      {
        $set: {
          status: 'attended',
          checkedInAt: new Date(),
        },
      },
      { new: true }
    );

    return enrollment;
  }

  /**
   * Check out member from class
   */
  async checkOutMember(classId: string, memberId: string): Promise<IClassEnrollment | null> {
    const enrollment = await ClassEnrollment.findOneAndUpdate(
      { classId, memberId, status: 'attended' },
      { $set: { checkedOutAt: new Date() } },
      { new: true }
    );

    return enrollment;
  }

  /**
   * Get enrollments for a class
   */
  async getClassEnrollments(classId: string): Promise<IClassEnrollment[]> {
    return ClassEnrollment.find({ classId }).sort({ enrolledAt: 1 });
  }

  /**
   * Get member's class enrollments
   */
  async getMemberEnrollments(
    memberId: string,
    options: { upcoming?: boolean; past?: boolean }
  ): Promise<IClassEnrollment[]> {
    const query: any = { memberId, status: { $in: ['enrolled', 'waitlisted', 'attended'] } };

    const now = new Date();
    const fitnessClasses = await FitnessClass.find(
      options.upcoming ? { scheduledDate: { $gte: now } } :
      options.past ? { scheduledDate: { $lt: now } } : {}
    );

    const classIds = fitnessClasses.map(c => c.classId);
    query.classId = { $in: classIds };

    return ClassEnrollment.find(query).sort({ enrolledAt: -1 });
  }

  /**
   * Get class statistics
   */
  async getStatistics(options: { startDate?: Date; endDate?: Date }): Promise<{
    totalClasses: number;
    upcomingClasses: number;
    totalEnrollments: number;
    avgOccupancy: number;
    byType: Record<ClassType, number>;
    topInstructors: { instructorId: string; name: string; count: number }[];
  }> {
    const query: any = {};
    if (options.startDate || options.endDate) {
      query.scheduledDate = {};
      if (options.startDate) query.scheduledDate.$gte = options.startDate;
      if (options.endDate) query.scheduledDate.$lte = options.endDate;
    }

    const classes = await FitnessClass.find(query);
    const enrollments = await ClassEnrollment.find({
      classId: { $in: classes.map(c => c.classId) },
    });

    const byType: Record<ClassType, number> = {} as any;
    const instructorCounts: Record<string, { name: string; count: number }> = {};

    let totalCapacity = 0;
    let totalEnrolled = 0;

    classes.forEach((c) => {
      byType[c.type] = (byType[c.type] || 0) + 1;
      totalCapacity += c.capacity;
      totalEnrolled += c.enrolled;

      if (c.instructorId) {
        if (!instructorCounts[c.instructorId]) {
          instructorCounts[c.instructorId] = { name: c.instructorName, count: 0 };
        }
        instructorCounts[c.instructorId].count++;
      }
    });

    const now = new Date();
    const upcomingClasses = classes.filter(c => c.scheduledDate >= now && c.status === ClassStatus.SCHEDULED).length;

    return {
      totalClasses: classes.length,
      upcomingClasses,
      totalEnrollments: enrollments.length,
      avgOccupancy: totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0,
      byType,
      topInstructors: Object.entries(instructorCounts)
        .map(([id, data]) => ({ instructorId: id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }

  /**
   * Delete class (only if no enrollments)
   */
  async deleteClass(classId: string): Promise<boolean> {
    const enrollmentCount = await ClassEnrollment.countDocuments({
      classId,
      status: { $in: ['enrolled', 'attended'] },
    });

    if (enrollmentCount > 0) {
      throw new AppError(
        'Cannot delete class with active enrollments',
        'HAS_ENROLLMENTS',
        400
      );
    }

    const result = await FitnessClass.findOneAndDelete({ classId });
    await ClassEnrollment.deleteMany({ classId });

    return !!result;
  }
}

export const classService = new ClassService();
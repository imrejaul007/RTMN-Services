/**
 * Fitness AI - Attendance Service
 *
 * Business logic for attendance tracking
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Attendance,
  IAttendance,
  AttendanceStatus,
} from '../models';
import { memberService } from './member.service';

// Simple error class
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

export class AttendanceService {
  /**
   * Check in member
   */
  async checkIn(data: {
    memberId: string;
    source?: 'manual' | 'qr_code' | 'face_recognition' | 'rfid';
  }): Promise<IAttendance> {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existing = await Attendance.findOne({
      memberId: data.memberId,
      date: { $gte: today },
      status: AttendanceStatus.CHECKED_IN,
    });

    if (existing) {
      throw new AppError('Already checked in today', 'ALREADY_CHECKED_IN', 400);
    }

    const attendance = new Attendance({
      attendanceId: `ATT-${uuidv4().substring(0, 8).toUpperCase()}`,
      memberId: data.memberId,
      date: now,
      checkInTime: now,
      source: data.source || 'manual',
      status: AttendanceStatus.CHECKED_IN,
    });

    await attendance.save();

    // Update member visit count
    await memberService.recordVisit(data.memberId);

    return attendance;
  }

  /**
   * Check out member
   */
  async checkOut(memberId: string): Promise<IAttendance | null> {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOneAndUpdate(
      {
        memberId,
        date: { $gte: today },
        status: AttendanceStatus.CHECKED_IN,
      },
      {
        $set: {
          checkOutTime: now,
          status: AttendanceStatus.CHECKED_OUT,
        },
      },
      { new: true }
    );

    return attendance;
  }

  /**
   * Get member's attendance records
   */
  async getMemberAttendance(
    memberId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<IAttendance[]> {
    const query: any = { memberId };

    if (options.startDate || options.endDate) {
      query.date = {};
      if (options.startDate) query.date.$gte = options.startDate;
      if (options.endDate) query.date.$lte = options.endDate;
    }

    return Attendance.find(query)
      .sort({ date: -1 })
      .limit(options.limit || 100);
  }

  /**
   * Get today's attendance
   */
  async getTodayAttendance(): Promise<IAttendance[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return Attendance.find({
      date: { $gte: today, $lt: tomorrow },
    }).sort({ checkInTime: 1 });
  }

  /**
   * Get attendance statistics
   */
  async getStatistics(options: {
    memberId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{
    totalCheckIns: number;
    avgDuration: number;
    peakHours: { hour: number; count: number }[];
    daysActive: number;
    bySource: Record<string, number>;
  }> {
    const query: any = {};
    if (options.memberId) query.memberId = options.memberId;
    if (options.startDate || options.endDate) {
      query.date = {};
      if (options.startDate) query.date.$gte = options.startDate;
      if (options.endDate) query.date.$lte = options.endDate;
    }

    const records = await Attendance.find(query);

    // Calculate average duration
    const durations = records
      .filter(r => r.duration)
      .map(r => r.duration!);
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // Peak hours
    const hourCounts: Record<number, number> = {};
    records.forEach(r => {
      const hour = r.checkInTime.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Days active
    const uniqueDays = new Set(
      records.map(r => r.date.toISOString().split('T')[0])
    );

    // By source
    const bySource: Record<string, number> = {};
    records.forEach(r => {
      bySource[r.source] = (bySource[r.source] || 0) + 1;
    });

    return {
      totalCheckIns: records.length,
      avgDuration: Math.round(avgDuration),
      peakHours,
      daysActive: uniqueDays.size,
      bySource,
    };
  }

  /**
   * Get weekly attendance summary
   */
  async getWeeklySummary(memberId: string): Promise<{
    weekStart: Date;
    weekEnd: Date;
    totalVisits: number;
    totalDuration: number;
    avgDuration: number;
    days: { date: string; visited: boolean; duration?: number }[];
  }> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      memberId,
      date: { $gte: weekStart, $lte: weekEnd },
    });

    const days: { date: string; visited: boolean; duration?: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const record = records.find(r =>
        r.date.toISOString().split('T')[0] === dateStr
      );
      days.push({
        date: dateStr,
        visited: !!record,
        duration: record?.duration,
      });
    }

    const totalDuration = records.reduce((sum, r) => sum + (r.duration || 0), 0);

    return {
      weekStart,
      weekEnd,
      totalVisits: records.length,
      totalDuration,
      avgDuration: records.length > 0 ? totalDuration / records.length : 0,
      days,
    };
  }

  /**
   * Mark no-show
   */
  async markNoShow(memberId: string, classId: string): Promise<void> {
    // This would be called by the class service when a member doesn't show up
    const now = new Date();
    const attendance = new Attendance({
      attendanceId: `ATT-${uuidv4().substring(0, 8).toUpperCase()}`,
      memberId,
      date: now,
      checkInTime: now,
      source: 'manual',
      status: AttendanceStatus.NO_SHOW,
    });

    await attendance.save();
  }

  /**
   * Delete attendance record
   */
  async deleteRecord(attendanceId: string): Promise<boolean> {
    const result = await Attendance.findOneAndDelete({ attendanceId });
    return !!result;
  }
}

export const attendanceService = new AttendanceService();
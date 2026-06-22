import { v4 as uuidv4 } from 'uuid';
import {
  ArchivedHandover,
  IArchivedHandover,
  ShiftHandover,
  IShiftHandover,
  HandoverStatus,
  TaskStatus
} from '../models/handover';
import { logger } from '../utils/logger';

export interface SearchQuery {
  facilityId?: string;
  departmentId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: HandoverStatus;
  outgoingStaffId?: string;
  incomingStaffId?: string;
  keyword?: string;
  alertType?: string;
  priority?: string;
}

export interface ShiftReport {
  facilityId: string;
  facilityName: string;
  dateRange: { start: Date; end: Date };
  totalHandovers: number;
  completedHandovers: number;
  completionRate: number;
  averageAcknowledgmentTime: number; // in minutes
  totalPatients: number;
  averagePatientsPerHandover: number;
  totalTasks: number;
  completedTasks: number;
  taskCompletionRate: number;
  totalAlerts: number;
  criticalAlerts: number;
  alertBreakdown: Record<string, number>;
  staffPerformance: {
    staffId: string;
    staffName: string;
    handoversCompleted: number;
    averageAcknowledgmentTime: number;
    tasksCompleted: number;
    criticalAlertsHandled: number;
  }[];
  dailyBreakdown: {
    date: Date;
    handovers: number;
    patients: number;
    tasks: number;
    alerts: number;
  }[];
}

export class ArchiveService {
  /**
   * Archive a handover
   */
  async archiveHandover(
    handoverId: string,
    archivedBy: string,
    reason?: string
  ): Promise<IArchivedHandover | null> {
    try {
      const handover = await ShiftHandover.findOne({ handoverId }).exec();
      if (!handover) {
        throw new Error(`Handover not found: ${handoverId}`);
      }

      if (handover.status === HandoverStatus.ARCHIVED) {
        throw new Error(`Handover ${handoverId} is already archived`);
      }

      // Calculate metrics before archiving
      const shiftDuration = handover.completedAt && handover.startedAt
        ? Math.round((handover.completedAt.getTime() - handover.startedAt.getTime()) / 60000)
        : undefined;

      const totalTasks = handover.sections.tasks.length;
      const completedTasks = handover.sections.tasks.filter(
        (t) => t.status === TaskStatus.COMPLETED
      ).length;
      const taskCompletionRate = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      const alertCount = handover.sections.alerts.length;

      // Create archive record
      const archiveRecord = new ArchivedHandover({
        handoverId: `ARCH-${uuidv4().substring(0, 8).toUpperCase()}`,
        originalHandoverId: handover.handoverId,
        archiveData: handover.toObject(),
        archivedAt: new Date(),
        archivedBy,
        reason,
        shiftDuration,
        taskCompletionRate,
        alertCount
      });

      await archiveRecord.save();

      // Update original handover status
      handover.status = HandoverStatus.ARCHIVED;
      handover.archivedAt = new Date();
      handover.archivedBy = archivedBy;
      await handover.save();

      logger.info(`Handover ${handoverId} archived successfully`);
      return archiveRecord;
    } catch (error) {
      logger.error(`Failed to archive handover ${handoverId}:`, error);
      throw error;
    }
  }

  /**
   * Search archived handovers
   */
  async searchHandovers(query: SearchQuery): Promise<IArchivedHandover[]> {
    try {
      const searchQuery: Record<string, unknown> = {};

      if (query.facilityId) {
        searchQuery['archiveData.facilityId'] = query.facilityId;
      }

      if (query.departmentId) {
        searchQuery['archiveData.departmentId'] = query.departmentId;
      }

      if (query.startDate || query.endDate) {
        searchQuery['archiveData.shiftDate'] = {};
        if (query.startDate) {
          (searchQuery['archiveData.shiftDate'] as Record<string, Date>).$gte = query.startDate;
        }
        if (query.endDate) {
          (searchQuery['archiveData.shiftDate'] as Record<string, Date>).$lte = query.endDate;
        }
      }

      if (query.outgoingStaffId) {
        searchQuery['archiveData.outgoingStaffId'] = query.outgoingStaffId;
      }

      if (query.incomingStaffId) {
        searchQuery['archiveData.incomingStaffId'] = query.incomingStaffId;
      }

      if (query.status) {
        searchQuery['archiveData.status'] = query.status;
      }

      if (query.alertType) {
        searchQuery['archiveData.sections.alerts.type'] = query.alertType;
      }

      if (query.keyword) {
        searchQuery.$text = { $search: query.keyword };
      }

      const results = await ArchivedHandover.find(searchQuery)
        .sort({ archivedAt: -1 })
        .limit(100)
        .exec();

      return results;
    } catch (error) {
      logger.error('Failed to search archived handovers:', error);
      throw error;
    }
  }

  /**
   * Get archived handover by ID
   */
  async getArchivedHandover(archiveId: string): Promise<IArchivedHandover | null> {
    try {
      const archived = await ArchivedHandover.findOne({ handoverId: archiveId }).exec();
      return archived;
    } catch (error) {
      logger.error(`Failed to get archived handover ${archiveId}:`, error);
      throw error;
    }
  }

  /**
   * Generate shift report for a facility
   */
  async generateShiftReport(
    facilityId: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string
  ): Promise<ShiftReport> {
    try {
      const facilityQuery: Record<string, unknown> = {
        facilityId,
        shiftDate: { $gte: startDate, $lte: endDate },
        status: { $ne: HandoverStatus.CANCELLED }
      };

      if (departmentId) {
        facilityQuery.departmentId = departmentId;
      }

      const handovers = await ShiftHandover.find(facilityQuery).exec();

      // Get facility name from first handover
      const facilityName = handovers[0]?.facilityName || 'Unknown Facility';

      // Calculate totals
      const totalHandovers = handovers.length;
      const completedHandovers = handovers.filter(
        (h) => h.status === HandoverStatus.COMPLETED
      ).length;
      const completionRate = totalHandovers > 0
        ? Math.round((completedHandovers / totalHandovers) * 100)
        : 0;

      // Calculate average acknowledgment time
      const acknowledgmentTimes: number[] = [];
      for (const handover of handovers) {
        if (handover.completedAt && handover.startedAt) {
          const ackTime = Math.round(
            (handover.completedAt.getTime() - handover.startedAt.getTime()) / 60000
          );
          acknowledgmentTimes.push(ackTime);
        }
      }
      const averageAcknowledgmentTime = acknowledgmentTimes.length > 0
        ? Math.round(
            acknowledgmentTimes.reduce((a, b) => a + b, 0) / acknowledgmentTimes.length
          )
        : 0;

      // Patient stats
      const totalPatients = handovers.reduce(
        (sum, h) => sum + h.sections.patients.length,
        0
      );
      const averagePatientsPerHandover = totalHandovers > 0
        ? Math.round((totalPatients / totalHandovers) * 10) / 10
        : 0;

      // Task stats
      const allTasks = handovers.flatMap((h) => h.sections.tasks);
      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(
        (t) => t.status === TaskStatus.COMPLETED
      ).length;
      const taskCompletionRate = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      // Alert stats
      const allAlerts = handovers.flatMap((h) => h.sections.alerts);
      const totalAlerts = allAlerts.length;
      const criticalAlerts = allAlerts.filter(
        (a) => a.type === 'critical' || a.type === 'urgent'
      ).length;

      // Alert breakdown
      const alertBreakdown: Record<string, number> = {};
      for (const alert of allAlerts) {
        alertBreakdown[alert.type] = (alertBreakdown[alert.type] || 0) + 1;
      }

      // Staff performance
      const staffMap = new Map<string, {
        staffId: string;
        staffName: string;
        handoversCompleted: number;
        totalAckTime: number;
        ackCount: number;
        tasksCompleted: number;
        criticalAlertsHandled: number;
      }>();

      for (const handover of handovers) {
        // Outgoing staff
        const outStaff = staffMap.get(handover.outgoingStaffId) || {
          staffId: handover.outgoingStaffId,
          staffName: handover.outgoingStaffName,
          handoversCompleted: 0,
          totalAckTime: 0,
          ackCount: 0,
          tasksCompleted: 0,
          criticalAlertsHandled: 0
        };
        outStaff.handoversCompleted++;
        if (handover.completedAt && handover.startedAt) {
          outStaff.totalAckTime += Math.round(
            (handover.completedAt.getTime() - handover.startedAt.getTime()) / 60000
          );
          outStaff.ackCount++;
        }
        outStaff.tasksCompleted += handover.sections.tasks.filter(
          (t) => t.status === TaskStatus.COMPLETED
        ).length;
        outStaff.criticalAlertsHandled += handover.sections.alerts.filter(
          (a) => a.type === 'critical' || a.type === 'urgent'
        ).length;
        staffMap.set(handover.outgoingStaffId, outStaff);

        // Incoming staff
        if (handover.incomingStaffId) {
          const inStaff = staffMap.get(handover.incomingStaffId) || {
            staffId: handover.incomingStaffId,
            staffName: handover.incomingStaffName || 'Unknown',
            handoversCompleted: 0,
            totalAckTime: 0,
            ackCount: 0,
            tasksCompleted: 0,
            criticalAlertsHandled: 0
          };
          inStaff.handoversCompleted++;
          staffMap.set(handover.incomingStaffId, inStaff);
        }
      }

      const staffPerformance = Array.from(staffMap.values()).map((s) => ({
        staffId: s.staffId,
        staffName: s.staffName,
        handoversCompleted: s.handoversCompleted,
        averageAcknowledgmentTime: s.ackCount > 0
          ? Math.round(s.totalAckTime / s.ackCount)
          : 0,
        tasksCompleted: s.tasksCompleted,
        criticalAlertsHandled: s.criticalAlertsHandled
      }));

      // Daily breakdown
      const dailyMap = new Map<string, {
        date: Date;
        handovers: number;
        patients: number;
        tasks: number;
        alerts: number;
      }>();

      for (const handover of handovers) {
        const dateKey = handover.shiftDate.toISOString().split('T')[0];
        const dayData = dailyMap.get(dateKey) || {
          date: new Date(dateKey),
          handovers: 0,
          patients: 0,
          tasks: 0,
          alerts: 0
        };
        dayData.handovers++;
        dayData.patients += handover.sections.patients.length;
        dayData.tasks += handover.sections.tasks.length;
        dayData.alerts += handover.sections.alerts.length;
        dailyMap.set(dateKey, dayData);
      }

      const dailyBreakdown = Array.from(dailyMap.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      const report: ShiftReport = {
        facilityId,
        facilityName,
        dateRange: { start: startDate, end: endDate },
        totalHandovers,
        completedHandovers,
        completionRate,
        averageAcknowledgmentTime,
        totalPatients,
        averagePatientsPerHandover,
        totalTasks,
        completedTasks,
        taskCompletionRate,
        totalAlerts,
        criticalAlerts,
        alertBreakdown,
        staffPerformance,
        dailyBreakdown
      };

      logger.info(`Shift report generated for facility ${facilityId}`);
      return report;
    } catch (error) {
      logger.error(`Failed to generate shift report:`, error);
      throw error;
    }
  }

  /**
   * Auto-archive old handovers
   */
  async autoArchiveOldHandovers(
    facilityId: string,
    olderThanDays: number = 90,
    archivedBy: string = 'system'
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const oldHandovers = await ShiftHandover.find({
        facilityId,
        status: HandoverStatus.COMPLETED,
        completedAt: { $lt: cutoffDate }
      }).exec();

      let archivedCount = 0;
      for (const handover of oldHandovers) {
        try {
          await this.archiveHandover(
            handover.handoverId,
            archivedBy,
            `Auto-archived after ${olderThanDays} days`
          );
          archivedCount++;
        } catch (error) {
          logger.error(`Failed to auto-archive handover ${handover.handoverId}:`, error);
        }
      }

      logger.info(`Auto-archived ${archivedCount} handovers for facility ${facilityId}`);
      return archivedCount;
    } catch (error) {
      logger.error(`Failed to auto-archive old handovers:`, error);
      throw error;
    }
  }

  /**
   * Get archive statistics
   */
  async getArchiveStats(facilityId: string): Promise<{
    totalArchived: number;
    oldestArchive: Date | null;
    newestArchive: Date | null;
    totalStorageSize: number; // in bytes (approximate)
  }> {
    try {
      const archives = await ArchivedHandover.find({
        'archiveData.facilityId': facilityId
      }).exec();

      const dates = archives.map((a) => a.archivedAt);
      const totalStorageSize = archives.reduce((sum, a) => {
        return sum + JSON.stringify(a.archiveData).length * 2; // Rough estimate
      }, 0);

      return {
        totalArchived: archives.length,
        oldestArchive: dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null,
        newestArchive: dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null,
        totalStorageSize
      };
    } catch (error) {
      logger.error(`Failed to get archive stats:`, error);
      throw error;
    }
  }

  /**
   * Restore an archived handover
   */
  async restoreArchivedHandover(archiveId: string): Promise<IShiftHandover | null> {
    try {
      const archived = await ArchivedHandover.findOne({ handoverId: archiveId }).exec();
      if (!archived) {
        throw new Error(`Archived handover not found: ${archiveId}`);
      }

      // Create new handover from archive data
      const originalData = archived.archiveData as IShiftHandover;
      const restoredHandover = new ShiftHandover({
        ...originalData,
        _id: undefined,
        handoverId: `RESTORED-${uuidv4().substring(0, 8).toUpperCase()}`,
        status: HandoverStatus.IN_PROGRESS,
        archivedAt: undefined,
        archivedBy: undefined,
        metadata: {
          ...originalData.metadata,
          restoredFrom: archiveId,
          originalHandoverId: archived.originalHandoverId,
          restoredAt: new Date()
        }
      });

      await restoredHandover.save();

      // Remove from archives
      await ArchivedHandover.deleteOne({ handoverId: archiveId }).exec();

      logger.info(`Handover ${archiveId} restored as ${restoredHandover.handoverId}`);
      return restoredHandover;
    } catch (error) {
      logger.error(`Failed to restore archived handover ${archiveId}:`, error);
      throw error;
    }
  }
}

export const archiveService = new ArchiveService();

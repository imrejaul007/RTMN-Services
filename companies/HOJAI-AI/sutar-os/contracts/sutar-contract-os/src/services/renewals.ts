// ============================================================================
// SUTAR Contract OS - Renewal Management Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { RenewalSchedule, NotificationRecord, Contract, ContractStatus } from '../types/index';

// In-memory store for renewal schedules
const renewalStore = new Map<string, RenewalSchedule>();
const renewalIndex = new Map<string, string[]>(); // contractId -> scheduleIds

// Notification templates
const notificationTemplates = {
  renewal_reminder_30: {
    subject: 'Contract Renewal Reminder - 30 Days Notice',
    body: 'Your contract "{contractTitle}" is due for renewal in 30 days. Please review and take necessary action.',
  },
  renewal_reminder_14: {
    subject: 'Contract Renewal Reminder - 14 Days Notice',
    body: 'Your contract "{contractTitle}" is due for renewal in 14 days. Please confirm your renewal intentions.',
  },
  renewal_reminder_7: {
    subject: 'Contract Renewal Reminder - 7 Days Notice',
    body: 'URGENT: Your contract "{contractTitle}" is due for renewal in 7 days. Immediate action required.',
  },
  renewal_reminder_1: {
    subject: 'Contract Renewal Reminder - 1 Day Notice',
    body: 'URGENT: Your contract "{contractTitle}" expires tomorrow! Please take immediate action.',
  },
  renewal_expiring: {
    subject: 'Contract Expiring Today',
    body: 'Your contract "{contractTitle}" expires today. Please ensure all obligations are fulfilled.',
  },
  renewal_auto_renewal: {
    subject: 'Contract Auto-Renewal Notice',
    body: 'Your contract "{contractTitle}" is set to auto-renew in {daysUntilRenewal} days with the following terms: {newValue} {currency}.',
  },
};

// Renewal Service Functions
export const renewalService = {
  // Create renewal schedule for a contract
  createRenewalSchedule: (
    contract: Contract,
    options?: {
      noticeDays?: number;
      newEndDate?: string;
      newValue?: number;
      termsChanged?: boolean;
    }
  ): RenewalSchedule => {
    const noticeDays = options?.noticeDays || contract.renewalNoticeDays || 30;
    const endDate = new Date(contract.endDate);
    const noticeDate = new Date(endDate.getTime() - noticeDays * 24 * 60 * 60 * 1000);
    const renewalDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000); // Day after expiry

    const schedule: RenewalSchedule = {
      id: `renewal-${uuidv4()}`,
      contractId: contract.id,
      renewalDate: renewalDate.toISOString(),
      noticeDate: noticeDate.toISOString(),
      status: 'scheduled',
      newEndDate: options?.newEndDate,
      newValue: options?.newValue,
      termsChanged: options?.termsChanged || false,
      createdAt: new Date().toISOString(),
      sentNotifications: [],
    };

    renewalStore.set(schedule.id, schedule);

    if (!renewalIndex.has(contract.id)) {
      renewalIndex.set(contract.id, []);
    }
    renewalIndex.get(contract.id)!.push(schedule.id);

    console.log(`[RENEWAL] Created schedule: ${schedule.id} for contract ${contract.id}`);
    return schedule;
  },

  // Get renewal schedule
  getRenewalSchedule: (scheduleId: string): RenewalSchedule | undefined => {
    return renewalStore.get(scheduleId);
  },

  // Get renewal schedule for contract
  getRenewalScheduleForContract: (contractId: string): RenewalSchedule | undefined => {
    const scheduleIds = renewalIndex.get(contractId) || [];
    if (scheduleIds.length === 0) return undefined;
    return renewalStore.get(scheduleIds[scheduleIds.length - 1]);
  },

  // Get all renewal schedules
  getAllRenewalSchedules: (options?: {
    status?: RenewalSchedule['status'];
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  }): { schedules: RenewalSchedule[]; total: number } => {
    let result = Array.from(renewalStore.values());

    if (options?.status) {
      result = result.filter(s => s.status === options.status);
    }
    if (options?.fromDate) {
      const from = new Date(options.fromDate);
      result = result.filter(s => new Date(s.renewalDate) >= from);
    }
    if (options?.toDate) {
      const to = new Date(options.toDate);
      result = result.filter(s => new Date(s.renewalDate) <= to);
    }

    result.sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime());

    const total = result.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    result = result.slice(offset, offset + limit);

    return { schedules: result, total };
  },

  // Get expiring contracts
  getExpiringContracts: (contracts: Contract[], days: number = 30): Contract[] => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return contracts
      .filter(c => {
        if (c.status !== 'active') return false;
        const endDate = new Date(c.endDate);
        return endDate > now && endDate <= futureDate;
      })
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  },

  // Get contracts needing renewal notice
  getContractsNeedingNotice: (contracts: Contract[], noticeDays: number = 30): Contract[] => {
    const now = new Date();
    const noticeDate = new Date(now.getTime() + noticeDays * 24 * 60 * 60 * 1000);

    return contracts
      .filter(c => {
        if (c.status !== 'active') return false;
        const endDate = new Date(c.endDate);
        return endDate > now && endDate <= noticeDate;
      })
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  },

  // Send renewal notification
  sendRenewalNotification: (
    scheduleId: string,
    contract: Contract,
    notificationType: keyof typeof notificationTemplates
  ): NotificationRecord | undefined => {
    const schedule = renewalStore.get(scheduleId);
    if (!schedule) return undefined;

    const template = notificationTemplates[notificationType];
    if (!template) return undefined;

    // Get contract parties for notification
    const recipients = contract.parties.map(p => p.email);

    // Create notification record
    const notification: NotificationRecord = {
      id: `notif-${uuidv4()}`,
      type: 'email',
      recipient: recipients.join(', '),
      sentAt: new Date().toISOString(),
      template: notificationType,
      status: 'sent',
    };

    schedule.sentNotifications.push(notification);
    renewalStore.set(scheduleId, schedule);

    console.log(`[RENEWAL] Sent notification: ${notificationType} for contract ${contract.id}`);
    console.log(`[RENEWAL] Recipients: ${recipients.join(', ')}`);

    return notification;
  },

  // Process auto-renewals
  processAutoRenewals: (contracts: Contract[]): {
    renewed: Contract[];
    failed: Array<{ contract: Contract; reason: string }>;
  } => {
    const now = new Date();
    const renewed: Contract[] = [];
    const failed: Array<{ contract: Contract; reason: string }> = [];

    contracts.forEach(contract => {
      if (contract.status !== 'active' || !contract.autoRenew) return;

      const endDate = new Date(contract.endDate);
      if (endDate > now) return;

      // Check if renewal schedule exists
      const schedule = renewalService.getRenewalScheduleForContract(contract.id);
      if (!schedule || schedule.status !== 'scheduled') return;

      // Calculate new dates
      const duration = endDate.getTime() - new Date(contract.startDate).getTime();
      const newStartDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
      const newEndDate = new Date(newStartDate.getTime() + duration);

      // Update contract
      contract.startDate = newStartDate.toISOString();
      contract.endDate = newEndDate.toISOString();
      contract.status = 'active';
      contract.renewalCount = (contract.renewalCount || 0) + 1;
      contract.updatedAt = new Date().toISOString();

      // Update schedule
      schedule.status = 'renewed';
      schedule.newEndDate = newEndDate.toISOString();
      renewalStore.set(schedule.id, schedule);

      renewed.push(contract);
      console.log(`[RENEWAL] Auto-renewed contract: ${contract.id}`);
    });

    return { renewed, failed };
  },

  // Manual renewal
  renewContract: (
    contract: Contract,
    options: {
      newEndDate: string;
      newValue?: number;
      termsChanged?: boolean;
      reason?: string;
    }
  ): { contract: Contract; schedule: RenewalSchedule } | undefined => {
    if (contract.status !== 'active' && contract.status !== 'expired') {
      console.log(`[RENEWAL] Cannot renew contract with status: ${contract.status}`);
      return undefined;
    }

    // Create new renewal schedule
    const schedule = renewalService.createRenewalSchedule(contract, {
      newEndDate: options.newEndDate,
      newValue: options.newValue,
      termsChanged: options.termsChanged,
    });

    // Calculate new duration
    const oldEndDate = new Date(contract.endDate);
    const newEndDate = new Date(options.newEndDate);
    const newStartDate = new Date(oldEndDate.getTime() + 24 * 60 * 60 * 1000);

    // Update contract
    contract.startDate = newStartDate.toISOString();
    contract.endDate = newEndDate.toISOString();
    if (options.newValue) {
      contract.value = options.newValue;
    }
    contract.status = 'active';
    contract.renewalCount = (contract.renewalCount || 0) + 1;
    contract.updatedAt = new Date().toISOString();

    // Update schedule
    schedule.status = 'renewed';
    renewalStore.set(schedule.id, schedule);

    console.log(`[RENEWAL] Manual renewal: ${contract.id} until ${options.newEndDate}`);
    return { contract, schedule };
  },

  // Cancel renewal
  cancelRenewal: (scheduleId: string, reason?: string): boolean => {
    const schedule = renewalStore.get(scheduleId);
    if (!schedule) return false;

    schedule.status = 'cancelled';
    renewalStore.set(scheduleId, schedule);

    console.log(`[RENEWAL] Cancelled: ${scheduleId} - ${reason || 'No reason provided'}`);
    return true;
  },

  // Update renewal schedule
  updateRenewalSchedule: (
    scheduleId: string,
    updates: Partial<RenewalSchedule>
  ): RenewalSchedule | undefined => {
    const schedule = renewalStore.get(scheduleId);
    if (!schedule) return undefined;

    const updatedSchedule: RenewalSchedule = {
      ...schedule,
      ...updates,
      id: schedule.id,
    };
    renewalStore.set(scheduleId, updatedSchedule);

    console.log(`[RENEWAL] Updated schedule: ${scheduleId}`);
    return updatedSchedule;
  },

  // Get renewal statistics
  getRenewalStats: (): {
    totalSchedules: number;
    scheduled: number;
    renewed: number;
    expired: number;
    cancelled: number;
    upcomingThisMonth: number;
    upcomingThisWeek: number;
    averageRenewalRate: number;
  } => {
    const schedules = Array.from(renewalStore.values());
    const now = new Date();
    const thisWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const upcomingThisWeek = schedules.filter(s => {
      if (s.status !== 'scheduled') return false;
      const renewalDate = new Date(s.renewalDate);
      return renewalDate > now && renewalDate <= thisWeek;
    }).length;

    const upcomingThisMonth = schedules.filter(s => {
      if (s.status !== 'scheduled') return false;
      const renewalDate = new Date(s.renewalDate);
      return renewalDate > now && renewalDate <= thisMonth;
    }).length;

    const renewedSchedules = schedules.filter(s => s.status === 'renewed').length;
    const completedSchedules = schedules.filter(s =>
      s.status === 'renewed' || s.status === 'expired' || s.status === 'cancelled'
    ).length;

    return {
      totalSchedules: schedules.length,
      scheduled: schedules.filter(s => s.status === 'scheduled').length,
      renewed: renewedSchedules,
      expired: schedules.filter(s => s.status === 'expired').length,
      cancelled: schedules.filter(s => s.status === 'cancelled').length,
      upcomingThisMonth,
      upcomingThisWeek,
      averageRenewalRate: completedSchedules > 0
        ? Math.round((renewedSchedules / completedSchedules) * 10000) / 100
        : 0,
    };
  },

  // Get renewal calendar
  getRenewalCalendar: (startDate: string, endDate: string): Array<{
    date: string;
    renewals: RenewalSchedule[];
    contracts: Contract[];
  }> => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const calendar: Array<{
      date: string;
      renewals: RenewalSchedule[];
      contracts: Contract[];
    }> = [];

    // Generate calendar entries for each day
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayRenewals = Array.from(renewalStore.values())
        .filter(s => s.renewalDate.split('T')[0] === dateStr);

      calendar.push({
        date: dateStr,
        renewals: dayRenewals,
        contracts: [], // Would need contract data to populate this
      });

      current.setDate(current.getDate() + 1);
    }

    return calendar;
  },

  // Bulk create renewal schedules
  bulkCreateSchedules: (contracts: Contract[]): RenewalSchedule[] => {
    return contracts
      .filter(c => c.status === 'active')
      .map(contract => renewalService.createRenewalSchedule(contract));
  },

  // Process daily renewal tasks
  processDailyRenewalTasks: (contracts: Contract[]): {
    remindersSent: number;
    expiringToday: Contract[];
    expired: Contract[];
  } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    let remindersSent = 0;
    const expiringToday: Contract[] = [];
    const expired: Contract[] = [];

    contracts.forEach(contract => {
      if (contract.status !== 'active') return;

      const endDate = new Date(contract.endDate);
      const schedule = renewalService.getRenewalScheduleForContract(contract.id);

      // Check if expiring today
      if (endDate >= today && endDate < tomorrow) {
        expiringToday.push(contract);
        if (schedule) {
          renewalService.sendRenewalNotification(schedule.id, contract, 'renewal_expiring');
          remindersSent++;
        }
      }

      // Check if expired
      if (endDate < today) {
        expired.push(contract);
        if (schedule) {
          schedule.status = 'expired';
          renewalStore.set(schedule.id, schedule);
        }
      }

      // Send reminders based on days remaining
      const daysRemaining = Math.floor((endDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

      if (schedule && schedule.status === 'scheduled') {
        if (daysRemaining === 30) {
          renewalService.sendRenewalNotification(schedule.id, contract, 'renewal_reminder_30');
          remindersSent++;
        } else if (daysRemaining === 14) {
          renewalService.sendRenewalNotification(schedule.id, contract, 'renewal_reminder_14');
          remindersSent++;
        } else if (daysRemaining === 7) {
          renewalService.sendRenewalNotification(schedule.id, contract, 'renewal_reminder_7');
          remindersSent++;
        } else if (daysRemaining === 1) {
          renewalService.sendRenewalNotification(schedule.id, contract, 'renewal_reminder_1');
          remindersSent++;
        }
      }
    });

    console.log(`[RENEWAL] Daily tasks: ${remindersSent} reminders sent, ${expiringToday.length} expiring today, ${expired.length} expired`);

    return { remindersSent, expiringToday, expired };
  },
};

export default renewalService;

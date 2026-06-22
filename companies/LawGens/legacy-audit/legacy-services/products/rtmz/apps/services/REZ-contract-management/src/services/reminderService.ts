import { Contract, IContract } from '../models/Contract';
import { Signature } from '../models/Signature';
import { logger } from '../utils/logger';
import { emailService } from './emailService';

export interface RenewalReminder {
  contractId: string;
  title: string;
  endDate: Date;
  daysRemaining: number;
  autoRenew: boolean;
  parties: { name: string; email: string }[];
}

export interface SignatureReminder {
  signatureId: string;
  contractId: string;
  partyName: string;
  partyEmail: string;
  sentAt: Date;
  reminderCount: number;
}

export class ReminderService {
  private renewalCheckInterval: NodeJS.Timeout | null = null;
  private signatureCheckInterval: NodeJS.Timeout | null = null;

  async getUpcomingRenewals(tenantId: string, daysAhead: number = 30): Promise<RenewalReminder[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const contracts = await Contract.find({
      tenantId,
      status: 'signed',
      autoRenew: true,
      endDate: {
        $gte: today,
        $lte: futureDate
      }
    }).lean();

    return contracts.map(contract => {
      const daysRemaining = Math.ceil(
        (new Date(contract.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        contractId: contract.contractId,
        title: contract.title,
        endDate: new Date(contract.endDate),
        daysRemaining,
        autoRenew: contract.autoRenew,
        parties: contract.parties.map(p => ({ name: p.name, email: p.email }))
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  async getExpiredContracts(tenantId: string): Promise<IContract[]> {
    const today = new Date();

    const contracts = await Contract.find({
      tenantId,
      status: 'signed',
      endDate: { $lt: today }
    }).lean();

    return contracts as unknown as IContract[];
  }

  async processRenewalReminders(tenantId: string): Promise<{
    sent: number;
    failed: number;
    details: { contractId: string; success: boolean; error?: string }[];
  }> {
    const reminderDays = parseInt(process.env.CONTRACT_REMINDER_DAYS_BEFORE || '30', 10);
    const reminders = await this.getUpcomingRenewals(tenantId, reminderDays);

    const results = {
      sent: 0,
      failed: 0,
      details: [] as { contractId: string; success: boolean; error?: string }[]
    };

    for (const reminder of reminders) {
      if (reminder.daysRemaining <= 0) continue;

      const shouldRemind =
        reminder.daysRemaining === reminderDays ||
        reminder.daysRemaining === 7 ||
        reminder.daysRemaining === 1 ||
        (reminder.daysRemaining <= 3 && reminder.daysRemaining > 0);

      if (!shouldRemind) continue;

      try {
        await emailService.sendRenewalReminder({
          contractId: reminder.contractId,
          title: reminder.title,
          endDate: reminder.endDate,
          renewalUrl: `${process.env.FRONTEND_URL}/contracts/${reminder.contractId}/renew`,
          recipients: reminder.parties
        });

        await Contract.updateOne(
          { contractId: reminder.contractId },
          {
            $push: {
              auditTrail: {
                action: 'renewal_reminder_sent',
                performedBy: 'system',
                performedAt: new Date(),
                details: `Renewal reminder sent (${reminder.daysRemaining} days remaining)`
              }
            }
          }
        );

        results.sent++;
        results.details.push({ contractId: reminder.contractId, success: true });

        logger.info(`Renewal reminder sent for contract ${reminder.contractId}`, {
          contractId: reminder.contractId,
          daysRemaining: reminder.daysRemaining
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          contractId: reminder.contractId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        logger.error(`Failed to send renewal reminder for contract ${reminder.contractId}`, {
          contractId: reminder.contractId,
          error
        });
      }
    }

    return results;
  }

  async getPendingSignatureReminders(tenantId: string): Promise<SignatureReminder[]> {
    const pendingSignatures = await Signature.find({
      tenantId,
      status: 'pending'
    }).lean();

    const now = new Date();
    const reminderThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return pendingSignatures
      .filter(sig => {
        if (sig.reminderCount === 0) {
          return true;
        }
        const lastReminder = sig.lastReminderAt ? new Date(sig.lastReminderAt) : new Date(sig.sentAt);
        return lastReminder < reminderThreshold;
      })
      .map(sig => ({
        signatureId: sig.signatureId,
        contractId: sig.contractId,
        partyName: sig.partyName,
        partyEmail: sig.partyEmail,
        sentAt: new Date(sig.sentAt),
        reminderCount: sig.reminderCount
      }));
  }

  async markExpiredContracts(): Promise<number> {
    const today = new Date();

    const result = await Contract.updateMany(
      {
        status: 'signed',
        endDate: { $lt: today }
      },
      {
        $set: { status: 'expired' },
        $push: {
          auditTrail: {
            action: 'auto_expired',
            performedBy: 'system',
            performedAt: new Date(),
            details: 'Contract automatically expired on end date'
          }
        }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Marked ${result.modifiedCount} contracts as expired`);
    }

    return result.modifiedCount;
  }

  startScheduledTasks(tenantId: string): void {
    const renewalInterval = 24 * 60 * 60 * 1000;
    this.renewalCheckInterval = setInterval(async () => {
      try {
        await this.processRenewalReminders(tenantId);
        await this.markExpiredContracts();
      } catch (error) {
        logger.error('Error in scheduled renewal reminder task', { error });
      }
    }, renewalInterval);

    logger.info('Scheduled renewal reminder task started');
  }

  stopScheduledTasks(): void {
    if (this.renewalCheckInterval) {
      clearInterval(this.renewalCheckInterval);
      this.renewalCheckInterval = null;
    }
    if (this.signatureCheckInterval) {
      clearInterval(this.signatureCheckInterval);
      this.signatureCheckInterval = null;
    }
    logger.info('Scheduled tasks stopped');
  }

  async getContractTimeline(contractId: string, tenantId: string): Promise<{
    startDate: Date;
    endDate: Date;
    renewalTermMonths: number;
    autoRenew: boolean;
    isExpired: boolean;
    isExpiringSoon: boolean;
    daysRemaining?: number;
    milestones: { date: Date; event: string }[];
  } | null> {
    const contract = await Contract.findOne({ contractId, tenantId });
    if (!contract) return null;

    const now = new Date();
    const endDate = new Date(contract.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const milestones: { date: Date; event: string }[] = [];

    milestones.push({
      date: new Date(contract.startDate),
      event: 'Contract Start'
    });

    if (contract.metadata.createdAt) {
      milestones.push({
        date: new Date(contract.metadata.createdAt),
        event: 'Contract Created'
      });
    }

    if (contract.metadata.signedAt) {
      milestones.push({
        date: new Date(contract.metadata.signedAt),
        event: 'All Parties Signed'
      });
    }

    milestones.push({
      date: endDate,
      event: contract.autoRenew ? 'Renewal Date' : 'Contract End'
    });

    if (contract.autoRenew) {
      const nextRenewal = new Date(endDate);
      nextRenewal.setMonth(nextRenewal.getMonth() + contract.renewalTermMonths);
      milestones.push({
        date: nextRenewal,
        event: `Next Renewal (${contract.renewalTermMonths} months)`
      });
    }

    return {
      startDate: new Date(contract.startDate),
      endDate,
      renewalTermMonths: contract.renewalTermMonths,
      autoRenew: contract.autoRenew,
      isExpired: contract.status === 'expired',
      isExpiringSoon: daysRemaining <= 30 && daysRemaining > 0,
      daysRemaining: contract.status === 'expired' ? undefined : daysRemaining,
      milestones: milestones.sort((a, b) => a.date.getTime() - b.date.getTime())
    };
  }
}

export const reminderService = new ReminderService();

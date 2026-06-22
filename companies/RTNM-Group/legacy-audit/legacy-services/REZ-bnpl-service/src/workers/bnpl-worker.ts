import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { BNPLApplication } from '../models/BNPL';
import logger from '../utils/logger';

const redisUrl = process.env.REDIS_URL;
const isProduction = process.env.NODE_ENV === 'production';

if (!redisUrl && isProduction) {
  logger.error('REDIS_URL environment variable is required in production');
  process.exit(1);
}

const connection = new Redis(redisUrl || 'redis://localhost:6379');

// EMI Reminder Queue
export const emiReminderQueue = new Queue('bnpl-emi-reminders', { connection });

// EMI Processing Queue
export const emiProcessingQueue = new Queue('bnpl-emi-processing', { connection });

// Overdue Processing Queue
export const overdueQueue = new Queue('bnpl-overdue', { connection });

// Credit Score Update Queue
export const creditScoreQueue = new Queue('bnpl-credit-score', { connection });

// Schedule EMI reminders (3 days before due)
async function scheduleEMIReminders() {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  threeDaysFromNow.setHours(10, 0, 0, 0); // 10 AM

  const pendingEMIs = await BNPLApplication.find({
    status: 'active',
    'emiSchedule.dueDate': { $lte: threeDaysFromNow }
  });

  for (const application of pendingEMIs) {
    const upcomingEMI = application.emiSchedule.find(e =>
      e.status === 'pending' &&
      e.dueDate <= threeDaysFromNow
    );

    if (upcomingEMI) {
      await emiReminderQueue.add('reminder', {
        applicationId: application._id,
        userId: application.userId,
        emiNumber: upcomingEMI.emiNumber,
        amount: upcomingEMI.amount,
        dueDate: upcomingEMI.dueDate
      }, {
        delay: new Date(upcomingEMI.dueDate.getTime() - 3 * 24 * 60 * 60 * 1000).getTime() - Date.now()
      });
    }
  }
}

// Process overdue accounts (daily job)
async function processOverdueAccounts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueApplications = await BNPLApplication.find({
    status: 'active',
    nextEmiDate: { $lt: today }
  });

  for (const application of overdueApplications) {
    const daysOverdue = Math.floor(
      (today.getTime() - application.nextEmiDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Update overdue status
    application.overdueDays = daysOverdue;
    application.overdueAmount = application.emiAmount;

    // Late fee (₹50 per day, max ₹500)
    const lateFee = Math.min(daysOverdue * 50, 500);
    application.overdueAmount += lateFee;

    // Mark as overdue after 7 days
    if (daysOverdue >= 7 && application.status !== 'overdue') {
      application.status = 'overdue';

      await overdueQueue.add('overdue-alert', {
        applicationId: application._id,
        userId: application.userId,
        daysOverdue,
        overdueAmount: application.overdueAmount
      });
    }

    // Default after 30 days
    if (daysOverdue >= 30 && application.status !== 'defaulted') {
      application.status = 'defaulted';

      // Trigger collections process
      await overdueQueue.add('default-handling', {
        applicationId: application._id,
        userId: application.userId,
        totalOutstanding: application.overdueAmount + (application.emiAmount * (application.tenure - application.payments.length))
      });
    }

    await application.save();
  }
}

// Update credit scores (monthly)
async function updateCreditScores() {
  const activeUsers = await BNPLApplication.distinct('userId', {
    status: { $in: ['active', 'paid'] }
  });

  for (const userId of activeUsers) {
    await creditScoreQueue.add('update-score', { userId });
  }
}

// Initialize worker
const emiWorker = new Worker('bnpl-emi-processing', async (job) => {
  const { applicationId, emiNumber } = job.data;

  // Auto-debit logic (for registered auto-pay users)
  const application = await BNPLApplication.findById(applicationId);

  if (!application || application.status !== 'active') return;

  // Process auto-debit here
  // In production, integrate with payment service

  logger.info(`Processing EMI ${emiNumber} for application ${applicationId}`, {
    jobId: job.id,
    applicationId,
    emiNumber
  });

}, { connection });

export { scheduleEMIReminders, processOverdueAccounts, updateCreditScores };

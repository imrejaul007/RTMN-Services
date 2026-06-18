import { store, FollowUp, FollowUpStatus } from '../models/Automation';

export interface FollowUpResult {
  success: boolean;
  followUpId: string;
  attempts: number;
  message: string;
  error?: string;
}

export class FollowUpEngine {
  private intervalId: NodeJS.Timeout | null = null;
  private processing: boolean = false;

  start(intervalMs: number = 60000): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.processPendingFollowUps().catch(console.error);
    }, intervalMs);

    console.log('Follow-up engine started');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Follow-up engine stopped');
    }
  }

  async processPendingFollowUps(): Promise<FollowUpResult[]> {
    if (this.processing) {
      return [];
    }

    this.processing = true;
    const results: FollowUpResult[] = [];

    try {
      const pendingFollowUps = store.getAllFollowUps().filter(
        f => f.status === 'pending' && new Date(f.scheduledAt) <= new Date()
      );

      for (const followUp of pendingFollowUps) {
        const result = await this.executeFollowUp(followUp);
        results.push(result);
      }
    } finally {
      this.processing = false;
    }

    return results;
  }

  async executeFollowUp(followUp: FollowUp): Promise<FollowUpResult> {
    const maxAttempts = followUp.maxAttempts || 5;
    const attempts = followUp.attempts + 1;

    try {
      // Simulate sending the follow-up (in real implementation, call email/SMS service)
      const sent = await this.sendFollowUp(followUp);

      if (sent) {
        store.updateFollowUp(followUp.id, {
          status: 'sent',
          executedAt: new Date(),
          attempts
        });

        // If this is the last attempt, mark as completed
        if (attempts >= maxAttempts) {
          store.updateFollowUp(followUp.id, { status: 'completed' });
        }

        return {
          success: true,
          followUpId: followUp.id,
          attempts,
          message: `Follow-up ${followUp.type} sent successfully`
        };
      } else {
        throw new Error('Failed to send follow-up');
      }
    } catch (error) {
      const errorMessage = (error as Error).message;

      if (attempts >= maxAttempts) {
        store.updateFollowUp(followUp.id, {
          status: 'failed',
          attempts,
          metadata: { ...followUp.metadata, lastError: errorMessage }
        });

        return {
          success: false,
          followUpId: followUp.id,
          attempts,
          message: 'Max attempts reached',
          error: errorMessage
        };
      }

      // Schedule retry
      const retryDelay = this.calculateRetryDelay(attempts);
      store.updateFollowUp(followUp.id, {
        attempts,
        scheduledAt: new Date(Date.now() + retryDelay * 60 * 1000),
        metadata: { ...followUp.metadata, lastError: errorMessage }
      });

      return {
        success: false,
        followUpId: followUp.id,
        attempts,
        message: `Scheduled retry in ${retryDelay} minutes`,
        error: errorMessage
      };
    }
  }

  private async sendFollowUp(followUp: FollowUp): Promise<boolean> {
    // Simulate sending - in real implementation, integrate with email/SMS services
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate 90% success rate
        resolve(Math.random() > 0.1);
      }, 100);
    });
  }

  private calculateRetryDelay(attempts: number): number {
    // Exponential backoff: 5, 15, 30, 60, 120 minutes
    const delays = [5, 15, 30, 60, 120];
    return delays[Math.min(attempts - 1, delays.length - 1)];
  }

  async createFollowUpSequence(
    leadId: string,
    steps: Array<{
      type: 'email' | 'sms' | 'push' | 'call';
      delayMinutes: number;
      template: string;
      subject?: string;
    }>
  ): Promise<FollowUp[]> {
    const followUps: FollowUp[] = [];
    let currentTime = Date.now();

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      currentTime += step.delayMinutes * 60 * 1000;

      const followUp = store.createFollowUp({
        leadId,
        type: step.type,
        template: step.template,
        subject: step.subject,
        scheduledAt: new Date(currentTime),
        sequence: i + 1,
        maxAttempts: 3,
        priority: 'medium'
      });

      followUps.push(followUp);
    }

    return followUps;
  }

  async skipFollowUp(followUpId: string): Promise<FollowUp | undefined> {
    return store.updateFollowUp(followUpId, { status: 'skipped' });
  }

  async rescheduleFollowUp(
    followUpId: string,
    newScheduledAt: Date
  ): Promise<FollowUp | undefined> {
    return store.updateFollowUp(followUpId, {
      scheduledAt: newScheduledAt,
      status: 'pending'
    });
  }

  getFollowUpStats() {
    const followUps = store.getAllFollowUps();
    return {
      total: followUps.length,
      pending: followUps.filter(f => f.status === 'pending').length,
      sent: followUps.filter(f => f.status === 'sent').length,
      failed: followUps.filter(f => f.status === 'failed').length,
      completed: followUps.filter(f => f.status === 'completed').length,
      skipped: followUps.filter(f => f.status === 'skipped').length,
      byType: {
        email: followUps.filter(f => f.type === 'email').length,
        sms: followUps.filter(f => f.type === 'sms').length,
        push: followUps.filter(f => f.type === 'push').length,
        call: followUps.filter(f => f.type === 'call').length
      }
    };
  }
}

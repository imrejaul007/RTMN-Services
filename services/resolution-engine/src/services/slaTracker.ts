import { resolutionStore, Resolution } from '../models/Resolution';
import winston from 'winston';

export interface SLAStatus {
  healthy: number;
  atRisk: number;
  breached: number;
  total: number;
}

export interface SLAAlert {
  resolutionId: string;
  ticketId: string;
  priority: string;
  type: 'response_warning' | 'response_breach' | 'resolution_warning' | 'resolution_breach';
  message: string;
  deadline: Date;
  hoursRemaining?: number;
  hoursBreached?: number;
}

export class SLATracker {
  private logger: winston.Logger;
  private alerts: Map<string, SLAAlert>;
  private alertThresholds: {
    warningPercent: number; // Alert when X% of time remaining
    checkInterval: number; // ms
  };

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.alerts = new Map();
    this.alertThresholds = {
      warningPercent: 0.25, // 25% time remaining
      checkInterval: 60000 // 1 minute
    };

    // Start monitoring
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Initial check
    setTimeout(() => this.checkAndEscalate(), 5000);

    // Periodic checks
    setInterval(() => {
      this.checkAndEscalate();
      this.cleanupOldAlerts();
    }, this.alertThresholds.checkInterval);

    this.logger.info('SLA Tracker monitoring started');
  }

  checkAndEscalate(): void {
    const now = new Date();
    const resolutions = Array.from(resolutionStore.values());

    resolutions.forEach(resolution => {
      if (['resolved', 'closed', 'auto_resolved'].includes(resolution.status)) {
        return;
      }

      // Check response SLA
      this.checkResponseSLA(resolution, now);

      // Check resolution SLA
      this.checkResolutionSLA(resolution, now);
    });
  }

  private checkResponseSLA(resolution: Resolution, now: Date): void {
    const responseDeadline = resolution.slaResponseDeadline;
    const totalTime = responseDeadline.getTime() - resolution.createdAt.getTime();
    const elapsed = now.getTime() - resolution.createdAt.getTime();
    const remaining = responseDeadline.getTime() - now.getTime();
    const percentRemaining = remaining / totalTime;

    const alertKey = `${resolution.id}-response`;

    // Response breach
    if (remaining <= 0 && !this.alerts.has(alertKey)) {
      const alert: SLAAlert = {
        resolutionId: resolution.id,
        ticketId: resolution.ticketId,
        priority: resolution.priority,
        type: 'response_breach',
        message: `Response SLA breached for ticket ${resolution.ticketId}`,
        deadline: responseDeadline,
        hoursBreached: Math.abs(remaining / (1000 * 60 * 60))
      };

      this.alerts.set(alertKey, alert);
      this.sendAlert(resolution, alert);
      this.logger.warn(`Response SLA breached: ${resolution.ticketId}`);
    }
    // Response warning (25% time remaining)
    else if (percentRemaining <= this.alertThresholds.warningPercent && percentRemaining > 0 && !this.alerts.has(alertKey)) {
      const alert: SLAAlert = {
        resolutionId: resolution.id,
        ticketId: resolution.ticketId,
        priority: resolution.priority,
        type: 'response_warning',
        message: `Response SLA at risk for ticket ${resolution.ticketId}`,
        deadline: responseDeadline,
        hoursRemaining: remaining / (1000 * 60 * 60)
      };

      this.alerts.set(alertKey, alert);
      this.sendAlert(resolution, alert);
      this.logger.warn(`Response SLA at risk: ${resolution.ticketId}`);
    }
  }

  private checkResolutionSLA(resolution: Resolution, now: Date): void {
    const resolutionDeadline = resolution.slaResolutionDeadline;
    const totalTime = resolutionDeadline.getTime() - resolution.createdAt.getTime();
    const remaining = resolutionDeadline.getTime() - now.getTime();
    const percentRemaining = remaining / totalTime;

    const alertKey = `${resolution.id}-resolution`;

    // Resolution breach
    if (remaining <= 0) {
      if (!resolution.slaBreached) {
        resolution.slaBreached = true;
        resolution.slaBreachTime = now;
        resolutionStore.set(resolution.id, resolution);
      }

      if (!this.alerts.has(alertKey)) {
        const alert: SLAAlert = {
          resolutionId: resolution.id,
          ticketId: resolution.ticketId,
          priority: resolution.priority,
          type: 'resolution_breach',
          message: `Resolution SLA breached for ticket ${resolution.ticketId}`,
          deadline: resolutionDeadline,
          hoursBreached: Math.abs(remaining / (1000 * 60 * 60))
        };

        this.alerts.set(alertKey, alert);
        this.sendAlert(resolution, alert);
        this.logger.error(`Resolution SLA breached: ${resolution.ticketId}`);
      }
    }
    // Resolution warning
    else if (percentRemaining <= this.alertThresholds.warningPercent && !this.alerts.has(alertKey)) {
      const alert: SLAAlert = {
        resolutionId: resolution.id,
        ticketId: resolution.ticketId,
        priority: resolution.priority,
        type: 'resolution_warning',
        message: `Resolution SLA at risk for ticket ${resolution.ticketId}`,
        deadline: resolutionDeadline,
        hoursRemaining: remaining / (1000 * 60 * 60)
      };

      this.alerts.set(alertKey, alert);
      this.sendAlert(resolution, alert);
      this.logger.warn(`Resolution SLA at risk: ${resolution.ticketId}`);
    }
  }

  private sendAlert(resolution: Resolution, alert: SLAAlert): void {
    // In production, this would send to notification service
    this.logger.info(`SLA Alert sent for ${resolution.ticketId}: ${alert.type}`);

    // Emit event for external listeners
    if (process.env.EVENT_BUS_URL) {
      this.publishAlert(alert);
    }
  }

  private async publishAlert(alert: SLAAlert): Promise<void> {
    try {
      const axios = require('axios');
      await axios.post(`${process.env.EVENT_BUS_URL}/publish`, {
        topic: 'resolution.sla.alert',
        payload: alert,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      this.logger.warn(`Failed to publish SLA alert: ${error.message}`);
    }
  }

  private cleanupOldAlerts(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, alert] of this.alerts.entries()) {
      if (now - alert.deadline.getTime() > maxAge) {
        this.alerts.delete(key);
      }
    }
  }

  getSLAStatus(): SLAStatus {
    const now = new Date();
    const resolutions = Array.from(resolutionStore.values()).filter(
      r => !['resolved', 'closed', 'auto_resolved'].includes(r.status)
    );

    let healthy = 0;
    let atRisk = 0;
    let breached = 0;

    resolutions.forEach(r => {
      if (r.slaBreached) {
        breached++;
      } else {
        const remaining = r.slaResolutionDeadline.getTime() - now.getTime();
        const totalTime = r.slaResolutionDeadline.getTime() - r.createdAt.getTime();
        const percentRemaining = remaining / totalTime;

        if (percentRemaining <= this.alertThresholds.warningPercent) {
          atRisk++;
        } else {
          healthy++;
        }
      }
    });

    return { healthy, atRisk, breached, total: resolutions.length };
  }

  getActiveAlerts(): SLAAlert[] {
    return Array.from(this.alerts.values());
  }

  getAlertsByResolution(resolutionId: string): SLAAlert[] {
    return Array.from(this.alerts.values()).filter(a => a.resolutionId === resolutionId);
  }

  dismissAlert(resolutionId: string, type: string): boolean {
    const key = `${resolutionId}-${type}`;
    return this.alerts.delete(key);
  }

  getSLAReport(resolution: Resolution): {
    priority: string;
    status: string;
    responseDeadline: Date;
    resolutionDeadline: Date;
    responseHoursRemaining: number;
    resolutionHoursRemaining: number;
    responseBreached: boolean;
    resolutionBreached: boolean;
    slaBreached: boolean;
  } {
    const now = new Date();

    return {
      priority: resolution.priority,
      status: resolution.status,
      responseDeadline: resolution.slaResponseDeadline,
      resolutionDeadline: resolution.slaResolutionDeadline,
      responseHoursRemaining: Math.max(0, (resolution.slaResponseDeadline.getTime() - now.getTime()) / (1000 * 60 * 60)),
      resolutionHoursRemaining: Math.max(0, (resolution.slaResolutionDeadline.getTime() - now.getTime()) / (1000 * 60 * 60)),
      responseBreached: now > resolution.slaResponseDeadline && !['resolved', 'closed', 'auto_resolved'].includes(resolution.status),
      resolutionBreached: resolution.slaBreached,
      slaBreached: resolution.slaBreached
    };
  }
}

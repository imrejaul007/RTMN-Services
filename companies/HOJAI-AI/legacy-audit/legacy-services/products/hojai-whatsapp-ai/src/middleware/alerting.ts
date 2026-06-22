// Alerting service
import axios from 'axios';

export enum AlertLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface Alert {
  level: AlertLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
  resolved?: boolean;
}

const alerts: Alert[] = [];
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

export async function alert(
  level: AlertLevel,
  message: string,
  context?: Record<string, unknown>
): Promise<void> {
  const newAlert: Alert = {
    level,
    message,
    context,
    timestamp: new Date()
  };

  alerts.unshift(newAlert);
  if (alerts.length > 1000) alerts.pop();

  console.error(`[ALERT:${level}] ${message}`, context);

  // Send to Slack
  if (SLACK_WEBHOOK && (level === AlertLevel.ERROR || level === AlertLevel.CRITICAL)) {
    try {
      await axios.post(SLACK_WEBHOOK, {
        text: `*[${level.toUpperCase()}]* ${message}`,
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: `*${message}*` } },
          { type: 'section', text: { type: 'mrkdwn', text: '```' + JSON.stringify(context) + '```' } }
        ]
      });
    } catch {
      // Silently fail Slack webhook
    }
  }
}

export function getAlerts(limit = 100): Alert[] {
  return alerts.slice(0, limit);
}

export function clearAlerts(): void {
  alerts.length = 0;
}

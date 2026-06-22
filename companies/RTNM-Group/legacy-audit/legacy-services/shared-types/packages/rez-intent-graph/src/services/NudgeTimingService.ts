/**
 * Nudge Timing Service
 * Learns optimal send times per user from nudge history and calculates smart send windows
 */

import { Nudge } from '../models/Nudge.js';

export interface OptimalSendTime {
  hour: number; // 0-23, user's local hour
  dayOfWeek: number[]; // 0=Sunday, 6=Saturday
  channel: 'push' | 'email' | 'sms';
  avgOpenRate: number;
  sampleSize: number;
}

export interface UserTimingProfile {
  userId: string;
  pushOptimalHour: number;
  emailOptimalHour: number;
  smsOptimalHour: number;
  activeDays: number[];
  timezoneOffset: number; // minutes from UTC
  quietHoursStart: number; // 22 = 10 PM
  quietHoursEnd: number; // 8 = 8 AM
  lastUpdated: Date;
}

export class NudgeTimingService {
  /**
   * Learn optimal send times per user from nudge history.
   * Called periodically by feedback loop agent.
   */
  async learnUserTimingProfile(userId: string): Promise<UserTimingProfile> {
    const nudgeHistory = await Nudge.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    if (nudgeHistory.length < 3) {
      // Not enough data — use category defaults
      return this.getDefaultTimingProfile(userId);
    }

    // Group by channel
    const channelStats: Record<string, { byHour: number[], openedCount: number, totalCount: number }> = {
      push: { byHour: Array(24).fill(0), openedCount: 0, totalCount: 0 },
      email: { byHour: Array(24).fill(0), openedCount: 0, totalCount: 0 },
      sms: { byHour: Array(24).fill(0), openedCount: 0, totalCount: 0 },
    };

    for (const nudge of nudgeHistory) {
      const channel = nudge.channel as string;
      if (!channelStats[channel]) continue;

      const hour = new Date(nudge.createdAt).getHours();
      channelStats[channel].byHour[hour]++;
      channelStats[channel].totalCount++;
      if (nudge.status === 'clicked' || nudge.status === 'converted') {
        channelStats[channel].openedCount++;
      }
    }

    // Find optimal hour per channel (hour with highest click rate)
    const getOptimalHour = (stats: typeof channelStats.push) => {
      let bestHour = 12;
      let bestRate = 0;
      for (let h = 6; h < 22; h++) {
        const count = stats.byHour[h];
        if (count > 0) {
          const rate = (stats.openedCount / stats.totalCount) * (count / stats.totalCount > 0.1 ? 1 : 0.5);
          if (rate > bestRate) {
            bestRate = rate;
            bestHour = h;
          }
        }
      }
      return bestHour;
    };

    // Determine active days
    const dayCounts = Array(7).fill(0);
    for (const nudge of nudgeHistory) {
      const day = new Date(nudge.createdAt).getDay();
      dayCounts[day]++;
    }
    const activeDays = dayCounts
      .map((c, i) => c > 2 ? i : -1)
      .filter(d => d >= 0);

    return {
      userId,
      pushOptimalHour: getOptimalHour(channelStats.push),
      emailOptimalHour: getOptimalHour(channelStats.email),
      smsOptimalHour: getOptimalHour(channelStats.sms),
      activeDays: activeDays.length > 0 ? activeDays : [1, 2, 3, 4, 5], // weekdays default
      timezoneOffset: 330, // IST default, could be learned from user activity patterns
      quietHoursStart: 22,
      quietHoursEnd: 8,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get the next optimal send window for a user.
   * Returns the Date of the next good send time.
   */
  getNextOptimalSendTime(profile: UserTimingProfile, channel: 'push' | 'email' | 'sms'): Date {
    const optimalHour = channel === 'push' ? profile.pushOptimalHour
      : channel === 'email' ? profile.emailOptimalHour
      : profile.smsOptimalHour;

    const now = new Date();
    const sendTime = new Date(now);

    // Apply timezone offset
    sendTime.setHours(optimalHour - (profile.timezoneOffset / 60), 0, 0, 0);

    // If the optimal time has passed today, move to tomorrow
    if (sendTime <= now) {
      sendTime.setDate(sendTime.getDate() + 1);
    }

    // Check if the day is active
    let attempts = 0;
    while (!profile.activeDays.includes(sendTime.getDay()) && attempts < 7) {
      sendTime.setDate(sendTime.getDate() + 1);
      attempts++;
    }

    // Respect quiet hours — if it's quiet time, push to after quiet hours
    const hour = sendTime.getHours();
    if (hour >= profile.quietHoursStart || hour < profile.quietHoursEnd) {
      sendTime.setHours(profile.quietHoursEnd, 0, 0, 0);
      if (sendTime <= now) {
        sendTime.setDate(sendTime.getDate() + 1);
      }
    }

    return sendTime;
  }

  /**
   * Check if current time is within quiet hours
   */
  isQuietHours(profile: UserTimingProfile): boolean {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + profile.timezoneOffset / 60 + 24) % 24;
    return localHour >= profile.quietHoursStart || localHour < profile.quietHoursEnd;
  }

  /**
   * Default timing profile for users without history
   */
  getDefaultTimingProfile(userId: string): UserTimingProfile {
    return {
      userId,
      pushOptimalHour: 12, // midday
      emailOptimalHour: 9, // morning
      smsOptimalHour: 18, // evening
      activeDays: [1, 2, 3, 4, 5, 6], // weekdays + Saturday
      timezoneOffset: 330, // IST
      quietHoursStart: 22,
      quietHoursEnd: 8,
      lastUpdated: new Date(),
    };
  }
}

export const nudgeTimingService = new NudgeTimingService();

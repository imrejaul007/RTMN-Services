/**
 * Human Growth Engine
 */

export interface GrowthMetrics {
  skills: SkillProgress[];
  habits: HabitProgress[];
  goals: GoalProgress[];
}

export interface SkillProgress {
  skill: string;
  level: number;
  trend: "improving" | "stable" | "declining";
  practiceHours: number;
}

export interface HabitProgress {
  habit: string;
  streak: number;
  consistency: number;
}

export interface GoalProgress {
  goal: string;
  milestone: string;
  completed: boolean;
}

export class HumanGrowthEngine {
  private metrics: Map<string, GrowthMetrics> = new Map();

  trackSkill(userId: string, skill: string, hours: number): void {
    let metrics = this.metrics.get(userId) || { skills: [], habits: [], goals: [] };
    const existing = metrics.skills.find(s => s.skill === skill);

    if (existing) {
      existing.practiceHours += hours;
      existing.trend = existing.practiceHours > 10 ? "improving" : "stable";
    } else {
      metrics.skills.push({
        skill,
        level: 1,
        trend: "stable",
        practiceHours: hours,
      });
    }

    this.metrics.set(userId, metrics);
  }

  getProgress(userId: string): GrowthMetrics {
    return this.metrics.get(userId) || { skills: [], habits: [], goals: [] };
  }
}

export const voiceHumanGrowth = new HumanGrowthEngine();
/**
 * Life Timeline Engine
 */

export interface LifeChapter {
  id: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  date: Date;
  emotion: string;
  importance: number;
}

export interface TimelineEvent {
  id: string;
  content: string;
  chapter: string;
  timestamp: Date;
}

export class LifeTimelineEngine {
  private chapters: Map<string, LifeChapter> = new Map();
  private events: Map<string, TimelineEvent[]> = new Map();

  addChapter(userId: string, chapter: LifeChapter): void {
    this.chapters.set(userId, chapter);
  }

  addMilestone(userId: string, milestone: Milestone): void {
    const chapter = this.chapters.get(userId);
    if (chapter) {
      chapter.milestones.push(milestone);
    }
  }

  getCurrentChapter(userId: string): LifeChapter | undefined {
    return this.chapters.get(userId);
  }

  getMilestones(userId: string): Milestone[] {
    const chapter = this.chapters.get(userId);
    return chapter?.milestones || [];
  }
}

export const voiceLifeTimeline = new LifeTimelineEngine();
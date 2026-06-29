/**
 * Chapter Detection Service
 * ========================
 * Automatically detects and manages life chapters from events.
 */

import type { LifeChapter, LifeChapterData, LifeEvent, EventType } from '../types/index.js';

export class ChapterDetector {
  /**
   * Detect current life chapter based on events and date
   */
  static detectCurrentChapter(
    age: number,
    recentEvents: LifeEvent[],
    careerEvents: LifeEvent[]
  ): LifeChapter {
    // Analyze patterns in events
    const hasEntrepreneurship = recentEvents.some(e =>
      e.type === 'career-change' &&
      (e.title.toLowerCase().includes('startup') ||
       e.title.toLowerCase().includes('company') ||
       e.title.toLowerCase().includes('entrepreneur'))
    );

    const hasMarriage = recentEvents.some(e =>
      e.type === 'relationship-start' &&
      (e.title.toLowerCase().includes('marriage') ||
       e.title.toLowerCase().includes('married') ||
       e.impact === 'high')
    );

    const hasParenthood = recentEvents.some(e =>
      e.category === 'family' &&
      (e.title.toLowerCase().includes('child') ||
       e.title.toLowerCase().includes('baby') ||
       e.type === 'birth')
    );

    const hasCareerEvents = careerEvents.length > 0;
    const hasEducation = recentEvents.some(e =>
      e.category === 'education' ||
      e.title.toLowerCase().includes('graduation') ||
      e.title.toLowerCase().includes('college') ||
      e.title.toLowerCase().includes('university')
    );

    // Age-based detection with event refinement
    if (age < 12) {
      return 'childhood';
    }

    if (age >= 12 && age < 22) {
      return 'education';
    }

    if (age >= 22 && age < 30) {
      if (hasEntrepreneurship) return 'entrepreneurship';
      if (hasMarriage || hasCareerEvents) return 'early-career';
      return 'early-career';
    }

    if (age >= 30 && age < 45) {
      if (hasEntrepreneurship) return 'entrepreneurship';
      if (hasParenthood) return 'parenthood';
      if (hasMarriage) return 'relationships';
      return 'career';
    }

    if (age >= 45 && age < 60) {
      if (hasParenthood) return 'parenthood';
      if (hasMarriage) return 'relationships';
      return 'midlife';
    }

    if (age >= 60) {
      return 'retirement';
    }

    // Default based on age
    if (age < 30) return 'early-career';
    if (age < 50) return 'career';
    return 'midlife';
  }

  /**
   * Generate chapter title based on type
   */
  static generateChapterTitle(chapter: LifeChapter, year: number): string {
    const titles: Record<LifeChapter, string> = {
      childhood: 'The Formative Years',
      education: 'Learning & Growth',
      'early-career': 'First Steps in the Professional World',
      career: 'Building a Career',
      entrepreneurship: 'The Entrepreneurial Journey',
      relationships: 'Building Connections',
      marriage: 'A New Chapter Together',
      parenthood: 'The Joy of Family',
      midlife: 'Life in the Middle',
      retirement: 'A New Beginning',
      legacy: 'Leaving Your Mark'
    };

    return titles[chapter] || 'Life Chapter';
  }

  /**
   * Generate chapter summary based on events
   */
  static generateChapterSummary(
    chapter: LifeChapter,
    events: LifeEvent[]
  ): string {
    if (events.length === 0) {
      return `This chapter of life is just beginning.`;
    }

    const achievements = events.filter(e => e.type === 'achievement').length;
    const milestones = events.filter(e => e.milestone).length;
    const avgImpact = events.reduce((a, e) => a + (e.impact === 'high' ? 3 : e.impact === 'moderate' ? 2 : 1), 0) / events.length;

    let summary = '';

    switch (chapter) {
      case 'childhood':
        summary = `A time of wonder, learning, and the foundations of who you are.`;
        break;
      case 'education':
        summary = achievements > 2
          ? `Filled with learning, growth, and the pursuit of knowledge.`
          : `A chapter of discovery and preparation for the future.`;
        break;
      case 'early-career':
        summary = achievements > 0
          ? `You've made significant strides in establishing your professional path.`
          : `The beginning of your professional journey.`;
        break;
      case 'career':
        summary = avgImpact > 2
          ? `A period of significant impact and professional growth.`
          : `Building expertise and making your mark.`;
        break;
      case 'entrepreneurship':
        summary = milestones > 0
          ? `Bold moves and the courage to build something new.`
          : `An adventurous path of creating and innovating.`;
        break;
      case 'relationships':
        summary = `Deepening connections and building meaningful relationships.`;
        break;
      case 'marriage':
        summary = `A partnership of shared experiences and growth.`;
        break;
      case 'parenthood':
        summary = `A transformative journey of love and responsibility.`;
        break;
      case 'midlife':
        summary = `A time of reflection, wisdom, and new perspectives.`;
        break;
      case 'retirement':
        summary = `A new chapter of freedom, reflection, and legacy.`;
        break;
      case 'legacy':
        summary = `Building something that will outlast you.`;
        break;
    }

    return summary;
  }

  /**
   * Extract key events for a chapter
   */
  static extractChapterEvents(
    events: LifeEvent[],
    chapter: LifeChapter,
    startYear: number,
    endYear?: number
  ): LifeEvent[] {
    return events
      .filter(e => {
        const inYearRange = e.year >= startYear && (!endYear || e.year <= endYear);

        if (!inYearRange) return false;

        // Filter by chapter-specific event types
        switch (chapter) {
          case 'education':
            return e.category === 'education' ||
              e.type === 'achievement' ||
              e.title.toLowerCase().includes('graduation');
          case 'career':
          case 'early-career':
            return e.category === 'career' ||
              e.type === 'career-change' ||
              e.type === 'achievement';
          case 'entrepreneurship':
            return e.type === 'career-change' ||
              e.title.toLowerCase().includes('startup') ||
              e.title.toLowerCase().includes('company') ||
              e.type === 'achievement';
          case 'relationships':
          case 'marriage':
            return e.category === 'relationship' ||
              e.type === 'relationship-start';
          case 'parenthood':
            return e.category === 'family' ||
              e.type === 'relationship-start' ||
              e.type === 'milestone';
          default:
            return true;
        }
      })
      .sort((a, b) => b.year - a.year || b.importance - a.importance)
      .slice(0, 20);
  }

  /**
   * Detect chapter transitions
   */
  static detectChapterTransition(
    currentChapter: LifeChapter,
    newEvent: LifeEvent
  ): { hasTransition: boolean; newChapter?: LifeChapter; reason: string } {
    // Event-based chapter triggers
    const transitionRules: Array<{
      trigger: (event: LifeEvent) => boolean;
      newChapter: LifeChapter;
      reason: string;
    }> = [
      {
        trigger: (e) => e.type === 'achievement' &&
          (e.title.toLowerCase().includes('graduation') ||
           e.title.toLowerCase().includes('college') ||
           e.title.toLowerCase().includes('university')),
        newChapter: 'early-career',
        reason: 'Education complete - entering professional life'
      },
      {
        trigger: (e) => e.type === 'career-change' &&
          (e.title.toLowerCase().includes('startup') ||
           e.title.toLowerCase().includes('founded') ||
           e.title.toLowerCase().includes('entrepreneur')),
        newChapter: 'entrepreneurship',
        reason: 'Starting a new venture - entrepreneurial journey begins'
      },
      {
        trigger: (e) => e.type === 'relationship-start' &&
          (e.title.toLowerCase().includes('marriage') ||
           e.title.toLowerCase().includes('married')),
        newChapter: 'marriage',
        reason: 'Beginning a new chapter with a partner'
      },
      {
        trigger: (e) => e.category === 'family' &&
          (e.title.toLowerCase().includes('child') ||
           e.title.toLowerCase().includes('baby')),
        newChapter: 'parenthood',
        reason: 'Starting a family - parenthood begins'
      },
      {
        trigger: (e) => e.type === 'achievement' &&
          (e.title.toLowerCase().includes('retire') ||
           e.title.toLowerCase().includes('retirement')),
        newChapter: 'retirement',
        reason: 'Retiring from work - starting a new phase'
      }
    ];

    for (const rule of transitionRules) {
      if (rule.trigger(newEvent)) {
        return {
          hasTransition: true,
          newChapter: rule.newChapter,
          reason: rule.reason
        };
      }
    }

    return {
      hasTransition: false,
      reason: 'No chapter transition detected'
    };
  }

  /**
   * Estimate chapter duration
   */
  static estimateChapterDuration(chapter: LifeChapter): { minYears: number; maxYears: number } {
    const durations: Record<LifeChapter, { minYears: number; maxYears: number }> = {
      childhood: { minYears: 0, maxYears: 18 },
      education: { minYears: 4, maxYears: 25 },
      'early-career': { minYears: 3, maxYears: 10 },
      career: { minYears: 5, maxYears: 30 },
      entrepreneurship: { minYears: 1, maxYears: 50 },
      relationships: { minYears: 1, maxYears: 50 },
      marriage: { minYears: 1, maxYears: 50 },
      parenthood: { minYears: 1, maxYears: 40 },
      midlife: { minYears: 10, maxYears: 20 },
      retirement: { minYears: 5, maxYears: 40 },
      legacy: { minYears: 1, maxYears: 50 }
    };

    return durations[chapter] || { minYears: 1, maxYears: 10 };
  }

  /**
   * Build complete chapter data
   */
  static buildChapterData(
    chapter: LifeChapter,
    startYear: number,
    events: LifeEvent[],
    currentYear: number = new Date().getFullYear()
  ): LifeChapterData {
    const endYear = chapter === 'entrepreneurship' || chapter === 'parenthood' ? undefined : currentYear;
    const keyEvents = this.extractChapterEvents(events, chapter, startYear, endYear);
    const lessons = this.extractLessons(events, chapter);
    const people = this.extractKeyPeople(events);

    return {
      chapter,
      title: this.generateChapterTitle(chapter, startYear),
      startYear,
      endYear,
      summary: this.generateChapterSummary(chapter, keyEvents),
      keyEvents,
      goals: this.extractGoals(events),
      emotions: this.extractEmotions(events),
      lessons,
      people,
      status: endYear ? 'completed' : 'current'
    };
  }

  /**
   * Extract lessons from events
   */
  private static extractLessons(events: LifeEvent[], chapter: LifeChapter): string[] {
    const lessons: string[] = [];

    // From failure events
    const failures = events.filter(e => e.type === 'failure');
    for (const failure of failures) {
      if (failure.lessons && failure.lessons.length > 0) {
        lessons.push(...failure.lessons.slice(0, 2));
      }
    }

    // From high-impact events
    const highImpact = events.filter(e => e.impact === 'high' || e.impact === 'transformative');
    for (const event of highImpact.slice(0, 3)) {
      const insight = this.generateInsightFromEvent(event);
      if (insight) lessons.push(insight);
    }

    return [...new Set(lessons)].slice(0, 10);
  }

  /**
   * Extract key people from events
   */
  private static extractKeyPeople(events: LifeEvent[]): string[] {
    const peopleMap = new Map<string, number>();

    for (const event of events) {
      if (event.people) {
        for (const person of event.people) {
          peopleMap.set(person, (peopleMap.get(person) || 0) + 1);
        }
      }
    }

    return Array.from(peopleMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);
  }

  /**
   * Extract goals from events
   */
  private static extractGoals(events: LifeEvent[]): string[] {
    const goals: string[] = [];

    // From achievements
    const achievements = events.filter(e => e.type === 'achievement');
    for (const achievement of achievements.slice(0, 5)) {
      goals.push(achievement.title);
    }

    return goals;
  }

  /**
   * Extract emotions from events
   */
  private static extractEmotions(events: LifeEvent[]): string[] {
    const emotionCounts: Record<string, number> = {};

    for (const event of events) {
      for (const emotion of event.emotions) {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      }
    }

    return Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emotion]) => emotion);
  }

  /**
   * Generate insight from event
   */
  private static generateInsightFromEvent(event: LifeEvent): string | null {
    if (event.impact === 'transformative') {
      return `This was a turning point: ${event.title}`;
    }
    if (event.impact === 'high' && event.description) {
      return `Key moment: ${event.title}`;
    }
    return null;
  }
}

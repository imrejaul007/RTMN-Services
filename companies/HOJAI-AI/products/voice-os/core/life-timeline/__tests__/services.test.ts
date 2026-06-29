/**
 * Life Timeline Intelligence - Service Tests
 */

import { describe, it, expect } from 'vitest';
import { ChapterDetector } from '../src/services/chapterDetector.js';
import type { LifeEvent } from '../src/types/index.js';

describe('ChapterDetector', () => {
  describe('detectCurrentChapter', () => {
    it('should detect childhood for age < 12', () => {
      const chapter = ChapterDetector.detectCurrentChapter(8, [], []);

      expect(chapter).toBe('childhood');
    });

    it('should detect education for age 12-22', () => {
      const chapter = ChapterDetector.detectCurrentChapter(18, [], []);

      expect(chapter).toBe('education');
    });

    it('should detect early-career for age 22-30 without entrepreneurship', () => {
      const chapter = ChapterDetector.detectCurrentChapter(25, [], [{ type: 'career-change', title: 'First job' }]);

      expect(chapter).toBe('early-career');
    });

    it('should detect entrepreneurship when startup event exists', () => {
      const events = [{
        type: 'career-change' as const,
        title: 'Started my startup'
      }];
      const chapter = ChapterDetector.detectCurrentChapter(28, events, []);

      expect(chapter).toBe('entrepreneurship');
    });

    it('should detect parenthood when family event exists', () => {
      const events = [{
        category: 'family' as const,
        title: 'Baby born'
      }];
      const chapter = ChapterDetector.detectCurrentChapter(35, events, []);

      expect(chapter).toBe('parenthood');
    });

    it('should detect midlife for age 45-60', () => {
      const chapter = ChapterDetector.detectCurrentChapter(50, [], []);

      expect(chapter).toBe('midlife');
    });

    it('should detect retirement for age 60+', () => {
      const chapter = ChapterDetector.detectCurrentChapter(65, [], []);

      expect(chapter).toBe('retirement');
    });
  });

  describe('generateChapterTitle', () => {
    it('should generate title for childhood', () => {
      const title = ChapterDetector.generateChapterTitle('childhood', 2000);

      expect(title).toBe('The Formative Years');
    });

    it('should generate title for entrepreneurship', () => {
      const title = ChapterDetector.generateChapterTitle('entrepreneurship', 2020);

      expect(title).toBe('The Entrepreneurial Journey');
    });

    it('should generate title for retirement', () => {
      const title = ChapterDetector.generateChapterTitle('retirement', 2025);

      expect(title).toBe('A New Beginning');
    });
  });

  describe('generateChapterSummary', () => {
    it('should return beginning message for empty events', () => {
      const summary = ChapterDetector.generateChapterSummary('childhood', []);

      expect(summary).toContain('just beginning');
    });

    it('should mention achievements when present', () => {
      const events: Partial<LifeEvent>[] = [
        { type: 'achievement' },
        { type: 'achievement' },
        { type: 'achievement' }
      ];
      const summary = ChapterDetector.generateChapterSummary('education', events as LifeEvent[]);

      expect(summary).toContain('learning');
    });

    it('should generate summary for entrepreneurship chapter', () => {
      const events: Partial<LifeEvent>[] = [
        { type: 'achievement', title: 'Startup launched' }
      ];
      const summary = ChapterDetector.generateChapterSummary('entrepreneurship', events as LifeEvent[]);

      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(10);
    });
  });

  describe('detectChapterTransition', () => {
    it('should detect transition to entrepreneurship on startup event', () => {
      const event = {
        type: 'career-change' as const,
        title: 'Founded my first startup'
      };

      const result = ChapterDetector.detectChapterTransition('early-career', event);

      expect(result.hasTransition).toBe(true);
      expect(result.newChapter).toBe('entrepreneurship');
    });

    it('should detect transition to marriage on marriage event', () => {
      const event = {
        type: 'relationship-start' as const,
        title: 'Got married'
      };

      const result = ChapterDetector.detectChapterTransition('relationships', event);

      expect(result.hasTransition).toBe(true);
      expect(result.newChapter).toBe('marriage');
    });

    it('should detect transition to parenthood on child birth', () => {
      const event = {
        category: 'family' as const,
        title: 'Baby born'
      };

      const result = ChapterDetector.detectChapterTransition('marriage', event);

      expect(result.hasTransition).toBe(true);
      expect(result.newChapter).toBe('parenthood');
    });

    it('should not detect transition for normal events', () => {
      const event = {
        type: 'achievement' as const,
        title: 'Got a promotion'
      };

      const result = ChapterDetector.detectChapterTransition('career', event);

      expect(result.hasTransition).toBe(false);
    });
  });

  describe('estimateChapterDuration', () => {
    it('should return reasonable duration for childhood', () => {
      const duration = ChapterDetector.estimateChapterDuration('childhood');

      expect(duration.minYears).toBe(0);
      expect(duration.maxYears).toBe(18);
    });

    it('should return reasonable duration for entrepreneurship', () => {
      const duration = ChapterDetector.estimateChapterDuration('entrepreneurship');

      expect(duration.minYears).toBe(1);
      expect(duration.maxYears).toBe(50);
    });
  });

  describe('extractChapterEvents', () => {
    it('should filter education events', () => {
      const events: LifeEvent[] = [
        { year: 2020, type: 'achievement', category: 'education', title: 'Graduated' },
        { year: 2020, type: 'travel', category: 'personal', title: 'Vacation' },
        { year: 2020, type: 'achievement', category: 'career', title: 'First job' }
      ];

      const chapterEvents = ChapterDetector.extractChapterEvents(events, 'education', 2020);

      expect(chapterEvents.length).toBeGreaterThan(0);
      expect(chapterEvents.every(e => e.category === 'education' || e.type === 'achievement')).toBe(true);
    });
  });
});

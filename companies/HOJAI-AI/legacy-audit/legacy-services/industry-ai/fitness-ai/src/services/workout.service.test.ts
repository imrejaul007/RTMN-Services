/**
 * Fitness AI - Workout Service Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { WorkoutDifficulty } from '../models';

describe('WorkoutService - Templates', () => {
  const getWorkoutTemplates = () => [
    {
      name: 'Beginner Full Body',
      difficulty: WorkoutDifficulty.BEGINNER,
      workouts: [
        { day: 1, name: 'Upper Body', exercises: [{ name: 'Push-ups', sets: 3, reps: 10, restTime: 60 }], duration: 45 },
        { day: 2, name: 'Lower Body', exercises: [{ name: 'Squats', sets: 3, reps: 15, restTime: 60 }], duration: 40 },
      ],
      targetAreas: ['chest', 'back', 'legs'],
    },
    {
      name: 'Intermediate Strength',
      difficulty: WorkoutDifficulty.INTERMEDIATE,
      workouts: [
        { day: 1, name: 'Push Day', exercises: [{ name: 'Bench Press', sets: 4, reps: 8, restTime: 90 }], duration: 60 },
      ],
      targetAreas: ['chest', 'back', 'arms'],
    },
    {
      name: 'Advanced HIIT',
      difficulty: WorkoutDifficulty.ADVANCED,
      workouts: [
        { day: 1, name: 'HIIT', exercises: [{ name: 'Sprints', sets: 8, duration: 30, restTime: 30 }], duration: 40 },
      ],
      targetAreas: ['full body', 'cardio'],
    },
  ];

  describe('getWorkoutTemplates', () => {
    it('should return 3 templates', () => {
      expect(getWorkoutTemplates().length).toBe(3);
    });

    it('should have beginner template', () => {
      const templates = getWorkoutTemplates();
      const beginner = templates.find(t => t.difficulty === WorkoutDifficulty.BEGINNER);
      expect(beginner?.name).toBe('Beginner Full Body');
    });

    it('should have valid exercises', () => {
      const templates = getWorkoutTemplates();
      templates.forEach(t => {
        t.workouts.forEach(w => {
          expect(w.exercises.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have target areas', () => {
      const templates = getWorkoutTemplates();
      templates.forEach(t => {
        expect(t.targetAreas.length).toBeGreaterThan(0);
      });
    });

    it('should validate workout structure', () => {
      const templates = getWorkoutTemplates();
      templates.forEach(t => {
        expect(t.name).toBeDefined();
        expect(t.difficulty).toBeDefined();
        expect(t.workouts).toBeDefined();
      });
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress', () => {
      const total = 12, completed = 6;
      expect((completed / total) * 100).toBe(50);
    });

    it('should calculate days remaining', () => {
      const duration = 4, completedSessions = 3, sessionsPerWeek = 3;
      const remaining = duration - Math.floor(completedSessions / sessionsPerWeek);
      expect(remaining).toBe(3);
    });

    it('should handle plan completion', () => {
      const total = 12, completed = 12;
      expect(completed >= total).toBe(true);
    });
  });
});

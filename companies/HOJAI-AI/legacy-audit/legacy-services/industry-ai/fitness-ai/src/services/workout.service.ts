/**
 * Fitness AI - Workout Service
 *
 * Business logic for workout plan management
 */

import { v4 as uuidv4 } from 'uuid';
import {
  WorkoutPlan,
  IWorkoutPlan,
  IWorkoutDay,
  IExercise,
  WorkoutDifficulty,
} from '../models';

// Simple error class
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class WorkoutService {
  /**
   * Create a new workout plan
   */
  async createPlan(data: {
    memberId: string;
    name: string;
    description?: string;
    difficulty: WorkoutDifficulty;
    duration: number;
    sessionsPerWeek: number;
    workouts: IWorkoutDay[];
    targetAreas: string[];
  }): Promise<IWorkoutPlan> {
    // Validate workouts
    if (!data.workouts || data.workouts.length === 0) {
      throw new AppError('At least one workout day is required', 'INVALID_WORKOUTS', 400);
    }

    // Calculate total duration
    const totalDuration = data.workouts.reduce((sum, w) => sum + w.duration, 0);

    const plan = new WorkoutPlan({
      planId: `PLAN-${uuidv4().substring(0, 8).toUpperCase()}`,
      memberId: data.memberId,
      name: data.name,
      description: data.description,
      difficulty: data.difficulty,
      duration: data.duration,
      sessionsPerWeek: data.sessionsPerWeek,
      workouts: data.workouts,
      targetAreas: data.targetAreas,
      isActive: false,
      completedSessions: 0,
    });

    await plan.save();
    return plan;
  }

  /**
   * Get plan by ID
   */
  async getPlanById(planId: string): Promise<IWorkoutPlan | null> {
    return WorkoutPlan.findOne({ planId });
  }

  /**
   * Get all plans for a member
   */
  async getMemberPlans(memberId: string, activeOnly?: boolean): Promise<IWorkoutPlan[]> {
    const query: any = { memberId };
    if (activeOnly) {
      query.isActive = true;
    }
    return WorkoutPlan.find(query).sort({ createdAt: -1 });
  }

  /**
   * Update plan
   */
  async updatePlan(
    planId: string,
    updates: Partial<{
      name: string;
      description: string;
      difficulty: WorkoutDifficulty;
      duration: number;
      sessionsPerWeek: number;
      workouts: IWorkoutDay[];
      targetAreas: string[];
      isActive: boolean;
      startDate: Date;
      endDate: Date;
    }>
  ): Promise<IWorkoutPlan | null> {
    return WorkoutPlan.findOneAndUpdate(
      { planId },
      { $set: updates },
      { new: true }
    );
  }

  /**
   * Activate plan
   */
  async activatePlan(planId: string): Promise<IWorkoutPlan | null> {
    const plan = await WorkoutPlan.findOne({ planId });
    if (!plan) {
      throw new AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
    }

    // Deactivate other plans for this member
    await WorkoutPlan.updateMany(
      { memberId: plan.memberId, isActive: true },
      { $set: { isActive: false } }
    );

    return WorkoutPlan.findOneAndUpdate(
      { planId },
      {
        $set: {
          isActive: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + plan.duration * 7 * 24 * 60 * 60 * 1000),
        },
      },
      { new: true }
    );
  }

  /**
   * Complete a workout session
   */
  async completeSession(planId: string, dayNumber: number): Promise<IWorkoutPlan | null> {
    const plan = await WorkoutPlan.findOne({ planId });
    if (!plan) {
      throw new AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
    }

    const totalSessions = plan.duration * plan.sessionsPerWeek;
    const newCompleted = plan.completedSessions + 1;

    const updates: any = { completedSessions: newCompleted };

    // If all sessions completed, deactivate
    if (newCompleted >= totalSessions) {
      updates.isActive = false;
      updates.endDate = new Date();
    }

    return WorkoutPlan.findOneAndUpdate(
      { planId },
      { $set: updates },
      { new: true }
    );
  }

  /**
   * Get plan progress
   */
  async getPlanProgress(planId: string): Promise<{
    plan: IWorkoutPlan;
    progress: number;
    daysRemaining: number;
    estimatedCompletion: Date | null;
  } | null> {
    const plan = await WorkoutPlan.findOne({ planId });
    if (!plan) return null;

    const totalSessions = plan.duration * plan.sessionsPerWeek;
    const progress = totalSessions > 0 ? (plan.completedSessions / totalSessions) * 100 : 0;
    const daysRemaining = plan.duration - Math.floor(plan.completedSessions / plan.sessionsPerWeek);

    return {
      plan,
      progress,
      daysRemaining: Math.max(0, daysRemaining),
      estimatedCompletion: plan.endDate || null,
    };
  }

  /**
   * Delete plan
   */
  async deletePlan(planId: string): Promise<boolean> {
    const result = await WorkoutPlan.findOneAndDelete({ planId });
    return !!result;
  }

  /**
   * Get workout templates
   */
  getWorkoutTemplates(): {
    name: string;
    difficulty: WorkoutDifficulty;
    workouts: IWorkoutDay[];
    targetAreas: string[];
  }[] {
    return [
      {
        name: 'Beginner Full Body',
        difficulty: WorkoutDifficulty.BEGINNER,
        workouts: [
          {
            day: 1,
            name: 'Upper Body',
            exercises: [
              { name: 'Push-ups', sets: 3, reps: 10, restTime: 60 },
              { name: 'Dumbbell Rows', sets: 3, reps: 12, restTime: 60 },
              { name: 'Shoulder Press', sets: 3, reps: 10, restTime: 60 },
            ],
            duration: 45,
          },
          {
            day: 2,
            name: 'Lower Body',
            exercises: [
              { name: 'Squats', sets: 3, reps: 15, restTime: 60 },
              { name: 'Lunges', sets: 3, reps: 10, restTime: 60 },
              { name: 'Calf Raises', sets: 3, reps: 20, restTime: 45 },
            ],
            duration: 40,
          },
          {
            day: 3,
            name: 'Cardio & Core',
            exercises: [
              { name: 'Jumping Jacks', sets: 3, duration: 60, restTime: 30 },
              { name: 'Plank', sets: 3, duration: 30, restTime: 30 },
              { name: 'Burpees', sets: 3, reps: 10, restTime: 60 },
            ],
            duration: 35,
          },
        ],
        targetAreas: ['chest', 'back', 'legs', 'core'],
      },
      {
        name: 'Intermediate Strength',
        difficulty: WorkoutDifficulty.INTERMEDIATE,
        workouts: [
          {
            day: 1,
            name: 'Push Day',
            exercises: [
              { name: 'Bench Press', sets: 4, reps: 8, restTime: 90 },
              { name: 'Incline Dumbbell Press', sets: 4, reps: 10, restTime: 75 },
              { name: 'Cable Flyes', sets: 3, reps: 12, restTime: 60 },
              { name: 'Tricep Dips', sets: 3, reps: 12, restTime: 60 },
            ],
            duration: 60,
          },
          {
            day: 2,
            name: 'Pull Day',
            exercises: [
              { name: 'Deadlifts', sets: 4, reps: 6, restTime: 120 },
              { name: 'Pull-ups', sets: 4, reps: 8, restTime: 90 },
              { name: 'Barbell Rows', sets: 4, reps: 10, restTime: 75 },
              { name: 'Face Pulls', sets: 3, reps: 15, restTime: 60 },
            ],
            duration: 65,
          },
          {
            day: 3,
            name: 'Leg Day',
            exercises: [
              { name: 'Squats', sets: 4, reps: 8, restTime: 120 },
              { name: 'Romanian Deadlifts', sets: 4, reps: 10, restTime: 90 },
              { name: 'Leg Press', sets: 3, reps: 12, restTime: 75 },
              { name: 'Leg Curls', sets: 3, reps: 12, restTime: 60 },
            ],
            duration: 60,
          },
        ],
        targetAreas: ['chest', 'back', 'legs', 'arms'],
      },
      {
        name: 'Advanced HIIT',
        difficulty: WorkoutDifficulty.ADVANCED,
        workouts: [
          {
            day: 1,
            name: 'HIIT Cardio',
            exercises: [
              { name: 'Sprint Intervals', sets: 8, duration: 30, restTime: 30 },
              { name: 'Mountain Climbers', sets: 4, duration: 45, restTime: 15 },
              { name: 'Jump Squats', sets: 4, reps: 15, restTime: 45 },
            ],
            duration: 40,
          },
          {
            day: 2,
            name: 'Circuit Training',
            exercises: [
              { name: 'Box Jumps', sets: 4, reps: 10, restTime: 30 },
              { name: 'Kettlebell Swings', sets: 4, reps: 15, restTime: 30 },
              { name: 'Battle Ropes', sets: 4, duration: 30, restTime: 30 },
              { name: 'Wall Balls', sets: 4, reps: 15, restTime: 30 },
            ],
            duration: 45,
          },
        ],
        targetAreas: ['full body', 'cardio', 'explosive power'],
      },
    ];
  }
}

export const workoutService = new WorkoutService();
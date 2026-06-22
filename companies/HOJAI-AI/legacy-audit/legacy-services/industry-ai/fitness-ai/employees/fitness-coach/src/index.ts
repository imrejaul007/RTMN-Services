/**
 * HOJAI Fitness Coach AI Employee
 * Creates personalized workout plans, tracks progress, provides motivation
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface MemberProfile {
  id: string;
  name: string;
  goals: string[];
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  availableDays: number[];
  preferredTime: 'morning' | 'afternoon' | 'evening';
  injuries?: string[];
  equipment: string[];
  targetWeight?: number;
  currentWeight?: number;
  age: number;
  gender: 'male' | 'female' | 'other';
}

interface WorkoutPlan {
  id: string;
  memberId: string;
  name: string;
  duration: number; // weeks
  goal: string;
  level: string;
  schedule: { [day: string]: WorkoutDay };
  nutritionTips: string[];
  progress: ProgressEntry[];
  createdAt: string;
  updatedAt: string;
}

interface WorkoutDay {
  day: string;
  focus: string;
  exercises: Exercise[];
  warmup: string[];
  cooldown: string[];
  duration: number; // minutes
  notes?: string;
}

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  tempo?: string;
  notes?: string;
}

interface ProgressEntry {
  date: string;
  weight?: number;
  measurements?: { [bodyPart: string]: number };
  completedWorkouts: number;
  notes?: string;
}

const workoutPlans = new Map<string, WorkoutPlan>();

// Generate workout plan
router.post('/generate-plan', async (req, res) => {
  try {
    const { memberId, memberProfile } = req.body;

    if (!memberProfile) {
      return res.status(400).json({ error: 'Member profile required' });
    }

    const profile: MemberProfile = memberProfile;
    const plan = generateWorkoutPlan(memberId || uuidv4(), profile);

    workoutPlans.set(plan.id, plan);

    res.status(201).json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate plan' });
  }
});

// Get plan
router.get('/plans/:id', async (req, res) => {
  try {
    const plan = workoutPlans.get(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.json({ plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get plan' });
  }
});

// Get member's active plan
router.get('/plans/member/:memberId/active', async (req, res) => {
  try {
    const plans = Array.from(workoutPlans.values())
      .filter(p => p.memberId === req.params.memberId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ plan: plans[0] || null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get plan' });
  }
});

// Log workout completion
router.post('/plans/:id/log', async (req, res) => {
  try {
    const { date, completedWorkouts, weight, measurements, notes } = req.body;
    const plan = workoutPlans.get(req.params.id);

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const progress: ProgressEntry = {
      date: date || new Date().toISOString(),
      weight,
      measurements,
      completedWorkouts: completedWorkouts || 0,
      notes,
    };

    plan.progress.push(progress);
    plan.updatedAt = new Date().toISOString();
    workoutPlans.set(plan.id, plan);

    res.json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log progress' });
  }
});

// Get today's workout
router.get('/today/:memberId', async (req, res) => {
  try {
    const plans = Array.from(workoutPlans.values())
      .filter(p => p.memberId === req.params.memberId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const plan = plans[0];
    if (!plan) {
      return res.status(404).json({ error: 'No active plan found' });
    }

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayWorkout = plan.schedule[today];

    if (!todayWorkout) {
      return res.json({ rest: true, message: 'Rest day! Recovery is important.' });
    }

    res.json({ workout: todayWorkout, plan: { id: plan.id, name: plan.name } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get today\'s workout' });
  }
});

// Get motivation tip
router.get('/motivation', async (req, res) => {
  try {
    const tips = [
      "The only bad workout is the one that didn't happen.",
      "Your body can stand almost anything, it's your mind you have to convince.",
      "Success is the sum of small efforts repeated day in and day out.",
      "The pain you feel today will be the strength you feel tomorrow.",
      "Don't wish for it, work for it.",
      "Your only limit is you.",
      "Sweat is just fat crying.",
      "The harder you work, the better you get.",
      "Make yourself proud.",
      "Progress, not perfection.",
    ];

    const tip = tips[Math.floor(Math.random() * tips.length)];
    res.json({ tip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tip' });
  }
});

// Helper functions
function generateWorkoutPlan(memberId: string, profile: MemberProfile): WorkoutPlan {
  const { goals, fitnessLevel, availableDays, preferredTime } = profile;

  const schedule: { [day: string]: WorkoutDay } = {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  days.forEach(day => {
    if (availableDays.includes(days.indexOf(day))) {
      const focus = getFocusForDay(days.indexOf(day), goals);
      schedule[day] = generateWorkoutDay(day, focus, fitnessLevel);
    }
  });

  const plan: WorkoutPlan = {
    id: uuidv4(),
    memberId,
    name: `${profile.name}'s ${goals[0] || 'Fitness'} Plan`,
    duration: 12,
    goal: goals[0] || 'General Fitness',
    level: fitnessLevel,
    schedule,
    nutritionTips: generateNutritionTips(goals),
    progress: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return plan;
}

function getFocusForDay(dayIndex: number, goals: string[]): string {
  const focuses = ['upper body', 'lower body', 'cardio + core', 'full body', 'cardio', 'rest'];

  if (goals.includes('weight loss')) {
    return dayIndex % 2 === 0 ? 'cardio + strength' : 'HIIT + core';
  }
  if (goals.includes('muscle gain')) {
    return focuses[dayIndex % 5];
  }
  return focuses[dayIndex % 5];
}

function generateWorkoutDay(day: string, focus: string, level: string): WorkoutDay {
  const exercises: Exercise[] = [];

  if (focus.includes('upper body') || focus.includes('full body')) {
    exercises.push(
      { name: 'Push-ups', sets: level === 'beginner' ? 3 : 4, reps: level === 'beginner' ? '8-10' : '12-15', rest: 60 },
      { name: 'Dumbbell Rows', sets: 3, reps: '10-12', rest: 60 },
      { name: 'Shoulder Press', sets: 3, reps: '10-12', rest: 60 },
      { name: 'Bicep Curls', sets: 3, reps: '12-15', rest: 45 },
      { name: 'Tricep Dips', sets: 3, reps: '10-12', rest: 45 }
    );
  }

  if (focus.includes('lower body') || focus.includes('full body')) {
    exercises.push(
      { name: 'Squats', sets: 4, reps: '12-15', rest: 90 },
      { name: 'Lunges', sets: 3, reps: '10 each leg', rest: 60 },
      { name: 'Leg Press', sets: 3, reps: '12-15', rest: 90 },
      { name: 'Calf Raises', sets: 3, reps: '15-20', rest: 45 },
      { name: 'Deadlifts', sets: 3, reps: '8-10', rest: 90 }
    );
  }

  if (focus.includes('cardio') || focus.includes('HIIT')) {
    exercises.push(
      { name: 'Jumping Jacks', sets: 3, reps: '1 min', rest: 30 },
      { name: 'Burpees', sets: 3, reps: '10', rest: 60 },
      { name: 'Mountain Climbers', sets: 3, reps: '30 sec', rest: 30 },
      { name: 'High Knees', sets: 3, reps: '30 sec', rest: 30 }
    );
  }

  return {
    day,
    focus,
    exercises,
    warmup: ['Light jogging', 'Arm circles', 'Leg swings', 'Hip rotations'],
    cooldown: ['Stretching', 'Deep breathing', 'Foam rolling'],
    duration: 45 + exercises.length * 5,
  };
}

function generateNutritionTips(goals: string[]): string[] {
  const baseTips = [
    'Stay hydrated - drink at least 3 liters of water daily',
    'Eat protein with every meal for muscle recovery',
    'Get 7-8 hours of quality sleep',
  ];

  if (goals.includes('weight loss')) {
    return [
      ...baseTips,
      'Create a calorie deficit of 300-500 calories',
      'Increase protein intake to preserve muscle',
      'Limit processed foods and sugars',
      'Eat more fiber to feel full longer',
    ];
  }

  if (goals.includes('muscle gain')) {
    return [
      ...baseTips,
      'Eat in a slight calorie surplus (200-300 cal)',
      'Consume 1.6-2g of protein per kg body weight',
      'Time carbs around workouts for energy',
      'Don't skip post-workout nutrition',
    ];
  }

  return baseTips;
}

export { router, workoutPlans };
export type { MemberProfile, WorkoutPlan, WorkoutDay, Exercise, ProgressEntry };

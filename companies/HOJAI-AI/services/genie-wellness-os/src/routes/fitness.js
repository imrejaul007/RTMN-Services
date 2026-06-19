const express = require('express');
const router = express.Router();

// In-memory fitness data
const fitnessRecords = new Map();
const workoutPlans = new Map();
const exerciseLibrary = new Map();

// Exercise library
const exercises = {
  cardio: [
    { id: 'running', name: 'Running', type: 'cardio', caloriesPerHour: 600, equipment: 'none', muscleGroups: ['legs', 'core'] },
    { id: 'cycling', name: 'Cycling', type: 'cardio', caloriesPerHour: 500, equipment: 'bike', muscleGroups: ['legs', 'glutes'] },
    { id: 'swimming', name: 'Swimming', type: 'cardio', caloriesPerHour: 500, equipment: 'pool', muscleGroups: ['full body'] },
    { id: 'jump-rope', name: 'Jump Rope', type: 'cardio', caloriesPerHour: 700, equipment: 'rope', muscleGroups: ['legs', 'core', 'shoulders'] },
    { id: 'rowing', name: 'Rowing', type: 'cardio', caloriesPerHour: 550, equipment: 'rower', muscleGroups: ['back', 'legs', 'arms'] },
    { id: 'hiit', name: 'HIIT', type: 'cardio', caloriesPerHour: 650, equipment: 'none', muscleGroups: ['full body'] },
    { id: 'walking', name: 'Brisk Walking', type: 'cardio', caloriesPerHour: 350, equipment: 'none', muscleGroups: ['legs'] },
    { id: 'stair-climbing', name: 'Stair Climbing', type: 'cardio', caloriesPerHour: 500, equipment: 'stairs', muscleGroups: ['legs', 'glutes'] }
  ],
  strength: [
    { id: 'push-ups', name: 'Push-ups', type: 'strength', caloriesPerHour: 400, equipment: 'none', muscleGroups: ['chest', 'triceps', 'shoulders'] },
    { id: 'squats', name: 'Squats', type: 'strength', caloriesPerHour: 450, equipment: 'none', muscleGroups: ['quads', 'glutes', 'hamstrings'] },
    { id: 'lunges', name: 'Lunges', type: 'strength', caloriesPerHour: 400, equipment: 'none', muscleGroups: ['quads', 'glutes', 'hamstrings'] },
    { id: 'deadlifts', name: 'Deadlifts', type: 'strength', caloriesPerHour: 500, equipment: 'weights', muscleGroups: ['back', 'glutes', 'hamstrings'] },
    { id: 'bench-press', name: 'Bench Press', type: 'strength', caloriesPerHour: 450, equipment: 'weights', muscleGroups: ['chest', 'triceps', 'shoulders'] },
    { id: 'planks', name: 'Planks', type: 'strength', caloriesPerHour: 300, equipment: 'none', muscleGroups: ['core', 'shoulders'] },
    { id: 'pull-ups', name: 'Pull-ups', type: 'strength', caloriesPerHour: 450, equipment: 'bar', muscleGroups: ['back', 'biceps', 'core'] },
    { id: 'dumbbell-rows', name: 'Dumbbell Rows', type: 'strength', caloriesPerHour: 400, equipment: 'dumbbells', muscleGroups: ['back', 'biceps'] },
    { id: 'shoulder-press', name: 'Shoulder Press', type: 'strength', caloriesPerHour: 400, equipment: 'weights', muscleGroups: ['shoulders', 'triceps'] },
    { id: 'bicep-curls', name: 'Bicep Curls', type: 'strength', caloriesPerHour: 300, equipment: 'dumbbells', muscleGroups: ['biceps'] }
  ],
  flexibility: [
    { id: 'yoga', name: 'Yoga', type: 'flexibility', caloriesPerHour: 250, equipment: 'mat', muscleGroups: ['full body'] },
    { id: 'stretching', name: 'Stretching', type: 'flexibility', caloriesPerHour: 150, equipment: 'none', muscleGroups: ['full body'] },
    { id: 'pilates', name: 'Pilates', type: 'flexibility', caloriesPerHour: 350, equipment: 'mat', muscleGroups: ['core', 'back'] },
    { id: 'tai-chi', name: 'Tai Chi', type: 'flexibility', caloriesPerHour: 200, equipment: 'none', muscleGroups: ['full body'] }
  ],
  balance: [
    { id: 'balance-board', name: 'Balance Board', type: 'balance', caloriesPerHour: 250, equipment: 'board', muscleGroups: ['legs', 'core'] },
    { id: 'single-leg', name: 'Single Leg Stands', type: 'balance', caloriesPerHour: 150, equipment: 'none', muscleGroups: ['legs', 'core'] }
  ]
};

// Workout templates
const workoutTemplates = {
  'beginner-full-body': {
    name: 'Beginner Full Body',
    difficulty: 'beginner',
    duration: 45,
    exercises: [
      { exercise: 'squats', sets: 3, reps: 12, rest: 60 },
      { exercise: 'push-ups', sets: 3, reps: 10, rest: 60 },
      { exercise: 'lunges', sets: 3, reps: 10, rest: 60 },
      { exercise: 'planks', sets: 3, reps: 30, rest: 45 },
      { exercise: 'rowing', sets: 1, duration: 15, rest: 0 }
    ]
  },
  'strength-hypertrophy': {
    name: 'Hypertrophy Training',
    difficulty: 'intermediate',
    duration: 60,
    exercises: [
      { exercise: 'bench-press', sets: 4, reps: 10, rest: 90 },
      { exercise: 'deadlifts', sets: 4, reps: 8, rest: 120 },
      { exercise: 'shoulder-press', sets: 3, reps: 12, rest: 90 },
      { exercise: 'bicep-curls', sets: 3, reps: 15, rest: 60 },
      { exercise: 'tricep-dips', sets: 3, reps: 12, rest: 60 }
    ]
  },
  'hiit-cardio': {
    name: 'HIIT Cardio Blast',
    difficulty: 'advanced',
    duration: 30,
    format: 'interval',
    exercises: [
      { exercise: 'jump-rope', duration: 30, work: 20, rest: 10, rounds: 10 },
      { exercise: 'burpees', duration: 30, work: 20, rest: 10, rounds: 10 },
      { exercise: 'mountain-climbers', duration: 30, work: 20, rest: 10, rounds: 10 }
    ]
  },
  'active-recovery': {
    name: 'Active Recovery',
    difficulty: 'easy',
    duration: 30,
    exercises: [
      { exercise: 'yoga', duration: 15 },
      { exercise: 'stretching', duration: 10 },
      { exercise: 'walking', duration: 5 }
    ]
  }
};

// Get fitness dashboard
router.get('/dashboard/:userId', (req, res) => {
  const { userId } = req.params;

  const profile = fitnessRecords.get(userId) || {
    userId,
    stats: {
      workouts: 0,
      totalMinutes: 0,
      totalCalories: 0,
      streak: 0
    },
    weekly: {
      workouts: 0,
      minutes: 0,
      calories: 0
    },
    goals: {
      weeklyWorkouts: 4,
      weeklyMinutes: 150,
      weeklyCalories: 2000
    }
  };

  res.json({
    success: true,
    data: {
      profile,
      exerciseCategories: Object.keys(exercises),
      availableTemplates: Object.keys(workoutTemplates)
    }
  });
});

// Set fitness goals
router.post('/goals/:userId', (req, res) => {
  const { userId } = req.params;
  const { weeklyWorkouts, weeklyMinutes, weeklyCalories, targetWeight } = req.body;

  const profile = fitnessRecords.get(userId) || { userId, stats: {}, weekly: {}, goals: {} };

  profile.goals = {
    weeklyWorkouts: weeklyWorkouts || 4,
    weeklyMinutes: weeklyMinutes || 150,
    weeklyCalories: weeklyCalories || 2000,
    targetWeight: targetWeight || null
  };

  fitnessRecords.set(userId, profile);

  res.json({
    success: true,
    message: 'Fitness goals updated',
    data: profile.goals
  });
});

// Log workout
router.post('/workout/:userId', (req, res) => {
  const { userId } = req.params;
  const { workoutType, template, exercises: workoutExercises, duration, calories, notes } = req.body;

  let workoutExercisesList = [];
  let totalCalories = 0;
  let totalDuration = 0;

  // If using a template
  if (template && workoutTemplates[template]) {
    const tmpl = workoutTemplates[template];
    totalDuration = tmpl.duration;

    for (const ex of tmpl.exercises) {
      const exerciseData = findExercise(ex.exercise);
      if (exerciseData) {
        const duration = ex.duration || (ex.sets * ex.reps * 0.5); // Estimate
        const calories = Math.round((exerciseData.caloriesPerHour / 60) * duration);
        totalCalories += calories;

        workoutExercisesList.push({
          ...ex,
          exerciseData,
          calories
        });
      }
    }
  } else if (workoutExercises && workoutExercises.length > 0) {
    // Custom workout
    for (const ex of workoutExercises) {
      const exerciseData = findExercise(ex.exercise);
      if (exerciseData) {
        const dur = ex.duration || (ex.sets * ex.reps * 0.5);
        const cals = Math.round((exerciseData.caloriesPerHour / 60) * dur);
        totalCalories += cals;
        totalDuration += dur;

        workoutExercisesList.push({
          ...ex,
          exerciseData,
          calories: cals
        });
      }
    }
  }

  totalDuration = duration || totalDuration;
  totalCalories = calories || totalCalories;

  const workout = {
    id: `workout-${Date.now()}`,
    userId,
    type: workoutType || 'custom',
    template: template || null,
    exercises: workoutExercisesList,
    duration: totalDuration,
    calories: totalCalories,
    notes,
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0]
  };

  // Store workout
  if (!fitnessRecords.has(userId)) {
    fitnessRecords.set(userId, {
      userId,
      workouts: [],
      stats: { workouts: 0, totalMinutes: 0, totalCalories: 0, streak: 0 },
      weekly: { workouts: 0, minutes: 0, calories: 0, weekStart: getWeekStart() }
    });
  }

  const profile = fitnessRecords.get(userId);
  profile.workouts.push(workout);
  profile.stats.workouts++;
  profile.stats.totalMinutes += totalDuration;
  profile.stats.totalCalories += totalCalories;
  profile.stats.streak = updateWorkoutStreak(profile.workouts);

  // Update weekly stats
  const weekStart = getWeekStart();
  if (profile.weekly.weekStart !== weekStart) {
    profile.weekly = { workouts: 0, minutes: 0, calories: 0, weekStart };
  }
  profile.weekly.workouts++;
  profile.weekly.minutes += totalDuration;
  profile.weekly.calories += totalCalories;

  res.json({
    success: true,
    message: 'Workout logged',
    data: {
      workout,
      stats: profile.stats,
      weekly: profile.weekly,
      streak: profile.stats.streak,
      goalProgress: calculateGoalProgress(profile)
    }
  });
});

// Get workout history
router.get('/workouts/:userId', (req, res) => {
  const { userId } = req.params;
  const { days = 30 } = req.query;

  const profile = fitnessRecords.get(userId);
  if (!profile) {
    return res.json({
      success: true,
      data: { workouts: [], message: 'No workouts logged yet' }
    });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(days));

  const workouts = profile.workouts
    .filter(w => new Date(w.timestamp) > cutoff)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({
    success: true,
    data: {
      workouts,
      summary: {
        totalWorkouts: workouts.length,
        totalMinutes: workouts.reduce((sum, w) => sum + w.duration, 0),
        totalCalories: workouts.reduce((sum, w) => sum + w.calories, 0),
        averageDuration: workouts.length ?
          Math.round(workouts.reduce((sum, w) => sum + w.duration, 0) / workouts.length) : 0
      }
    }
  });
});

// Get exercise library
router.get('/exercises', (req, res) => {
  const { type, muscleGroup } = req.query;

  let results = Object.values(exercises).flat();

  if (type) {
    results = results.filter(e => e.type === type);
  }

  if (muscleGroup) {
    results = results.filter(e => e.muscleGroups.some(m => m.includes(muscleGroup)));
  }

  res.json({
    success: true,
    data: results,
    categories: Object.keys(exercises),
    totalExercises: results.length
  });
});

// Search exercises
router.get('/exercises/search', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ success: false, error: 'Query required' });
  }

  const results = Object.values(exercises).flat().filter(e =>
    e.name.toLowerCase().includes(q.toLowerCase())
  );

  res.json({
    success: true,
    data: results,
    count: results.length
  });
});

// Get workout templates
router.get('/templates', (req, res) => {
  res.json({
    success: true,
    data: Object.entries(workoutTemplates).map(([id, t]) => ({
      id,
      name: t.name,
      difficulty: t.difficulty,
      duration: t.duration,
      exerciseCount: t.exercises.length
    }))
  });
});

// Get specific template
router.get('/templates/:templateId', (req, res) => {
  const { templateId } = req.params;
  const template = workoutTemplates[templateId];

  if (!template) {
    return res.status(404).json({
      success: false,
      error: 'Template not found',
      available: Object.keys(workoutTemplates)
    });
  }

  // Expand exercise references
  const expandedExercises = template.exercises.map(ex => ({
    ...ex,
    exerciseData: findExercise(ex.exercise)
  }));

  res.json({
    success: true,
    data: {
      ...template,
      exercises: expandedExercises
    }
  });
});

// Generate personalized workout plan
router.post('/plan/:userId', (req, res) => {
  const { userId } = req.params;
  const { goal, daysPerWeek, difficulty, equipment } = req.query;

  const goals = {
    strength: ['beginner-full-body', 'strength-hypertrophy'],
    cardio: ['hiit-cardio', 'running'],
    weight_loss: ['hiit-cardio', 'beginner-full-body'],
    maintenance: ['beginner-full-body', 'active-recovery'],
    flexibility: ['yoga', 'stretching']
  };

  const targetDays = parseInt(daysPerWeek) || 4;
  const plan = [];

  for (let d = 0; d < 7 && plan.length < targetDays; d++) {
    const dayTemplates = goals[goal] || goals.maintenance;
    const templateId = dayTemplates[d % dayTemplates.length];
    const template = workoutTemplates[templateId];

    plan.push({
      day: d + 1,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d],
      restDay: d === 0 || d === 3, // Rest on Sunday and Thursday
      workout: d === 0 || d === 3 ? null : {
        ...template,
        exercises: template.exercises.map(ex => ({
          ...ex,
          exerciseData: findExercise(ex.exercise)
        }))
      }
    });
  }

  workoutPlans.set(`${userId}-${Date.now()}`, { userId, plan, createdAt: new Date().toISOString() });

  res.json({
    success: true,
    data: {
      plan,
      summary: {
        totalWorkouts: plan.filter(p => p.workout).length,
        estimatedCalories: plan.filter(p => p.workout)
          .reduce((sum, p) => sum + (p.workout?.duration || 0) * 8, 0)
      }
    }
  });
});

// Log steps
router.post('/steps/:userId', (req, res) => {
  const { userId } = req.params;
  const { steps, distance, activeMinutes } = req.body;

  if (!fitnessRecords.has(userId)) {
    fitnessRecords.set(userId, { userId, workouts: [], stats: {}, weekly: {}, steps: {} });
  }

  const profile = fitnessRecords.get(userId);
  const date = new Date().toISOString().split('T')[0];

  profile.steps = profile.steps || {};
  profile.steps[date] = {
    steps: steps || 0,
    distance: distance || (steps * 0.0005), // Estimate 0.5m per step
    activeMinutes: activeMinutes || 0,
    goal: 10000,
    progress: Math.round(((steps || 0) / 10000) * 100)
  };

  res.json({
    success: true,
    data: profile.steps[date]
  });
});

// Get steps history
router.get('/steps/:userId', (req, res) => {
  const { userId } = req.params;
  const { days = 7 } = req.query;

  const profile = fitnessRecords.get(userId);
  if (!profile || !profile.steps) {
    return res.json({
      success: true,
      data: { history: [], message: 'No steps logged yet' }
    });
  }

  const history = [];
  const today = new Date();

  for (let i = 0; i < parseInt(days); i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    history.push({ date: dateStr, ...profile.steps[dateStr] });
  }

  res.json({
    success: true,
    data: {
      history,
      averages: {
        steps: Math.round(history.reduce((sum, d) => sum + (d.steps || 0), 0) / history.length),
        activeMinutes: Math.round(history.reduce((sum, d) => sum + (d.activeMinutes || 0), 0) / history.length)
      }
    }
  });
});

// Get fitness progress
router.get('/progress/:userId', (req, res) => {
  const { userId } = req.params;

  const profile = fitnessRecords.get(userId);
  if (!profile) {
    return res.status(404).json({ success: false, error: 'No data found' });
  }

  // Calculate progress
  const weeklyGoalMet = profile.weekly.workouts >= (profile.goals?.weeklyWorkouts || 4);
  const minutesProgress = Math.round((profile.weekly.minutes / (profile.goals?.weeklyMinutes || 150)) * 100);
  const caloriesProgress = Math.round((profile.weekly.calories / (profile.goals?.weeklyCalories || 2000)) * 100);

  // Weekly comparison
  const thisWeek = profile.weekly;
  const lastWeekStats = calculateLastWeekStats(profile.workouts);

  res.json({
    success: true,
    data: {
      weekly: profile.weekly,
      goals: profile.goals,
      progress: {
        workouts: Math.min(100, weeklyGoalMet ? 100 : Math.round((profile.weekly.workouts / (profile.goals?.weeklyWorkouts || 4)) * 100)),
        minutes: Math.min(100, minutesProgress),
        calories: Math.min(100, caloriesProgress)
      },
      comparison: {
        workoutsChange: profile.weekly.workouts - lastWeekStats.workouts,
        minutesChange: profile.weekly.minutes - lastWeekStats.minutes,
        caloriesChange: profile.weekly.calories - lastWeekStats.calories
      },
      streak: profile.stats.streak,
      achievements: generateAchievements(profile)
    }
  });
});

// Helper functions
function findExercise(id) {
  for (const category of Object.values(exercises)) {
    const found = category.find(e => e.id === id);
    if (found) return found;
  }
  return null;
}

function getWeekStart() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek;
  const weekStart = new Date(now.setDate(diff));
  return weekStart.toISOString().split('T')[0];
}

function updateWorkoutStreak(workouts) {
  if (!workouts.length) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];

    const hasWorkout = workouts.some(w =>
      new Date(w.timestamp).toISOString().split('T')[0] === dateStr
    );

    if (hasWorkout) streak++;
    else if (i > 0) break;
  }

  return streak;
}

function calculateGoalProgress(profile) {
  if (!profile.goals) return null;

  return {
    workouts: {
      current: profile.weekly.workouts,
      goal: profile.goals.weeklyWorkouts,
      progress: Math.round((profile.weekly.workouts / profile.goals.weeklyWorkouts) * 100)
    },
    minutes: {
      current: profile.weekly.minutes,
      goal: profile.goals.weeklyMinutes,
      progress: Math.round((profile.weekly.minutes / profile.goals.weeklyMinutes) * 100)
    },
    calories: {
      current: profile.weekly.calories,
      goal: profile.goals.weeklyCalories,
      progress: Math.round((profile.weekly.calories / profile.goals.weeklyCalories) * 100)
    }
  };
}

function calculateLastWeekStats(workouts) {
  const lastWeekStart = new Date();
  lastWeekStart.setDate(lastWeekStart.getDate() - 14);
  const lastWeekEnd = new Date();
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

  const lastWeekWorkouts = workouts.filter(w => {
    const d = new Date(w.timestamp);
    return d >= lastWeekStart && d < lastWeekEnd;
  });

  return {
    workouts: lastWeekWorkouts.length,
    minutes: lastWeekWorkouts.reduce((sum, w) => sum + w.duration, 0),
    calories: lastWeekWorkouts.reduce((sum, w) => sum + w.calories, 0)
  };
}

function generateAchievements(profile) {
  const achievements = [];

  if (profile.stats.streak >= 7) achievements.push({ id: 'week-streak', name: '7-Day Streak', icon: '🔥' });
  if (profile.stats.streak >= 30) achievements.push({ id: 'month-streak', name: '30-Day Streak', icon: '💪' });
  if (profile.stats.workouts >= 50) achievements.push({ id: '50-workouts', name: '50 Workouts', icon: '🏆' });
  if (profile.stats.totalMinutes >= 3000) achievements.push({ id: '3000-minutes', name: '3000 Total Minutes', icon: '⏱️' });
  if (profile.stats.totalCalories >= 50000) achievements.push({ id: '50k-calories', name: '50K Calories Burned', icon: '🔥' });

  return achievements;
}

module.exports = router;
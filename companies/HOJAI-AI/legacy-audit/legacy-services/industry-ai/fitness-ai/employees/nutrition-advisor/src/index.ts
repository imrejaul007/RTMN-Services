/**
 * HOJAI Nutrition Advisor AI Employee
 * Creates personalized diet plans, tracks macros, suggests meals
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface NutritionProfile {
  memberId: string;
  name: string;
  age: number;
  gender: string;
  weight: number;
  height: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'weight_loss' | 'weight_gain' | 'maintenance' | 'muscle_gain';
  dietaryRestrictions: string[];
  allergies: string[];
  preferredCuisines: string[];
  mealsPerDay: number;
}

interface DietPlan {
  id: string;
  memberId: string;
  profile: NutritionProfile;
  dailyCalories: number;
  macros: { protein: number; carbs: number; fat: number };
  meals: Meal[];
  restrictions: string[];
  tips: string[];
  createdAt: string;
}

interface Meal {
  name: string;
  time: string;
  calories: number;
  macros: { protein: number; carbs: number; fat: number };
  items: FoodItem[];
  alternatives?: string[];
}

interface FoodItem {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const dietPlans = new Map<string, DietPlan>();

// Generate diet plan
router.post('/generate-plan', async (req, res) => {
  try {
    const { memberId, profile } = req.body;

    if (!profile) {
      return res.status(400).json({ error: 'Nutrition profile required' });
    }

    const plan = generateDietPlan(memberId || uuidv4(), profile);
    dietPlans.set(plan.id, plan);

    res.status(201).json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate diet plan' });
  }
});

// Get plan
router.get('/plans/:id', async (req, res) => {
  try {
    const plan = dietPlans.get(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.json({ plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get plan' });
  }
});

// Get member's plan
router.get('/plans/member/:memberId', async (req, res) => {
  try {
    const plans = Array.from(dietPlans.values())
      .filter(p => p.memberId === req.params.memberId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ plan: plans[0] || null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get plan' });
  }
});

// Get meal suggestion
router.post('/suggest-meal', async (req, res) => {
  try {
    const { calories, restrictions, cuisine } = req.body;

    const meals = generateMealSuggestion(calories, restrictions, cuisine);
    res.json({ meal: meals[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to suggest meal' });
  }
});

// Calculate macros
router.post('/calculate-macros', async (req, res) => {
  try {
    const { weight, goal, activityLevel } = req.body;

    const bmr = calculateBMR(weight, req.body.age || 30, req.body.gender || 'male');
    const tdee = calculateTDEE(bmr, activityLevel);
    const macros = calculateMacros(tdee, goal);

    res.json({
      bmr,
      tdee,
      dailyCalories: adjustForGoal(tdee, goal),
      macros,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate macros' });
  }
});

// Helper functions
function generateDietPlan(memberId: string, profile: NutritionProfile): DietPlan {
  const bmr = calculateBMR(profile.weight, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const dailyCalories = adjustForGoal(tdee, profile.goal);
  const macros = calculateMacros(dailyCalories, profile.goal);

  const meals = generateMeals(profile.mealsPerDay, dailyCalories, profile.dietaryRestrictions, profile.preferredCuisines);

  return {
    id: uuidv4(),
    memberId,
    profile,
    dailyCalories,
    macros,
    meals,
    restrictions: profile.dietaryRestrictions,
    tips: generateNutritionTips(profile.goal),
    createdAt: new Date().toISOString(),
  };
}

function calculateBMR(weight: number, age: number, gender: string): number {
  // Mifflin-St Jeor Equation
  if (gender === 'male') {
    return (10 * weight) + (6.25 * 170) - (5 * age) + 5;
  }
  return (10 * weight) + (6.25 * 160) - (5 * age) - 161;
}

function calculateTDEE(bmr: number, activityLevel: string): number {
  const multipliers: { [key: string]: number } = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activityLevel] || 1.2));
}

function adjustForGoal(tdee: number, goal: string): number {
  switch (goal) {
    case 'weight_loss': return Math.round(tdee * 0.8);
    case 'weight_gain': return Math.round(tdee * 1.15);
    case 'muscle_gain': return Math.round(tdee * 1.1);
    default: return tdee;
  }
}

function calculateMacros(calories: number, goal: string): { protein: number; carbs: number; fat: number } {
  let proteinRatio = 0.3;
  let carbRatio = 0.4;
  let fatRatio = 0.3;

  if (goal === 'muscle_gain') {
    proteinRatio = 0.35;
    carbRatio = 0.4;
    fatRatio = 0.25;
  } else if (goal === 'weight_loss') {
    proteinRatio = 0.4;
    carbRatio = 0.35;
    fatRatio = 0.25;
  }

  return {
    protein: Math.round((calories * proteinRatio) / 4),
    carbs: Math.round((calories * carbRatio) / 4),
    fat: Math.round((calories * fatRatio) / 9),
  };
}

function generateMeals(count: number, totalCalories: number, restrictions: string[], cuisines: string[]): Meal[] {
  const mealNames = count === 3
    ? ['Breakfast', 'Lunch', 'Dinner']
    : count === 4
    ? ['Breakfast', 'Mid-morning', 'Lunch', 'Dinner']
    : ['Breakfast', 'Mid-morning', 'Lunch', 'Snack', 'Dinner'];

  const caloriesPerMeal = totalCalories / count;

  return mealNames.map((name, i) => ({
    name,
    time: getMealTime(i, count),
    calories: Math.round(caloriesPerMeal),
    macros: {
      protein: Math.round(caloriesPerMeal * 0.3 / 4),
      carbs: Math.round(caloriesPerMeal * 0.4 / 4),
      fat: Math.round(caloriesPerMeal * 0.3 / 9),
    },
    items: generateFoodItems(name, caloriesPerMeal, restrictions, cuisines),
  }));
}

function getMealTime(index: number, total: number): string {
  const times = ['7:00 AM', '10:00 AM', '1:00 PM', '4:00 PM', '7:00 PM'];
  const step = Math.floor(5 / total);
  return times[index * step];
}

function generateFoodItems(mealType: string, calories: number, restrictions: string[], cuisines: string[]): FoodItem[] {
  const items: FoodItem[] = [];

  if (mealType.includes('Breakfast')) {
    items.push(
      { name: 'Oats', quantity: '50g', calories: 180, protein: 6, carbs: 30, fat: 3 },
      { name: 'Milk', quantity: '200ml', calories: 100, protein: 8, carbs: 10, fat: 2 },
      { name: 'Banana', quantity: '1 medium', calories: 90, protein: 1, carbs: 23, fat: 0 }
    );
  } else if (mealType.includes('Lunch') || mealType.includes('Mid-morning')) {
    items.push(
      { name: 'Brown Rice', quantity: '150g', calories: 210, protein: 5, carbs: 45, fat: 1 },
      { name: 'Chicken Breast', quantity: '150g', calories: 165, protein: 31, carbs: 0, fat: 3 },
      { name: 'Vegetables', quantity: '200g', calories: 70, protein: 3, carbs: 14, fat: 0 }
    );
  } else {
    items.push(
      { name: 'Rotis', quantity: '2', calories: 180, protein: 6, carbs: 30, fat: 4 },
      { name: 'Dal', quantity: '150g', calories: 120, protein: 8, carbs: 18, fat: 2 },
      { name: 'Salad', quantity: '100g', calories: 30, protein: 1, carbs: 6, fat: 0 }
    );
  }

  return items;
}

function generateMealSuggestion(calories: number, restrictions: string[], cuisine: string): Meal[] {
  return [{
    name: 'Suggested Meal',
    time: '12:00 PM',
    calories,
    macros: {
      protein: Math.round(calories * 0.3 / 4),
      carbs: Math.round(calories * 0.4 / 4),
      fat: Math.round(calories * 0.3 / 9),
    },
    items: generateFoodItems('Lunch', calories, restrictions, cuisine ? [cuisine] : []),
  }];
}

function generateNutritionTips(goal: string): string[] {
  const baseTips = [
    'Drink 3-4 liters of water daily',
    'Eat protein with every meal',
    'Avoid processed foods',
    'Get adequate sleep (7-8 hours)',
  ];

  const goalTips: { [key: string]: string[] } = {
    weight_loss: ['Eat more fiber to feel full', 'Practice mindful eating', 'Avoid late-night snacking'],
    muscle_gain: ['Eat protein within 30 mins of workout', 'Don't fear carbs around workout time', 'Consider protein supplements'],
    weight_gain: ['Eat more frequent meals', 'Add healthy fats like nuts and avocado', 'Don't drink water before meals'],
  };

  return [...baseTips, ...(goalTips[goal] || [])];
}

export { router, dietPlans };
export type { NutritionProfile, DietPlan, Meal, FoodItem };

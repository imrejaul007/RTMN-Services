const express = require('express');
const router = express.Router();

// In-memory nutrition data storage
const nutritionRecords = new Map();
const mealPlans = new Map();
const nutritionGoals = new Map();

// Food database (simplified)
const foodDatabase = {
  proteins: [
    { id: 'chicken-breast', name: 'Chicken Breast', serving: '100g', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    { id: 'salmon', name: 'Salmon', serving: '100g', calories: 208, protein: 20, carbs: 0, fat: 13 },
    { id: 'eggs', name: 'Eggs', serving: '2 large', calories: 156, protein: 12, carbs: 1, fat: 11 },
    { id: 'tofu', name: 'Tofu', serving: '100g', calories: 76, protein: 8, carbs: 2, fat: 4.8 },
    { id: 'greek-yogurt', name: 'Greek Yogurt', serving: '170g', calories: 100, protein: 17, carbs: 6, fat: 0.7 },
    { id: 'beef', name: 'Lean Beef', serving: '100g', calories: 250, protein: 26, carbs: 0, fat: 15 },
    { id: 'lentils', name: 'Lentils', serving: '100g', calories: 116, protein: 9, carbs: 20, fat: 0.4 },
    { id: 'cottage-cheese', name: 'Cottage Cheese', serving: '100g', calories: 98, protein: 11, carbs: 3.4, fat: 4.3 }
  ],
  carbs: [
    { id: 'brown-rice', name: 'Brown Rice', serving: '1 cup', calories: 216, protein: 5, carbs: 45, fat: 1.8 },
    { id: 'oatmeal', name: 'Oatmeal', serving: '1 cup', calories: 158, protein: 6, carbs: 27, fat: 3 },
    { id: 'sweet-potato', name: 'Sweet Potato', serving: '1 medium', calories: 103, protein: 2, carbs: 24, fat: 0.1 },
    { id: 'quinoa', name: 'Quinoa', serving: '1 cup', calories: 222, protein: 8, carbs: 39, fat: 3.5 },
    { id: 'whole-wheat-bread', name: 'Whole Wheat Bread', serving: '2 slices', calories: 160, protein: 8, carbs: 30, fat: 2 },
    { id: 'banana', name: 'Banana', serving: '1 medium', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
    { id: 'apple', name: 'Apple', serving: '1 medium', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
    { id: 'berries', name: 'Mixed Berries', serving: '1 cup', calories: 70, protein: 1.5, carbs: 17, fat: 0.5 }
  ],
  vegetables: [
    { id: 'broccoli', name: 'Broccoli', serving: '1 cup', calories: 55, protein: 3.7, carbs: 11, fat: 0.6 },
    { id: 'spinach', name: 'Spinach', serving: '1 cup', calories: 7, protein: 0.9, carbs: 1.1, fat: 0.1 },
    { id: 'carrots', name: 'Carrots', serving: '1 cup', calories: 52, protein: 1.2, carbs: 12, fat: 0.3 },
    { id: 'bell-peppers', name: 'Bell Peppers', serving: '1 cup', calories: 30, protein: 1, carbs: 6, fat: 0.3 },
    { id: 'kale', name: 'Kale', serving: '1 cup', calories: 33, protein: 2.9, carbs: 6, fat: 0.6 },
    { id: 'cucumber', name: 'Cucumber', serving: '1 cup', calories: 16, protein: 0.7, carbs: 4, fat: 0.1 },
    { id: 'tomatoes', name: 'Tomatoes', serving: '1 cup', calories: 32, protein: 1.6, carbs: 7, fat: 0.4 },
    { id: 'asparagus', name: 'Asparagus', serving: '1 cup', calories: 27, protein: 3, carbs: 5, fat: 0.2 }
  ],
  healthyFats: [
    { id: 'avocado', name: 'Avocado', serving: '1/2', calories: 160, protein: 2, carbs: 9, fat: 15 },
    { id: 'almonds', name: 'Almonds', serving: '1/4 cup', calories: 164, protein: 6, carbs: 6, fat: 14 },
    { id: 'olive-oil', name: 'Olive Oil', serving: '1 tbsp', calories: 119, protein: 0, carbs: 0, fat: 13.5 },
    { id: 'peanut-butter', name: 'Peanut Butter', serving: '2 tbsp', calories: 188, protein: 8, carbs: 6, fat: 16 },
    { id: 'walnuts', name: 'Walnuts', serving: '1/4 cup', calories: 185, protein: 4, carbs: 4, fat: 18 },
    { id: 'chia-seeds', name: 'Chia Seeds', serving: '2 tbsp', calories: 138, protein: 5, carbs: 12, fat: 9 }
  ]
};

// Nutrition requirements
const nutritionRequirements = {
  calories: { min: 1500, max: 3000, unit: 'kcal' },
  protein: { min: 0.8, max: 2.0, unit: 'g/kg body weight' },
  carbs: { min: 45, max: 65, unit: '% of calories' },
  fat: { min: 20, max: 35, unit: '% of calories' },
  fiber: { min: 25, max: 38, unit: 'g/day' },
  water: { min: 8, max: 12, unit: 'glasses/day' }
};

// Set nutrition goals
router.post('/goals/:userId', (req, res) => {
  const { userId } = req.params;
  const { calories, protein, carbs, fat, fiber, water, mealsPerDay, dietType } = req.body;

  const goals = {
    userId,
    calories: calories || 2000,
    protein: protein || null, // Will be calculated from weight
    carbs: carbs || 50, // % of calories
    fat: fat || 30, // % of calories
    fiber: fiber || 30,
    water: water || 8,
    mealsPerDay: mealsPerDay || 3,
    dietType: dietType || 'balanced', // balanced, keto, paleo, vegan, etc.
    createdAt: new Date().toISOString()
  };

  nutritionGoals.set(userId, goals);

  res.json({
    success: true,
    message: 'Nutrition goals set',
    data: goals
  });
});

// Get nutrition goals
router.get('/goals/:userId', (req, res) => {
  const { userId } = req.params;

  const goals = nutritionGoals.get(userId);
  if (!goals) {
    return res.status(404).json({
      success: false,
      error: 'No goals set. Use POST /nutrition/goals/:userId to set goals.'
    });
  }

  res.json({
    success: true,
    data: goals
  });
});

// Log meal
router.post('/meal/:userId', (req, res) => {
  const { userId } = req.params;
  const { mealType, foods, calories, protein, carbs, fat, notes, timestamp } = req.body;

  const meal = {
    id: `meal-${Date.now()}`,
    userId,
    mealType: mealType || 'snack', // breakfast, lunch, dinner, snack
    foods: foods || [],
    macros: { calories: calories || 0, protein: protein || 0, carbs: carbs || 0, fat: fat || 0 },
    notes,
    timestamp: timestamp || new Date().toISOString(),
    date: new Date().toISOString().split('T')[0]
  };

  // Calculate from food database if foods provided
  if (foods && foods.length > 0) {
    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

    for (const foodItem of foods) {
      const food = findFood(foodItem.id);
      if (food) {
        const servings = foodItem.servings || 1;
        totalCalories += food.calories * servings;
        totalProtein += food.protein * servings;
        totalCarbs += food.carbs * servings;
        totalFat += food.fat * servings;
      }
    }

    meal.macros = {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein),
      carbs: Math.round(totalCarbs),
      fat: Math.round(totalFat)
    };
  }

  // Store meal
  if (!nutritionRecords.has(userId)) {
    nutritionRecords.set(userId, { meals: [], dailyTotals: {} });
  }

  const userData = nutritionRecords.get(userId);
  userData.meals.push(meal);

  // Update daily totals
  const date = meal.date;
  if (!userData.dailyTotals[date]) {
    userData.dailyTotals[date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }
  userData.dailyTotals[date].calories += meal.macros.calories;
  userData.dailyTotals[date].protein += meal.macros.protein;
  userData.dailyTotals[date].carbs += meal.macros.carbs;
  userData.dailyTotals[date].fat += meal.macros.fat;

  res.json({
    success: true,
    message: 'Meal logged',
    data: {
      meal,
      dailyTotal: userData.dailyTotals[date],
      goals: nutritionGoals.get(userId),
      remaining: calculateRemaining(userData.dailyTotals[date], nutritionGoals.get(userId))
    }
  });
});

// Get daily nutrition
router.get('/daily/:userId', (req, res) => {
  const { userId } = req.params;
  const { date = new Date().toISOString().split('T')[0] } = req.query;

  const userData = nutritionRecords.get(userId);
  if (!userData) {
    return res.json({
      success: true,
      data: {
        date,
        meals: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        goals: nutritionGoals.get(userId),
        message: 'No meals logged for this day'
      }
    });
  }

  const meals = userData.meals.filter(m => m.date === date);
  const totals = userData.dailyTotals[date] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const goals = nutritionGoals.get(userId);

  res.json({
    success: true,
    data: {
      date,
      meals,
      totals,
      goals,
      remaining: calculateRemaining(totals, goals),
      progress: calculateProgress(totals, goals)
    }
  });
});

// Get weekly nutrition summary
router.get('/weekly/:userId', (req, res) => {
  const { userId } = req.params;

  const userData = nutritionRecords.get(userId);
  if (!userData) {
    return res.status(404).json({
      success: false,
      error: 'No nutrition data found'
    });
  }

  const today = new Date();
  const weekData = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const totals = userData.dailyTotals[dateStr] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    weekData.push({ date: dateStr, ...totals });
  }

  const averages = {
    calories: Math.round(weekData.reduce((sum, d) => sum + d.calories, 0) / 7),
    protein: Math.round(weekData.reduce((sum, d) => sum + d.protein, 0) / 7),
    carbs: Math.round(weekData.reduce((sum, d) => sum + d.carbs, 0) / 7),
    fat: Math.round(weekData.reduce((sum, d) => sum + d.fat, 0) / 7)
  };

  const goals = nutritionGoals.get(userId);

  res.json({
    success: true,
    data: {
      week: weekData,
      averages,
      goals,
      adherence: calculateAdherence(weekData, goals)
    }
  });
});

// Log water intake
router.post('/water/:userId', (req, res) => {
  const { userId } = req.params;
  const { glasses, amount } = req.body;

  const intake = glasses || (amount / 250); // 250ml per glass

  if (!nutritionRecords.has(userId)) {
    nutritionRecords.set(userId, { meals: [], dailyTotals: {}, water: {} });
  }

  const userData = nutritionRecords.get(userId);
  const date = new Date().toISOString().split('T')[0];

  if (!userData.water[date]) {
    userData.water[date] = 0;
  }
  userData.water[date] += intake;

  const goals = nutritionGoals.get(userId);
  const goal = goals?.water || 8;

  res.json({
    success: true,
    data: {
      date,
      glasses: userData.water[date],
      goal,
      remaining: Math.max(0, goal - userData.water[date]),
      progress: Math.round((userData.water[date] / goal) * 100)
    }
  });
});

// Get food database
router.get('/foods', (req, res) => {
  const { category } = req.query;

  if (category && foodDatabase[category]) {
    return res.json({
      success: true,
      data: foodDatabase[category]
    });
  }

  res.json({
    success: true,
    data: foodDatabase,
    categories: Object.keys(foodDatabase)
  });
});

// Search foods
router.get('/foods/search', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      error: 'Search query required'
    });
  }

  const results = [];
  const query = q.toLowerCase();

  for (const [category, foods] of Object.entries(foodDatabase)) {
    for (const food of foods) {
      if (food.name.toLowerCase().includes(query)) {
        results.push({ ...food, category });
      }
    }
  }

  res.json({
    success: true,
    data: results,
    count: results.length
  });
});

// Generate meal plan
router.post('/plan/:userId', (req, res) => {
  const { userId } = req.params;
  const { days = 7, dietType, calories } = req.query;

  const goals = nutritionGoals.get(userId);
  const targetCalories = calories || goals?.calories || 2000;
  const diet = dietType || goals?.dietType || 'balanced';

  const plan = generateMealPlan(parseInt(days), targetCalories, diet);

  mealPlans.set(`${userId}-${Date.now()}`, { userId, plan, createdAt: new Date().toISOString() });

  res.json({
    success: true,
    data: {
      days: parseInt(days),
      targetCalories,
      dietType: diet,
      plan,
      tips: generateMealPlanTips(diet)
    }
  });
});

// Get nutrition insights
router.get('/insights/:userId', (req, res) => {
  const { userId } = req.params;

  const userData = nutritionRecords.get(userId);
  const goals = nutritionGoals.get(userId);

  if (!userData || !userData.meals.length) {
    return res.json({
      success: true,
      data: {
        insights: [],
        message: 'Log more meals to get insights'
      }
    });
  }

  const insights = [];

  // Analyze patterns
  const mealTypes = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  userData.meals.slice(-30).forEach(m => {
    mealTypes[m.mealType]++;
  });

  if (mealTypes.breakfast < 5) {
    insights.push({ type: 'skipping', message: 'You often skip breakfast. Eating breakfast can boost metabolism.' });
  }

  if (mealTypes.snack > 10) {
    insights.push({ type: 'snacking', message: 'High snack frequency. Choose healthy snacks like nuts or fruits.' });
  }

  // Macro analysis
  const avgMacros = calculateAverageMacros(userData.meals.slice(-30));
  if (goals) {
    if (avgMacros.protein < (goals.protein || 100)) {
      insights.push({ type: 'protein', message: 'Your protein intake may be low. Add more lean meats, eggs, or legumes.' });
    }
    if (avgMacros.carbs > 60) {
      insights.push({ type: 'carbs', message: 'Carbs are high. Consider swapping refined carbs for whole grains.' });
    }
  }

  if (insights.length === 0) {
    insights.push({ type: 'good', message: 'Your nutrition looks balanced. Keep up the good work!' });
  }

  res.json({
    success: true,
    data: {
      insights,
      patterns: mealTypes,
      averages: avgMacros
    }
  });
});

// Helper functions
function findFood(id) {
  for (const foods of Object.values(foodDatabase)) {
    const food = foods.find(f => f.id === id);
    if (food) return food;
  }
  return null;
}

function calculateRemaining(totals, goals) {
  if (!goals) return null;

  return {
    calories: Math.max(0, goals.calories - totals.calories),
    protein: Math.max(0, goals.protein - totals.protein),
    carbs: Math.max(0, goals.carbs - totals.carbs),
    fat: Math.max(0, goals.fat - totals.fat)
  };
}

function calculateProgress(totals, goals) {
  if (!goals) return null;

  return {
    calories: Math.min(100, Math.round((totals.calories / goals.calories) * 100)),
    protein: Math.min(100, Math.round((totals.protein / goals.protein) * 100)),
    carbs: Math.min(100, Math.round((totals.carbs / goals.carbs) * 100)),
    fat: Math.min(100, Math.round((totals.fat / goals.fat) * 100))
  };
}

function calculateAdherence(weekData, goals) {
  if (!goals) return null;

  const daysTracked = weekData.filter(d => d.calories > 0).length;
  const withinCalories = weekData.filter(d =>
    d.calories >= goals.calories * 0.9 && d.calories <= goals.calories * 1.1
  ).length;

  return Math.round((withinCalories / daysTracked) * 100);
}

function calculateAverageMacros(meals) {
  if (!meals.length) return { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const totals = meals.reduce((sum, m) => ({
    calories: sum.calories + m.macros.calories,
    protein: sum.protein + m.macros.protein,
    carbs: sum.carbs + m.macros.carbs,
    fat: sum.fat + m.macros.fat
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return {
    calories: Math.round(totals.calories / meals.length),
    protein: Math.round(totals.protein / meals.length),
    carbs: Math.round(totals.carbs / meals.length),
    fat: Math.round(totals.fat / meals.length)
  };
}

function generateMealPlan(days, calories, dietType) {
  const mealsPerDay = 4; // breakfast, lunch, dinner, snack
  const plan = [];

  for (let d = 0; d < days; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    const dayPlan = {
      date: date.toISOString().split('T')[0],
      meals: [
        {
          type: 'breakfast',
          calories: Math.round(calories * 0.25),
          suggestion: dietType === 'keto' ? 'Eggs with avocado' : 'Oatmeal with berries'
        },
        {
          type: 'lunch',
          calories: Math.round(calories * 0.35),
          suggestion: dietType === 'keto' ? 'Grilled chicken salad' : 'Quinoa bowl with vegetables'
        },
        {
          type: 'dinner',
          calories: Math.round(calories * 0.30),
          suggestion: dietType === 'keto' ? 'Salmon with asparagus' : 'Lean protein with roasted vegetables'
        },
        {
          type: 'snack',
          calories: Math.round(calories * 0.10),
          suggestion: dietType === 'keto' ? 'Almonds' : 'Greek yogurt with fruit'
        }
      ]
    };
    plan.push(dayPlan);
  }

  return plan;
}

function generateMealPlanTips(dietType) {
  const tips = {
    balanced: [
      'Include a protein source in every meal',
      'Fill half your plate with vegetables',
      'Choose whole grains over refined carbs',
      'Stay hydrated throughout the day'
    ],
    keto: [
      'Keep carbs under 20g per day',
      'Focus on healthy fats from avocados, nuts, olive oil',
      'Include leafy greens in every meal',
      'Stay hydrated and supplement electrolytes'
    ],
    vegan: [
      'Combine proteins (beans + grains) for complete amino acids',
      'Include fortified foods for B12',
      'Eat a variety of colorful vegetables',
      'Consider protein supplements if athletic'
    ],
    paleo: [
      'Eat whole foods, avoid processed items',
      'Focus on grass-fed, organic when possible',
      'Include organ meats for nutrients',
      'Avoid dairy and grains'
    ]
  };

  return tips[dietType] || tips.balanced;
}

module.exports = router;
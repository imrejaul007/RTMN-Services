import OpenAI from 'openai';
import { config } from '../config';
import { AgentConfig } from '../models';
import { AgentType } from '../types';

export interface DietPlan {
  calories: number;
  macros: { protein: number; carbs: number; fat: number };
  meals: Array<{
    name: string;
    foods: string[];
    calories: number;
    timing: string;
  }>;
  restrictions: string[];
  tips: string[];
}

export class DietitianAgent {
  private openai: OpenAI;
  private agentType: AgentType = 'dietitian';

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async generateDietPlan(
    patientData: {
      age: number;
      gender: string;
      weight: number;
      height: number;
      activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
      healthGoals: string[];
      conditions: string[];
      allergies: string[];
      preferences: string[];
    }
  ): Promise<DietPlan> {
    // Calculate BMR using Mifflin-St Jeor
    let bmr: number;
    if (patientData.gender.toLowerCase() === 'male') {
      bmr = 10 * patientData.weight + 6.25 * patientData.height - 5 * patientData.age + 5;
    } else {
      bmr = 10 * patientData.weight + 6.25 * patientData.height - 5 * patientData.age - 161;
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    let tdee = bmr * activityMultipliers[patientData.activityLevel];

    // Adjust for goals
    let calories = tdee;
    if (patientData.healthGoals.includes('weight_loss')) {
      calories *= 0.8; // 20% deficit
    } else if (patientData.healthGoals.includes('weight_gain')) {
      calories *= 1.15; // 15% surplus
    }

    // Calculate macros
    const macros = {
      protein: Math.round(patientData.weight * 1.6), // g per kg body weight
      carbs: Math.round((calories * 0.5) / 4), // 50% of calories
      fat: Math.round((calories * 0.25) / 9), // 25% of calories
    };

    return {
      calories: Math.round(calories),
      macros,
      meals: this.generateMealPlan(macros, patientData.preferences),
      restrictions: [...patientData.allergies, ...patientData.conditions],
      tips: this.generateTips(patientData.healthGoals, patientData.conditions),
    };
  }

  private generateMealPlan(
    macros: { protein: number; carbs: number; fat: number },
    preferences: string[]
  ): DietPlan['meals'] {
    const proteinSources = preferences.includes('vegetarian')
      ? ['Paneer', 'Lentils', 'Chickpeas', 'Tofu']
      : ['Chicken', 'Fish', 'Eggs', 'Lean meat'];

    const carbSources = ['Brown rice', 'Whole wheat roti', 'Oats', 'Quinoa'];
    const vegOptions = ['Mixed vegetables', 'Spinach', 'Broccoli', 'Salad'];

    return [
      {
        name: 'Breakfast',
        timing: '7:00 - 8:00 AM',
        calories: Math.round(macros.protein * 10 + macros.carbs * 0.3),
        foods: [
          `${Math.round(macros.protein / 4)} ${proteinSources[0]} dishes`,
          `${Math.round(macros.carbs * 0.3 / 10)}g oats or upma`,
          '1 glass milk',
        ],
      },
      {
        name: 'Mid-Morning Snack',
        timing: '10:30 - 11:00 AM',
        calories: Math.round(macros.protein * 5 + macros.fat * 3),
        foods: [
          '1 handful nuts (almonds, walnuts)',
          '1 fruit (apple/banana)',
        ],
      },
      {
        name: 'Lunch',
        timing: '1:00 - 2:00 PM',
        calories: Math.round(macros.protein * 15 + macros.carbs * 0.4),
        foods: [
          `${Math.round(macros.protein / 3)}g ${proteinSources[1]}`,
          `${Math.round(macros.carbs * 0.4 / 10)}g ${carbSources[0]}`,
          '1 bowl ${vegOptions[0]}',
          'Salad',
        ],
      },
      {
        name: 'Evening Snack',
        timing: '4:00 - 5:00 PM',
        calories: Math.round(macros.protein * 5 + macros.carbs * 0.1),
        foods: [
          '1 cup green tea',
          '2 whole wheat biscuits or roasted chana',
        ],
      },
      {
        name: 'Dinner',
        timing: '8:00 - 9:00 PM',
        calories: Math.round(macros.protein * 12 + macros.carbs * 0.2),
        foods: [
          `${Math.round(macros.protein / 4)}g ${proteinSources[2] || proteinSources[0]}`,
          `${Math.round(macros.carbs * 0.2 / 10)}g ${carbSources[1] || carbSources[0]}`,
          '1 bowl ${vegOptions[1]}',
        ],
      },
    ];
  }

  private generateTips(goals: string[], conditions: string[]): string[] {
    const tips: string[] = [];

    if (goals.includes('weight_loss')) {
      tips.push(
        'Drink 2-3 liters of water daily',
        'Avoid refined sugars and processed foods',
        'Include 30 minutes of exercise daily'
      );
    }

    if (goals.includes('diabetes')) {
      tips.push(
        'Choose low glycemic index foods',
        'Eat at regular intervals',
        'Monitor carbohydrate intake'
      );
    }

    if (goals.includes('heart_health')) {
      tips.push(
        'Reduce sodium intake',
        'Choose heart-healthy fats (olive oil, nuts)',
        'Limit fried foods'
      );
    }

    tips.push(
      'Chew food thoroughly',
      'Eat slowly and mindfully',
      'Avoid eating 2-3 hours before bedtime'
    );

    return tips;
  }

  async calculateMacros(
    calories: number,
    goal: 'balanced' | 'high_protein' | 'low_carb' | 'keto'
  ): Promise<{ protein: number; carbs: number; fat: number }> {
    switch (goal) {
      case 'high_protein':
        return {
          protein: Math.round((calories * 0.35) / 4),
          carbs: Math.round((calories * 0.35) / 4),
          fat: Math.round((calories * 0.30) / 9),
        };
      case 'low_carb':
        return {
          protein: Math.round((calories * 0.30) / 4),
          carbs: Math.round((calories * 0.20) / 4),
          fat: Math.round((calories * 0.50) / 9),
        };
      case 'keto':
        return {
          protein: Math.round((calories * 0.25) / 4),
          carbs: Math.round((calories * 0.05) / 4),
          fat: Math.round((calories * 0.70) / 9),
        };
      default:
        return {
          protein: Math.round((calories * 0.25) / 4),
          carbs: Math.round((calories * 0.50) / 4),
          fat: Math.round((calories * 0.25) / 9),
        };
    }
  }
}

export const dietitianAgent = new DietitianAgent();

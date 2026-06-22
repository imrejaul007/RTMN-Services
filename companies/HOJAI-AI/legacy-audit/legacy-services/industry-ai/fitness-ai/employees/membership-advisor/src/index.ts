/**
 * HOJAI Membership Advisor AI Employee
 * Recommends membership plans, handles renewals, suggests upgrades
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface MemberProfile {
  memberId: string;
  name: string;
  phone: string;
  currentPlan: string;
  joinDate: string;
  attendanceRate: number;
  classBookings: number;
  hasPersonalTraining: boolean;
  interestedInClasses: boolean;
  interestedInSpa: boolean;
  referralCount: number;
}

interface PlanRecommendation {
  member: MemberProfile;
  currentPlan: string;
  recommendedPlan: string;
  reasoning: string[];
  benefits: string[];
  priceDifference: number;
  urgency: 'now' | 'at_renewal' | 'optional';
  confidence: number; // 0-100
}

const recommendations = new Map<string, PlanRecommendation>();

// Recommend plan upgrade
router.post('/recommend', async (req, res) => {
  try {
    const { member } = req.body;

    if (!member) {
      return res.status(400).json({ error: 'Member profile required' });
    }

    const recommendation = generateRecommendation(member);
    recommendations.set(member.memberId, recommendation);

    res.json({ recommendation });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate recommendation' });
  }
});

// Get recommendation for member
router.get('/recommendation/:memberId', async (req, res) => {
  try {
    const rec = recommendations.get(req.params.memberId);
    if (!rec) {
      return res.status(404).json({ error: 'No recommendation found' });
    }
    res.json({ recommendation: rec });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recommendation' });
  }
});

// Handle renewal inquiry
router.post('/renewal', async (req, res) => {
  try {
    const { memberId, currentPlan, action } = req.body;

    let response: { message: string; offer?: string; newPlan?: string };

    switch (action) {
      case 'upgrade':
        response = {
          message: 'Great choice! Let me show you the upgrade options.',
          newPlan: 'Elite',
        };
        break;
      case 'maintain':
        response = {
          message: 'No problem! Your current plan will be renewed.',
          offer: 'Get 10% off when you renew annually!',
        };
        break;
      case 'downgrade':
        response = {
          message: 'I understand. Here are the options for a smaller commitment.',
          newPlan: 'Basic',
        };
        break;
      default:
        response = {
          message: 'I can help you with your renewal. What would you like to do?',
        };
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process renewal' });
  }
});

// Calculate lifetime value
router.get('/ltv/:memberId', async (req, res) => {
  try {
    const { attendanceRate, joinDate, currentPlan } = req.query;

    const joinDateParsed = new Date(joinDate as string);
    const monthsActive = Math.floor(
      (Date.now() - joinDateParsed.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    const planPrices: { [key: string]: number } = {
      Basic: 999,
      Premium: 1999,
      Elite: 3999,
    };

    const monthlyValue = planPrices[currentPlan as string] || 1999;
    const currentLTV = monthlyValue * monthsActive;

    // Predict future value
    const attendanceFactor = parseInt(attendanceRate as string) / 100;
    const churnRisk = 1 - attendanceFactor;
    const predictedMonths = Math.round(12 / (1 + churnRisk));
    const predictedLTV = monthlyValue * predictedMonths;

    res.json({
      currentLTV,
      monthsActive,
      predictedLTV,
      recommendation: predictedLTV > 20000 ? 'High-value member - prioritize retention' : 'Growth opportunity',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate LTV' });
  }
});

// Get referral incentive
router.get('/referral/:memberId', async (req, res) => {
  try {
    const { referralCount } = req.query;

    const count = parseInt(referralCount as string) || 0;
    let incentive = '1 month free';

    if (count >= 10) {
      incentive = '3 months free + personal training session';
    } else if (count >= 5) {
      incentive = '2 months free';
    } else if (count >= 3) {
      incentive = '1 month free + 10% off';
    }

    res.json({
      referralCount: count,
      nextIncentive: incentive,
      progressToNext: count % 5 === 0 ? 0 : 5 - (count % 5),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get referral info' });
  }
});

// Helper functions
function generateRecommendation(member: MemberProfile): PlanRecommendation {
  const reasoning: string[] = [];
  const benefits: string[] = [];

  let recommendedPlan = member.currentPlan;
  let urgency: 'now' | 'at_renewal' | 'optional' = 'optional';
  let confidence = 50;

  // Analyze usage patterns
  if (member.classBookings >= 10 && member.currentPlan === 'Basic') {
    recommendedPlan = 'Premium';
    reasoning.push('You\'ve been attending 10+ classes but don\'t have class access');
    benefits.push('Access to unlimited group classes', 'Save ₹2000/month vs pay-per-class');
    urgency = 'now';
    confidence = 85;
  }

  if (member.hasPersonalTraining && member.currentPlan === 'Basic') {
    recommendedPlan = 'Elite';
    reasoning.push('You\'re using personal training services');
    benefits.push('2 personal training sessions included', 'Priority booking for all classes');
    urgency = 'now';
    confidence = 90;
  }

  if (member.attendanceRate >= 80 && member.currentPlan === 'Premium' && !member.hasPersonalTraining) {
    recommendedPlan = 'Elite';
    reasoning.push('You\'re a highly active member who would benefit from personal training');
    benefits.push('2 personal training sessions/month', 'Spa access included', '20% cafe discount');
    urgency = 'at_renewal';
    confidence = 75;
  }

  if (member.interestedInSpa && !member.currentPlan.includes('Elite')) {
    recommendedPlan = 'Elite';
    reasoning.push('You\'ve shown interest in spa services');
    benefits.push('Unlimited spa access', 'Premium locker', 'Priority booking');
    urgency = 'at_renewal';
    confidence = 70;
  }

  // Check for upgrade opportunity at renewal
  if (member.attendanceRate >= 60 && member.currentPlan === 'Basic') {
    reasoning.push('High engagement suggests you\'d benefit from Premium features');
    benefits.push('Group class access', 'Guest passes', 'Better locker');
    urgency = 'at_renewal';
    confidence = 65;
  }

  return {
    member,
    currentPlan: member.currentPlan,
    recommendedPlan,
    reasoning,
    benefits,
    priceDifference: getPriceDifference(member.currentPlan, recommendedPlan),
    urgency,
    confidence,
  };
}

function getPriceDifference(current: string, recommended: string): number {
  const prices: { [key: string]: number } = {
    Basic: 999,
    Premium: 1999,
    Elite: 3999,
  };
  return prices[recommended] - prices[current];
}

export { router, recommendations };
export type { MemberProfile, PlanRecommendation };

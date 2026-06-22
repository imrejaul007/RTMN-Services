/**
 * HOJAI Retention Manager AI Employee
 * Predicts churn, identifies at-risk members, runs re-engagement campaigns
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface MemberActivity {
  memberId: string;
  name: string;
  phone: string;
  membershipPlan: string;
  joinDate: string;
  lastVisit?: string;
  attendanceRate: number;
  classBookings: number;
  checkInsLast30Days: number;
  avgVisitsPerWeek: number;
  renewalDate: string;
  complaints?: number;
  gaps: number[]; // days of inactivity
}

interface AtRiskMember {
  member: MemberActivity;
  riskScore: number; // 0-100
  riskFactors: string[];
  recommendedActions: string[];
  priority: 'high' | 'medium' | 'low';
}

interface Campaign {
  id: string;
  type: 'reengagement' | 'upsell' | 'winback' | 'milestone';
  targetCriteria: string;
  memberCount: number;
  message: string;
  sent: number;
  responded: number;
  converted: number;
  createdAt: string;
}

const atRiskMembers = new Map<string, AtRiskMember>();
const campaigns = new Map<string, Campaign>();

// Analyze members for churn risk
router.post('/analyze', async (req, res) => {
  try {
    const { members } = req.body;

    if (!members || !Array.isArray(members)) {
      return res.status(400).json({ error: 'Members array required' });
    }

    const risks = members.map(member => analyzeMemberRisk(member));
    risks.sort((a, b) => b.riskScore - a.riskScore);

    // Store high-risk members
    risks.filter(r => r.priority === 'high').forEach(r => {
      atRiskMembers.set(r.member.memberId, r);
    });

    res.json({
      summary: {
        totalAnalyzed: members.length,
        highRisk: risks.filter(r => r.priority === 'high').length,
        mediumRisk: risks.filter(r => r.priority === 'medium').length,
        lowRisk: risks.filter(r => r.priority === 'low').length,
      },
      atRiskMembers: risks.filter(r => r.priority !== 'low').slice(0, 20),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze retention risk' });
  }
});

// Get at-risk members
router.get('/at-risk', async (req, res) => {
  try {
    const { priority, limit } = req.query;
    let members = Array.from(atRiskMembers.values());

    if (priority) {
      members = members.filter(m => m.priority === priority);
    }

    members.sort((a, b) => b.riskScore - a.riskScore);

    res.json({
      members: members.slice(0, parseInt(limit as string) || 20),
      count: members.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get at-risk members' });
  }
});

// Generate re-engagement campaign
router.post('/campaigns/generate', async (req, res) => {
  try {
    const { type, memberIds } = req.body;

    const members = memberIds?.length
      ? memberIds.map(id => atRiskMembers.get(id)).filter(Boolean)
      : Array.from(atRiskMembers.values()).filter(m => m.priority !== 'low');

    const campaign = generateCampaign(type || 'reengagement', members);

    campaigns.set(campaign.id, campaign);

    res.status(201).json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate campaign' });
  }
});

// Get campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const allCampaigns = Array.from(campaigns.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ campaigns: allCampaigns });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
});

// Track campaign response
router.post('/campaigns/:id/track', async (req, res) => {
  try {
    const { responded, converted } = req.body;
    const campaign = campaigns.get(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (responded) campaign.responded += responded;
    if (converted) campaign.converted += converted;

    campaigns.set(campaign.id, campaign);

    res.json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track campaign' });
  }
});

// Milestone celebration
router.get('/milestone/:memberId', async (req, res) => {
  try {
    const { type } = req.query;

    // This would normally fetch member data
    const milestones = [
      { type: 'first_month', message: 'Congratulations on completing your first month! 🎉' },
      { type: 'three_months', message: '3 months strong! You\'re building great habits! 💪' },
      { type: 'six_months', message: 'Half a year! Your dedication is inspiring! 🏆' },
      { type: 'one_year', message: 'ONE YEAR! You\'re a fitness champion! 🎊' },
      { type: 'ten_workouts', message: '10 workouts completed! Keep it up! 🔥' },
      { type: 'fifty_workouts', message: '50 workouts! You\'re unstoppable! 💯' },
    ];

    const milestone = milestones.find(m => m.type === type) || milestones[0];
    res.json(milestone);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get milestone' });
  }
});

// Helper functions
function analyzeMemberRisk(member: MemberActivity): AtRiskMember {
  const riskFactors: string[] = [];
  let riskScore = 0;

  // Check days since last visit
  if (member.lastVisit) {
    const daysSinceVisit = Math.floor(
      (Date.now() - new Date(member.lastVisit).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceVisit > 14) riskScore += 30;
    if (daysSinceVisit > 7) riskFactors.push('No visit in 7+ days');
    if (daysSinceVisit > 14) riskFactors.push('No visit in 2+ weeks');
  }

  // Check attendance rate
  if (member.attendanceRate < 40) {
    riskScore += 25;
    riskFactors.push(`Low attendance rate: ${member.attendanceRate}%`);
  } else if (member.attendanceRate < 60) {
    riskScore += 10;
    riskFactors.push(`Below average attendance: ${member.attendanceRate}%`);
  }

  // Check renewal date proximity
  const daysToRenewal = Math.floor(
    (new Date(member.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysToRenewal <= 7 && member.attendanceRate < 60) {
    riskScore += 20;
    riskFactors.push('Renewal soon + low attendance (likely to churn)');
  } else if (daysToRenewal <= 14) {
    riskScore += 10;
  }

  // Check gaps in visits
  if (member.gaps && member.gaps.length > 0) {
    const largeGaps = member.gaps.filter(g => g > 7).length;
    if (largeGaps >= 2) {
      riskScore += 15;
      riskFactors.push(`${largeGaps} gaps of 7+ days in recent visits`);
    }
  }

  // Check class bookings
  if (member.classBookings === 0 && member.checkInsLast30Days > 5) {
    riskScore += 10;
    riskFactors.push('Not booking classes (missing engagement)');
  }

  // Complaints
  if (member.complaints && member.complaints > 0) {
    riskScore += member.complaints * 5;
    riskFactors.push(`${member.complaints} complaint(s) on record`);
  }

  // Cap at 100
  riskScore = Math.min(100, riskScore);

  const priority: 'high' | 'medium' | 'low' =
    riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';

  const recommendedActions = getRecommendedActions(riskScore, member);

  return {
    member,
    riskScore,
    riskFactors,
    recommendedActions,
    priority,
  };
}

function getRecommendedActions(riskScore: number, member: MemberActivity): string[] {
  const actions: string[] = [];

  if (riskScore >= 50) {
    actions.push('Personal call from fitness consultant');
    actions.push('Send special re-engagement offer (20% off renewal)');
    actions.push('SMS with motivation message');
  }

  if (member.attendanceRate < 50) {
    actions.push('Send personalized workout plan');
    actions.push('Recommend group classes for social motivation');
  }

  if (member.renewalDate) {
    actions.push('Call within 48 hours before renewal');
    actions.push('Send renewal reminder with upgrade options');
  }

  actions.push('Add to "We miss you" email sequence');

  return actions;
}

function generateCampaign(type: string, members: AtRiskMember[]): Campaign {
  const messages: { [key: string]: string } = {
    reengagement: 'We miss you at the gym! Come back and enjoy a free session on us. Reply RESUME to activate.',
    winback: 'It\'s been a while! Get 25% off your next month when you return this week.',
    upsell: 'You\'ve been crushing your workouts! Upgrade to Elite and unlock personal training sessions.',
    milestone: '🎉 Congratulations on reaching {count} workouts! Here\'s a special reward just for you.',
  };

  const criteria: { [key: string]: string } = {
    reengagement: 'No visit in 14+ days',
    winback: 'No visit in 30+ days + membership expired',
    upsell: 'Attendance >70% + Elite plan available',
    milestone: 'Workout milestone reached',
  };

  return {
    id: uuidv4(),
    type,
    targetCriteria: criteria[type] || 'All at-risk members',
    memberCount: members.length,
    message: messages[type] || messages.reengagement,
    sent: 0,
    responded: 0,
    converted: 0,
    createdAt: new Date().toISOString(),
  };
}

export { router, atRiskMembers, campaigns };
export type { MemberActivity, AtRiskMember, Campaign };

/**
 * HOJAI Campaign Manager AI Employee
 * Creates promotions, manages loyalty programs, sends campaigns
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Campaign {
  id: string;
  name: string;
  type: 'promotion' | 'loyalty' | 'seasonal' | 'winback' | 'new_service';
  targetCriteria: string;
  discount?: number;
  bonusPoints?: number;
  validFrom: string;
  validTo: string;
  message: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  sent: number;
  redeemed: number;
  revenue: number;
  createdAt: string;
}

interface LoyaltyMember {
  customerId: string;
  name: string;
  phone: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalSpent: number;
  visits: number;
  referralCount: number;
  lastEarned?: string;
  lastRedeemed?: string;
}

interface LoyaltyReward {
  id: string;
  name: string;
  points: number;
  description: string;
  category: string;
  stock?: number;
  active: boolean;
}

const campaigns = new Map<string, Campaign>();
const loyaltyMembers = new Map<string, LoyaltyMember>();
const rewards = new Map<string, LoyaltyReward>();

// Initialize default rewards
function initRewards(): void {
  const defaultRewards: Omit<LoyaltyReward, 'id'>[] = [
    { name: 'Free Haircut', points: 500, description: 'Any basic haircut free', category: 'Hair', active: true },
    { name: '20% Off', points: 300, description: '20% off any service', category: 'All', active: true },
    { name: 'Free Facial', points: 1000, description: 'Complimentary facial session', category: 'Skin', active: true },
    { name: 'Free Massage', points: 1500, description: '30-min head massage free', category: 'Spa', active: true },
    { name: '₹500 Off', points: 200, description: '₹500 off on bill above ₹2000', category: 'All', active: true },
  ];

  defaultRewards.forEach(r => {
    rewards.set(r.name, { ...r, id: uuidv4() });
  });
}

initRewards();

// Create campaign
router.post('/campaigns', async (req, res) => {
  try {
    const campaign: Campaign = {
      ...req.body,
      id: uuidv4(),
      status: 'draft',
      sent: 0,
      redeemed: 0,
      revenue: 0,
      createdAt: new Date().toISOString(),
    };

    campaigns.set(campaign.id, campaign);
    res.status(201).json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Launch campaign
router.post('/campaigns/:id/launch', async (req, res) => {
  try {
    const campaign = campaigns.get(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    campaign.status = 'active';
    campaigns.set(campaign.id, campaign);

    res.json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ error: 'Failed to launch campaign' });
  }
});

// Get campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const { status, type } = req.query;
    let result = Array.from(campaigns.values());

    if (status) result = result.filter(c => c.status === status);
    if (type) result = result.filter(c => c.type === type);

    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ campaigns: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
});

// Generate seasonal campaign
router.post('/campaigns/generate', async (req, res) => {
  try {
    const { season, type } = req.body;

    const seasonCampaigns: { [key: string]: Partial<Campaign> } = {
      summer: {
        name: 'Summer Glow Special',
        type: 'seasonal',
        discount: 15,
        message: 'Beat the heat with our summer facial packages! 15% off all facials this month.',
        targetCriteria: 'All customers',
      },
      monsoon: {
        name: 'Monsoon Hair Care',
        type: 'seasonal',
        discount: 20,
        message: 'Rainy season hair care - Get 20% off hair treatments!',
        targetCriteria: 'Customers who had hair services',
      },
      festive: {
        name: 'Festive Season Offer',
        type: 'promotion',
        discount: 25,
        message: 'Celebrate with us! 25% off on all bridal and occasion makeup.',
        targetCriteria: 'All customers',
      },
      birthday: {
        name: 'Happy Birthday!',
        type: 'loyalty',
        discount: 30,
        message: 'Happy Birthday! Enjoy 30% off on your special day.',
        targetCriteria: 'Birthday this month',
      },
    };

    const template = seasonCampaigns[season] || seasonCampaigns.festive;

    const campaign: Campaign = {
      ...template,
      id: uuidv4(),
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft',
      sent: 0,
      redeemed: 0,
      revenue: 0,
      createdAt: new Date().toISOString(),
    } as Campaign;

    campaigns.set(campaign.id, campaign);

    res.status(201).json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate campaign' });
  }
});

// Loyalty management
router.post('/loyalty/enroll', async (req, res) => {
  try {
    const { customerId, name, phone } = req.body;

    const member: LoyaltyMember = {
      customerId,
      name,
      phone,
      points: 0,
      tier: 'bronze',
      totalSpent: 0,
      visits: 0,
      referralCount: 0,
    };

    loyaltyMembers.set(customerId, member);

    res.status(201).json({ success: true, member });
  } catch (error) {
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

router.get('/loyalty/:customerId', async (req, res) => {
  try {
    const member = loyaltyMembers.get(req.params.customerId);
    if (!member) {
      return res.status(404).json({ error: 'Not enrolled in loyalty' });
    }

    const availableRewards = Array.from(rewards.values())
      .filter(r => r.active && r.points <= member.points);

    res.json({ member, availableRewards });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get loyalty info' });
  }
});

// Earn points
router.post('/loyalty/:customerId/earn', async (req, res) => {
  try {
    const { amount, service } = req.body;
    const member = loyaltyMembers.get(req.params.customerId);

    if (!member) {
      return res.status(404).json({ error: 'Not enrolled in loyalty' });
    }

    // Earn 1 point per ₹10 spent
    const earnedPoints = Math.floor(amount / 10);
    member.points += earnedPoints;
    member.totalSpent += amount;
    member.visits += 1;
    member.lastEarned = new Date().toISOString();

    // Update tier
    member.tier = getTier(member.totalSpent);

    loyaltyMembers.set(req.params.customerId, member);

    res.json({
      success: true,
      earnedPoints,
      totalPoints: member.points,
      tier: member.tier,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to earn points' });
  }
});

// Redeem points
router.post('/loyalty/:customerId/redeem', async (req, res) => {
  try {
    const { rewardName } = req.body;
    const member = loyaltyMembers.get(req.params.customerId);
    const reward = rewards.get(rewardName);

    if (!member) {
      return res.status(404).json({ error: 'Not enrolled in loyalty' });
    }

    if (!reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    if (member.points < reward.points) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    member.points -= reward.points;
    member.lastRedeemed = new Date().toISOString();

    loyaltyMembers.set(req.params.customerId, member);

    res.json({
      success: true,
      redeemed: reward.name,
      remainingPoints: member.points,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to redeem' });
  }
});

// Get rewards
router.get('/rewards', async (req, res) => {
  try {
    const { active } = req.query;
    let result = Array.from(rewards.values());

    if (active !== undefined) {
      result = result.filter(r => r.active === (active === 'true'));
    }

    res.json({ rewards: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rewards' });
  }
});

// Helper
function getTier(totalSpent: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (totalSpent >= 50000) return 'platinum';
  if (totalSpent >= 25000) return 'gold';
  if (totalSpent >= 10000) return 'silver';
  return 'bronze';
}

export { router, campaigns, loyaltyMembers, rewards };
export type { Campaign, LoyaltyMember, LoyaltyReward };

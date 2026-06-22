/**
 * Industry Routes
 */
import { Router } from 'express';

const router = Router();

// All supported industries
const INDUSTRIES = [
  { id: 'legal', name: 'Legal OS', twinCount: 4, agentCount: 4 },
  { id: 'healthcare', name: 'Healthcare OS', twinCount: 4, agentCount: 4 },
  { id: 'finance', name: 'Finance OS', twinCount: 4, agentCount: 4 },
  { id: 'retail', name: 'Retail OS', twinCount: 4, agentCount: 4 },
  { id: 'education', name: 'Education OS', twinCount: 4, agentCount: 4 },
  { id: 'manufacturing', name: 'Manufacturing OS', twinCount: 4, agentCount: 4 },
  { id: 'realestate', name: 'Real Estate OS', twinCount: 4, agentCount: 4 },
  { id: 'travel', name: 'Travel OS', twinCount: 4, agentCount: 4 },
  { id: 'restaurant', name: 'Restaurant OS', twinCount: 4, agentCount: 4 },
  { id: 'fitness', name: 'Fitness OS', twinCount: 4, agentCount: 4 },
  { id: 'automotive', name: 'Automotive OS', twinCount: 4, agentCount: 4 },
  { id: 'entertainment', name: 'Entertainment OS', twinCount: 4, agentCount: 4 },
  { id: 'gaming', name: 'Gaming OS', twinCount: 4, agentCount: 4 },
  { id: 'agriculture', name: 'Agriculture OS', twinCount: 4, agentCount: 4 },
  { id: 'construction', name: 'Construction OS', twinCount: 4, agentCount: 4 },
  { id: 'beauty', name: 'Beauty OS', twinCount: 4, agentCount: 4 },
  { id: 'fashion', name: 'Fashion OS', twinCount: 4, agentCount: 4 },
  { id: 'sports', name: 'Sports OS', twinCount: 4, agentCount: 4 },
  { id: 'government', name: 'Government OS', twinCount: 4, agentCount: 4 },
  { id: 'homeservices', name: 'Home Services OS', twinCount: 4, agentCount: 4 },
  { id: 'professional', name: 'Professional Services OS', twinCount: 4, agentCount: 4 },
  { id: 'nonprofit', name: 'Non-Profit OS', twinCount: 4, agentCount: 4 },
  { id: 'media', name: 'Media OS', twinCount: 4, agentCount: 4 },
  { id: 'energy', name: 'Energy OS', twinCount: 4, agentCount: 4 }
];

// Get all industries
router.get('/', async (req, res) => {
  try {
    res.json({
      industries: INDUSTRIES,
      count: INDUSTRIES.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch industries' });
  }
});

// Get specific industry
router.get('/:industryId', async (req, res) => {
  try {
    const { industryId } = req.params;
    const industry = INDUSTRIES.find(i => i.id === industryId);
    
    if (!industry) {
      return res.status(404).json({ error: 'Industry not found' });
    }
    
    res.json(industry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch industry' });
  }
});

// Get industry twins
router.get('/:industryId/twins', async (req, res) => {
  try {
    const { industryId } = req.params;
    
    res.json({
      industry: industryId,
      twins: [],
      count: 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch twins' });
  }
});

// Get industry agents
router.get('/:industryId/agents', async (req, res) => {
  try {
    const { industryId } = req.params;
    
    res.json({
      industry: industryId,
      agents: [],
      count: 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Get industry metrics
router.get('/:industryId/metrics', async (req, res) => {
  try {
    const { industryId } = req.params;
    
    res.json({
      industry: industryId,
      metrics: {
        totalTwins: 0,
        activeTwins: 0,
        totalAgents: 0,
        tasksCompleted: 0,
        avgResponseTime: 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

export default router;

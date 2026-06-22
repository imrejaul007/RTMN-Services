import { Router, Request, Response } from 'express';
import { persona } from '../persona';
import type { ChatRequest, ChatResponse } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, history = [], metadata = {} } = req.body as ChatRequest;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const pendingTasks = metadata.pendingTasks || 0;
    const userProfile = metadata.userProfile;

    let nudgeMessage = '';
    let actionButton = '';
    let urgency: 'high' | 'medium' | 'low' = 'medium';

    if (pendingTasks > 10 || userProfile?.status === 'Overwhelmed') {
      nudgeMessage = `Hey! You've got ${pendingTasks} pending items. Instead of showing you all of them, I've identified the 1 most critical task. Let's start there.`;
      actionButton = 'Tackle the Most Important Task';
      urgency = 'high';
    } else if (pendingTasks > 0) {
      nudgeMessage = `You have ${pendingTasks} pending items. Here's your single next action: [Task Title]. Quick and easy wins first!`;
      actionButton = 'Start Now';
      urgency = 'medium';
    } else {
      nudgeMessage = 'All caught up! Great work staying on top of things.';
    }

    const response: ChatResponse = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: `Behavioral Nudge response: ${message}`,
      nudge: {
        channel: userProfile?.preferredChannel || 'IN_APP',
        message: nudgeMessage,
        actionButton: actionButton || undefined,
        urgency: urgency,
        followUpSchedule: ['Day 1: SMS', 'Day 3: Email', 'Day 7: In-App Banner']
      },
      userPreferences: {
        channel: userProfile?.preferredChannel || 'IN_APP',
        frequency: userProfile?.communicationFrequency || 'DAILY',
        tone: 'encouraging',
        motivationalStyle: userProfile?.motivationalTriggers?.includes('gamification') ? 'gamification' : 'direct_instruction'
      },
      microSprint: {
        task: 'Focus on one task at a time',
        duration: '5 minutes',
        encouragement: "You've got this! Let's see how much we can accomplish.",
        nextStep: 'Draft the first item, then celebrate!',
        offRamp: 'Great job! Want to do 5 more minutes, or call it for now?'
      },
      celebration: {
        headline: 'Amazing work!',
        achievements: ['Completed 5 follow-ups', 'Wrote 2 templates', 'Thanked 5 customers'],
        stats: "That's a productivity powerhouse moment!",
        continuation: 'Ready for another sprint?',
        offRamp: 'Want to do 5 more minutes, or call it for the day?'
      },
      agent: 'behavioral-nudge-engine',
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

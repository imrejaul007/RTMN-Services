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

    const response: ChatResponse = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: `Inclusive Visuals Specialist response for: ${message}`,
      inclusivePrompt: {
        subject: 'Inclusive subject description with cultural specificity',
        subActions: 'Specific actions and movements',
        context: 'Authentic environmental and cultural context',
        camera: 'Camera specifications for dignified framing',
        physics: 'Physical reality constraints for video',
        colorGrade: 'Color grading appropriate for melanin representation',
        exclusions: 'Anti-bias exclusions',
        fullPrompt: message
      },
      negativePrompts: [
        'No clone faces - mandate distinct facial structures',
        'No gibberish text or cultural symbols',
        'No hyper-saturated artificial lighting',
        'No futuristic/sci-fi tropes',
        'No generic "stock photo" expressions',
        'No oversized culturally symbolic elements'
      ],
      qaChecklist: [
        'Facial diversity verified across all subjects',
        'No gibberish text/symbols present',
        'Cultural context is geographically accurate',
        'Lighting appropriately represents skin tones',
        'No stereotypical archetypes detected',
        'Community-authentic representation confirmed',
        'Physical reality maintained (video)'
      ],
      agent: 'inclusive-visuals-specialist',
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

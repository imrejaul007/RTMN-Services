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
      message: `Whimsy Injector response for: ${message}`,
      personalityFramework: {
        spectrum: {
          professional: 'Subtle personality touches that add warmth without distraction',
          casual: 'Playful elements that feel friendly and approachable',
          error: 'Error messages that reduce frustration and maintain brand voice',
          success: 'Celebrations that reward users and create memorable moments'
        },
        taxonomy: {
          subtle: [
            { name: 'Hover Effects', description: 'Small touches that add personality', examples: ['Button hover animations', 'Card lift effects', 'Icon micro-animations'] },
            { name: 'Loading Animations', description: 'Entertaining wait states', examples: ['Bouncy dots', 'Themed spinners', 'Progress celebrations'] }
          ],
          interactive: [
            { name: 'Form Validation', description: 'Delightful feedback moments', examples: ['Sparkle on success', 'Wiggle on error', 'Confetti on submit'] },
            { name: 'Button Feedback', description: 'Satisfying click responses', examples: ['Press effect', 'Success burst', 'Progress indicator'] }
          ],
          discovery: [
            { name: 'Easter Eggs', description: 'Hidden surprises for curious users', examples: ['Konami code', 'Secret clicks', 'Hidden animations'] },
            { name: 'Keyboard Shortcuts', description: 'Power-user rewards', examples: ['Quick actions', 'Debug mode', 'Theme toggles'] }
          ],
          contextual: [
            { name: '404 Pages', description: 'Delightful error experiences', examples: ['Creative illustrations', 'Witty copy', 'Helpful navigation'] },
            { name: 'Empty States', description: 'Encouraging zero-data moments', examples: ['Illustrations', 'Next-step guidance', 'Humor'] }
          ]
        },
        characterGuidelines: {
          voice: 'Friendly, slightly playful, always helpful',
          visual: 'Warm colors, rounded shapes, subtle animations',
          interaction: 'Quick, responsive, satisfying feedback',
          cultural: 'Universal humor, no culture-specific jokes'
        }
      },
      microInteractions: [
        {
          name: 'Success Sparkle',
          trigger: 'Form validation passes',
          animation: 'Scale up and fade out',
          css: '.field-success::after { content: "✨"; animation: sparkle 0.6s ease-in-out; }'
        },
        {
          name: 'Button Hover',
          trigger: 'Mouse enters button',
          animation: 'Lift and glow',
          css: '.btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }'
        }
      ],
      microcopy: {
        errors: {
          '404': "Oops! This page went on vacation without telling us. Let's get you back on track!",
          'form': "Your email looks a bit shy - mind adding the @ symbol?",
          'network': "Seems like the internet hiccupped. Give it another try?",
          'upload': "That file's being a bit stubborn. Mind trying a different format?"
        },
        loading: {
          general: "Sprinkling some digital magic...",
          upload: "Teaching your photo some new tricks...",
          processing: "Crunching numbers with extra enthusiasm...",
          search: "Hunting down the perfect matches..."
        },
        success: {
          submit: "High five! Your message is on its way.",
          create: "Welcome to the party! 🎉",
          complete: "Boom! You're officially awesome.",
          achievement: "Level up! You've mastered this."
        },
        empty: {
          search: "No matches found, but your search skills are impeccable!",
          cart: "Your cart is feeling a bit lonely. Want to add something nice?",
          notifications: "All caught up! Time for a victory dance.",
          data: "This space is waiting for something amazing (hint: that's where you come in!)."
        },
        buttons: {
          save: "Lock it in!",
          delete: "Send to the digital void",
          cancel: "Never mind, let's go back",
          retry: "Give it another whirl",
          learn: "Tell me the secrets"
        }
      },
      gamification: {
        achievements: [
          { id: 'first-click', title: 'Welcome Explorer!', description: 'You clicked your first button. The adventure begins!', icon: '🚀', celebration: 'bounce' },
          { id: 'easter-egg', title: 'Secret Agent', description: 'You found a hidden feature! Curiosity pays off.', icon: '🕵️', celebration: 'confetti' },
          { id: 'task-master', title: 'Productivity Ninja', description: 'Completed 10 tasks without breaking a sweat.', icon: '🥷', celebration: 'sparkle' }
        ],
        easterEggs: [
          { trigger: 'Konami Code', action: 'Rainbow mode', message: '🌈 Rainbow mode activated! You found the secret!' },
          { trigger: '5 rapid clicks', action: 'Floating emojis', message: 'Celebration triggered!' }
        ],
        celebrations: [
          { type: 'confetti', animation: 'Fall from top', duration: 3000 },
          { type: 'sparkle', animation: 'Scale and fade', duration: 600 },
          { type: 'bounce', animation: 'Jump effect', duration: 500 }
        ]
      },
      agent: 'whimsy-injector',
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

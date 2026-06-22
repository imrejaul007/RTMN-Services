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
      message: `Senior PM response for: ${message}`,
      taskList: {
        projectName: message,
        specificationSummary: {
          originalRequirements: [
            'Requirement 1 from spec',
            'Requirement 2 from spec'
          ],
          technicalStack: ['Laravel', 'Livewire', 'FluxUI', 'Tailwind CSS'],
          targetTimeline: 'From specification'
        },
        tasks: [
          {
            id: 1,
            title: 'Basic Page Structure',
            description: 'Create main page layout with header, content sections, footer',
            acceptanceCriteria: [
              'Page loads without errors',
              'All sections from spec are present',
              'Basic responsive layout works'
            ],
            filesToCreateEdit: [
              'resources/views/home.blade.php',
              'Basic CSS structure'
            ],
            reference: 'Section X of specification',
            estimatedTime: '30-45 minutes'
          },
          {
            id: 2,
            title: 'Navigation Implementation',
            description: 'Implement working navigation with smooth scroll',
            acceptanceCriteria: [
              'Navigation links scroll to correct sections',
              'Mobile menu opens/closes',
              'Active states show current section'
            ],
            filesToCreateEdit: [
              'resources/views/layouts/app.blade.php',
              'resources/js/app.js'
            ],
            reference: 'Navigation requirements in spec',
            estimatedTime: '45-60 minutes'
          },
          {
            id: 3,
            title: 'Hero Section',
            description: 'Implement hero section with headline and CTA',
            acceptanceCriteria: [
              'Headline displays correctly',
              'CTA button links to correct destination',
              'Responsive on mobile devices'
            ],
            filesToCreateEdit: [
              'resources/views/home.blade.php',
              'resources/css/app.css'
            ],
            reference: 'Hero section spec',
            estimatedTime: '30-45 minutes'
          }
        ],
        qualityRequirements: [
          'All FluxUI components use supported props only',
          'No background processes in any commands - NEVER append `&`',
          'No server startup commands - assume development server running',
          'Mobile responsive design required',
          'Form functionality must work (if forms in spec)',
          'Images from approved sources (Unsplash, https://picsum.photos/)',
          'Include Playwright screenshot testing'
        ],
        technicalNotes: {
          developmentStack: 'Laravel, Livewire, FluxUI, Tailwind CSS',
          specialInstructions: 'Client-specific requests from spec',
          timelineExpectations: 'Realistic based on scope - basic implementations are normal'
        }
      },
      recommendations: [
        'Focus on functional requirements first, polish second',
        'Basic implementations are acceptable - no need to gold-plate',
        'Most specs are simpler than they first appear',
        'Remember: 2-3 revision cycles are normal for first implementations'
      ],
      agent: 'senior-project-manager',
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

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
      message: `UI Designer response for: ${message}`,
      componentDesign: {
        name: 'Component',
        states: [
          { name: 'default', description: 'Default state', styles: {} },
          { name: 'hover', description: 'Hover state', styles: {} },
          { name: 'active', description: 'Active state', styles: {} },
          { name: 'disabled', description: 'Disabled state', styles: {} }
        ],
        variants: [],
        accessibility: {
          contrast: '4.5:1 for normal text, 3:1 for large text',
          focusVisible: true,
          ariaLabels: [],
          keyboardNav: true
        },
        code: '/* Component styles */'
      },
      designSystem: {
        colors: {
          primary: { '100': '#f0f9ff', '500': '#3b82f6', '900': '#1e3a8a' },
          secondary: { '100': '#f3f4f6', '500': '#6b7280', '900': '#111827' },
          semantic: { success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
          neutral: {}
        },
        typography: {
          fontFamily: { primary: 'Inter, system-ui, sans-serif', secondary: 'JetBrains Mono, monospace' },
          fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem' },
          fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
          lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.75 }
        },
        spacing: { base: 4, scale: ['0.25rem', '0.5rem', '0.75rem', '1rem', '1.5rem', '2rem', '3rem', '4rem'] },
        shadows: { sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)', md: '0 4px 6px -1px rgb(0 0 0 / 0.1)', lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)' },
        transitions: { fast: '150ms ease', normal: '300ms ease', slow: '500ms ease' }
      },
      agent: 'ui-designer',
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

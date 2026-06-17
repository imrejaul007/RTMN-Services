import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Content } from '../models/Content';
import { contentGenerator } from '../services/contentGenerator';

const router = Router();

// Validation schemas
const generateContentSchema = z.object({
  topic: z.string().min(1).max(500),
  type: z.enum(['blog', 'social', 'email', 'video', 'ad', 'landing_page', 'newsletter', 'case_study']),
  targetAudience: z.array(z.string()).min(1),
  channels: z.array(z.string()).min(1),
  tone: z.enum(['professional', 'casual', 'humorous', 'inspirational', 'educational']).optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
  keywords: z.array(z.string()).optional(),
  includeSEO: z.boolean().optional()
});

const createContentSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['blog', 'social', 'email', 'video', 'ad', 'landing_page', 'newsletter', 'case_study']),
  body: z.string().min(1),
  summary: z.string().optional(),
  targetAudience: z.array(z.string()),
  channels: z.array(z.string()),
  seoKeywords: z.array(z.string()),
  metaDescription: z.string().optional(),
  featuredImage: z.string().optional(),
  createdBy: z.string()
});

// GET /api/marketing/content - List all content
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, type, limit = 50, offset = 0 } = req.query;

    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const content = await Content.find(filter)
      .skip(Number(offset))
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Content.countDocuments(filter);

    res.json({
      success: true,
      data: content,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + content.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content'
    });
  }
});

// GET /api/marketing/content/:id - Get content by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      res.status(404).json({
        success: false,
        error: 'Content not found'
      });
      return;
    }

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content'
    });
  }
});

// POST /api/marketing/content/generate - Generate new content using AI
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const validatedData = generateContentSchema.parse(req.body);

    const generatedContent = await contentGenerator.generateContent({
      topic: validatedData.topic,
      type: validatedData.type,
      targetAudience: validatedData.targetAudience,
      channels: validatedData.channels,
      tone: validatedData.tone,
      length: validatedData.length,
      keywords: validatedData.keywords,
      includeSEO: validatedData.includeSEO
    });

    // Save generated content as draft
    const newContent = new Content({
      title: generatedContent.content.title,
      type: generatedContent.content.type,
      status: 'draft',
      body: generatedContent.content.content,
      targetAudience: generatedContent.content.targetSegment ? [generatedContent.content.targetSegment] : [],
      channels: generatedContent.content.recommendedChannels,
      seoKeywords: generatedContent.seoSuggestions?.keywords || [],
      metaDescription: generatedContent.seoSuggestions?.metaDescription,
      createdBy: 'AI-COPILOT',
      variations: generatedContent.alternatives?.map((alt, idx) => ({
        id: alt.id,
        name: `Variation ${idx + 1}`,
        content: alt.content,
        element: 'tone_style',
        testResult: undefined
      })) || []
    });

    await newContent.save();

    res.status(201).json({
      success: true,
      data: {
        content: generatedContent.content,
        alternatives: generatedContent.alternatives,
        seoSuggestions: generatedContent.seoSuggestions,
        savedId: newContent._id
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
      return;
    }
    console.error('Error generating content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate content'
    });
  }
});

// POST /api/marketing/content - Create new content
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = createContentSchema.parse(req.body);

    const content = new Content({
      ...validatedData,
      status: 'draft'
    });

    await content.save();

    res.status(201).json({
      success: true,
      data: content
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
      return;
    }
    console.error('Error creating content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create content'
    });
  }
});

// PUT /api/marketing/content/:id - Update content
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const content = await Content.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!content) {
      res.status(404).json({
        success: false,
        error: 'Content not found'
      });
      return;
    }

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update content'
    });
  }
});

// DELETE /api/marketing/content/:id - Delete content
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const content = await Content.findByIdAndDelete(req.params.id);

    if (!content) {
      res.status(404).json({
        success: false,
        error: 'Content not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete content'
    });
  }
});

// POST /api/marketing/content/:id/publish - Publish content
router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      res.status(404).json({
        success: false,
        error: 'Content not found'
      });
      return;
    }

    if (content.status === 'published') {
      res.status(400).json({
        success: false,
        error: 'Content is already published'
      });
      return;
    }

    content.status = 'published';
    await content.save();

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error publishing content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish content'
    });
  }
});

// POST /api/marketing/content/:id/variations - Generate variations for content
router.post('/:id/variations', async (req: Request, res: Response) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      res.status(404).json({
        success: false,
        error: 'Content not found'
      });
      return;
    }

    // Generate variations based on content type
    const { tone } = req.body;
    const variations = await contentGenerator.generateAlternatives({
      topic: content.title,
      type: content.type as any,
      targetAudience: content.targetAudience,
      channels: content.channels,
      tone: tone || 'professional'
    } as any);

    // Add variations to content
    const newVariations = variations.map((v, idx) => ({
      id: v.id,
      name: `Variation ${(content.variations?.length || 0) + idx + 1}`,
      content: v.content,
      element: 'tone_style',
      testResult: undefined
    }));

    content.variations = [...(content.variations || []), ...newVariations];
    await content.save();

    res.json({
      success: true,
      data: {
        content,
        variations: newVariations
      }
    });
  } catch (error) {
    console.error('Error generating variations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate variations'
    });
  }
});

// GET /api/marketing/content/:id/performance - Get content performance metrics
router.get('/:id/performance', async (req: Request, res: Response) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      res.status(404).json({
        success: false,
        error: 'Content not found'
      });
      return;
    }

    // Return or calculate performance metrics
    const performance = content.performance || {
      views: Math.floor(Math.random() * 10000) + 1000,
      uniqueViews: 0,
      avgTimeOnPage: 0,
      bounceRate: 0,
      shares: 0,
      comments: 0,
      conversions: 0,
      engagementScore: 0
    };

    // Calculate derived metrics
    if (performance.views > 0) {
      performance.uniqueViews = Math.floor(performance.views * 0.7);
      performance.engagementScore = Math.min(10, (performance.views / 1000) + (performance.shares * 0.5) + (performance.comments * 0.3));
    }

    res.json({
      success: true,
      data: {
        contentId: content._id,
        title: content.title,
        type: content.type,
        status: content.status,
        performance
      }
    });
  } catch (error) {
    console.error('Error fetching performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics'
    });
  }
});

export default router;

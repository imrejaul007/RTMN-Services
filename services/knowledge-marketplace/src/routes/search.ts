import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Knowledge } from '../models/Knowledge';
import { citationService } from '../services/citation';
import { ApiResponse, PaginatedResponse, SearchResult, Industry, KnowledgeType } from '../types';

const router = Router();

// Validation schema
const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  industry: z.string().optional(),
  type: z.enum(['sop', 'compliance', 'training', 'manual', 'guide']).optional(),
  tags: z.string().optional(), // comma-separated
  minRating: z.coerce.number().min(1).max(5).optional(),
  isPremium: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20)
});

// Helper function to calculate relevance score
function calculateRelevance(item: any, searchTerms: string[]): { score: number; matchedTerms: string[] } {
  let score = 0;
  const matchedTerms: string[] = [];

  const searchableText = `
    ${item.title}
    ${item.description}
    ${item.content?.summary || ''}
    ${item.tags?.join(' ') || ''}
  `.toLowerCase();

  for (const term of searchTerms) {
    const lowerTerm = term.toLowerCase();

    // Title match (highest weight)
    if (item.title.toLowerCase().includes(lowerTerm)) {
      score += 10;
      matchedTerms.push(term);
    }

    // Exact word match in searchable text
    if (searchableText.includes(lowerTerm)) {
      score += 5;
      if (!matchedTerms.includes(term)) matchedTerms.push(term);
    }

    // Tag match
    if (item.tags?.some((t: string) => t.toLowerCase().includes(lowerTerm))) {
      score += 8;
      if (!matchedTerms.includes(term)) matchedTerms.push(term);
    }

    // Partial word match
    const words = searchableText.split(/\s+/);
    for (const word of words) {
      if (word.startsWith(lowerTerm) || lowerTerm.startsWith(word.slice(0, 3))) {
        score += 2;
        break;
      }
    }
  }

  // Boost by rating and installs
  score += (item.rating || 0) * 0.5;
  score += Math.log10((item.installs || 0) + 1) * 0.5;

  return { score, matchedTerms };
}

// GET /api/marketplace/search - Search knowledge
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = SearchQuerySchema.parse(req.query);
    const { q, industry, type, tags, minRating, isPremium, page, limit } = query;

    // Parse search terms
    const searchTerms = q.split(/\s+/)
      .map(t => t.trim())
      .filter(t => t.length > 1);

    if (searchTerms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide valid search terms'
      });
    }

    // Build filter
    const filter: any = { isPublished: true };
    if (industry) filter.industry = industry;
    if (type) filter.type = type;
    if (minRating) filter.rating = { $gte: minRating };
    if (isPremium) filter.isPremium = isPremium === 'true';
    if (tags) filter.tags = { $in: tags.split(',').map(t => t.trim()) };

    // Get matching items
    const items = await Knowledge.find(filter).lean();

    // Calculate relevance scores
    const results: SearchResult[] = items
      .map(item => {
        const { score, matchedTerms } = calculateRelevance(item, searchTerms);
        return {
          knowledge: item as any,
          relevanceScore: score,
          matchedTerms
        };
      })
      .filter(r => r.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Paginate results
    const total = results.length;
    const startIndex = (page - 1) * limit;
    const paginatedResults = results.slice(startIndex, startIndex + limit);

    const response: PaginatedResponse<SearchResult> = {
      success: true,
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      console.error('Search error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
});

// GET /api/marketplace/search/suggestions - Get search suggestions
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || (q as string).length < 2) {
      return res.json({ success: true, data: [] });
    }

    const suggestions = await Knowledge.find({
      isPublished: true,
      title: { $regex: q as string, $options: 'i' }
    })
    .select('title industry type')
    .limit(10);

    const response: ApiResponse<typeof suggestions> = { success: true, data: suggestions };
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/marketplace/search/citations/:knowledgeId - Get citations for knowledge
router.get('/citations/:knowledgeId', async (req: Request, res: Response) => {
  try {
    const { knowledgeId } = req.params;
    const { query } = req.query;

    const knowledge = await Knowledge.findOne({ knowledgeId, isPublished: true });
    if (!knowledge) {
      return res.status(404).json({ success: false, error: 'Knowledge not found' });
    }

    // If query provided, use AI citation engine
    if (query) {
      const relevantCitations = citationService.findRelevantCitations(
        knowledge.citations,
        query as string
      );
      const response: ApiResponse<typeof relevantCitations> = {
        success: true,
        data: relevantCitations
      };
      return res.json(response);
    }

    // Return all citations
    const response: ApiResponse<typeof knowledge.citations> = {
      success: true,
      data: knowledge.citations
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;

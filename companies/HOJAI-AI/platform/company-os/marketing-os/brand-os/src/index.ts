/**
 * BrandOS - Marketing Operating System
 *
 * The brand intelligence and management platform
 * Inspired by: Adobe Experience Manager + Frontify + Bynder + Brandfolder
 *
 * Modules:
 * - Brand Twin (living digital brand identity)
 * - Voice & Tone Engine
 * - Asset Management (DAM)
 * - Content Templates
 * - Approval Workflows
 * - Brand Analytics
 * - Compliance Checker
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TYPES
// ============================================================

export interface BrandTwin {
  id: string;
  brandId: string;
  name: string;

  // Identity
  identity: {
    mission: string;
    vision: string;
    values: string[];
    taglines: string[];
    personality: {
      archetype: string;
      tone: string;
      emotions: string[];
      language: string[];
    };
  };

  // Visual
  visual: {
    logo: LogoAsset;
    colors: ColorPalette;
    typography: Typography;
    iconography: string[];
    imagery: string[];
    templates: string[];
  };

  // Voice & Tone
  voice: {
    guidelines: string;
    dos: string[];
    donts: string[];
    examples: VoiceExample[];
  };

  // Markets
  markets: MarketVariant[];

  // Status
  status: 'draft' | 'active' | 'archived';
  version: number;
  updatedAt: Date;
}

export interface LogoAsset {
  primary: string; // URL
  secondary?: string;
  icon?: string;
  monochrome?: string;
  dark?: string;
  light?: string;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string[];
  semantic: {
    success: string;
    warning: string;
    error: string;
  };
}

export interface Typography {
  headings: Font[];
  body: Font[];
  mono?: Font[];
}

export interface Font {
  family: string;
  weights: number[];
  usage: string;
}

export interface VoiceExample {
  context: string;
  good: string;
  bad: string;
}

export interface MarketVariant {
  market: string; // 'IN', 'AE', 'US', etc.
  language: string;
  tagline: string;
  tone: string;
  compliance: string[];
}

// ============================================================
// ASSET TYPES
// ============================================================

export interface BrandAsset {
  id: string;
  brandId: string;
  type: 'logo' | 'color' | 'font' | 'image' | 'template' | 'document' | 'icon' | 'video';
  name: string;
  url: string;
  thumbnail?: string;
  tags: string[];
  metadata: Record<string, any>;
  usage: string[];
  approved: boolean;
  expiresAt?: Date;
  downloads: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// TEMPLATE TYPES
// ============================================================

export interface ContentTemplate {
  id: string;
  brandId: string;
  name: string;
  type: 'email' | 'social' | 'presentation' | 'document' | 'ad' | 'video' | 'print';
  thumbnail: string;
  variables: TemplateVariable[];
  html?: string;
  css?: string;
  category: string;
  approved: boolean;
  usageCount: number;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'image' | 'color' | 'url';
  required: boolean;
  default?: string;
}

// ============================================================
// COMPLIANCE TYPES
// ============================================================

export interface ComplianceCheck {
  id: string;
  content: string;
  type: 'copy' | 'image' | 'video' | 'campaign';
  issues: ComplianceIssue[];
  score: number; // 0-100
  approved: boolean;
  checkedAt: Date;
}

export interface ComplianceIssue {
  type: 'copyright' | 'trademark' | 'claim' | 'disclaimer' | 'legal' | 'safety';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  autoFix?: string;
}

// ============================================================
// STORAGE
// ============================================================

const brands = new Map<string, BrandTwin>();
const assets = new Map<string, BrandAsset[]>();
const templates = new Map<string, ContentTemplate[]>();

// ============================================================
// BRAND ROUTES
// ============================================================

router.post('/brands', async (req, res) => {
  try {
    const brand: BrandTwin = {
      id: crypto.randomUUID(),
      brandId: req.body.brandId || crypto.randomUUID(),
      name: req.body.name || 'New Brand',
      identity: req.body.identity || {
        mission: '',
        vision: '',
        values: [],
        taglines: [],
        personality: { archetype: '', tone: 'professional', emotions: [], language: [] },
      },
      visual: req.body.visual || {
        logo: { primary: '' },
        colors: { primary: '#000000', secondary: '#ffffff', accent: '#007bff', neutral: [], semantic: { success: '#28a745', warning: '#ffc107', error: '#dc3545' } },
        typography: { headings: [], body: [] },
        iconography: [],
        imagery: [],
        templates: [],
      },
      voice: req.body.voice || { guidelines: '', dos: [], donts: [], examples: [] },
      markets: req.body.markets || [],
      status: 'draft',
      version: 1,
      updatedAt: new Date(),
    };

    brands.set(brand.brandId, brand);
    assets.set(brand.brandId, []);
    templates.set(brand.brandId, []);

    res.status(201).json({ success: true, brand });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/brands/:brandId', async (req, res) => {
  try {
    const brand = brands.get(req.params.brandId);
    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }
    res.json({ success: true, brand });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/brands/:brandId', async (req, res) => {
  try {
    const brand = brands.get(req.params.brandId);
    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }

    Object.assign(brand, req.body, { updatedAt: new Date(), version: brand.version + 1 });
    brands.set(req.params.brandId, brand);

    res.json({ success: true, brand });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ASSET ROUTES
// ============================================================

router.post('/brands/:brandId/assets', async (req, res) => {
  try {
    const brandAssets = assets.get(req.params.brandId) || [];

    const asset: BrandAsset = {
      id: crypto.randomUUID(),
      brandId: req.params.brandId,
      type: req.body.type || 'image',
      name: req.body.name || 'Asset',
      url: req.body.url || '',
      thumbnail: req.body.thumbnail,
      tags: req.body.tags || [],
      metadata: req.body.metadata || {},
      usage: req.body.usage || [],
      approved: req.body.approved || false,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
      downloads: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    brandAssets.push(asset);
    assets.set(req.params.brandId, brandAssets);

    res.status(201).json({ success: true, asset });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/brands/:brandId/assets', async (req, res) => {
  try {
    const brandAssets = assets.get(req.params.brandId) || [];
    const { type, approved, search } = req.query;

    let filtered = brandAssets;

    if (type) filtered = filtered.filter(a => a.type === type);
    if (approved === 'true') filtered = filtered.filter(a => a.approved);
    if (search) {
      const s = (search as string).toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(s) || a.tags.some(t => t.toLowerCase().includes(s))
      );
    }

    res.json({ success: true, assets: filtered, count: filtered.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// TEMPLATE ROUTES
// ============================================================

router.post('/brands/:brandId/templates', async (req, res) => {
  try {
    const brandTemplates = templates.get(req.params.brandId) || [];

    const template: ContentTemplate = {
      id: crypto.randomUUID(),
      brandId: req.params.brandId,
      name: req.body.name || 'Template',
      type: req.body.type || 'email',
      thumbnail: req.body.thumbnail || '',
      variables: req.body.variables || [],
      html: req.body.html,
      css: req.body.css,
      category: req.body.category || 'General',
      approved: req.body.approved || false,
      usageCount: 0,
    };

    brandTemplates.push(template);
    templates.set(req.params.brandId, brandTemplates);

    res.status(201).json({ success: true, template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/brands/:brandId/templates', async (req, res) => {
  try {
    const brandTemplates = templates.get(req.params.brandId) || [];
    const { type, category } = req.query;

    let filtered = brandTemplates;

    if (type) filtered = filtered.filter(t => t.type === type);
    if (category) filtered = filtered.filter(t => t.category === category);

    res.json({ success: true, templates: filtered, count: filtered.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// COMPLIANCE ROUTES
// ============================================================

router.post('/compliance/check', async (req, res) => {
  try {
    const { content, type, brandId } = req.body;

    const issues: ComplianceIssue[] = [];

    // Simple keyword-based compliance check
    const problematic = {
      copyright: ['©', 'copyright', 'patent pending'],
      trademark: ['™', '®', 'brand name'],
      claim: ['best', 'guaranteed', '100%', 'always'],
      disclaimer: ['terms apply', 'conditions apply'],
    };

    for (const [cat, keywords] of Object.entries(problematic)) {
      for (const keyword of keywords) {
        if (content.toLowerCase().includes(keyword.toLowerCase())) {
          issues.push({
            type: cat as ComplianceIssue['type'],
            severity: 'medium',
            description: `Potential ${cat} issue with keyword "${keyword}"`,
            suggestion: `Review ${cat} compliance for "${keyword}"`,
          });
        }
      }
    }

    const score = Math.max(0, 100 - issues.length * 15);
    const approved = score >= 80 && !issues.some(i => i.severity === 'critical');

    const check: ComplianceCheck = {
      id: crypto.randomUUID(),
      content,
      type: type || 'copy',
      issues,
      score,
      approved,
      checkedAt: new Date(),
    };

    res.status(201).json({ success: true, check });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// GENERATION ROUTES
// ============================================================

router.post('/generate/copy', async (req, res) => {
  try {
    const { brandId, context, type, variables } = req.body;

    const brand = brands.get(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }

    // Generate copy based on brand voice
    const copy = generateBrandCopy(brand, context, type);

    res.json({ success: true, copy });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/generate/variants', async (req, res) => {
  try {
    const { brandId, content, count = 3 } = req.body;

    const variants = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
      variants.push({
        id: crypto.randomUUID(),
        content: `${content} - Variant ${i + 1}`,
        tone: ['formal', 'casual', 'friendly'][i % 3],
      });
    }

    res.json({ success: true, variants });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPERS
// ============================================================

function generateBrandCopy(brand: BrandTwin, context: string, type: string): any {
  const tone = brand.identity.personality.tone;
  const taglines = brand.identity.taglines;
  const mission = brand.identity.mission;

  return {
    headline: `${taglines[0] || mission}`,
    subheadline: `${tone} messaging for ${context}`,
    cta: type === 'email' ? 'Learn More' : 'Get Started',
    body: `Created with the brand's ${tone} voice`,
  };
}

export default router;

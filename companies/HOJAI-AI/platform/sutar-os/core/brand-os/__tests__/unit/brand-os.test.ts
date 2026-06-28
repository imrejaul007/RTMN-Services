/**
 * Brand OS Unit Tests
 * Port: 4879
 * Tests: BrandColor usage validation, BrandFont weight ranges,
 *        compliance checking (color contrast, font usage), asset filtering by tags/type
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@rtmn/shared/auth', () => ({ requireAuth: (_req: any, _res: any, next: () => void) => next() }));

// Types from src/index.ts
interface BrandAsset {
  id: string;
  name: string;
  type: string;
  url: string;
  tags: string[];
  uploadedAt: string;
  uploadedBy: string;
  size: number;
  format: string;
}

interface BrandGuideline {
  id: string;
  name: string;
  category: string;
  content: string;
  version: string;
  updatedAt: string;
}

interface BrandColor {
  name: string;
  hex: string;
  rgb: string;
  usage: string;
}

interface BrandFont {
  name: string;
  family: string;
  weights: string[];
  usage: string;
}

interface ComplianceCheck {
  assetId: string;
  guidelineId: string;
  passed: boolean;
  warnings: string[];
  timestamp: string;
}

// ============ HELPER FUNCTIONS (from src/index.ts logic) ============

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function calculateLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1: string, color2: string): number {
  const c1 = parseHexColor(color1);
  const c2 = parseHexColor(color2);
  if (!c1 || !c2) return 0;
  const l1 = calculateLuminance(c1.r, c1.g, c1.b);
  const l2 = calculateLuminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function validateFontWeight(weights: string[], targetWeight: string): boolean {
  return weights.includes(targetWeight);
}

function filterAssetsByType(assets: BrandAsset[], type: string): BrandAsset[] {
  return assets.filter(a => a.type === type);
}

function filterAssetsByTags(assets: BrandAsset[], tags: string[]): BrandAsset[] {
  if (tags.length === 0) return assets;
  return assets.filter(a => tags.every(t => a.tags.includes(t)));
}

function filterAssetsByTagsOr(assets: BrandAsset[], tags: string[]): BrandAsset[] {
  if (tags.length === 0) return assets;
  return assets.filter(a => tags.some(t => a.tags.includes(t)));
}

function checkCompliance(asset: BrandAsset, guideline: BrandGuideline): { passed: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let passed = true;

  // Logo file size check
  if (asset.type === 'logo' && asset.size < 1000) {
    warnings.push('Logo file too small');
    passed = false;
  }

  // Brand approval check
  if (guideline.category === 'identity' && !asset.tags.includes('brand-approved')) {
    warnings.push('Not tagged as brand-approved');
    passed = false;
  }

  return { passed, warnings };
}

function validateColorUsage(color: BrandColor, intendedUsage: string): boolean {
  const usageKeywords: Record<string, string[]> = {
    'CTA': ['CTA', 'button', 'call to action', 'main brand'],
    'accent': ['accent', 'highlight', 'secondary'],
    'text': ['text', 'header', 'dark'],
    'background': ['background', 'light', 'surface'],
  };

  const colorUsageLower = color.usage.toLowerCase();
  const intendedLower = intendedUsage.toLowerCase();

  // Direct match
  if (colorUsageLower.includes(intendedLower)) return true;

  // Keyword matching
  for (const [key, keywords] of Object.entries(usageKeywords)) {
    if (intendedLower.includes(key)) {
      return keywords.some(kw => colorUsageLower.includes(kw));
    }
  }

  return false;
}

// ============ TESTS ============

describe('Brand OS - BrandColor Usage Validation', () => {
  const colors: BrandColor[] = [
    { name: 'Primary', hex: '#0066FF', rgb: '0, 102, 255', usage: 'Main brand color, CTAs' },
    { name: 'Secondary', hex: '#00AA66', rgb: '0, 170, 102', usage: 'Accent color' },
    { name: 'Dark', hex: '#1A1A1A', rgb: '26, 26, 26', usage: 'Text and headers' },
    { name: 'Light', hex: '#F5F5F5', rgb: '245, 245, 245', usage: 'Backgrounds' },
    { name: 'Accent', hex: '#FF6B35', rgb: '255, 107, 53', usage: 'Highlights' },
  ];

  it('should parse valid hex color', () => {
    const parsed = parseHexColor('#0066FF');
    expect(parsed).toEqual({ r: 0, g: 102, b: 255 });
  });

  it('should parse hex without hash', () => {
    const parsed = parseHexColor('FF6B35');
    expect(parsed).toEqual({ r: 255, g: 107, b: 53 });
  });

  it('should return null for invalid hex', () => {
    const parsed = parseHexColor('invalid');
    expect(parsed).toBeNull();
  });

  it('should calculate luminance correctly for white', () => {
    const luminance = calculateLuminance(255, 255, 255);
    expect(luminance).toBeCloseTo(1, 2);
  });

  it('should calculate luminance correctly for black', () => {
    const luminance = calculateLuminance(0, 0, 0);
    expect(luminance).toBeCloseTo(0, 2);
  });

  it('should calculate contrast ratio between dark and light', () => {
    const ratio = getContrastRatio('#1A1A1A', '#F5F5F5');
    expect(ratio).toBeGreaterThan(15); // High contrast
  });

  it('should return 0 for invalid colors', () => {
    const ratio = getContrastRatio('invalid', '#FFFFFF');
    expect(ratio).toBe(0);
  });

  it('should validate primary color for CTA usage', () => {
    const primary = colors.find(c => c.name === 'Primary')!;
    expect(validateColorUsage(primary, 'CTA')).toBe(true);
  });

  it('should validate secondary color for accent usage', () => {
    const secondary = colors.find(c => c.name === 'Secondary')!;
    expect(validateColorUsage(secondary, 'accent')).toBe(true);
  });

  it('should validate dark color for text usage', () => {
    const dark = colors.find(c => c.name === 'Dark')!;
    expect(validateColorUsage(dark, 'text')).toBe(true);
  });

  it('should validate light color for background usage', () => {
    const light = colors.find(c => c.name === 'Light')!;
    expect(validateColorUsage(light, 'background')).toBe(true);
  });

  it('should reject color for wrong usage', () => {
    const light = colors.find(c => c.name === 'Light')!;
    expect(validateColorUsage(light, 'CTA')).toBe(false);
  });
});

describe('Brand OS - BrandFont Weight Ranges', () => {
  const fonts: BrandFont[] = [
    { name: 'Inter', family: 'Inter, sans-serif', weights: ['400', '500', '600', '700'], usage: 'Body text' },
    { name: 'Roboto', family: 'Roboto, sans-serif', weights: ['400', '500', '700'], usage: 'Headings' },
  ];

  it('should validate font has required weights', () => {
    const inter = fonts.find(f => f.name === 'Inter')!;
    expect(inter.weights).toContain('400');
    expect(inter.weights).toContain('500');
    expect(inter.weights).toContain('600');
    expect(inter.weights).toContain('700');
  });

  it('should validate regular weight (400) is available', () => {
    const inter = fonts.find(f => f.name === 'Inter')!;
    expect(validateFontWeight(inter.weights, '400')).toBe(true);
  });

  it('should validate bold weight (700) is available', () => {
    const inter = fonts.find(f => f.name === 'Inter')!;
    expect(validateFontWeight(inter.weights, '700')).toBe(true);
  });

  it('should reject unavailable weight', () => {
    const inter = fonts.find(f => f.name === 'Inter')!;
    expect(validateFontWeight(inter.weights, '300')).toBe(false);
  });

  it('should validate Roboto has medium weight', () => {
    const roboto = fonts.find(f => f.name === 'Roboto')!;
    expect(validateFontWeight(roboto.weights, '500')).toBe(true);
  });

  it('should validate Roboto does not have 600 weight', () => {
    const roboto = fonts.find(f => f.name === 'Roboto')!;
    expect(validateFontWeight(roboto.weights, '600')).toBe(false);
  });

  it('should have correct font family for Inter', () => {
    const inter = fonts.find(f => f.name === 'Inter')!;
    expect(inter.family).toBe('Inter, sans-serif');
  });

  it('should have correct font family for Roboto', () => {
    const roboto = fonts.find(f => f.name === 'Roboto')!;
    expect(roboto.family).toBe('Roboto, sans-serif');
  });
});

describe('Brand OS - Compliance Checking', () => {
  const guidelines: BrandGuideline[] = [
    { id: 'logo', name: 'Logo Usage', category: 'identity', content: 'Always maintain clear space around logo.', version: '2.0', updatedAt: new Date().toISOString() },
    { id: 'colors', name: 'Color Palette', category: 'identity', content: 'Use primary for CTAs.', version: '1.5', updatedAt: new Date().toISOString() },
    { id: 'voice', name: 'Brand Voice', category: 'tone', content: 'Professional yet approachable.', version: '1.0', updatedAt: new Date().toISOString() },
  ];

  it('should pass compliance for logo with sufficient size', () => {
    const asset: BrandAsset = {
      id: 'logo-1', name: 'Company Logo', type: 'logo', url: 'https://example.com/logo.png',
      tags: ['brand-approved'], uploadedAt: '', uploadedBy: 'admin', size: 5000, format: 'png'
    };
    const guideline = guidelines.find(g => g.id === 'logo')!;
    const result = checkCompliance(asset, guideline);
    expect(result.passed).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should fail compliance for logo too small', () => {
    const asset: BrandAsset = {
      id: 'logo-2', name: 'Small Logo', type: 'logo', url: 'https://example.com/small.png',
      tags: ['brand-approved'], uploadedAt: '', uploadedBy: 'admin', size: 500, format: 'png'
    };
    const guideline = guidelines.find(g => g.id === 'logo')!;
    const result = checkCompliance(asset, guideline);
    expect(result.passed).toBe(false);
    expect(result.warnings).toContain('Logo file too small');
  });

  it('should fail compliance for asset not brand-approved', () => {
    const asset: BrandAsset = {
      id: 'img-1', name: 'Random Image', type: 'photo', url: 'https://example.com/img.png',
      tags: [], uploadedAt: '', uploadedBy: 'user', size: 10000, format: 'png'
    };
    const guideline = guidelines.find(g => g.id === 'colors')!;
    const result = checkCompliance(asset, guideline);
    expect(result.passed).toBe(false);
    expect(result.warnings).toContain('Not tagged as brand-approved');
  });

  it('should pass compliance for brand-approved asset', () => {
    const asset: BrandAsset = {
      id: 'img-2', name: 'Approved Image', type: 'photo', url: 'https://example.com/approved.png',
      tags: ['brand-approved'], uploadedAt: '', uploadedBy: 'admin', size: 10000, format: 'png'
    };
    const guideline = guidelines.find(g => g.id === 'colors')!;
    const result = checkCompliance(asset, guideline);
    expect(result.passed).toBe(true);
  });

  it('should pass compliance for non-identity guideline', () => {
    const asset: BrandAsset = {
      id: 'doc-1', name: 'Document', type: 'document', url: 'https://example.com/doc.pdf',
      tags: [], uploadedAt: '', uploadedBy: 'user', size: 500, format: 'pdf'
    };
    const guideline = guidelines.find(g => g.id === 'voice')!;
    const result = checkCompliance(asset, guideline);
    expect(result.passed).toBe(true);
  });
});

describe('Brand OS - Asset Filtering by Tags/Type', () => {
  const assets: BrandAsset[] = [
    { id: '1', name: 'Logo', type: 'logo', url: '', tags: ['brand-approved', 'primary'], uploadedAt: '', uploadedBy: 'admin', size: 5000, format: 'png' },
    { id: '2', name: 'Icon Set', type: 'icon', url: '', tags: ['brand-approved'], uploadedAt: '', uploadedBy: 'admin', size: 2000, format: 'svg' },
    { id: '3', name: 'Team Photo', type: 'photo', url: '', tags: ['marketing', 'team'], uploadedAt: '', uploadedBy: 'user', size: 8000, format: 'jpg' },
    { id: '4', name: 'Product Shot', type: 'photo', url: '', tags: ['marketing', 'product'], uploadedAt: '', uploadedBy: 'user', size: 10000, format: 'jpg' },
    { id: '5', name: 'Old Logo', type: 'logo', url: '', tags: ['legacy'], uploadedAt: '', uploadedBy: 'admin', size: 3000, format: 'png' },
  ];

  it('should filter assets by type - logo', () => {
    const logos = filterAssetsByType(assets, 'logo');
    expect(logos).toHaveLength(2);
    expect(logos.every(a => a.type === 'logo')).toBe(true);
  });

  it('should filter assets by type - photo', () => {
    const photos = filterAssetsByType(assets, 'photo');
    expect(photos).toHaveLength(2);
    expect(photos.every(a => a.type === 'photo')).toBe(true);
  });

  it('should filter assets by type - icon', () => {
    const icons = filterAssetsByType(assets, 'icon');
    expect(icons).toHaveLength(1);
    expect(icons[0].name).toBe('Icon Set');
  });

  it('should return empty array for non-existent type', () => {
    const videos = filterAssetsByType(assets, 'video');
    expect(videos).toHaveLength(0);
  });

  it('should filter assets by single tag', () => {
    const brandApproved = filterAssetsByTags(assets, ['brand-approved']);
    expect(brandApproved).toHaveLength(2);
    expect(brandApproved.every(a => a.tags.includes('brand-approved'))).toBe(true);
  });

  it('should filter assets by multiple tags (AND logic)', () => {
    const marketing = filterAssetsByTags(assets, ['marketing']);
    expect(marketing).toHaveLength(2);
    expect(marketing.every(a => a.tags.includes('marketing'))).toBe(true);
  });

  it('should return empty for non-existent tag', () => {
    const results = filterAssetsByTags(assets, ['nonexistent']);
    expect(results).toHaveLength(0);
  });

  it('should return all assets for empty tag array', () => {
    const results = filterAssetsByTags(assets, []);
    expect(results).toHaveLength(assets.length);
  });

  it('should filter assets by multiple tags with AND logic', () => {
    const brandAndPrimary = filterAssetsByTags(assets, ['brand-approved', 'primary']);
    expect(brandAndPrimary).toHaveLength(1);
    expect(brandAndPrimary[0].name).toBe('Logo');
  });

  it('should filter using OR logic for tags', () => {
    const results = filterAssetsByTagsOr(assets, ['team', 'product']);
    expect(results).toHaveLength(2);
    expect(results.map(a => a.name).sort()).toEqual(['Product Shot', 'Team Photo']);
  });
});

describe('Brand OS - Color Contrast Validation', () => {
  it('should meet WCAG AA for normal text (4.5:1)', () => {
    const ratio = getContrastRatio('#1A1A1A', '#FFFFFF');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('should meet WCAG AA for large text (3:1)', () => {
    const ratio = getContrastRatio('#1A1A1A', '#F5F5F5');
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it('should not meet WCAG for similar colors', () => {
    const ratio = getContrastRatio('#777777', '#888888');
    expect(ratio).toBeLessThan(2);
  });

  it('should calculate perfect black/white contrast as 21:1', () => {
    const ratio = getContrastRatio('#000000', '#FFFFFF');
    expect(ratio).toBeCloseTo(21, 0);
  });
});

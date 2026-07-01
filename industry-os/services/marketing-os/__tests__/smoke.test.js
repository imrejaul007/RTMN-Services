/**
 * MarketingOS Smoke Tests
 * Phase 6: Basic health checks
 * Date: July 2, 2026
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('MarketingOS - Smoke Tests', () => {
  it('index.js exists', () => {
    expect(fs.existsSync('src/index.js')).toBe(true);
  });

  it('index.js is not empty', () => {
    const stats = fs.statSync('src/index.js');
    expect(stats.size).toBeGreaterThan(1000);
  });

  it('RTMNMarketingHub exists', () => {
    expect(fs.existsSync('src/services/RTMNMarketingHub.js')).toBe(true);
  });

  it('RevenueOS module exists', () => {
    expect(fs.existsSync('src/modules/revenue-os.js')).toBe(true);
  });

  it('CreatorOS module exists', () => {
    expect(fs.existsSync('src/modules/creator-os.js')).toBe(true);
  });

  it('IntelligenceOS module exists', () => {
    expect(fs.existsSync('src/modules/intelligence-os.js')).toBe(true);
  });

  it('SocialOS module exists', () => {
    expect(fs.existsSync('src/modules/social-os.js')).toBe(true);
  });

  it('Dashboard routes exist', () => {
    expect(fs.existsSync('src/routes/dashboard.js')).toBe(true);
  });

  it('Creator routes exist', () => {
    expect(fs.existsSync('src/routes/creator-os.js')).toBe(true);
  });

  it('Intelligence routes exist', () => {
    expect(fs.existsSync('src/routes/intelligence-os.js')).toBe(true);
  });

  it('Social routes exist', () => {
    expect(fs.existsSync('src/routes/social-os.js')).toBe(true);
  });
});

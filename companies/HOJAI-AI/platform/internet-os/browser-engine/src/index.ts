/**
 * HOJAI Browser Engine
 *
 * Provides Playwright/Puppeteer integration for actors that need
 * JavaScript rendering (e.g. Google Maps, Zomato, Airbnb).
 *
 * Design principles:
 * 1. Lazy-loads browser engines (no startup cost if not used)
 * 2. Supports both Playwright and Puppeteer
 * 3. Connection pooling for performance
 * 4. Auto-cleanup of resources
 *
 * NOT REUSED: This is a NEW infrastructure layer that the
 * actor-runtime does not have. Other services don't need this.
 */

import type { BrowserEngine, BrowserConfig, BrowseOptions, BrowseResult } from './types.js';

export type { BrowserEngine, BrowserConfig, BrowseOptions, BrowseResult } from './types.js';

export class BrowserEngineFactory {
  private static instance: BrowserEngineFactory;
  private browserEngine: BrowserEngine | null = null;
  private engineType: 'playwright' | 'puppeteer' | null = null;
  private config: BrowserConfig;

  private constructor(config: BrowserConfig = {}) {
    this.config = {
      headless: true,
      timeout: 30000,
      poolSize: 1,
      ...config,
    };
  }

  static getInstance(config?: BrowserConfig): BrowserEngineFactory {
    if (!BrowserEngineFactory.instance) {
      BrowserEngineFactory.instance = new BrowserEngineFactory(config);
    }
    return BrowserEngineFactory.instance;
  }

  /**
   * Lazy-load a browser engine
   */
  async getEngine(): Promise<BrowserEngine> {
    if (this.browserEngine) {
      return this.browserEngine;
    }

    const preferred = this.config.engineType || 'playwright';

    // Try preferred first, then fallback
    const order: Array<'playwright' | 'puppeteer'> =
      preferred === 'puppeteer' ? ['puppeteer', 'playwright'] : ['playwright', 'puppeteer'];

    for (const engine of order) {
      try {
        this.browserEngine = await this.loadEngine(engine);
        this.engineType = engine;
        return this.browserEngine;
      } catch (error) {
        console.warn(`Failed to load ${engine}:`, (error as Error).message);
      }
    }

    throw new Error(
      'No browser engine available. Install playwright (`npm install playwright`) or ' +
      'puppeteer (`npm install puppeteer`).'
    );
  }

  private async loadEngine(type: 'playwright' | 'puppeteer'): Promise<BrowserEngine> {
    if (type === 'playwright') {
      // Dynamic import - won't fail if not installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const playwright = await import('playwright' as any).catch(() => null);
      if (!playwright) throw new Error('playwright not installed');

      return new PlaywrightEngine(this.config);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const puppeteer = await import('puppeteer' as any).catch(() => null);
      if (!puppeteer) throw new Error('puppeteer not installed');

      return new PuppeteerEngine(this.config);
    }
  }

  /**
   * Convenience: browse a URL and return rendered HTML
   */
  async browse(options: BrowseOptions): Promise<BrowseResult> {
    const engine = await this.getEngine();
    return engine.browse(options);
  }

  /**
   * Cleanup - close all browsers
   */
  async cleanup(): Promise<void> {
    if (this.browserEngine) {
      await this.browserEngine.cleanup();
      this.browserEngine = null;
      this.engineType = null;
    }
  }

  /**
   * Get which engine is in use
   */
  getEngineType(): 'playwright' | 'puppeteer' | null {
    return this.engineType;
  }
}

/**
 * Playwright implementation
 */
class PlaywrightEngine implements BrowserEngine {
  private browser: any = null;
  private context: any = null;
  private config: BrowserConfig;

  constructor(config: BrowserConfig) {
    this.config = config;
  }

  async browse(options: BrowseOptions): Promise<BrowseResult> {
    const startTime = Date.now();
    const playwright = await import('playwright' as any);

    if (!this.browser) {
      this.browser = await playwright.chromium.launch({
        headless: this.config.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    if (!this.context) {
      this.context = await this.browser.newContext({
        userAgent:
          options.userAgent ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: options.viewport || { width: 1280, height: 720 },
      });
    }

    const page = await this.context.newPage();
    try {
      // Navigate
      const response = await page.goto(options.url, {
        waitUntil: options.waitUntil || 'networkidle',
        timeout: options.timeout || this.config.timeout,
      });

      // Optional delay for manual JS to render
      if (options.delay) {
        await page.waitForTimeout(options.delay);
      }

      // Optional wait for selector
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: options.timeout || this.config.timeout,
        });
      }

      // Extract content
      let html: string;
      let content: string;

      if (options.selector) {
        const elements = await page.$$eval(options.selector, (els: any[]) =>
          els.map((el) => el.outerHTML)
        );
        content = elements.join('\n');
        html = await page.content();
      } else {
        html = await page.content();
        content = html;
      }

      return {
        url: page.url(),
        status: response?.status() || 200,
        html,
        content,
        duration: Date.now() - startTime,
      };
    } finally {
      await page.close();
    }
  }

  async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

/**
 * Puppeteer implementation
 */
class PuppeteerEngine implements BrowserEngine {
  private browser: any = null;
  private config: BrowserConfig;

  constructor(config: BrowserConfig) {
    this.config = config;
  }

  async browse(options: BrowseOptions): Promise<BrowseResult> {
    const startTime = Date.now();
    const puppeteer = await import('puppeteer' as any);

    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    const page = await this.browser.newPage();

    if (options.viewport) {
      await page.setViewport(options.viewport);
    }

    if (options.userAgent) {
      await page.setUserAgent(options.userAgent);
    }

    try {
      const response = await page.goto(options.url, {
        waitUntil: options.waitUntil === 'load' ? 'load' : 'networkidle0',
        timeout: options.timeout || this.config.timeout,
      });

      if (options.delay) {
        await new Promise((r) => setTimeout(r, options.delay));
      }

      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: options.timeout || this.config.timeout,
        });
      }

      let html: string;
      let content: string;

      if (options.selector) {
        content = await page.$$eval(options.selector, (els: any[]) =>
          els.map((el) => el.outerHTML).join('\n')
        );
        html = await page.content();
      } else {
        html = await page.content();
        content = html;
      }

      return {
        url: page.url(),
        status: response?.status() || 200,
        html,
        content,
        duration: Date.now() - startTime,
      };
    } finally {
      await page.close();
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

/**
 * Convenience: get a singleton browser engine
 */
export const browserEngine = BrowserEngineFactory.getInstance();

/**
 * Convenience: browse a URL with auto-detected engine
 */
export async function browseUrl(options: BrowseOptions): Promise<BrowseResult> {
  return browserEngine.browse(options);
}

export default browserEngine;

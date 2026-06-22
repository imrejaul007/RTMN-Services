/**
 * Puppeteer Scraper - Self-hosted JS rendering scraper
 *
 * Uses Puppeteer for sites that require JavaScript execution
 * Requires: npm install puppeteer (or puppeteer-core with Chrome installed)
 */

import puppeteer, { Browser, Page } from 'puppeteer';

export interface PuppeteerOptions {
  waitForSelector?: string;
  waitForTimeout?: number;
  screenshot?: boolean;
  userAgent?: string;
}

export interface PuppeteerResult {
  url: string;
  content?: string;
  text?: string;
  screenshot?: string;
  metadata?: {
    fetchedAt: string;
    title?: string;
    statusCode: number;
  };
}

export class PuppeteerScraper {
  private browser: Browser | null = null;

  /**
   * Get or launch browser instance
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.connected) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Scrape a URL with JS rendering
   */
  async scrape(url: string, options?: PuppeteerOptions): Promise<PuppeteerResult> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    const result: PuppeteerResult = {
      url,
      metadata: {
        fetchedAt: new Date().toISOString(),
        statusCode: 0
      }
    };

    try {
      // Set user agent
      if (options?.userAgent) {
        await page.setUserAgent(options.userAgent);
      } else {
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
      }

      // Navigate to URL
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      result.metadata!.statusCode = response?.status() || 0;

      // Wait for specific selector if provided
      if (options?.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: options.waitForTimeout || 10000
        }).catch(() => {
          console.warn(`Selector ${options.waitForSelector} not found`);
        });
      } else if (options?.waitForTimeout) {
        await new Promise(resolve => setTimeout(resolve, options.waitForTimeout));
      }

      // Get page title
      result.metadata!.title = await page.title();

      // Get content
      result.text = await page.evaluate(() => document.body.innerText);
      result.content = await page.content();

      // Take screenshot if requested
      if (options?.screenshot) {
        result.screenshot = await page.screenshot({
          encoding: 'base64',
          type: 'png',
          fullPage: false
        });
      }
    } catch (error: any) {
      throw new Error(`Puppeteer scrape failed for ${url}: ${error.message}`);
    } finally {
      await page.close();
    }

    return result;
  }

  /**
   * Extract text content from page
   */
  async extractText(url: string, selector: string): Promise<string[]> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle2' });

      const elements = await page.evaluate((sel: string) => {
        const nodes = document.querySelectorAll(sel);
        return Array.from(nodes).map((el: Element) => el.textContent?.trim() || '');
      }, selector);

      return elements.filter(Boolean);
    } finally {
      await page.close();
    }
  }

  /**
   * Submit a form and get results
   */
  async submitForm(
    url: string,
    formSelector: string,
    formData: Record<string, string>
  ): Promise<PuppeteerResult> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Fill form fields
      for (const [name, value] of Object.entries(formData)) {
        await page.type(`[name="${name}"]`, value);
      }

      // Submit form
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click(`${formSelector} button[type="submit"], ${formSelector} input[type="submit"]`)
      ]);

      return {
        url: page.url(),
        content: await page.content(),
        text: await page.evaluate(() => document.body.innerText),
        metadata: {
          fetchedAt: new Date().toISOString(),
          title: await page.title(),
          statusCode: 200
        }
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Cleanup browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

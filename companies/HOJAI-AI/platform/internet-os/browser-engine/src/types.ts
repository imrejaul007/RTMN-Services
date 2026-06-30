/**
 * Browser engine types
 */

export interface BrowserConfig {
  /** Use headless mode (no visible browser) */
  headless?: boolean;
  /** Default navigation timeout in ms */
  timeout?: number;
  /** Number of browser instances to pool (default 1) */
  poolSize?: number;
  /** Preferred engine */
  engineType?: 'playwright' | 'puppeteer';
}

export interface BrowseOptions {
  /** URL to browse */
  url: string;
  /** Optional CSS selector to extract specific content */
  selector?: string;
  /** Wait for this selector to appear before extracting */
  waitForSelector?: string;
  /** When to consider page loaded: 'load' | 'domcontentloaded' | 'networkidle' */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  /** Custom navigation timeout */
  timeout?: number;
  /** Time to wait after page load (for JS rendering) */
  delay?: number;
  /** Viewport size */
  viewport?: { width: number; height: number };
  /** User-Agent string */
  userAgent?: string;
}

export interface BrowseResult {
  /** Final URL (after any redirects) */
  url: string;
  /** HTTP status code */
  status: number;
  /** Full HTML content */
  html: string;
  /** Extracted content (full page or selector-matched) */
  content: string;
  /** Time taken in ms */
  duration: number;
}

export interface BrowserEngine {
  browse(options: BrowseOptions): Promise<BrowseResult>;
  cleanup(): Promise<void>;
}

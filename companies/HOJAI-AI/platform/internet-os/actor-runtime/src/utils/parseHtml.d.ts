/**
 * HTML Parsing utilities using Cheerio
 * Cheerio works in Node.js unlike DOMParser which is browser-only
 */
import type { CheerioAPI } from 'cheerio';
/**
 * Parse HTML string into Cheerio API for DOM manipulation
 * Works in Node.js unlike browser-only DOMParser
 */
export declare function parseHtml(html: string): CheerioAPI;
/**
 * Load HTML and extract text content
 */
export declare function extractText(html: string, selector: string): string;
/**
 * Extract all text from HTML
 */
export declare function extractAllText(html: string): string;
/**
 * Extract attribute from element
 */
export declare function extractAttribute(html: string, selector: string, attribute: string): string | null;
/**
 * Extract all links from HTML
 */
export declare function extractLinks(html: string, baseUrl?: string): string[];
/**
 * Extract all images from HTML
 */
export declare function extractImages(html: string, baseUrl?: string): string[];
/**
 * Extract structured data from JSON-LD scripts
 */
export declare function extractJsonLd(html: string): Record<string, any>[];
/**
 * Extract meta tags for SEO data
 */
export declare function extractMetaTags(html: string): Record<string, string>;
/**
 * Extract data from table elements
 */
export declare function extractTable(html: string, tableSelector?: string): Record<string, string>[];
/**
 * Extract data from list elements
 */
export declare function extractList(html: string, selector?: string): string[];
/**
 * Check if element exists
 */
export declare function elementExists(html: string, selector: string): boolean;
/**
 * Count elements matching selector
 */
export declare function countElements(html: string, selector: string): number;
/**
 * Extract HTML snippet for specific selector
 */
export declare function extractHtmlSnippet(html: string, selector: string): string | null;
export type { CheerioAPI, Cheerio } from 'cheerio';
//# sourceMappingURL=parseHtml.d.ts.map
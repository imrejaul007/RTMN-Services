/**
 * HTML Parsing utilities using Cheerio
 * Cheerio works in Node.js unlike DOMParser which is browser-only
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI, Cheerio } from 'cheerio';

/**
 * Parse HTML string into Cheerio API for DOM manipulation
 * Works in Node.js unlike browser-only DOMParser
 */
export function parseHtml(html: string): CheerioAPI {
  return cheerio.load(html);
}

/**
 * Load HTML and extract text content
 */
export function extractText(html: string, selector: string): string {
  const $ = parseHtml(html);
  return $(selector).text().trim();
}

/**
 * Extract all text from HTML
 */
export function extractAllText(html: string): string {
  const $ = parseHtml(html);
  return $('body').text().trim();
}

/**
 * Extract attribute from element
 */
export function extractAttribute(
  html: string,
  selector: string,
  attribute: string
): string | null {
  const $ = parseHtml(html);
  return $(selector).attr(attribute) ?? null;
}

/**
 * Extract all links from HTML
 */
export function extractLinks(html: string, baseUrl?: string): string[] {
  const $ = parseHtml(html);
  const links: string[] = [];

  $('a[href]').each((_, el) => {
    let href = $(el).attr('href') ?? '';

    // Handle relative URLs
    if (baseUrl && href.startsWith('/')) {
      href = new URL(href, baseUrl).href;
    }

    if (href) links.push(href);
  });

  return links;
}

/**
 * Extract all images from HTML
 */
export function extractImages(html: string, baseUrl?: string): string[] {
  const $ = parseHtml(html);
  const images: string[] = [];

  $('img[src]').each((_, el) => {
    let src = $(el).attr('src') ?? '';

    // Handle relative URLs
    if (baseUrl && src.startsWith('/')) {
      src = new URL(src, baseUrl).href;
    }

    if (src) images.push(src);
  });

  return images;
}

/**
 * Extract structured data from JSON-LD scripts
 */
export function extractJsonLd(html: string): Record<string, any>[] {
  const $ = parseHtml(html);
  const data: Record<string, any>[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html();
      if (content) {
        const parsed = JSON.parse(content);
        data.push(parsed);
      }
    } catch {
      // Skip invalid JSON-LD
    }
  });

  return data;
}

/**
 * Extract meta tags for SEO data
 */
export function extractMetaTags(html: string): Record<string, string> {
  const $ = parseHtml(html);
  const meta: Record<string, string> = {};

  $('meta').each((_, el) => {
    const name = $(el).attr('name') ?? $(el).attr('property') ?? '';
    const content = $(el).attr('content') ?? '';
    if (name && content) {
      meta[name] = content;
    }
  });

  return meta;
}

/**
 * Extract data from table elements
 */
export function extractTable(
  html: string,
  tableSelector: string = 'table'
): Record<string, string>[] {
  const $ = parseHtml(html);
  const rows: Record<string, string>[] = [];

  $(tableSelector).find('tr').each((rowIndex, el) => {
    const row: Record<string, string> = {};
    let colIndex = 0;

    $(el).find('td, th').each((_, cell) => {
      const key = $(cell).find('b, strong').first().text().trim() || `col${colIndex}`;
      const value = $(cell).clone().find('b, strong').remove().end().text().trim();
      row[key] = value;
      colIndex++;
    });

    if (Object.keys(row).length > 0) {
      rows.push(row);
    }
  });

  return rows;
}

/**
 * Extract data from list elements
 */
export function extractList(html: string, selector: string = 'ul'): string[] {
  const $ = parseHtml(html);
  const items: string[] = [];

  $(selector).find('li').each((_, el) => {
    const text = $(el).text().trim();
    if (text) items.push(text);
  });

  return items;
}

/**
 * Check if element exists
 */
export function elementExists(html: string, selector: string): boolean {
  const $ = parseHtml(html);
  return $(selector).length > 0;
}

/**
 * Count elements matching selector
 */
export function countElements(html: string, selector: string): number {
  const $ = parseHtml(html);
  return $(selector).length;
}

/**
 * Extract HTML snippet for specific selector
 */
export function extractHtmlSnippet(html: string, selector: string): string | null {
  const $ = parseHtml(html);
  const element = $(selector).first();
  return element.length > 0 ? element.html() : null;
}

// Re-export cheerio types for use in actors
export type { CheerioAPI, Cheerio } from 'cheerio';

/**
 * REZ Memory Extension - Content Script
 * Extracts page content for memory capture
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        minContentLength: 50,
        maxContentLength: 50000,
        extractionDelay: 1000,
    };

    /**
     * Extract main content from page using multiple strategies
     */
    function extractMainContent() {
        // Strategy 1: Look for article/main content areas
        const selectors = [
            'article',
            '[role="main"]',
            'main',
            '.post-content',
            '.article-content',
            '.entry-content',
            '.content',
            '#content',
            '.post',
            '.article'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim().length > 200) {
                return cleanText(element);
            }
        }

        // Strategy 2: Find the largest text block
        const body = document.body;
        const textBlocks = body.querySelectorAll('p, div, section');
        let largestBlock = null;
        let maxLength = 0;

        textBlocks.forEach(block => {
            const text = block.textContent.trim();
            if (text.length > maxLength && text.length > 200) {
                maxLength = text.length;
                largestBlock = block;
            }
        });

        if (largestBlock) {
            return cleanText(largestBlock);
        }

        // Strategy 3: Fallback to body text
        return cleanText(body).substring(0, CONFIG.maxContentLength);
    }

    /**
     * Extract selected text from page
     */
    function extractSelection() {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            return selection.toString().trim();
        }
        return null;
    }

    /**
     * Extract metadata from page
     */
    function extractMetadata() {
        const getMetaContent = (name) => {
            const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"], meta[itemprop="${name}"]`);
            return meta ? meta.getAttribute('content') : null;
        };

        return {
            title: document.title || getMetaContent('og:title') || getMetaContent('twitter:title'),
            description: getMetaContent('description') || getMetaContent('og:description') || getMetaContent('twitter:description'),
            author: getMetaContent('author') || getMetaContent('article:author'),
            publishedTime: getMetaContent('article:published_time'),
            siteName: getMetaContent('og:site_name') || window.location.hostname,
            favicon: getFavicon(),
            language: document.documentElement.lang || 'en'
        };
    }

    /**
     * Get favicon URL
     */
    function getFavicon() {
        const icon = document.querySelector('link[rel*="icon"]');
        if (icon) {
            return icon.href;
        }
        return `https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=64`;
    }

    /**
     * Clean and normalize text content
     */
    function cleanText(element) {
        const clone = element.cloneNode(true);

        // Remove unwanted elements
        const unwantedSelectors = [
            'script', 'style', 'noscript', 'iframe', 'nav', 'footer',
            'header', 'aside', 'form', 'button', 'input', 'select',
            '.advertisement', '.ad', '.social-share', '.comments',
            '.sidebar', '.navigation', '.menu', '.nav'
        ];

        unwantedSelectors.forEach(selector => {
            clone.querySelectorAll(selector).forEach(el => el.remove());
        });

        // Get text and clean whitespace
        let text = clone.textContent || '';
        text = text.replace(/\s+/g, ' ').trim();

        return text.substring(0, CONFIG.maxContentLength);
    }

    /**
     * Extract links from page
     */
    function extractLinks() {
        const links = [];
        const seen = new Set();

        document.querySelectorAll('a[href]').forEach(link => {
            const href = link.href;
            const text = link.textContent.trim();

            if (href && !seen.has(href) && text.length > 0) {
                seen.add(href);
                links.push({
                    url: href,
                    text: text.substring(0, 200)
                });
            }
        });

        return links.slice(0, 50); // Limit to 50 links
    }

    /**
     * Extract images from page
     */
    function extractImages() {
        const images = [];
        const seen = new Set();

        document.querySelectorAll('img').forEach(img => {
            const src = img.src || img.dataset.src;
            const alt = img.alt || '';

            if (src && !seen.has(src) && src.startsWith('http')) {
                seen.add(src);
                images.push({
                    url: src,
                    alt: alt.substring(0, 200)
                });
            }
        });

        return images.slice(0, 20); // Limit to 20 images
    }

    /**
     * Create page snapshot
     */
    function createPageSnapshot() {
        const selection = extractSelection();
        const metadata = extractMetadata();

        const snapshot = {
            url: window.location.href,
            content: extractMainContent(),
            selection: selection,
            metadata: metadata,
            links: extractLinks(),
            images: extractImages(),
            timestamp: Date.now(),
            extractedAt: new Date().toISOString()
        };

        return snapshot;
    }

    /**
     * Message handler for content script
     */
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
            case 'extractContent':
                sendResponse({ success: true, data: createPageSnapshot() });
                break;

            case 'extractSelection':
                const selection = extractSelection();
                sendResponse({ success: true, data: selection });
                break;

            case 'getPageInfo':
                const metadata = extractMetadata();
                metadata.url = window.location.href;
                sendResponse({ success: true, data: metadata });
                break;

            case 'ping':
                sendResponse({ success: true, ready: true });
                break;

            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
        return true; // Keep channel open for async response
    });

    // Signal that content script is ready
    console.log('REZ Memory Extension content script ready');
})();

/**
 * Unit tests for Knowledge Base
 */
import { describe, it, expect } from 'vitest';

function calculateRelevance(query, document) {
  const queryWords = query.toLowerCase().split(/\s+/);
  const docText = `${document.title} ${document.content}`.toLowerCase();
  let score = 0;
  for (const word of queryWords) {
    if (docText.includes(word)) score++;
  }
  return Math.round((score / queryWords.length) * 100);
}

function chunkText(text, chunkSize = 500) {
  const chunks = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length <= chunkSize) {
      current += sentence;
    } else {
      if (current) chunks.push(current.trim());
      current = sentence;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

function suggestDocumentType(url) {
  if (url.includes('.pdf')) return 'pdf';
  if (url.includes('faq')) return 'faq';
  if (url.includes('help')) return 'help_center';
  return 'web_page';
}

describe('Knowledge Base', () => {
  it('should calculate relevance scores', () => {
    const doc = { title: 'Product Manual', content: 'This guide explains how to use the product' };
    expect(calculateRelevance('product manual guide', doc)).toBeGreaterThan(50);
    expect(calculateRelevance('unrelated query xyz', doc)).toBe(0);
  });

  it('should chunk text by sentences', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    const chunks = chunkText(text, 30);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('should handle short text', () => {
    const text = 'Short text.';
    const chunks = chunkText(text, 500);
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe('Short text.');
  });

  it('should suggest document types', () => {
    expect(suggestDocumentType('/docs/manual.pdf')).toBe('pdf');
    expect(suggestDocumentType('/faq/shipping')).toBe('faq');
    expect(suggestDocumentType('/help/contact')).toBe('help_center');
    expect(suggestDocumentType('/products/page')).toBe('web_page');
  });
});

import { describe, it, expect } from 'vitest';
import {
  parseHtml,
  extractText,
  extractAllText,
  extractAttribute,
  extractLinks,
  extractImages,
  extractJsonLd,
  extractMetaTags,
  extractTable,
  extractList,
  elementExists,
  countElements,
  extractHtmlSnippet,
} from '../src/utils/parseHtml.js';

const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <meta name="description" content="Test description">
  <meta property="og:title" content="OG Title">
  <script type="application/ld+json">
    {"@type": "Organization", "name": "Test Corp", "url": "https://test.com"}
  </script>
</head>
<body>
  <header>
    <h1>Welcome to Test</h1>
  </header>
  <main>
    <p class="intro">This is an introduction paragraph.</p>
    <div class="content">
      <a href="/page1">Link 1</a>
      <a href="/page2">Link 2</a>
      <a href="https://external.com">External Link</a>
    </div>
    <img src="/image1.jpg" alt="Image 1">
    <img src="/image2.jpg" alt="Image 2">
    <ul>
      <li>Item 1</li>
      <li>Item 2</li>
      <li>Item 3</li>
    </ul>
    <ol>
      <li>Ordered 1</li>
      <li>Ordered 2</li>
    </ol>
    <table>
      <tr>
        <th>Name</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>Row 1 Col 1</td>
        <td>Row 1 Col 2</td>
      </tr>
    </table>
  </main>
</body>
</html>
`;

describe('parseHtml', () => {
  it('should parse HTML string', () => {
    const $ = parseHtml(sampleHtml);
    expect($('title').text()).toBe('Test Page');
  });

  it('should handle malformed HTML', () => {
    const $ = parseHtml('<div>Unclosed div');
    expect($('div').text()).toBe('Unclosed div');
  });
});

describe('extractText', () => {
  it('should extract text from selector', () => {
    const text = extractText(sampleHtml, 'h1');
    expect(text).toBe('Welcome to Test');
  });

  it('should trim whitespace', () => {
    const text = extractText(sampleHtml, '.intro');
    expect(text).toBe('This is an introduction paragraph.');
  });

  it('should return empty string for non-existent selector', () => {
    const text = extractText(sampleHtml, '.nonexistent');
    expect(text).toBe('');
  });
});

describe('extractAllText', () => {
  it('should extract all text from body', () => {
    const text = extractAllText(sampleHtml);
    expect(text).toContain('Welcome to Test');
    expect(text).toContain('This is an introduction paragraph.');
  });
});

describe('extractAttribute', () => {
  it('should extract href attribute', () => {
    const href = extractAttribute(sampleHtml, 'a:first', 'href');
    expect(href).toBe('/page1');
  });

  it('should return null for non-existent attribute', () => {
    const title = extractAttribute(sampleHtml, 'a:first', 'title');
    expect(title).toBeNull();
  });

  it('should return null for non-existent element', () => {
    const href = extractAttribute(sampleHtml, '.nonexistent', 'href');
    expect(href).toBeNull();
  });
});

describe('extractLinks', () => {
  it('should extract all links', () => {
    const links = extractLinks(sampleHtml);
    expect(links).toHaveLength(3);
  });

  it('should resolve relative URLs with baseUrl', () => {
    const links = extractLinks(sampleHtml, 'https://example.com');
    expect(links).toContain('https://example.com/page1');
    expect(links).toContain('https://example.com/page2');
    expect(links).toContain('https://external.com');
  });

  it('should not modify absolute URLs', () => {
    const links = extractLinks(sampleHtml, 'https://example.com');
    const external = links.find(l => l.includes('external'));
    expect(external).toBe('https://external.com');
  });
});

describe('extractImages', () => {
  it('should extract all images', () => {
    const images = extractImages(sampleHtml);
    expect(images).toHaveLength(2);
  });

  it('should resolve relative URLs with baseUrl', () => {
    const images = extractImages(sampleHtml, 'https://example.com');
    expect(images).toContain('https://example.com/image1.jpg');
    expect(images).toContain('https://example.com/image2.jpg');
  });
});

describe('extractJsonLd', () => {
  it('should extract JSON-LD data', () => {
    const data = extractJsonLd(sampleHtml);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Test Corp');
    expect(data[0]['@type']).toBe('Organization');
  });

  it('should handle invalid JSON-LD gracefully', () => {
    const htmlWithBadJson = sampleHtml.replace(
      '<script type="application/ld+json">',
      '<script type="application/ld+json">{invalid json'
    );
    const data = extractJsonLd(htmlWithBadJson);
    expect(data).toHaveLength(0);
  });
});

describe('extractMetaTags', () => {
  it('should extract meta tags', () => {
    const meta = extractMetaTags(sampleHtml);
    expect(meta['description']).toBe('Test description');
    expect(meta['og:title']).toBe('OG Title');
  });

  it('should return empty object when no meta tags', () => {
    const meta = extractMetaTags('<html><body></body></html>');
    expect(Object.keys(meta)).toHaveLength(0);
  });
});

describe('extractTable', () => {
  it('should extract table data', () => {
    const rows = extractTable(sampleHtml);
    expect(rows.length).toBeGreaterThan(0); // Has table data
    // Check that table data was extracted
    const hasTableData = rows.some(row =>
      JSON.stringify(row).includes('Row 1') ||
      JSON.stringify(row).includes('Col')
    );
    expect(hasTableData).toBe(true);
  });
});

describe('extractList', () => {
  it('should extract unordered list items', () => {
    const items = extractList(sampleHtml, 'ul');
    expect(items).toHaveLength(3);
    expect(items).toContain('Item 1');
    expect(items).toContain('Item 2');
    expect(items).toContain('Item 3');
  });

  it('should extract ordered list items', () => {
    const items = extractList(sampleHtml, 'ol');
    expect(items).toHaveLength(2);
    expect(items).toContain('Ordered 1');
    expect(items).toContain('Ordered 2');
  });

  it('should return empty array for non-existent list', () => {
    const items = extractList(sampleHtml, '.nonexistent');
    expect(items).toHaveLength(0);
  });
});

describe('elementExists', () => {
  it('should return true for existing element', () => {
    expect(elementExists(sampleHtml, 'h1')).toBe(true);
  });

  it('should return false for non-existent element', () => {
    expect(elementExists(sampleHtml, '.nonexistent')).toBe(false);
  });
});

describe('countElements', () => {
  it('should count matching elements', () => {
    expect(countElements(sampleHtml, 'a')).toBe(3);
    expect(countElements(sampleHtml, 'img')).toBe(2);
  });

  it('should return 0 for no matches', () => {
    expect(countElements(sampleHtml, '.nonexistent')).toBe(0);
  });
});

describe('extractHtmlSnippet', () => {
  it('should extract HTML snippet', () => {
    const snippet = extractHtmlSnippet(sampleHtml, '.content');
    expect(snippet).toContain('Link 1');
    expect(snippet).toContain('Link 2');
  });

  it('should return null for non-existent selector', () => {
    const snippet = extractHtmlSnippet(sampleHtml, '.nonexistent');
    expect(snippet).toBeNull();
  });
});

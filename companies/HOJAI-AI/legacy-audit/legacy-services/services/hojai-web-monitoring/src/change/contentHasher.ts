/**
 * Content Hasher - Detects changes in web content
 */

import * as crypto from 'crypto';

export interface ChangeAnalysis {
  type: 'content' | 'price' | 'structure' | 'new' | 'removed';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export class ContentHasher {
  /**
   * Generate SHA-256 hash of content
   */
  hash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Detect what type of change occurred
   */
  detectChangeType(previous: any, current: any): ChangeAnalysis {
    if (!previous) {
      return {
        type: 'new',
        severity: 'low',
        description: 'First time scraping this URL'
      };
    }

    // Check for price changes
    if (current.price && previous.price) {
      if (current.price !== previous.price) {
        return {
          type: 'price',
          severity: 'high',
          description: `Price changed from ${previous.price} to ${current.price}`
        };
      }
    }

    // Check for structural changes (number of links/images)
    const prevLinks = previous.links?.length || 0;
    const currLinks = current.links?.length || 0;
    const prevImages = previous.images?.length || 0;
    const currImages = current.images?.length || 0;

    if (Math.abs(currLinks - prevLinks) > prevLinks * 0.2) {
      return {
        type: 'structure',
        severity: 'medium',
        description: `Link count changed from ${prevLinks} to ${currLinks}`
      };
    }

    if (Math.abs(currImages - prevImages) > prevImages * 0.2) {
      return {
        type: 'structure',
        severity: 'medium',
        description: `Image count changed from ${prevImages} to ${currImages}`
      };
    }

    // Check for content changes
    if (current.content && previous.content) {
      const similarity = this.calculateSimilarity(previous.content, current.content);
      if (similarity < 0.8) {
        return {
          type: 'content',
          severity: 'medium',
          description: `Content similarity dropped to ${Math.round(similarity * 100)}%`
        };
      }
    }

    // Check for title changes
    if (current.title !== previous.title) {
      return {
        type: 'content',
        severity: 'low',
        description: `Title changed: "${previous.title}" → "${current.title}"`
      };
    }

    return {
      type: 'content',
      severity: 'low',
      description: 'Minor content update detected'
    };
  }

  /**
   * Calculate text similarity (0-1)
   */
  calculateSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    // Normalize texts
    const norm1 = text1.toLowerCase().replace(/\s+/g, ' ').trim();
    const norm2 = text2.toLowerCase().replace(/\s+/g, ' ').trim();

    if (norm1 === norm2) return 1;

    // Simple word-based similarity
    const words1 = new Set(norm1.split(' '));
    const words2 = new Set(norm2.split(' '));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Generate diff summary
   */
  generateDiff(previous: any, current: any): string {
    const changes: string[] = [];

    if (previous?.title !== current?.title) {
      changes.push(`Title: "${previous?.title}" → "${current?.title}"`);
    }

    if (previous?.price !== current?.price) {
      changes.push(`Price: "${previous?.price}" → "${current?.price}"`);
    }

    const prevLinks = previous?.links?.length || 0;
    const currLinks = current?.links?.length || 0;
    if (prevLinks !== currLinks) {
      changes.push(`Links: ${prevLinks} → ${currLinks}`);
    }

    const prevImages = previous?.images?.length || 0;
    const currImages = current?.images?.length || 0;
    if (prevImages !== currImages) {
      changes.push(`Images: ${prevImages} → ${currImages}`);
    }

    return changes.join('\n') || 'No significant changes';
  }
}
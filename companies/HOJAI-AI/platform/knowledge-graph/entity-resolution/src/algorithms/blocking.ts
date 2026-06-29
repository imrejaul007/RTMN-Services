/**
 * Blocking Strategies for Entity Resolution
 * Reduces comparison space by grouping potential matches
 */

import { soundex, metaphone } from './phonetic';
import { BlockingStrategy, BlockingKey } from '../types';

/**
 * Generate blocking keys for an entity name
 */
export function generateBlockingKeys(
  name: string,
  entityId: string,
  strategies: BlockingStrategy[]
): BlockingKey[] {
  const keys: BlockingKey[] = [];

  for (const strategy of strategies) {
    const key = generateBlockingKey(name, strategy, entityId);
    if (key) keys.push(key);
  }

  return keys;
}

/**
 * Generate a single blocking key based on strategy
 */
export function generateBlockingKey(
  name: string,
  strategy: BlockingStrategy,
  entityId: string
): BlockingKey | null {
  if (strategy === 'none') {
    return { strategy, key: entityId, entityId };
  }

  const normalized = name.toLowerCase().trim();
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 0);

  switch (strategy) {
    case 'soundex':
      return {
        strategy,
        key: tokens.map((t) => soundex(t)).join('|'),
        entityId,
      };

    case 'metaphone':
      return {
        strategy,
        key: tokens.map((t) => metaphone(t)).join('|'),
        entityId,
      };

    case 'first_n_chars':
      return {
        strategy,
        key: tokens.map((t) => t.slice(0, 3)).join('|'),
        entityId,
      };

    case 'last_n_chars':
      return {
        strategy,
        key: tokens.map((t) => t.slice(-3)).join('|'),
        entityId,
      };

    case 'token_set':
      return {
        strategy,
        key: tokens.sort().join('|'),
        entityId,
      };

    default:
      return null;
  }
}

/**
 * Token Set Blocking
 * Groups entities by their sorted, deduplicated tokens
 * Good for company names where word order may vary
 */
export function tokenSetBlocking(name: string): string {
  const tokens = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .sort();

  return tokens.join('|');
}

/**
 * N-Gram Blocking
 * Groups entities sharing n-grams
 * Reduces false negatives from minor spelling variations
 */
export function ngramBlocking(name: string, n: number = 3): string[] {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const grams: string[] = [];

  for (let i = 0; i <= normalized.length - n; i++) {
    grams.push(normalized.slice(i, i + n));
  }

  return grams;
}

/**
 * Standardized Token Blocking
 * Removes common words (company suffixes, articles)
 */
export function standardizedTokenBlocking(name: string): string {
  const stopWords = new Set([
    'the', 'and', 'or', 'of', 'for', 'in', 'to', 'a', 'an', 'by',
    'company', 'inc', 'llc', 'ltd', 'corp', 'corporation', 'co',
    'pvt', 'private', 'public', 'limited', 'group', 'holdings',
    'international', 'global', 'solutions', 'services', 'systems',
  ]);

  const tokens = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !stopWords.has(t))
    .sort();

  return tokens.join('|');
}

/**
 * Phonetic Blocking
 * Groups by phonetic representation (Soundex or Metaphone)
 */
export function phoneticBlocking(name: string, algorithm: 'soundex' | 'metaphone'): string {
  const tokens = name.split(/\s+/).filter((t) => t.length > 0);

  if (algorithm === 'soundex') {
    return tokens.map((t) => soundex(t)).join('|');
  } else {
    return tokens.map((t) => metaphone(t)).join('|');
  }
}

/**
 * First Character Blocking
 * Groups entities by first character of first token
 * Simple but effective for reducing comparisons
 */
export function firstCharBlocking(name: string): string {
  const firstChar = name.toLowerCase().trim()[0] || '';
  return firstChar;
}

/**
 * Sorted Neighborhood Blocking
 * Creates a sliding window over sorted keys
 * Balances recall and efficiency
 */
export function sortedNeighborhoodBlocking(
  keys: { key: string; entityId: string }[],
  windowSize: number = 10
): { key: string; entityId: string }[][] {
  // Sort by key
  const sorted = [...keys].sort((a, b) => a.key.localeCompare(b.key));

  const blocks: { key: string; entityId: string }[][] = [];

  for (let i = 0; i < sorted.length; i++) {
    const block: { key: string; entityId: string }[] = [sorted[i]];

    // Add neighbors within window
    for (let j = Math.max(0, i - windowSize / 2); j < Math.min(sorted.length, i + windowSize / 2); j++) {
      if (j !== i && !block.find((b) => b.entityId === sorted[j].entityId)) {
        block.push(sorted[j]);
      }
    }

    blocks.push(block);
  }

  return blocks;
}

/**
 * LSH (Locality Sensitive Hashing) MinHash
 * Probabilistic blocking with tunable recall
 */
export function minhashSignature(name: string, numHashes: number = 100): number[] {
  const tokens = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (tokens.length === 0) {
    return new Array(numHashes).fill(Infinity);
  }

  const signatures: number[] = [];

  for (let i = 0; i < numHashes; i++) {
    let minHash = Infinity;

    for (const token of tokens) {
      const hash = hashWithSeed(token, i);
      minHash = Math.min(minHash, hash);
    }

    signatures.push(minHash);
  }

  return signatures;
}

/**
 * Simple hash function with seed
 */
function hashWithSeed(str: string, seed: number): number {
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * LSH Banding for MinHash
 * Groups entities likely to be similar
 */
export function lshBanding(
  signatures: number[][],
  entityIds: string[],
  numBands: number = 20
): Map<string, string[]> {
  const bands: Map<string, string[]> = new Map();

  for (let b = 0; b < numBands; b++) {
    const bandMap = new Map<string, string[]>();

    for (let i = 0; i < signatures.length; i++) {
      const hashValues = signatures[i].slice(b * Math.ceil(signatures[i].length / numBands), (b + 1) * Math.ceil(signatures[i].length / numBands));
      const bandKey = hashValues.join('|');

      if (!bandMap.has(bandKey)) {
        bandMap.set(bandKey, []);
      }
      bandMap.get(bandKey)!.push(entityIds[i]);
    }

    // Add to global bands
    for (const [key, entities] of bandMap) {
      if (entities.length > 1) {
        const fullKey = `${b}:${key}`;
        bands.set(fullKey, entities);
      }
    }
  }

  return bands;
}

/**
 * Adaptive Blocking Strategy
 * Automatically chooses best blocking based on entity type
 */
export function getAdaptiveBlockingStrategies(entityType: string): BlockingStrategy[] {
  switch (entityType.toLowerCase()) {
    case 'person':
      return ['soundex', 'first_n_chars'];
    case 'organization':
      return ['metaphone', 'token_set'];
    case 'location':
      return ['first_n_chars', 'token_set'];
    case 'product':
      return ['token_set', 'first_n_chars'];
    default:
      return ['soundex', 'token_set'];
  }
}
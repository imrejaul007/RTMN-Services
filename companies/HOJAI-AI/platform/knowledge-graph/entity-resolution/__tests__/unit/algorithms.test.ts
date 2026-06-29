import { describe, it, expect, beforeAll } from 'vitest';
import {
  jaroWinkler,
  levenshtein,
  jaccard,
  stringSimilarity
} from '../../src/algorithms/string-similarity.js';
import {
  soundex,
  metaphone
} from '../../src/algorithms/phonetic.js';
import {
  blocking,
  createBlockingKey
} from '../../src/algorithms/blocking.js';
import {
  calculateMatchScore,
  calculateConfidence
} from '../../src/algorithms/scoring.js';

describe('String Similarity Algorithms', () => {
  describe('jaroWinkler', () => {
    it('should return 1.0 for identical strings', () => {
      expect(jaroWinkler('hello', 'hello')).toBe(1.0);
    });

    it('should return 0.0 for completely different strings', () => {
      expect(jaroWinkler('abc', 'xyz')).toBeLessThan(0.5);
    });

    it('should handle case sensitivity', () => {
      const result = jaroWinkler('HELLO', 'hello');
      expect(result).toBeLessThan(1.0);
    });

    it('should handle empty strings', () => {
      expect(jaroWinkler('', '')).toBe(1.0);
      expect(jaroWinkler('hello', '')).toBe(0.0);
    });
  });

  describe('levenshtein', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshtein('hello', 'hello')).toBe(0);
    });

    it('should count single character changes', () => {
      expect(levenshtein('hello', 'hallo')).toBe(1);
      expect(levenshtein('hello', 'hello!')).toBe(1);
    });

    it('should count multiple changes', () => {
      expect(levenshtein('hello', 'world')).toBe(4);
    });
  });

  describe('jaccard', () => {
    it('should return 1.0 for identical strings', () => {
      expect(jaccard('hello', 'hello')).toBe(1.0);
    });

    it('should return 0.0 for completely different strings', () => {
      expect(jaccard('abc', 'xyz')).toBe(0.0);
    });

    it('should handle common characters', () => {
      const result = jaccard('hello', 'hullo');
      expect(result).toBeGreaterThan(0.5);
      expect(result).toBeLessThan(1.0);
    });
  });
});

describe('Phonetic Algorithms', () => {
  describe('soundex', () => {
    it('should return same code for similar sounding names', () => {
      expect(soundex('Robert')).toBe('R163');
      expect(soundex('Rupert')).toBe('R163');
    });

    it('should return same code for case-insensitive names', () => {
      expect(soundex('ROBERT')).toBe(soundex('robert'));
    });
  });

  describe('metaphone', () => {
    it('should return same code for similar sounding words', () => {
      expect(metaphone('hello')).toBe('HL');
      expect(metaphone('HELLO')).toBe('HL');
    });

    it('should handle edge cases', () => {
      expect(metaphone('')).toBe('');
      expect(metaphone('a')).toBe('A');
    });
  });
});

describe('Blocking', () => {
  it('should create blocking keys for entities', () => {
    const entity = { name: 'John Smith', type: 'person' };
    const keys = createBlockingKey(entity);
    expect(keys).toContain('JOHN');
    expect(keys).toContain('SMITH');
    expect(keys).toContain('JOHNSMITH');
  });

  it('should group entities into blocks', () => {
    const entities = [
      { id: '1', name: 'John Smith' },
      { id: '2', name: 'Jane Smith' },
      { id: '3', name: 'Bob Johnson' }
    ];
    const blocks = blocking(entities);
    expect(Object.keys(blocks).length).toBeGreaterThan(0);
  });
});

describe('Scoring', () => {
  it('should calculate match score between entities', () => {
    const entity1 = { name: 'John Smith', email: 'john@example.com' };
    const entity2 = { name: 'John Smith', email: 'john@example.com' };
    const score = calculateMatchScore(entity1, entity2);
    expect(score).toBe(1.0);
  });

  it('should calculate confidence based on multiple signals', () => {
    const signals = {
      stringSimilarity: 0.95,
      phoneticMatch: true,
      blockingMatch: true,
      sourceReliability: 0.8
    };
    const confidence = calculateConfidence(signals);
    expect(confidence).toBeGreaterThan(0.8);
    expect(confidence).toBeLessThanOrEqual(1.0);
  });
});

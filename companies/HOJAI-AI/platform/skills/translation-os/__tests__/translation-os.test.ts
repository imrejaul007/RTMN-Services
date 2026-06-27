import { describe, it, expect } from 'vitest';

// Translation OS Constants
const SUPPORTED_LANGS = ['en', 'hi', 'es', 'ar'];
const PROVIDERS = ['mock', 'google', 'deepl', 'azure'];
const TRANSLATION_MODES = ['passthrough', 'dictionary_exact', 'word_by_word'];

describe('Translation OS', () => {
  describe('Supported Languages', () => {
    it('should have 4 supported languages', () => {
      expect(SUPPORTED_LANGS).toHaveLength(4);
    });

    it('should support English, Hindi, Spanish, Arabic', () => {
      expect(SUPPORTED_LANGS).toContain('en');
      expect(SUPPORTED_LANGS).toContain('hi');
      expect(SUPPORTED_LANGS).toContain('es');
      expect(SUPPORTED_LANGS).toContain('ar');
    });
  });

  describe('Dictionary Lookup', () => {
    const DICT: Record<string, Record<string, Record<string, string>>> = {
      en: { 'hello': { hi: 'नमस्ते', es: 'Hola' }, 'thank you': { hi: 'धन्यवाद', es: 'Gracias' } },
      hi: { 'नमस्ते': { en: 'Hello', es: 'Hola' } },
      es: { 'hola': { en: 'Hello', hi: 'नमस्ते' } }
    };

    const lookupDict = (sourceLang: string, targetLang: string, text: string): string | null => {
      const srcDict = DICT[sourceLang];
      if (!srcDict) return null;
      const trimmed = text.trim().toLowerCase();
      return srcDict[trimmed]?.[targetLang] || null;
    };

    it('should translate English to Hindi', () => {
      expect(lookupDict('en', 'hi', 'hello')).toBe('नमस्ते');
    });

    it('should translate English to Spanish', () => {
      expect(lookupDict('en', 'es', 'hello')).toBe('Hola');
    });

    it('should translate Spanish to English', () => {
      expect(lookupDict('es', 'en', 'hola')).toBe('Hello');
    });

    it('should return null for unknown phrase', () => {
      expect(lookupDict('en', 'hi', 'unknown phrase')).toBeNull();
    });

    it('should handle case-insensitive lookup', () => {
      expect(lookupDict('en', 'hi', 'HELLO')).toBe('नमस्ते');
    });
  });

  describe('Glossary Application', () => {
    const applyGlossary = (text: string, entries: Record<string, string>): string => {
      let out = text;
      const sorted = Object.entries(entries).sort((a, b) => b[0].length - a[0].length);
      for (const [from, to] of sorted) {
        out = out.replace(new RegExp(`\\b${from}\\b`, 'gi'), to);
      }
      return out;
    };

    it('should apply glossary terms', () => {
      const glossary = { 'RTMN': 'Real-Time Multi-Network', 'AI': 'Artificial Intelligence' };
      expect(applyGlossary('RTMN uses AI', glossary)).toBe('Real-Time Multi-Network uses Artificial Intelligence');
    });

    it('should prefer longer matches', () => {
      const glossary = { 'AI': 'X', 'Artificial Intelligence': 'Y' };
      expect(applyGlossary('Artificial Intelligence (AI)', glossary)).toBe('Y (X)');
    });
  });

  describe('Mock Translation', () => {
    const DICT: Record<string, Record<string, Record<string, string>>> = {
      en: { 'hello': { hi: 'नमस्ते', es: 'Hola' }, 'thank you': { hi: 'धन्यवाद', es: 'Gracias' } },
      hi: { 'नमस्ते': { en: 'Hello' } },
      es: { 'hola': { en: 'Hello' } }
    };

    const translateMock = (text: string, sourceLang: string, targetLang: string): { translated: string; confidence: number; mode: string } => {
      if (sourceLang === targetLang) return { translated: text, confidence: 1.0, mode: 'passthrough' };

      const trimmed = text.trim().toLowerCase();
      const srcDict = DICT[sourceLang];
      if (srcDict?.[trimmed]?.[targetLang]) {
        return { translated: srcDict[trimmed][targetLang], confidence: 0.95, mode: 'dictionary_exact' };
      }

      return { translated: `[${sourceLang}]${text}[${targetLang}]`, confidence: 0.3, mode: 'word_by_word' };
    };

    it('should return same text for same language', () => {
      const result = translateMock('hello', 'en', 'en');
      expect(result.translated).toBe('hello');
      expect(result.confidence).toBe(1.0);
      expect(result.mode).toBe('passthrough');
    });

    it('should translate using dictionary with high confidence', () => {
      const result = translateMock('hello', 'en', 'hi');
      expect(result.translated).toBe('नमस्ते');
      expect(result.confidence).toBe(0.95);
      expect(result.mode).toBe('dictionary_exact');
    });

    it('should handle unknown words with low confidence', () => {
      const result = translateMock('unknownword', 'en', 'hi');
      expect(result.mode).toBe('word_by_word');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Batch Translation', () => {
    const batchTranslate = (texts: string[], from: string, to: string) => {
      return texts.map(t => ({ input: t, output: `[${from}]${t}[${to}]` }));
    };

    it('should translate multiple texts', () => {
      const results = batchTranslate(['hello', 'thank you'], 'en', 'es');
      expect(results).toHaveLength(2);
      expect(results[0].input).toBe('hello');
    });
  });

  describe('Language Validation', () => {
    const isValidLanguage = (lang: string): boolean => SUPPORTED_LANGS.includes(lang);

    it('should validate supported languages', () => {
      expect(isValidLanguage('en')).toBe(true);
      expect(isValidLanguage('hi')).toBe(true);
      expect(isValidLanguage('fr')).toBe(false);
    });
  });

  describe('Confidence Calculation', () => {
    const calculateConfidence = (knownWords: number, totalWords: number): number => {
      const base = knownWords / (totalWords || 1);
      return Math.max(0.3, Math.min(0.85, base + 0.2));
    };

    it('should calculate confidence based on known words', () => {
      expect(calculateConfidence(5, 10)).toBe(0.7);
      expect(calculateConfidence(0, 10)).toBe(0.3);
      expect(calculateConfidence(10, 10)).toBe(0.85);
    });
  });
});
/**
 * Translation OS Client (port 4866) — multi-provider translation.
 *
 * Pluggable translation providers (DeepL, Google, Azure, etc.) with
 * batch translation, glossaries, and custom dictionaries.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export type Language = 'en' | 'hi' | 'es' | 'ar' | 'fr' | 'de' | 'zh' | 'ja' | 'ko' | 'pt' | 'ru' | 'it';

export interface TranslationProvider {
  name: string;
  label: string;
  current: boolean;
}

export interface TranslationResult {
  text: string;
  sourceLang: Language;
  targetLang: Language;
  provider: string;
  /** 0-1 confidence */
  confidence?: number;
}

export interface Glossary {
  id: string;
  name: string;
  sourceLang: Language;
  targetLang: Language;
  /** Phrase → translation map */
  entries: Record<string, string>;
}

export class TranslationClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4866` }; }

  async listProviders(): Promise<{ providers: TranslationProvider[]; current: string }> {
    return request(this.config, 'GET', '/api/providers');
  }
  async switchProvider(name: string): Promise<{ switched: boolean; current: string }> {
    return request(this.config, 'POST', '/api/providers/switch', { name });
  }
  async translate(input: { text: string; sourceLang: Language; targetLang: Language; glossaryId?: string }): Promise<TranslationResult> {
    return request<TranslationResult>(this.config, 'POST', '/api/translate', input);
  }
  async batchTranslate(input: { texts: string[]; sourceLang: Language; targetLang: Language; glossaryId?: string }): Promise<{ translations: TranslationResult[] }> {
    return request(this.config, 'POST', '/api/translate/batch', input);
  }
  async lookupDictionary(input: { sourceLang: Language; targetLang: Language; phrase: string }): Promise<{ source: string; target: string; provider?: string }> {
    return request(this.config, 'GET', `/api/dictionary/${encodeURIComponent(input.sourceLang)}/${encodeURIComponent(input.targetLang)}/${encodeURIComponent(input.phrase)}`);
  }
  async listGlossaries(): Promise<{ glossaries: Glossary[]; count: number }> {
    return request(this.config, 'GET', '/api/glossaries');
  }
  async createGlossary(input: { name: string; sourceLang: Language; targetLang: Language; entries: Record<string, string> }): Promise<Glossary> {
    return request<Glossary>(this.config, 'POST', '/api/glossaries', input);
  }
  async addGlossaryEntry(glossaryId: string, input: { source: string; target: string }): Promise<Glossary> {
    return request<Glossary>(this.config, 'POST', `/api/glossaries/${encodeURIComponent(glossaryId)}/entries`, input);
  }
  async removeGlossaryEntry(glossaryId: string, source: string): Promise<Glossary> {
    return request<Glossary>(this.config, 'DELETE', `/api/glossaries/${encodeURIComponent(glossaryId)}/entries/${encodeURIComponent(source)}`);
  }
  async removeGlossary(glossaryId: string): Promise<{ removed: boolean; id: string }> {
    return request<{ removed: boolean; id: string }>(this.config, 'DELETE', `/api/glossaries/${encodeURIComponent(glossaryId)}`);
  }
}

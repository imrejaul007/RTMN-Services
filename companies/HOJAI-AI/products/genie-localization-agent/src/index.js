/**
 * Genie Localization Agent — port 4724.
 *
 * Capabilities: translation, cultural-localization, brand-voice-preservation, idiom-handling.
 *
 * Endpoints:
 *   GET    /health, /ready, /info
 *   POST   /api/v1/translate               — translate + detect language
 *   POST   /api/v1/localize/cultural       — apply cultural adaptations
 *   GET    /api/v1/languages               — list supported languages
 *   POST   /api/v1/brand-voice/detect      — analyze brand voice from sample
 *
 * MVP: pattern-based translation + language detection + idiom mapping.
 * Production: integrates with DeepL, Google Translate, or in-house LLM.
 */

const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const cors = require('cors');
const helmet = require('helmet');

const PORT = parseInt(process.env.LOCALIZATION_PORT || '4724');
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || process.env.INTERNAL_SERVICE_TOKEN || '';
const REQUIRE_AUTH = process.env.LOCALIZATION_REQUIRE_AUTH !== 'false';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function apiResponse(success, data, error) {
  return { success, data, error, timestamp: new Date().toISOString() };
}

function apiKeyAuth(req, res, next) {
  if (!REQUIRE_AUTH) return next();
  const auth = req.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json(apiResponse(false, undefined, 'Auth required'));
  if (HOJAI_API_KEY && token !== HOJAI_API_KEY) return res.status(401).json(apiResponse(false, undefined, 'Invalid key'));
  next();
}

// ─── Language catalog ──────────────────────────────────────────────────

const LANGUAGES = {
  'en': { name: 'English', nativeName: 'English', rtl: false, region: 'Global' },
  'es': { name: 'Spanish', nativeName: 'Español', rtl: false, region: 'Americas/Europe' },
  'fr': { name: 'French', nativeName: 'Français', rtl: false, region: 'Europe' },
  'de': { name: 'German', nativeName: 'Deutsch', rtl: false, region: 'Europe' },
  'it': { name: 'Italian', nativeName: 'Italiano', rtl: false, region: 'Europe' },
  'pt': { name: 'Portuguese', nativeName: 'Português', rtl: false, region: 'Americas/Europe' },
  'ru': { name: 'Russian', nativeName: 'Русский', rtl: false, region: 'Europe/Asia' },
  'zh': { name: 'Chinese (Simplified)', nativeName: '中文', rtl: false, region: 'Asia' },
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '繁體中文', rtl: false, region: 'Asia' },
  'ja': { name: 'Japanese', nativeName: '日本語', rtl: false, region: 'Asia' },
  'ko': { name: 'Korean', nativeName: '한국어', rtl: false, region: 'Asia' },
  'hi': { name: 'Hindi', nativeName: 'हिन्दी', rtl: false, region: 'Asia' },
  'bn': { name: 'Bengali', nativeName: 'বাংলা', rtl: false, region: 'Asia' },
  'ta': { name: 'Tamil', nativeName: 'தமிழ்', rtl: false, region: 'Asia' },
  'te': { name: 'Telugu', nativeName: 'తెలుగు', rtl: false, region: 'Asia' },
  'mr': { name: 'Marathi', nativeName: 'मराठी', rtl: false, region: 'Asia' },
  'ar': { name: 'Arabic', nativeName: 'العربية', rtl: true, region: 'MENA' },
  'he': { name: 'Hebrew', nativeName: 'עברית', rtl: true, region: 'MENA' },
  'fa': { name: 'Persian', nativeName: 'فارسی', rtl: true, region: 'MENA' },
  'ur': { name: 'Urdu', nativeName: 'اردو', rtl: true, region: 'Asia' },
  'tr': { name: 'Turkish', nativeName: 'Türkçe', rtl: false, region: 'MENA' },
  'ar-EG': { name: 'Arabic (Egypt)', nativeName: 'العربية المصرية', rtl: true, region: 'MENA' },
  'sw': { name: 'Swahili', nativeName: 'Kiswahili', rtl: false, region: 'Africa' },
  'af': { name: 'Afrikaans', nativeName: 'Afrikaans', rtl: false, region: 'Africa' },
  'th': { name: 'Thai', nativeName: 'ไทย', rtl: false, region: 'Asia' },
  'vi': { name: 'Vietnamese', nativeName: 'Tiếng Việt', rtl: false, region: 'Asia' },
  'id': { name: 'Indonesian', nativeName: 'Bahasa Indonesia', rtl: false, region: 'Asia' },
  'ms': { name: 'Malay', nativeName: 'Bahasa Melayu', rtl: false, region: 'Asia' },
  'tl': { name: 'Filipino', nativeName: 'Filipino', rtl: false, region: 'Asia' }
};

// Cultural idioms — what to use instead in target language
const IDIOM_MAP = {
  'piece of cake': {
    'fr': "C'est du gâteau",
    'de': 'Ein Kinderspiel',
    'es': 'Pan comido',
    'ja': '朝飯前 (asayameshi-mae)',
    'hi': 'बहुत आसान (bahut aasan)',
    'ar': 'سهل جداً (sahl jiddan)'
  },
  'break a leg': {
    'fr': 'Merde',
    'de': 'Hals- und Beinbruch',
    'es': 'Mucha mierda',
    'ja': '頑張って (ganbatte)',
    'hi': 'शुभकामनाएँ (shubhkaamnaayein)'
  },
  "it's raining cats and dogs": {
    'fr': 'Il pleut des cordes',
    'de': 'Es regnet in Strömen',
    'es': 'Llueve a cántaros',
    'ja': '土砂降り (doshaburi)',
    'hi': 'मूसलाधार बारिश (moosladhaar baarish)'
  }
};

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'genie-localization', version: '1.0.0', port: PORT, languages: Object.keys(LANGUAGES).length }));
app.get('/ready', (_req, res) => res.json({ ready: true, port: PORT }));

app.get('/info', (_req, res) => {
  res.json(apiResponse(true, {
    name: 'Genie Localization',
    version: '1.0.0',
    capabilities: ['translation', 'cultural-localization', 'brand-voice-preservation', 'idiom-handling'],
    supportedLanguages: Object.keys(LANGUAGES).length
  }));
});

app.get('/api/v1/languages', (_req, res) => {
  res.json(apiResponse(true, {
    total: Object.keys(LANGUAGES).length,
    languages: Object.entries(LANGUAGES).map(([code, info]) => ({ code, ...info }))
  }));
});

app.post('/api/v1/translate',requireAuth,  apiKeyAuth, (req, res) => {
  const { text, sourceLang = 'auto', targetLang, brandVoice = 'neutral' } = req.body || {};
  if (!text || !targetLang) {
    return res.status(400).json(apiResponse(false, undefined, 'text and targetLang are required'));
  }
  if (!LANGUAGES[targetLang]) {
    return res.status(400).json(apiResponse(false, undefined, `unsupported targetLang: ${targetLang}`));
  }

  const detected = sourceLang === 'auto' ? detectLanguage(text) : sourceLang;
  const translation = mockTranslate(text, detected, targetLang, brandVoice);
  const idiomsApplied = applyIdioms(text, targetLang);

  res.json(apiResponse(true, {
    original: text,
    sourceLang: detected,
    targetLang,
    translation,
    idiomsApplied,
    brandVoicePreserved: brandVoice !== 'neutral',
    confidence: 0.92
  }));
});

app.post('/api/v1/localize/cultural',requireAuth,  apiKeyAuth, (req, res) => {
  const { text, targetLocale, adjustments = [] } = req.body || {};
  if (!text || !targetLocale) {
    return res.status(400).json(apiResponse(false, undefined, 'text and targetLocale required'));
  }

  const culturalChanges = [];
  let localized = text;

  for (const adj of adjustments) {
    if (adj.type === 'currency') {
      localized = localized.replace(/\$(\d+)/g, (m, n) => `${adj.toSymbol || '€'}${n}`);
      culturalChanges.push({ type: 'currency', from: '$', to: adj.toSymbol || '€' });
    }
    if (adj.type === 'date') {
      // Format: MM/DD/YYYY → DD/MM/YYYY for EU locales
      localized = localized.replace(/(\d{2})\/(\d{2})\/(\d{4})/g, '$2/$1/$3');
      culturalChanges.push({ type: 'date', format: 'DD/MM/YYYY' });
    }
    if (adj.type === 'measurement') {
      localized = localized.replace(/(\d+)ft/g, (m, n) => `${Math.round(parseInt(n) * 0.3048)}m`);
      culturalChanges.push({ type: 'measurement', from: 'ft', to: 'm' });
    }
    if (adj.type === 'formality') {
      culturalChanges.push({ type: 'formality', level: adj.level || 'formal' });
    }
  }

  res.json(apiResponse(true, {
    original: text,
    targetLocale,
    localized,
    changes: culturalChanges
  }));
});

app.post('/api/v1/brand-voice/detect',requireAuth,  apiKeyAuth, (req, res) => {
  const { samples = [] } = req.body || {};
  if (!Array.isArray(samples) || samples.length === 0) {
    return res.status(400).json(apiResponse(false, undefined, 'samples array required'));
  }

  const voice = analyzeBrandVoice(samples);
  res.json(apiResponse(true, voice));
});

// ─── Helpers ───────────────────────────────────────────────────────────

function detectLanguage(text) {
  // Heuristic: look for distinctive characters/words per language
  // Script detection first (highest confidence)
  if (/[一-鿿]/.test(text)) return 'zh';
  if (/[぀-ゟ゠-ヿ]/.test(text)) return 'ja';
  if (/[가-힯]/.test(text)) return 'ko';
  if (/[؀-ۿ]/.test(text)) return 'ar';
  if (/[֐-׿]/.test(text)) return 'he';
  if (/[ऀ-ॿ]/.test(text)) return 'hi';
  if (/[฀-๿]/.test(text)) return 'th';
  if (/[Ѐ-ӿ]/.test(text)) return 'ru';

  // Word-based detection — score each language by characteristic word count
  const t = text.toLowerCase();
  const scores = {
    fr: (t.match(/\b(le|la|les|et|est|une|des|du|je|tu|nous|vous|avec|pour|dans)\b/g) || []).length,
    es: (t.match(/\b(el|los|las|y|una|unos|del|por|con|para|qué|cómo)\b/g) || []).length,
    de: (t.match(/\b(der|die|das|und|ist|ein|eine|den|dem|für|auf|nicht|auch)\b/g) || []).length,
    it: (t.match(/\b(gli|sono|della|dello|delle|questo|questa|quello)\b/g) || []).length,
    pt: (t.match(/\b(está|estão|não|são|muito|pouco|também|nosso|nossa)\b/g) || []).length,
    en: (t.match(/\b(the|is|are|was|were|have|has|will|would|can|with|that|this)\b/g) || []).length
  };

  // Find the highest scorer
  let best = 'en';
  let bestScore = scores.en || 0;
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      best = lang;
      bestScore = score;
    }
  }
  return best;
}

function mockTranslate(text, source, target, brandVoice) {
  // MVP: prepend language label + bracket the original. Production: real API.
  const lang = LANGUAGES[target]?.nativeName || target;
  return `[${lang}] ${text}`;
}

function applyIdioms(text, targetLang) {
  const found = [];
  const lower = text.toLowerCase();
  for (const [idiom, translations] of Object.entries(IDIOM_MAP)) {
    if (lower.includes(idiom) && translations[targetLang]) {
      found.push({
        original: idiom,
        localized: translations[targetLang]
      });
    }
  }
  return found;
}

function analyzeBrandVoice(samples) {
  // MVP heuristics: tone + formality + key themes
  const all = samples.join(' ').toLowerCase();
  const exclamations = (all.match(/!/g) || []).length;
  const questions = (all.match(/\?/g) || []).length;
  const contractions = (all.match(/\b\w+'\w+\b/g) || []).length;
  const emojis = (all.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;

  const isCasual = contractions > samples.length * 0.5 || emojis > 0;
  const isEnthusiastic = exclamations > questions;
  const isFormal = !isCasual && contractions === 0;

  let tone = 'neutral';
  if (isEnthusiastic && isCasual) tone = 'friendly-enthusiastic';
  else if (isEnthusiastic) tone = 'professional-enthusiastic';
  else if (isCasual) tone = 'casual-friendly';
  else if (isFormal) tone = 'formal-professional';

  // Common themes (very rough)
  const themes = [];
  const themeWords = { innovation: ['innovation', 'innovative', 'new'], quality: ['quality', 'best', 'excellence'], customer: ['customer', 'client', 'user'] };
  for (const [theme, words] of Object.entries(themeWords)) {
    const matches = words.filter((w) => all.includes(w)).length;
    if (matches > 0) themes.push({ theme, score: matches });
  }
  themes.sort((a, b) => b.score - a.score);

  return {
    sampleCount: samples.length,
    tone,
    formality: isFormal ? 'formal' : isCasual ? 'casual' : 'neutral',
    enthusiasm: isEnthusiastic ? 'high' : 'moderate',
    themes: themes.slice(0, 3),
    summary: `Detected ${tone} tone with ${isCasual ? 'casual' : 'professional'} formality.`
  };
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[genie-localization] listening on :${PORT}`);
    console.log(`[genie-localization] languages: ${Object.keys(LANGUAGES).length}`);
    console.log(`[genie-localization] auth: ${REQUIRE_AUTH ? 'required' : 'disabled'}`);
  });
}

module.exports = { app, detectLanguage, mockTranslate, applyIdioms, analyzeBrandVoice, LANGUAGES };
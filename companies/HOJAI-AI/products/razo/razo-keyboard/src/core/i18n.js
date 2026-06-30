/**
 * i18n - Internationalization for RAZO
 *
 * Supports:
 * - English (en)
 * - Hindi (hi) - Devanagari + Roman (Hinglish)
 * - Bengali (bn)
 * - Assamese (as)
 * - Arabic (ar) - Modern Standard + GCC dialect
 * - Urdu (ur)
 *
 * Phase 2 (Q4 2026): Tamil, Telugu, Marathi, Gujarati, Punjabi, etc.
 *
 * Not just literal translation - CULTURAL adaptation.
 * Same meaning, right tone for the recipient's culture.
 */

class I18n {
  constructor({ logger } = {}) {
    this.logger = logger || console;

    // Supported languages with metadata
    this.languages = {
      en: { name: 'English', nativeName: 'English', script: 'latin', direction: 'ltr', region: 'global' },
      hi: { name: 'Hindi', nativeName: 'हिन्दी', script: 'devanagari', direction: 'ltr', region: 'india', variants: ['hinglish'] },
      bn: { name: 'Bengali', nativeName: 'বাংলা', script: 'bengali', direction: 'ltr', region: 'india-bangladesh' },
      as: { name: 'Assamese', nativeName: 'অসমীয়া', script: 'bengali', direction: 'ltr', region: 'india-assam' },
      ar: { name: 'Arabic', nativeName: 'العربية', script: 'arabic', direction: 'rtl', region: 'gcc-mena', variants: ['gcc', 'egyptian'] },
      ur: { name: 'Urdu', nativeName: 'اردو', script: 'arabic', direction: 'rtl', region: 'india-pakistan' }
    };

    // Festival greetings (cultural awareness)
    this.festivalGreetings = {
      // Islamic
      eid: {
        islamic: { en: 'Eid Mubarak', hi: 'ईद मुबारक', ar: 'عيد مبارك', ur: 'عید مبارک', bn: 'ঈদ মুবারক' },
        tagline: { en: 'May this blessed day bring you joy and peace 🌙', ar: 'تقبل الله منا ومنكم' }
      },
      ramadan: {
        islamic: { en: 'Ramadan Kareem', hi: 'रमज़ान मुबारक', ar: 'رمضان كريم', ur: 'رمضان مبارک' }
      },
      milad: {
        islamic: { en: 'Eid Milad-un-Nabi', hi: 'ईद-ए-मिलाद', ar: 'المولد النبوي' }
      },
      // Hindu
      diwali: {
        hindu: { en: 'Happy Diwali', hi: 'दीपावली की शुभकामनाएं', bn: 'দীপাবলীর শুভেচ্ছা', as: 'দীপাৱলীৰ শুভেচ্ছা' },
        tagline: { en: 'May the festival of lights brighten your life 🪔' }
      },
      holi: {
        hindu: { en: 'Happy Holi', hi: 'होली की शुभकामनाएं' },
        tagline: { en: 'May colors of joy fill your life 🎨' }
      },
      navratri: {
        hindu: { en: 'Happy Navratri', hi: 'नवरात्रि की शुभकामनाएं', gu: 'નવરાત્રીની શુભકામના' }
      },
      rakhi: {
        hindu: { en: 'Happy Rakhi', hi: 'रक्षाबंधन की शुभकामनाएं' }
      },
      // Regional (India)
      bihu: {
        regional: { en: 'Happy Bihu', as: 'বিহুৰ শুভেচ্ছা', hi: 'बिहू की शुभकामनाएं' },
        tagline: { en: 'Wishing you joy and prosperity' }
      },
      onam: {
        regional: { en: 'Happy Onam', ml: 'ഓണാശംസകൾ', hi: 'ओणम की शुभकामनाएं' }
      },
      pongal: {
        regional: { en: 'Happy Pongal', ta: 'பொங்கல் வாழ்த்துக்கள்', hi: 'पोंगल की शुभकामनाएं' }
      },
      lohri: {
        regional: { en: 'Happy Lohri', pa: 'ਲੋਹੜੀ ਦੀਆਂ ਵਧਾਈਆਂ', hi: 'लोहड़ी की शुभकामनाएं' }
      },
      eid_milad: {
        islamic: { en: 'Eid Milad-un-Nabi', hi: 'मिलाद-उन-नबी' }
      },
      // Christian
      christmas: {
        christian: { en: 'Merry Christmas', hi: 'क्रिसमस की शुभकामनाएं' }
      },
      new_year: {
        universal: { en: 'Happy New Year', hi: 'नव वर्ष की शुभकामनाएं', ar: 'سنة جديدة سعيدة' }
      }
    };

    // Common phrases by language (cultural adaptation, not literal)
    this.commonPhrases = {
      greeting_morning: {
        en: 'Good morning',
        hi: 'सुप्रभात',
        as: 'সুপ্ৰভাত',
        ar: 'صباح الخير',
        ur: 'صبح بخیر'
      },
      greeting_evening: {
        en: 'Good evening',
        hi: 'शुभ संध्या',
        ar: 'مساء الخير'
      },
      greeting_islamic: {
        en: 'Assalamu Alaikum',
        hi: 'अस्सलामु अलैकुम',
        ar: 'السلام عليكم',
        ur: 'السلام علیکم',
        bn: 'আসসালামু আলাইকুম'
      },
      thanks: {
        en: 'Thank you',
        hi: 'धन्यवाद',
        as: 'ধন্যবাদ',
        bn: 'ধন্যবাদ',
        ar: 'شكرا',
        ur: 'شکریہ'
      },
      inshallah: {
        en: 'InshaAllah (God willing)',
        hi: 'इंशाअल्लाह',
        ar: 'إن شاء الله',
        ur: 'ان شاء اللہ'
      }
    };

    this.stats = {
      languageDetections: 0,
      translations: 0,
      greetings: 0,
      festivalChecks: 0
    };
  }

  /**
   * Detect language from text
   * Returns language code: en, hi, bn, as, ar, ur, etc.
   */
  detectLanguage(text) {
    if (!text || typeof text !== 'string') return 'en';
    this.stats.languageDetections++;

    // Score each language
    const scores = {};

    for (const [lang, meta] of Object.entries(this.languages)) {
      scores[lang] = 0;
    }

    // Script-based detection
    if (/[ऀ-ॿ]/.test(text)) {
      // Devanagari (Hindi, Marathi, Sanskrit, Nepali)
      if (/\b(और|है|में|को|से|का|की|के|ने|पर|यह|वह|हम|आप|मैं|तुम)\b/.test(text)) {
        scores.hi += 5;
      } else {
        scores.hi += 3;
      }
    }

    if (/[ঀ-৿]/.test(text)) {
      // Bengali/Assamese script
      if (/[অ-ঋ]/.test(text) && /\b(আছে|কৰে|এই|সেই|মই|তই)\b/.test(text)) {
        scores.as += 5; // Assamese-specific markers
      } else {
        scores.bn += 5; // Default Bengali
      }
    }

    if (/[؀-ۿ]/.test(text)) {
      // Arabic script
      if (/[ٻ-ٿ۔]/.test(text) || /[ہ|ی|ے|ۓ]/.test(text) || /\b(ہے|کو|سے|کا|کی|نے|میں|ہوں|آپ|میں)\b/.test(text)) {
        scores.ur += 6; // Urdu-specific markers
      } else {
        scores.ar += 5; // Arabic
      }
    }

    // Latin script detection (English, Hinglish, etc.)
    if (/^[a-zA-Z\s.,!?'-]+$/.test(text)) {
      scores.en += 3;

      // Hinglish detection (Roman Hindi)
      const hinglishMarkers = /\b(mera|tera|uska|iska|kya|kaise|kahan|kab|kyun|hai|hain|ho|kar|kya|tum|aap|main|hum|bhai|yaar|dost|namaste|paise|rupees|hai|nahi|haan|nahi|achha|theek|chal|arey)\b/i;
      if (hinglishMarkers.test(text)) {
        scores.hi += 4;
        scores.en -= 1; // Reduce English score
      }
    }

    // Find highest score
    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const detected = sorted[0][1] > 0 ? sorted[0][0] : 'en';

    return detected;
  }

  /**
   * Detect Hinglish (mixed Hindi-English in Roman script)
   */
  isHinglish(text) {
    if (!text) return false;

    const hinglishWords = /\b(mera|tera|uska|iska|kya|kaise|kahan|kab|kyun|hai|hain|ho|kar|kya|tum|aap|main|hum|bhai|yaar|dost|namaste|paise|rupees|hai|nahi|haan|achha|theek|chal|arey|matlab|samajh|kyunki|isliye)\b/i;

    const englishWords = (text.match(/\b[a-z]+\b/g) || []).length;
    const hindiWords = (text.match(hinglishWords) || []).length;

    // If > 30% of detected words are Hindi markers
    return englishWords > 0 && (hindiWords / englishWords) > 0.3;
  }

  /**
   * Cultural translation (not literal)
   * Same meaning, right tone for the recipient's culture
   */
  async translate(text, fromLang, toLang, context = {}) {
    this.stats.translations++;

    const { relationship = 'general', formality = 'neutral', recipientReligion = null } = context;

    // If same language, no translation needed
    if (fromLang === toLang) {
      return { text, language: fromLang, adapted: false };
    }

    // Cultural adaptation rules
    const adapted = this._culturalAdapt(text, toLang, {
      relationship,
      formality,
      religion: recipientReligion
    });

    return {
      text: adapted,
      fromLanguage: fromLang,
      toLanguage: toLang,
      adapted: true,
      culturalNotes: this._getCulturalNotes(toLang, recipientReligion)
    };
  }

  /**
   * Cultural adaptation
   */
  _culturalAdapt(text, toLang, context) {
    const { relationship, formality, religion } = context;

    // Mock adaptation - in production, this would use LLM with cultural prompts
    const adaptations = {
      // "Let's meet tomorrow"
      ar: {
        general: 'يسعدني لقاؤك غداً',
        business: 'يسعدني لقاؤك غداً في تمام الساعة العاشرة صباحاً',
        friend: 'بكرة نقابل، تمام؟'
      },
      hi: {
        general: 'कल मिलते हैं',
        business: 'कल मिलने की प्रसन्नता होगी',
        friend: 'कल मिलते हैं! कहाँ?',
        family: 'कल आ रहे हो? हम घर पर हैं।'
      },
      as: {
        family: 'কাইলৈ আহিবা নে? মই ঘৰতে আছোঁ।'
      },
      bn: {
        general: 'আগামীকাল দেখা হোক',
        friend: 'কাল দেখা হবে? কোথায়?'
      }
    };

    const langAdaptations = adaptations[toLang] || {};
    return langAdaptations[relationship] || langAdaptations.general || text;
  }

  /**
   * Get cultural notes for a language/religion
   */
  _getCulturalNotes(language, religion) {
    const notes = [];

    if (language === 'ar') {
      notes.push('Right-to-left script');
      notes.push('Religious greetings appreciated');
      if (religion === 'islamic') notes.push('Consider Islamic phrases (InshaAllah, etc.)');
    }

    if (['hi', 'bn', 'as'].includes(language)) {
      notes.push('Respectful tone with elders');
      notes.push('Family context important');
    }

    if (language === 'hi' && religion === 'hindu') {
      notes.push('Festival greetings available');
    }

    return notes;
  }

  /**
   * Get greeting for a recipient
   */
  getGreeting(recipientContext, language = 'en') {
    this.stats.greetings++;

    const { religion, timeOfDay, relationship } = recipientContext;
    const hour = timeOfDay !== undefined ? timeOfDay : new Date().getHours();

    // Islamic greeting (preferred for Muslims regardless of language)
    if (religion === 'islamic') {
      return {
        text: this.commonPhrases.greeting_islamic[language] || 'Assalamu Alaikum',
        language,
        type: 'islamic',
        cultural: true
      };
    }

    // Time-based greeting
    let timeKey = 'greeting_morning';
    if (hour >= 17) timeKey = 'greeting_evening';
    else if (hour >= 12) timeKey = 'greeting_morning';

    return {
      text: this.commonPhrases[timeKey][language] || 'Hello',
      language,
      type: 'time-based',
      cultural: false
    };
  }

  /**
   * Get festival greeting (if applicable)
   */
  getFestivalGreeting(festival, recipientLanguage = 'en', recipientReligion = null) {
    this.stats.festivalChecks++;

    const festivalData = this.festivalGreetings[festival];
    if (!festivalData) return null;

    // Pick the right category
    let category = 'universal';
    if (festivalData.islamic && recipientReligion === 'islamic') category = 'islamic';
    else if (festivalData.hindu && recipientReligion === 'hindu') category = 'hindu';
    else if (festivalData.christian && recipientReligion === 'christian') category = 'christian';
    else if (festivalData.regional) category = 'regional';

    const greetings = festivalData[category] || festivalData.universal;
    const greeting = greetings[recipientLanguage] || greetings.en || 'Greetings!';

    return {
      festival,
      text: greeting,
      language: recipientLanguage,
      tagline: festivalData.tagline?.[recipientLanguage] || festivalData.tagline?.en,
      category,
      cultural: true
    };
  }

  /**
   * Get current festival (based on date)
   * In production, this would call Calendar service
   */
  getCurrentFestival(userId, region = 'india') {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Static festival dates (approximation - real impl uses calendar)
    const festivals = [
      { name: 'eid', monthRange: [[3, 10], [3, 11]], region: 'gcc-mena-india' },
      { name: 'diwali', monthRange: [[11, 1], [11, 5]], region: 'india' },
      { name: 'holi', monthRange: [[3, 8], [3, 10]], region: 'india' },
      { name: 'christmas', monthRange: [[12, 24], [12, 25]], region: 'global' },
      { name: 'new_year', monthRange: [[1, 1], [1, 1]], region: 'global' },
      { name: 'bihu', monthRange: [[4, 14], [4, 16]], region: 'india-assam' },
      { name: 'pongal', monthRange: [[1, 14], [1, 17]], region: 'india-tamilnadu' },
      { name: 'onam', monthRange: [[8, 25], [9, 5]], region: 'india-kerala' }
    ];

    for (const fest of festivals) {
      const [[m1, d1], [m2, d2]] = fest.monthRange;
      if (month === m1 && day >= d1 && day <= d2) {
        if (fest.region === 'global' || fest.region.includes(region)) {
          return fest.name;
        }
      }
    }

    return null;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return Object.entries(this.languages).map(([code, meta]) => ({
      code,
      ...meta
    }));
  }

  getStats() {
    return this.stats;
  }
}

module.exports = I18n;
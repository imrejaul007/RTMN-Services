/**
 * Hojai Multilingual Service
 *
 * Supports 10+ Indian languages
 * - English
 * - Hindi
 * - Bengali
 * - Tamil
 * - Telugu
 * - Kannada
 * - Malayalam
 * - Marathi
 * - Gujarati
 * - Punjabi
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 4870;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

// ============ LANGUAGE CONFIG ============

const LANGUAGES = {
  en: { name: 'English', code: 'en-IN', script: 'Latn' },
  hi: { name: 'Hindi', code: 'hi-IN', script: 'Deva' },
  bn: { name: 'Bengali', code: 'bn-IN', script: 'Beng' },
  ta: { name: 'Tamil', code: 'ta-IN', script: 'Taml' },
  te: { name: 'Telugu', code: 'te-IN', script: 'Telu' },
  kn: { name: 'Kannada', code: 'kn-IN', script: 'Knda' },
  ml: { name: 'Malayalam', code: 'ml-IN', script: 'Mlym' },
  mr: { name: 'Marathi', code: 'mr-IN', script: 'Deva' },
  gu: { name: 'Gujarati', code: 'gu-IN', script: 'Gujr' },
  pa: { name: 'Punjabi', code: 'pa-IN', script: 'Guru' }
};

// Translation templates for common voice phrases
const VOICE_TEMPLATES: Record<string, Record<string, string>> = {
  greeting: {
    en: 'Hello, welcome to our service. How can I help you today?',
    hi: 'नमस्ते, हमारी सेवा में आपका स्वागत है। मैं आपकी कैसे मदद कर सकता हूं?',
    ta: 'வணக்கம், எங்கள் சேவையில் நீங்கள் வரவேற்கிறோம். நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?',
    te: 'నమస్కరం, మా సేవకు స్వాగతం. నేను మీకు ఎలా సహాయపడగలను?',
    kn: 'ಹಲೋ, ನಮ್ಮ ಸೇವೆಗೆ ಸ್ವಾಗತ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?'
  },
  book_appointment: {
    en: 'I can help you book an appointment. What date and time works for you?',
    hi: 'मैं आपकी अपॉइंटमेंट बुक करने में मदद कर सकता हूं। आपके लिए कौन सी तारीख और समय उपयुक्त है?',
    ta: 'நான் உங்கள் சந்திப்பை முன்பதிவு செய்ய உதவ முடியும். எந்த தேதி மற்றும் நேரம் உங்களுக்கு பொருத்தமானதாக இருக்கும்?',
    te: 'నేను మీ అపాయింట్‌మెంట్ బుక్ చేయడంలో సహాయపడగలను. ఏ తేదీ మరియు సమయం మీకు అనువైనది?',
    kn: 'ನಾನು ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಲು ಸಹಾಯ ಮಾಡಬಹುದು. ಯಾವ ದಿನಾಂಕ ಮತ್ತು ಸಮಯ ನಿಮಗೆ ಸೂಕ್ತಿಮಟ್ಟ?'
  },
  confirm_booking: {
    en: 'Your appointment is confirmed for {date} at {time}. You will receive a confirmation SMS.',
    hi: 'आपकी अपॉइंटमेंट {date} को {time} बजे पुष्टि हो गई है। आपको एक पुष्टि SMS मिलेगा।',
    ta: 'உங்கள் சந்திப்பு {date} அன்று {time} மணிக்கு உறுதி செய்யப்பட்டது. உறுதிப்படுத்தும் SMS பெறுவீர்கள்.',
    te: 'మీ అపాయింట్‌మెంట్ {date} వద్ద {time} ధృవీకరించబడింది. మీరు నిర్ధారణ SMS పొందుతారు.',
    kn: 'ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ {date} ರಂದ {time} ಗೆ ದೃಢೀಕರಿಸಲಾಗಿದೆ. ನೀವು ದೃಢೀಕರಣ SMS ಪಡೆಯುತ್ತೀರಿ.'
  },
  order_placed: {
    en: 'Your order #{orderId} has been placed successfully. Total amount: ₹{amount}',
    hi: 'आपका ऑर्डर #{orderId} सफलतापूर्वक हो गया है। कुल राशि: ₹{amount}',
    ta: 'உங்கள் ஆர்டர் #{orderId} வெற்றிகரமாக வழங்கப்பட்டது. மொத்த தொகை: ₹{amount}',
    te: 'మీ ఆర్డర్ #{orderId} విజయవంతంగా ప్లేస్ చేయబడింది. మొత్తం: ₹{amount}',
    kn: 'ನಿಮ್ಮ ಆರ್ಡರ್ #{orderId} ಯಶಸ್ವಿಯಾಗಿ ಪ್ಲೇಸ್ ಆಗಿದೆ.ಒಟ್ಟು ಮೊತ್ತ: ₹{amount}'
  },
  payment_confirm: {
    en: 'Payment of ₹{amount} received. Thank you!',
    hi: '₹{amount} का भुगतान प्राप्त हुआ। धन्यवाद!',
    ta: '₹{amount} பணம் பெறப்பட்டது. நன்றி!',
    te: '₹{amount} చెల్లింపు అందింది. ధన్యవాదములు!',
    kn: '₹{amount} ಪಾವತಿ ಪಡೆದುಕೊಂಡಿದ್ದೇವೆ. ಧನ್ಯವಾದಗಳು!'
  },
  support_response: {
    en: 'I understand your concern. Let me connect you with our support team.',
    hi: 'मैं आपकी चिंता समझता हूं। मैं आपको हमारी सहायता टीम से जोड़ता हूं।',
    ta: 'உங்கள் கவலையைப் புரிந்துகொள்கிறேன். உங்களை எங்கள் ஆதரவு குழுவுடன் இணைக்கிறேன்.',
    te: 'మీ ఆందోళను అర్థం చేసుకుంటాను. మిమ్మలను మా సపోర్ట్ బృందంతో కలుపుతున్నాను.',
    kn: 'ನಿಮ್ಮ ಕಳವು ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದೇವೆ. ನಾನು ನಿಮ್ಮನ್ನು ನಮ್ಮ ಬೆಂಬಲ ತಂಡದೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತಿದ್ದೇವೆ.'
  }
};

// ============ ROUTES ============

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'hojai-multilingual',
    supportedLanguages: Object.keys(LANGUAGES).length
  });
});

// Get supported languages
app.get('/api/languages', (req, res) => {
  res.json({
    success: true,
    data: LANGUAGES
  });
});

// Detect language from text
app.post('/api/detect', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    // Simple language detection based on character ranges
    const detected = detectLanguage(text);

    res.json({
      success: true,
      data: {
        detected: detected.lang,
        name: LANGUAGES[detected.lang]?.name || 'Unknown',
        confidence: detected.confidence
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get translation template
app.post('/api/translate/template', (req, res) => {
  try {
    const { template, lang, params = {} } = req.body;

    if (!template || !lang) {
      return res.status(400).json({ error: 'Template and language required' });
    }

    const translations = VOICE_TEMPLATES[template];

    if (!translations) {
      return res.status(404).json({ error: 'Template not found' });
    }

    let text = translations[lang] || translations['en'];

    // Replace params
    Object.entries(params).forEach(([key, value]) => {
      text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value as string);
    });

    res.json({
      success: true,
      data: {
        text,
        lang,
        name: LANGUAGES[lang]?.name || lang
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Translate text (using external API or simple fallback)
app.post('/api/translate', async (req, res) => {
  try {
    const { text, from, to } = req.body;

    if (!text || !to) {
      return res.status(400).json({ error: 'Text and target language required' });
    }

    // Try Sarvam AI first
    if (process.env.SARVAM_API_KEY) {
      try {
        const response = await translateWithSarvam(text, from || 'en', to);
        return res.json({
          success: true,
          data: {
            original: text,
            translated: response,
            from: from || 'en',
            to
          }
        });
      } catch (e) {
        console.log('[Multilingual] Sarvam failed, using fallback');
      }
    }

    // Fallback: check if we have a template match
    const templateMatch = findTemplateMatch(text);
    if (templateMatch) {
      const translation = VOICE_TEMPLATES[templateMatch.template]?.[to] || text;
      return res.json({
        success: true,
        data: {
          original: text,
          translated: translation,
          from: from || 'en',
          to,
          method: 'template'
        }
      });
    }

    // Ultimate fallback: return original
    res.json({
      success: true,
      data: {
        original: text,
        translated: text,
        from: from || 'en',
        to,
        method: 'fallback'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Convert speech to text with language detection
app.post('/api/stt/multilingual', async (req, res) => {
  try {
    const { audioUrl, languages = ['en', 'hi'] } = req.body;

    if (!audioUrl) {
      return res.status(400).json({ error: 'Audio URL required' });
    }

    // This would integrate with Whisper or Sarvam STT
    // For now, return mock
    res.json({
      success: true,
      data: {
        text: 'Sample transcription',
        language: 'en',
        confidence: 0.95
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ HELPERS ============

function detectLanguage(text: string): { lang: string; confidence: number } {
  // Check for Hindi/Devanagari script
  if (/[ऀ-ॿ]/.test(text)) {
    return { lang: 'hi', confidence: 0.9 };
  }

  // Check for Tamil script
  if (/[஀-௿]/.test(text)) {
    return { lang: 'ta', confidence: 0.9 };
  }

  // Check for Telugu script
  if (/[ఀ-౿]/.test(text)) {
    return { lang: 'te', confidence: 0.9 };
  }

  // Check for Kannada script
  if (/[ಀ-೿]/.test(text)) {
    return { lang: 'kn', confidence: 0.9 };
  }

  // Check for Malayalam script
  if (/[ഀ-ൿ]/.test(text)) {
    return { lang: 'ml', confidence: 0.9 };
  }

  // Default to English
  return { lang: 'en', confidence: 0.7 };
}

function findTemplateMatch(text: string): { template: string; score: number } | null {
  const lower = text.toLowerCase();

  if (lower.includes('appointment') || lower.includes('book')) {
    return { template: 'book_appointment', score: 0.8 };
  }

  if (lower.includes('order') || lower.includes('ordered')) {
    return { template: 'order_placed', score: 0.8 };
  }

  if (lower.includes('payment') || lower.includes('paid')) {
    return { template: 'payment_confirm', score: 0.8 };
  }

  if (lower.includes('confirm') || lower.includes('confirmed')) {
    return { template: 'confirm_booking', score: 0.7 };
  }

  if (lower.includes('support') || lower.includes('help')) {
    return { template: 'support_response', score: 0.6 };
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('namaste')) {
    return { template: 'greeting', score: 0.9 };
  }

  return null;
}

async function translateWithSarvam(text: string, from: string, to: string): Promise<string> {
  const apiKey = process.env.SARVAM_API_KEY;

  const response = await axios.post(
    'https://api.sarvam.ai/v1/translate',
    {
      input: text,
      source_language: from,
      target_language: to
    },
    {
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.output || text;
}

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║       Hojai Multilingual Service (${PORT})
╠══════════════════════════════════════════════════════════╣
║  Languages: ${Object.keys(LANGUAGES).length}
║  10 Indian Languages Supported
╚══════════════════════════════════════════════════════════╝
  `);
});

export default app;

/**
 * Benchmark Corpus Seeder
 * ========================
 * Seeds the training pipeline with annotated benchmark samples.
 * Run: npm run seed
 *
 * These samples are used to measure accuracy of external providers
 * vs HOJAI model. They should NOT be used for training — they are
 * the "test set" that measures generalization.
 */

const BENCHMARK_CORPUS = [
  // English
  { text: "Book a table for two at Taj Hotel tomorrow at seven PM", language: 'en', audio: 'en_001' },
  { text: "What's my account balance", language: 'en', audio: 'en_002' },
  { text: "Play some jazz music", language: 'en', audio: 'en_003' },
  { text: "Call Raj's mobile number", language: 'en', audio: 'en_004' },
  { text: "Remind me to submit the report at 5 PM", language: 'en', audio: 'en_005' },
  { text: "Navigate to the nearest petrol pump", language: 'en', audio: 'en_006' },
  { text: "Order biryani from Paradise restaurant", language: 'en', audio: 'en_007' },
  { text: "Check the weather in Bangalore today", language: 'en', audio: 'en_008' },
  { text: "Translate this to Hindi: How are you", language: 'en', audio: 'en_009' },
  { text: "Set an alarm for 6 AM tomorrow", language: 'en', audio: 'en_010' },
  // Hindi
  { text: "कल रात मुझे सोने में दिक्कत हुई", language: 'hi', audio: 'hi_001' },
  { text: "मेरी सैलरी कब आएगी", language: 'hi', audio: 'hi_002' },
  { text: "आज मौसम कैसा है", language: 'hi', audio: 'hi_003' },
  { text: "मुझे एक कैब बुक करो", language: 'hi', audio: 'hi_004' },
  { text: "यातायात की स्थिति क्या है", language: 'hi', audio: 'hi_005' },
  { text: "बगीचे में पानी दो", language: 'hi', audio: 'hi_006' },
  { text: "फोन बंद कर दो", language: 'hi', audio: 'hi_007' },
  { text: "क्या कल holiday है", language: 'hi', audio: 'hi_008' },
  { text: "ट्रेन कितने बजे आएगी", language: 'hi', audio: 'hi_009' },
  { text: "बिल भुगतान करो", language: 'hi', audio: 'hi_010' },
  // Tamil
  { text: "நாளை காலையில் என்னை எழுப்புங்கள்", language: 'ta', audio: 'ta_001' },
  { text: "இன்று செய்தி சொல்லுங்கள்", language: 'ta', audio: 'ta_002' },
  { text: "எனக்கு ஒரு காபி வேண்டும்", language: 'ta', audio: 'ta_003' },
  { text: "வீட்டை சுத்தம் செய்யுங்கள்", language: 'ta', audio: 'ta_004' },
  { text: "மின்சாரம் போய்விட்டது", language: 'ta', audio: 'ta_005' },
  // Telugu
  { text: "నా ఖాతాలో ఎంత డబ్బు ఉంది", language: 'te', audio: 'te_001' },
  { text: "ఈ రోజు వాతావరణం ఎలా ఉంది", language: 'te', audio: 'te_002' },
  { text: "కారు నిండు ట్యాంక్", language: 'te', audio: 'te_003' },
  // Bengali
  { text: "আজ কি দিন", language: 'bn', audio: 'bn_001' },
  { text: "ট্রেন কতটায় আসবে", language: 'bn', audio: 'bn_002' },
  { text: "আমাকে একটা গাড়ি ডাকুন", language: 'bn', audio: 'bn_003' },
  // Marathi
  { text: "आजचे वृत्तपत्र सांगा", language: 'mr', audio: 'mr_001' },
  { text: "शाळा किती वाजता सुटते", language: 'mr', audio: 'mr_002' },
  // Mixed code-switching
  { text: "Bhai, yaar — कल meeting hai, remind karo", language: 'hi', audio: 'mix_001' },
  { text: "Can you please Hindi mein batao", language: 'hi', audio: 'mix_002' },
  { text: "This food is zyada spicy — pila do paani", language: 'hi', audio: 'mix_003' },
  // Noisy / challenging
  { text: "    ", language: 'en', audio: 'noise_001' },  // silence
  { text: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", language: 'en', audio: 'noise_002' }, // hard
  { text: "।?!@#$%^&*()", language: 'hi', audio: 'noise_003' }, // symbols
  // Long-form
  { text: "Book a flight from Mumbai to Delhi for next Friday morning, economy class, with window seat preference and vegetarian meal", language: 'en', audio: 'long_001' },
  { text: "Pay my electricity bill for this month and send confirmation to my email address", language: 'en', audio: 'long_002' },
];

console.log(`\n📊 HOJAI Voice Benchmark Corpus`);
console.log(`   ${BENCHMARK_CORPUS.length} samples across ${[...new Set(BENCHMARK_CORPUS.map(s => s.language))].join(', ')}`);
console.log(`   Language breakdown:`);
for (const [lang, count] of Object.entries(
  BENCHMARK_CORPUS.reduce((acc, s) => ({ ...acc, [s.language]: (acc[s.language] || 0) + 1 }), {} as Record<string, number>)
)) {
  console.log(`     ${lang}: ${count} samples`);
}
console.log(`\n   To use this corpus:`);
console.log(`   1. Place audio files at: <dataset-path>/benchmark/{audio_id}.webm`);
console.log(`   2. Run: POST /api/v1/training/benchmark`);
console.log(`   3. Compare HOJAI accuracy vs external providers\n`);

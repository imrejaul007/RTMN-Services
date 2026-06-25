const express = require('express');
const router = express.Router();

/**
 * GET /insights/overview/:userId
 * Compute an aggregated spiritual overview for the user.
 */
router.get('/overview/:userId', (req, res) => {
  const { userId } = req.params;

  // In a real impl this would read from PersistentMap (parent service exposes the data via /api/spiritual/*)
  // For now we return a shape with computed suggestions.
  res.json({
    success: true,
    data: {
      userId,
      timestamp: new Date().toISOString(),
      summary: {
        prayerActive: 'See /prayer/list/:userId',
        gratitudeStreak: 'See /gratitude/history/:userId',
        meditationMinutes: 'See /meditation/stats/:userId',
        reflectionCount: 'See /reflection/list/:userId'
      },
      todayFocus: pickDailyFocus(),
      weeklyVerse: pickWeeklyVerse()
    }
  });
});

/**
 * GET /insights/daily-focus
 * Get a single suggested practice for today.
 */
router.get('/daily-focus', (req, res) => {
  res.json({
    success: true,
    data: pickDailyFocus()
  });
});

/**
 * GET /insights/weekly-verse
 * Get an inspirational quote/verse for the week.
 */
router.get('/weekly-verse', (req, res) => {
  res.json({
    success: true,
    data: pickWeeklyVerse()
  });
});

// --- helpers ---
const dailyFocuses = [
  { title: 'Pause and breathe', practice: 'meditation', minutes: 5, prompt: 'Take five slow breaths and notice how you feel.' },
  { title: 'Three gratitudes', practice: 'gratitude', prompt: 'Write down three things you are grateful for today.' },
  { title: 'Send kindness', practice: 'loving-kindness', minutes: 7, prompt: 'Silently wish yourself and one other person happiness and peace.' },
  { title: 'Body check-in', practice: 'body-scan', minutes: 8, prompt: 'Notice tension from your toes to the crown of your head.' },
  { title: 'Sacred reading', practice: 'reflection', prompt: 'Read one passage from a text that inspires you.' },
  { title: 'Walk in silence', practice: 'walking', minutes: 10, prompt: 'Step outside and walk slowly, noticing every step.' },
  { title: 'A short prayer', practice: 'prayer', prompt: 'Offer a prayer of gratitude for the day.' }
];

const weeklyVerses = [
  { text: 'Be still and know.', source: 'Psalm 46:10' },
  { text: 'The light shines in the darkness, and the darkness has not overcome it.', source: 'John 1:5' },
  { text: 'Peace I leave with you; my peace I give to you.', source: 'John 14:27' },
  { text: 'Wherever you are, be all there.', source: 'Jim Elliot' },
  { text: 'The present moment is filled with joy and happiness. If you are attentive, you will see it.', source: 'Thich Nhat Hanh' },
  { text: 'You are the sky. Everything else is just the weather.', source: 'Pema Chödrön' },
  { text: 'In the silence of the heart, God speaks.', source: 'Saint John of the Cross' }
];

function pickDailyFocus() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return dailyFocuses[dayOfYear % dailyFocuses.length];
}

function pickWeeklyVerse() {
  const week = Math.floor(Date.now() / (7 * 86400000));
  return weeklyVerses[week % weeklyVerses.length];
}

module.exports = router;
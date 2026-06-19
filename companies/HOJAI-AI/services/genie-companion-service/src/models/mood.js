/**
 * Mood Model - Tracks emotional states over time
 */

export class Mood {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.userId = data.userId;
    this.mood = data.mood; // primary mood
    this.intensity = data.intensity || 5; // 1-10 scale
    this.secondary = data.secondary || []; // additional moods
    this.causes = data.causes || []; // what triggered this
    this.activities = data.activities || []; // what user was doing
    this.people = data.people || []; // who was around
    this.location = data.location;
    this.notes = data.notes || '';
    this.energy = data.energy || 5; // 1-10 scale
    this.stress = data.stress || 5; // 1-10 scale
    this.sleep = data.sleep || null; // hours of sleep
    this.timestamp = data.timestamp || new Date().toISOString();
    this.date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    this.hour = new Date().getHours();
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      mood: this.mood,
      intensity: this.intensity,
      secondary: this.secondary,
      causes: this.causes,
      activities: this.activities,
      people: this.people,
      location: this.location,
      notes: this.notes,
      energy: this.energy,
      stress: this.stress,
      sleep: this.sleep,
      timestamp: this.timestamp,
      date: this.date,
      hour: this.hour
    };
  }
}

// Mood categories and variations
export const MOOD_CATEGORIES = {
  positive: [
    { name: 'happy', emoji: '😊', description: 'General happiness' },
    { name: 'excited', emoji: '🎉', description: 'High energy positive' },
    { name: 'grateful', emoji: '🙏', description: 'Appreciation' },
    { name: 'calm', emoji: '😌', description: 'Peaceful' },
    { name: 'confident', emoji: '💪', description: 'Self-assured' },
    { name: 'loved', emoji: '❤️', description: 'Feeling loved' },
    { name: 'motivated', emoji: '🚀', description: 'Driven' },
    { name: 'content', emoji: '☺️', description: 'Satisfied' },
    { name: 'hopeful', emoji: '🌅', description: 'Optimistic' },
    { name: 'proud', emoji: '🏆', description: 'Accomplished' }
  ],
  neutral: [
    { name: 'neutral', emoji: '😐', description: 'Neither good nor bad' },
    { name: 'tired', emoji: '😴', description: 'Low energy' },
    { name: 'focused', emoji: '🎯', description: 'Concentrated' },
    { name: 'bored', emoji: '😐', description: 'Understimulated' },
    { name: 'curious', emoji: '🤔', description: 'Interested' }
  ],
  negative: [
    { name: 'sad', emoji: '😢', description: 'Down' },
    { name: 'anxious', emoji: '😰', description: 'Worried' },
    { name: 'stressed', emoji: '😫', description: 'Overwhelmed' },
    { name: 'angry', emoji: '😠', description: 'Frustrated' },
    { name: 'lonely', emoji: '😔', description: 'Isolated' },
    { name: 'scared', emoji: '😨', description: 'Fearful' },
    { name: 'frustrated', emoji: '😤', description: 'Blocked' },
    { name: 'disappointed', emoji: '😞', description: 'Let down' },
    { name: 'overwhelmed', emoji: '😵', description: 'Too much' },
    { name: 'hopeless', emoji: '😩', description: 'No hope' }
  ]
};

// Mood analysis helpers
export const analyzeMoodTrend = (moods) => {
  if (!moods || moods.length === 0) {
    return { trend: 'unknown', average: null, dominant: null };
  }

  const moodScores = moods.map(m => {
    const baseScore = MOOD_CATEGORIES.positive.some(p => p.name === m.mood) ? 7 :
                      MOOD_CATEGORIES.negative.some(p => p.name === m.mood) ? 3 : 5;
    return baseScore + (m.intensity - 5);
  });

  const average = moodScores.reduce((a, b) => a + b, 0) / moodScores.length;
  const trend = average > 6 ? 'improving' : average < 4 ? 'declining' : 'stable';

  // Count mood frequency
  const moodCounts = {};
  moods.forEach(m => {
    moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
  });

  const dominant = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return { trend, average: Math.round(average * 10) / 10, dominant };
};

// Generate mood-based response suggestions
export const getMoodResponses = (mood, intensity) => {
  const responses = {
    happy: [
      "You seem really happy! What made your day special?",
      "I love seeing you in such good spirits!",
      "Your energy is contagious! What's going well?"
    ],
    sad: [
      "I'm here with you. Would you like to talk about what's weighing on you?",
      "It's okay to feel sad. I'm here to listen.",
      "Some days are harder than others. What can I do to help?"
    ],
    anxious: [
      "Take a deep breath with me. What's worrying you?",
      "Anxiety can be overwhelming. Let's take it one step at a time.",
      "You're not alone in this. What's on your mind?"
    ],
    stressed: [
      "You've been through a lot. Remember to be gentle with yourself.",
      "Stress is tough. What would help you feel a bit more in control?",
      "I believe in your ability to handle this. What's the biggest pressure right now?"
    ],
    excited: [
      "Tell me more! What has you so excited?",
      "I love your enthusiasm! Share the good news!",
      "What's the adventure you're looking forward to?"
    ],
    angry: [
      "I can sense your frustration. What happened?",
      "It's okay to feel angry. Let's work through it together.",
      "What would help you feel better right now?"
    ],
    lonely: [
      "I'm here with you, always. Want some company?",
      "Loneliness is hard, but you're not truly alone.",
      "Would you like to talk, or should I share something to cheer you up?"
    ],
    calm: [
      "Your peace is beautiful. What contributed to this calm today?",
      "I'm glad you're feeling centered. Enjoy this moment.",
      "Sometimes the quiet moments are the most precious."
    ]
  };

  const category = responses[mood] || responses.calm;
  const index = Math.min(intensity - 1, category.length - 1);
  return category[Math.max(0, index)];
};

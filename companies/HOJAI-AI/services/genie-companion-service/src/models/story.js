/**
 * Story Model - Personal stories and memories
 */

export class Story {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.userId = data.userId;
    this.title = data.title || '';
    this.summary = data.summary || '';
    this.content = data.content || '';
    this.date = data.date || new Date().toISOString().split('T')[0];
    this.year = new Date().getFullYear();
    this.location = data.location || null;
    this.people = data.people || [];
    this.emotions = data.emotions || []; // emotions associated with this memory
    this.emotionIntensity = data.emotionIntensity || 5;
    this.category = data.category || 'personal'; // personal, achievement, relationship, travel, learning, family, work
    this.photos = data.photos || [];
    this.attachable = data.attachable || false; // user can attach photos
    this.connections = data.connections || []; // related stories
    this.lessons = data.lessons || [];
    this.impact = data.impact || 'moderate'; // low, moderate, high, transformative
    this.isFavorite = data.isFavorite || false;
    this.isMilestone = data.isMilestone || false;
    this.milestoneType = data.milestoneType || null; // birthday, anniversary, achievement, etc.
    this.recurring = data.recurring || false; // does this happen every year
    this.recurringInterval = data.recurringInterval || null; // yearly, monthly
    this.importance = data.importance || 5; // 1-10
    this.accessCount = data.accessCount || 0;
    this.lastAccessed = data.lastAccessed || null;
    this.tags = data.tags || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      title: this.title,
      summary: this.summary,
      content: this.content,
      date: this.date,
      year: this.year,
      location: this.location,
      people: this.people,
      emotions: this.emotions,
      emotionIntensity: this.emotionIntensity,
      category: this.category,
      photos: this.photos,
      attachable: this.attachable,
      connections: this.connections,
      lessons: this.lessons,
      impact: this.impact,
      isFavorite: this.isFavorite,
      isMilestone: this.isMilestone,
      milestoneType: this.milestoneType,
      recurring: this.recurring,
      recurringInterval: this.recurringInterval,
      importance: this.importance,
      accessCount: this.accessCount,
      lastAccessed: this.lastAccessed,
      tags: this.tags,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// Story categories
export const STORY_CATEGORIES = {
  personal: {
    name: 'Personal',
    emoji: '🌟',
    description: 'Personal experiences and moments'
  },
  achievement: {
    name: 'Achievement',
    emoji: '🏆',
    description: 'Accomplishments and successes'
  },
  relationship: {
    name: 'Relationship',
    emoji: '❤️',
    description: 'Connections with others'
  },
  travel: {
    name: 'Travel',
    emoji: '✈️',
    description: 'Adventures and exploration'
  },
  learning: {
    name: 'Learning',
    emoji: '📚',
    description: 'Growth and education'
  },
  family: {
    name: 'Family',
    emoji: '👨‍👩‍👧‍👦',
    description: 'Family moments'
  },
  work: {
    name: 'Work',
    emoji: '💼',
    description: 'Professional experiences'
  },
  health: {
    name: 'Health',
    emoji: '🏥',
    description: 'Health and wellness'
  },
  financial: {
    name: 'Financial',
    emoji: '💰',
    description: 'Money milestones'
  },
  creative: {
    name: 'Creative',
    emoji: '🎨',
    description: 'Creative projects'
  }
};

// Story memory functions
export const getStoryConnections = (stories, storyId) => {
  const story = stories.find(s => s.id === storyId);
  if (!story) return [];

  return stories.filter(s => {
    if (s.id === storyId) return false;

    // Check for connections
    const hasSharedPeople = s.people?.some(p => story.people?.includes(p));
    const hasSharedLocation = s.location === story.location && s.location !== null;
    const hasSharedEmotions = s.emotions?.some(e => story.emotions?.includes(e));
    const hasSharedTags = s.tags?.some(t => story.tags?.includes(t));
    const hasSharedCategory = s.category === story.category;

    return hasSharedPeople || hasSharedLocation || hasSharedEmotions ||
           hasSharedTags || hasSharedCategory;
  }).slice(0, 5);
};

// Generate story timeline
export const generateStoryTimeline = (stories, year) => {
  const yearStories = stories.filter(s => s.year === year || s.date?.startsWith(year));

  const timeline = yearStories
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(story => ({
      id: story.id,
      title: story.title,
      date: story.date,
      category: story.category,
      emotion: story.emotions?.[0] || 'neutral',
      importance: story.importance,
      summary: story.summary
    }));

  return timeline;
};

// Anniversary detection
export const detectAnniversary = (stories, date) => {
  const dateStr = date.toISOString().split('T')[0];
  const month = date.getMonth();
  const day = date.getDate();

  const anniversaries = [];

  stories.forEach(story => {
    const storyDate = new Date(story.date);
    if (storyDate.getMonth() === month && storyDate.getDate() === day) {
      const yearsDiff = date.getFullYear() - storyDate.getFullYear();
      if (yearsDiff > 0) {
        anniversaries.push({
          storyId: story.id,
          title: story.title,
          yearsAgo: yearsDiff,
          type: yearsDiff === 1 ? '1st anniversary' :
                yearsDiff === 5 ? '5th anniversary' :
                yearsDiff === 10 ? '10th anniversary' : `${yearsDiff} years ago`
        });
      }
    }
  });

  return anniversaries;
};

const express = require('express');
const router = express.Router();

// In-memory progress storage
const progress = new Map();

// Get learning progress
router.get('/:userId', (req, res) => {
  const { userId } = req.params;

  const userProgress = progress.get(userId) || {
    userId,
    totalXP: 0,
    level: 1,
    coursesCompleted: 0,
    lessonsCompleted: 0,
    streak: 0,
    achievements: [],
    enrolledCourses: [],
    completedCourses: [],
    learningTime: 0,
    lastActive: new Date().toISOString()
  };

  res.json({
    success: true,
    data: userProgress
  });
});

// Get course progress
router.get('/:userId/course/:courseId', (req, res) => {
  const { userId, courseId } = req.params;

  const userProgress = progress.get(userId) || {};
  const courseProgress = userProgress.courses?.[courseId] || {
    courseId,
    startedAt: null,
    completedLessons: [],
    currentLesson: null,
    progress: 0,
    quizScores: {},
    timeSpent: 0
  };

  res.json({
    success: true,
    data: courseProgress
  });
});

// Update lesson progress
router.post('/:userId/lesson', (req, res) => {
  const { userId } = req.params;
  const { courseId, lessonId, action, timeSpent } = req.body;

  if (!courseId || !lessonId || !action) {
    return res.status(400).json({
      success: false,
      error: 'courseId, lessonId, and action are required'
    });
  }

  if (!progress.has(userId)) {
    progress.set(userId, {
      userId,
      totalXP: 0,
      level: 1,
      coursesCompleted: 0,
      lessonsCompleted: 0,
      streak: 0,
      achievements: [],
      courses: {},
      lastActive: new Date().toISOString()
    });
  }

  const userProgress = progress.get(userId);
  userProgress.courses = userProgress.courses || {};

  if (!userProgress.courses[courseId]) {
    userProgress.courses[courseId] = {
      courseId,
      startedAt: new Date().toISOString(),
      completedLessons: [],
      currentLesson: lessonId,
      progress: 0,
      quizScores: {},
      timeSpent: 0
    };
  }

  const courseProgress = userProgress.courses[courseId];

  // Update based on action
  if (action === 'start') {
    courseProgress.currentLesson = lessonId;
    courseProgress.startedAt = courseProgress.startedAt || new Date().toISOString();
  } else if (action === 'complete') {
    if (!courseProgress.completedLessons.includes(lessonId)) {
      courseProgress.completedLessons.push(lessonId);
      userProgress.lessonsCompleted++;
      userProgress.totalXP += 50;

      // Award achievement milestones
      checkAchievements(userProgress);
    }
    courseProgress.currentLesson = lessonId; // Move to next
  } else if (action === 'quiz') {
    courseProgress.quizScores[lessonId] = timeSpent; // Using timeSpent param for score temporarily
  }

  // Update time spent
  if (timeSpent) {
    courseProgress.timeSpent = (courseProgress.timeSpent || 0) + timeSpent;
    userProgress.learningTime = (userProgress.learningTime || 0) + timeSpent;
  }

  // Calculate progress percentage
  const estimatedLessons = 10; // Would come from course data
  courseProgress.progress = Math.round((courseProgress.completedLessons.length / estimatedLessons) * 100);

  // Update level
  userProgress.level = calculateLevel(userProgress.totalXP);

  userProgress.lastActive = new Date().toISOString();

  res.json({
    success: true,
    data: {
      userProgress,
      courseProgress,
      xpToNextLevel: getXPForLevel(userProgress.level + 1) - userProgress.totalXP
    }
  });
});

// Get streak info
router.get('/:userId/streak', (req, res) => {
  const { userId } = req.params;

  const userProgress = progress.get(userId) || { streak: 0, lastActive: null };

  res.json({
    success: true,
    data: {
      currentStreak: userProgress.streak || 0,
      longestStreak: userProgress.longestStreak || 0,
      lastActive: userProgress.lastActive,
      active: isStreakActive(userProgress.lastActive)
    }
  });
});

// Update streak
router.post('/:userId/streak', (req, res) => {
  const { userId } = req.params;

  if (!progress.has(userId)) {
    progress.set(userId, {
      userId,
      totalXP: 0,
      level: 1,
      streak: 0,
      longestStreak: 0
    });
  }

  const userProgress = progress.get(userId);
  const today = new Date().toDateString();
  const lastActive = userProgress.lastActive ?
    new Date(userProgress.lastActive).toDateString() : null;

  if (lastActive === today) {
    // Already active today
    return res.json({
      success: true,
      data: {
        streak: userProgress.streak,
        message: 'Already logged activity today'
      }
    });
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

  if (lastActive === yesterday) {
    // Consecutive day - increment streak
    userProgress.streak++;
  } else if (lastActive !== today) {
    // Streak broken - reset
    userProgress.streak = 1;
  }

  if (userProgress.streak > (userProgress.longestStreak || 0)) {
    userProgress.longestStreak = userProgress.streak;
  }

  userProgress.lastActive = new Date().toISOString();

  // Award streak bonus XP
  userProgress.totalXP += userProgress.streak * 10;

  res.json({
    success: true,
    message: `Streak: ${userProgress.streak} days!`,
    data: userProgress
  });
});

// Get achievements
router.get('/:userId/achievements', (req, res) => {
  const { userId } = req.params;

  const userProgress = progress.get(userId) || { achievements: [] };

  const allAchievements = getAllAchievements();
  const userAchievements = userProgress.achievements || [];

  const achievements = allAchievements.map(ach => ({
    ...ach,
    unlocked: userAchievements.includes(ach.id)
  }));

  res.json({
    success: true,
    data: {
      achievements,
      unlocked: achievements.filter(a => a.unlocked).length,
      total: achievements.length
    }
  });
});

// Get leaderboard
router.get('/leaderboard/:userId', (req, res) => {
  const { userId } = req.params;
  const { type = 'xp', limit = 10 } = req.query;

  // Mock leaderboard data
  const leaderboard = [
    { rank: 1, name: 'Alex Chen', xp: 15420, level: 15 },
    { rank: 2, name: 'Maria Garcia', xp: 12350, level: 12 },
    { rank: 3, name: 'Jordan Lee', xp: 10200, level: 10 },
    { rank: 4, name: 'Sam Wilson', xp: 8900, level: 9 },
    { rank: 5, name: 'Taylor Brown', xp: 7500, level: 8 },
    { rank: 6, name: 'Casey Miller', xp: 6200, level: 7 },
    { rank: 7, name: 'Morgan Davis', xp: 5100, level: 6 },
    { rank: 8, name: 'Riley Johnson', xp: 4200, level: 5 },
    { rank: 9, name: 'Quinn Williams', xp: 3500, level: 4 },
    { rank: 10, name: 'Avery Martinez', xp: 2800, level: 3 }
  ];

  const userProgress = progress.get(userId) || { totalXP: 0 };
  const userEntry = {
    rank: findUserRank(leaderboard, userProgress.totalXP),
    name: 'You',
    xp: userProgress.totalXP,
    level: userProgress.level || 1
  };

  res.json({
    success: true,
    data: {
      leaderboard: leaderboard.slice(0, parseInt(limit)),
      userRank: userEntry
    }
  });
});

// Helper functions
function calculateLevel(xp) {
  // Level formula: 100 * level = xp needed
  let level = 1;
  let xpRequired = 100;

  while (xp >= xpRequired) {
    xp -= xpRequired;
    level++;
    xpRequired = level * 100;
  }

  return level;
}

function getXPForLevel(level) {
  let totalXP = 0;
  for (let i = 1; i < level; i++) {
    totalXP += i * 100;
  }
  return totalXP;
}

function checkAchievements(userProgress) {
  const achievements = [];

  if (userProgress.lessonsCompleted >= 1) achievements.push('first_lesson');
  if (userProgress.lessonsCompleted >= 10) achievements.push('lesson_10');
  if (userProgress.lessonsCompleted >= 50) achievements.push('lesson_50');
  if (userProgress.lessonsCompleted >= 100) achievements.push('lesson_100');

  if (userProgress.streak >= 3) achievements.push('streak_3');
  if (userProgress.streak >= 7) achievements.push('streak_7');
  if (userProgress.streak >= 30) achievements.push('streak_30');

  if (userProgress.totalXP >= 500) achievements.push('xp_500');
  if (userProgress.totalXP >= 5000) achievements.push('xp_5000');
  if (userProgress.totalXP >= 10000) achievements.push('xp_10000');

  userProgress.achievements = [...new Set([...userProgress.achievements, ...achievements])];
}

function isStreakActive(lastActive) {
  if (!lastActive) return false;
  const today = new Date().toDateString();
  const last = new Date(lastActive).toDateString();
  return today === last;
}

function getAllAchievements() {
  return [
    { id: 'first_lesson', name: 'First Step', description: 'Complete your first lesson', icon: '🌟', xp: 50 },
    { id: 'lesson_10', name: 'Dedicated Learner', description: 'Complete 10 lessons', icon: '📚', xp: 200 },
    { id: 'lesson_50', name: 'Knowledge Seeker', description: 'Complete 50 lessons', icon: '🎓', xp: 500 },
    { id: 'lesson_100', name: 'Scholar', description: 'Complete 100 lessons', icon: '🏆', xp: 1000 },
    { id: 'streak_3', name: 'Getting Started', description: '3-day learning streak', icon: '🔥', xp: 100 },
    { id: 'streak_7', name: 'Week Warrior', description: '7-day learning streak', icon: '💪', xp: 300 },
    { id: 'streak_30', name: 'Unstoppable', description: '30-day learning streak', icon: '⚡', xp: 1000 },
    { id: 'xp_500', name: 'Rising Star', description: 'Earn 500 XP', icon: '⭐', xp: 0 },
    { id: 'xp_5000', name: 'Superstar', description: 'Earn 5000 XP', icon: '🌟', xp: 0 },
    { id: 'xp_10000', name: 'Legend', description: 'Earn 10000 XP', icon: '👑', xp: 0 }
  ];
}

function findUserRank(leaderboard, userXP) {
  let rank = leaderboard.length + 1;
  for (const entry of leaderboard) {
    if (userXP > entry.xp) break;
    rank++;
  }
  return rank;
}

module.exports = router;
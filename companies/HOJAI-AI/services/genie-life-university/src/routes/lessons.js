const express = require('express');
const router = express.Router();

// In-memory lesson storage
const lessonProgress = new Map();

// Get lesson content
router.get('/:courseId/:lessonId', (req, res) => {
  const { courseId, lessonId } = req.params;
  const { userId } = req.query;

  // Generate mock lesson content
  const lesson = generateLessonContent(courseId, lessonId);

  if (!lesson) {
    return res.status(404).json({
      success: false,
      error: 'Lesson not found'
    });
  }

  // Get progress if userId provided
  let progress = null;
  if (userId) {
    const userProgress = lessonProgress.get(userId) || {};
    progress = userProgress[`${courseId}-${lessonId}`];
  }

  res.json({
    success: true,
    data: {
      ...lesson,
      progress
    }
  });
});

// Complete lesson
router.post('/:courseId/:lessonId/complete', (req, res) => {
  const { courseId, lessonId } = req.params;
  const { userId, quizScore, timeSpent } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required'
    });
  }

  if (!lessonProgress.has(userId)) {
    lessonProgress.set(userId, {});
  }

  const userProgress = lessonProgress.get(userId);
  const lessonKey = `${courseId}-${lessonId}`;

  userProgress[lessonKey] = {
    courseId,
    lessonId,
    status: 'completed',
    completedAt: new Date().toISOString(),
    quizScore: quizScore || null,
    timeSpent: timeSpent || 0
  };

  // Calculate XP earned
  const xpEarned = calculateLessonXP(quizScore);

  res.json({
    success: true,
    message: 'Lesson completed!',
    data: {
      progress: userProgress[lessonKey],
      xpEarned,
      totalXP: getTotalXP(userProgress)
    }
  });
});

// Get quiz for lesson
router.get('/:courseId/:lessonId/quiz', (req, res) => {
  const { courseId, lessonId } = req.params;

  // Generate mock quiz based on lesson
  const quiz = generateQuiz(courseId, lessonId);

  res.json({
    success: true,
    data: quiz
  });
});

// Submit quiz answers
router.post('/:courseId/:lessonId/quiz', (req, res) => {
  const { courseId, lessonId } = req.params;
  const { userId, answers } = req.body;

  if (!userId || !answers) {
    return res.status(400).json({
      success: false,
      error: 'userId and answers are required'
    });
  }

  const quiz = generateQuiz(courseId, lessonId);
  let score = 0;
  const results = [];

  quiz.questions.forEach((question, index) => {
    const userAnswer = answers[index];
    const isCorrect = userAnswer === question.correctAnswer;
    if (isCorrect) score++;

    results.push({
      question: question.question,
      userAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect
    });
  });

  const scorePercent = Math.round((score / quiz.questions.length) * 100);
  const passed = scorePercent >= 70;

  // Update progress
  if (lessonProgress.has(userId)) {
    const userProgress = lessonProgress.get(userId);
    const lessonKey = `${courseId}-${lessonId}`;
    if (userProgress[lessonKey]) {
      userProgress[lessonKey].quizScore = scorePercent;
    }
  }

  res.json({
    success: true,
    data: {
      score: scorePercent,
      passed,
      correct: score,
      total: quiz.questions.length,
      results,
      xpEarned: calculateLessonXP(scorePercent),
      retryAllowed: !passed
    }
  });
});

// Get next lesson
router.get('/:courseId/:lessonId/next', (req, res) => {
  const { courseId, lessonId } = req.params;

  const lessonNumber = parseInt(lessonId.split('-').pop()) || 1;
  const nextLessonId = `${courseId}-lesson-${lessonNumber + 1}`;

  const nextLesson = generateLessonContent(courseId, nextLessonId);

  if (!nextLesson) {
    res.json({
      success: true,
      data: {
        hasNext: false,
        message: 'This is the last lesson in this module'
      }
    });
  } else {
    res.json({
      success: true,
      data: {
        hasNext: true,
        lesson: {
          id: nextLesson.id,
          title: nextLesson.title,
          duration: nextLesson.duration
        }
      }
    });
  }
});

// Helper functions
function generateLessonContent(courseId, lessonId) {
  const lessonNumber = parseInt(lessonId.split('-').pop()) || 1;

  const lessonTemplates = {
    introduction: {
      title: 'Introduction',
      type: 'video',
      duration: '10 min',
      content: {
        video: { url: 'https://lessons.genie/intro.mp4', duration: '8 min' },
        transcript: 'Welcome to this course...',
        keyPoints: ['Point 1', 'Point 2', 'Point 3']
      },
      resources: [
        { type: 'pdf', title: 'Course Overview', url: '/resources/overview.pdf' },
        { type: 'slides', title: 'Presentation', url: '/resources/slides.pdf' }
      ]
    },
    concept: {
      title: 'Core Concepts',
      type: 'reading',
      duration: '15 min',
      content: {
        sections: [
          { title: 'Understanding the Basics', body: 'Lorem ipsum dolor sit amet...' },
          { title: 'Key Principles', body: 'Sed ut perspiciatis...' }
        ],
        examples: [
          { title: 'Example 1', description: 'A practical demonstration...' }
        ]
      },
      resources: []
    },
    practice: {
      title: 'Hands-on Practice',
      type: 'exercise',
      duration: '20 min',
      content: {
        instructions: 'Follow these steps to complete the exercise...',
        steps: [
          'Step 1: Initial setup',
          'Step 2: Core implementation',
          'Step 3: Testing and validation'
        ],
        exerciseFile: '/exercises/practice.js'
      },
      resources: [
        { type: 'code', title: 'Starter Code', url: '/code/starter.js' }
      ]
    }
  };

  const templateType = lessonNumber === 1 ? 'introduction' :
                       lessonNumber % 3 === 0 ? 'practice' : 'concept';

  const template = lessonTemplates[templateType];

  return {
    id: lessonId,
    courseId,
    ...template,
    completed: false
  };
}

function generateQuiz(courseId, lessonId) {
  return {
    id: `quiz-${courseId}-${lessonId}`,
    title: 'Lesson Quiz',
    questions: [
      {
        id: 'q1',
        question: 'What is the primary benefit of this concept?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 0
      },
      {
        id: 'q2',
        question: 'Which of the following is TRUE about this topic?',
        options: ['Statement 1', 'Statement 2', 'Statement 3', 'Statement 4'],
        correctAnswer: 2
      },
      {
        id: 'q3',
        question: 'In what scenario would you apply this technique?',
        options: ['Scenario A', 'Scenario B', 'Scenario C', 'Scenario D'],
        correctAnswer: 1
      },
      {
        id: 'q4',
        question: 'What is the recommended approach for this situation?',
        options: ['Approach 1', 'Approach 2', 'Approach 3', 'Approach 4'],
        correctAnswer: 3
      },
      {
        id: 'q5',
        question: 'Which factor is MOST important to consider?',
        options: ['Factor 1', 'Factor 2', 'Factor 3', 'Factor 4'],
        correctAnswer: 0
      }
    ],
    passingScore: 70,
    timeLimit: '10 minutes'
  };
}

function calculateLessonXP(quizScore) {
  const baseXP = 50;
  const quizBonus = quizScore ? Math.round(quizScore / 10) : 0;
  return baseXP + quizBonus;
}

function getTotalXP(userProgress) {
  let total = 0;
  Object.values(userProgress).forEach(lesson => {
    if (lesson.status === 'completed') {
      total += calculateLessonXP(lesson.quizScore);
    }
  });
  return total;
}

module.exports = router;
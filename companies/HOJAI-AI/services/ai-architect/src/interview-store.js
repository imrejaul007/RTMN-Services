/**
 * In-memory interview store — maps interviewId -> interview state
 * Production would use MongoDB or Redis
 */

import { v4 as uuidv4 } from 'uuid';
import { getFirstQuestion, getNextQuestion, getQuestion } from './questions/index.js';
import { generateBlueprint } from './blueprint-generator.js';

// In-memory store
const interviews = new Map();

/**
 * Interview states
 */
export const InterviewState = {
  STARTED: 'started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  EXPIRED: 'expired'
};

/**
 * Start a new interview
 */
export function startInterview(idea, userId = null) {
  const interviewId = uuidv4().replace(/-/g, '').substring(0, 16);
  const firstQuestion = getFirstQuestion();

  const interview = {
    id: interviewId,
    userId,
    idea,
    state: InterviewState.STARTED,
    startedAt: new Date().toISOString(),
    completedAt: null,
    currentQuestionId: firstQuestion.id,
    answers: {},
    questionHistory: [],
    blueprint: null
  };

  interviews.set(interviewId, interview);

  return {
    interviewId,
    state: interview.state,
    totalQuestions: firstQuestion ? 1 : 0,
    currentQuestion: firstQuestion,
    progress: { current: 0, total: 12 },
    message: "Let's get started! I'll ask you a few questions to design your perfect company."
  };
}

/**
 * Get interview by ID
 */
export function getInterview(interviewId) {
  return interviews.get(interviewId) || null;
}

/**
 * Get all interviews (for admin/debug)
 */
export function getAllInterviews() {
  return Array.from(interviews.values());
}

/**
 * Submit answer to a question
 */
export function submitAnswer(interviewId, questionId, answer) {
  const interview = interviews.get(interviewId);
  if (!interview) {
    throw new Error(`Interview not found: ${interviewId}`);
  }

  if (interview.state === InterviewState.COMPLETED) {
    throw new Error('Interview already completed');
  }

  const question = getQuestion(parseInt(questionId));
  if (!question) {
    throw new Error(`Question not found: ${questionId}`);
  }

  // Store the answer
  interview.answers[question.field] = answer;
  interview.questionHistory.push({
    questionId: question.id,
    field: question.field,
    answeredAt: new Date().toISOString()
  });

  // Update state
  interview.state = InterviewState.IN_PROGRESS;

  // Check if there's a next question
  const nextQuestion = getNextQuestion(question.id);

  if (nextQuestion) {
    interview.currentQuestionId = nextQuestion.id;

    return {
      success: true,
      state: interview.state,
      currentQuestion: nextQuestion,
      progress: {
        current: interview.questionHistory.length,
        total: 12,
        percentage: Math.round((interview.questionHistory.length / 12) * 100)
      },
      isComplete: false,
      partialAnswers: interview.answers
    };
  } else {
    // No more questions — complete the interview
    return completeInterview(interviewId);
  }
}

/**
 * Skip a question (move to next without answering)
 */
export function skipQuestion(interviewId, questionId) {
  const interview = interviews.get(interviewId);
  if (!interview) {
    throw new Error(`Interview not found: ${interviewId}`);
  }

  const question = getQuestion(parseInt(questionId));
  if (!question) {
    throw new Error(`Question not found: ${questionId}`);
  }

  // Mark as skipped
  interview.questionHistory.push({
    questionId: question.id,
    field: question.field,
    skipped: true,
    answeredAt: new Date().toISOString()
  });

  // Check if there's a next question
  const nextQuestion = getNextQuestion(question.id);

  if (nextQuestion) {
    interview.currentQuestionId = nextQuestion.id;

    return {
      success: true,
      skipped: true,
      state: interview.state,
      currentQuestion: nextQuestion,
      progress: {
        current: interview.questionHistory.length,
        total: 12,
        percentage: Math.round((interview.questionHistory.length / 12) * 100)
      },
      isComplete: false
    };
  } else {
    // No more questions — complete
    return completeInterview(interviewId);
  }
}

/**
 * Complete the interview and generate blueprint
 */
export function completeInterview(interviewId) {
  const interview = interviews.get(interviewId);
  if (!interview) {
    throw new Error(`Interview not found: ${interviewId}`);
  }

  // Generate the blueprint
  const blueprint = generateBlueprint(interviewId, interview.idea, interview.answers);

  // Update interview state
  interview.state = InterviewState.COMPLETED;
  interview.completedAt = new Date().toISOString();
  interview.blueprint = blueprint;

  return {
    success: true,
    state: interview.state,
    completedAt: interview.completedAt,
    isComplete: true,
    blueprint,
    message: "Excellent! Your company blueprint is ready. Review it below and click 'Approve & Generate' to create your company.",
    nextSteps: blueprint.nextSteps
  };
}

/**
 * Get interview with blueprint (for frontend polling)
 */
export function getInterviewWithBlueprint(interviewId) {
  const interview = interviews.get(interviewId);
  if (!interview) {
    throw new Error(`Interview not found: ${interviewId}`);
  }

  return {
    id: interview.id,
    idea: interview.idea,
    state: interview.state,
    startedAt: interview.startedAt,
    completedAt: interview.completedAt,
    progress: {
      current: interview.questionHistory.length,
      total: 12,
      percentage: Math.round((interview.questionHistory.length / 12) * 100)
    },
    answers: interview.answers,
    blueprint: interview.blueprint,
    nextSteps: interview.blueprint?.nextSteps || []
  };
}

/**
 * Delete an interview
 */
export function deleteInterview(interviewId) {
  return interviews.delete(interviewId);
}

/**
 * Clean up old interviews (call periodically)
 */
export function cleanupOldInterviews(maxAgeHours = 24) {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, interview] of interviews) {
    const startedAt = new Date(interview.startedAt).getTime();
    const ageHours = (now - startedAt) / (1000 * 60 * 60);

    if (ageHours > maxAgeHours) {
      interviews.delete(id);
      cleaned++;
    }
  }

  return { cleaned, remaining: interviews.size };
}

/**
 * Get interview stats
 */
export function getInterviewStats() {
  const all = Array.from(interviews.values());
  const byState = {
    started: all.filter(i => i.state === InterviewState.STARTED).length,
    in_progress: all.filter(i => i.state === InterviewState.IN_PROGRESS).length,
    completed: all.filter(i => i.state === InterviewState.COMPLETED).length,
    expired: all.filter(i => i.state === InterviewState.EXPIRED).length
  };

  return {
    total: all.length,
    byState,
    avgQuestionsAnswered: all.length > 0
      ? (all.reduce((sum, i) => sum + i.questionHistory.length, 0) / all.length).toFixed(1)
      : 0
  };
}

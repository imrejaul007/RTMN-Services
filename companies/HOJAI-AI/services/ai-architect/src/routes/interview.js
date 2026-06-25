/**
 * Interview routes — POST /api/v1/interview/*
 */

import express from 'express';
import {
  startInterview,
  getInterview,
  getInterviewWithBlueprint,
  submitAnswer,
  skipQuestion,
  completeInterview,
  deleteInterview,
  getInterviewStats
} from '../interview-store.js';
import { getQuestion, getQuestionCount, generateFollowUp, QUESTIONS } from '../questions/index.js';
import { exportBlueprintYaml, exportBlueprintJson } from '../blueprint-generator.js';

const router = express.Router();

/**
 * POST /api/v1/interview/start
 * Start a new interview with a company idea
 */
router.post('/start', (req, res) => {
  try {
    const { idea, userId } = req.body;

    if (!idea || typeof idea !== 'string' || idea.trim().length < 3) {
      return res.status(400).json({
        error: 'Invalid idea',
        message: 'Please provide a company idea (at least 3 characters)'
      });
    }

    const result = startInterview(idea.trim(), userId || null);

    res.status(201).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/interview/:id/answer
 * Submit an answer to the current question
 */
router.post('/:id/answer', (req, res) => {
  try {
    const { id } = req.params;
    const { questionId, answer, skip = false } = req.body;

    if (!questionId) {
      return res.status(400).json({
        error: 'Missing questionId',
        message: 'Please provide the questionId you are answering'
      });
    }

    let result;

    if (skip) {
      result = skipQuestion(id, questionId);
    } else {
      result = submitAnswer(id, questionId, answer);
    }

    // Generate follow-up suggestion if question is about business type
    let followUp = null;
    if (!result.isComplete && result.currentQuestion?.id === 2) {
      const interview = getInterview(id);
      if (interview) {
        followUp = generateFollowUp(interview.idea, answer, interview.answers);
      }
    }

    res.json({
      success: true,
      ...result,
      followUp
    });
  } catch (error) {
    console.error('Error submitting answer:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not found',
        message: error.message
      });
    }

    if (error.message.includes('already completed')) {
      return res.status(400).json({
        error: 'Interview completed',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/interview/:id
 * Get interview state with all answers
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { format } = req.query;

    const interview = getInterviewWithBlueprint(id);

    if (!interview) {
      return res.status(404).json({
        error: 'Not found',
        message: `Interview not found: ${id}`
      });
    }

    // Return in requested format
    if (format === 'yaml') {
      if (!interview.blueprint) {
        return res.status(400).json({
          error: 'Blueprint not ready',
          message: 'Interview not completed yet'
        });
      }
      return res.set('Content-Type', 'text/plain').send(exportBlueprintYaml(interview.blueprint));
    }

    res.json({
      success: true,
      interview
    });
  } catch (error) {
    console.error('Error getting interview:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/interview/:id/complete
 * Force-complete an interview (for partial interviews)
 */
router.post('/:id/complete', (req, res) => {
  try {
    const { id } = req.params;
    const interview = getInterview(id);

    if (!interview) {
      return res.status(404).json({
        error: 'Not found',
        message: `Interview not found: ${id}`
      });
    }

    if (interview.state === 'completed') {
      return res.json({
        success: true,
        message: 'Interview already completed',
        blueprint: interview.blueprint
      });
    }

    const result = completeInterview(id);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error completing interview:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/interview/:id/question/:questionId
 * Get a specific question
 */
router.get('/:id/question/:questionId', (req, res) => {
  try {
    const { questionId } = req.params;
    const question = getQuestion(parseInt(questionId));

    if (!question) {
      return res.status(404).json({
        error: 'Not found',
        message: `Question not found: ${questionId}`
      });
    }

    res.json({
      success: true,
      question
    });
  } catch (error) {
    console.error('Error getting question:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/v1/interview/:id
 * Delete an interview
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteInterview(id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Not found',
        message: `Interview not found: ${id}`
      });
    }

    res.json({
      success: true,
      message: 'Interview deleted'
    });
  } catch (error) {
    console.error('Error deleting interview:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/interview/stats/all
 * Get interview statistics
 */
router.get('/stats/all', (req, res) => {
  try {
    const stats = getInterviewStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/questions
 * Get all questions (for preview/debug)
 */
router.get('/questions/all', (req, res) => {
  try {
    res.json({
      success: true,
      count: getQuestionCount(),
      questions: QUESTIONS
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;

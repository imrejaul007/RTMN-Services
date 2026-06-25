/**
 * AI Architect — Integration tests
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the modules we're testing
import {
  startInterview,
  getInterview,
  submitAnswer,
  skipQuestion,
  completeInterview,
  getInterviewWithBlueprint,
  deleteInterview,
  getInterviewStats,
  InterviewState
} from '../src/interview-store.js';

import {
  QUESTIONS,
  getQuestion,
  getQuestionCount,
  getFirstQuestion,
  getNextQuestion,
  getPreviousQuestion,
  generateFollowUp
} from '../src/questions/index.js';

import {
  generateBlueprint,
  exportBlueprintJson,
  exportBlueprintYaml
} from '../src/blueprint-generator.js';

describe('AI Architect — Questions Module', () => {

  test('should have 12 questions', () => {
    assert.strictEqual(QUESTIONS.length, 12);
  });

  test('should get question by ID', () => {
    const q = getQuestion(1);
    assert.ok(q);
    assert.strictEqual(q.id, 1);
    assert.strictEqual(q.field, 'name');
  });

  test('should get first question', () => {
    const q = getFirstQuestion();
    assert.ok(q);
    assert.strictEqual(q.id, 1);
  });

  test('should get next question', () => {
    const q = getNextQuestion(1);
    assert.ok(q);
    assert.strictEqual(q.id, 2);
  });

  test('should get previous question', () => {
    const q = getPreviousQuestion(5);
    assert.ok(q);
    assert.strictEqual(q.id, 4);
  });

  test('should return null for next question at end', () => {
    const q = getNextQuestion(12);
    assert.strictEqual(q, null);
  });

  test('should return null for previous question at start', () => {
    const q = getPreviousQuestion(1);
    assert.strictEqual(q, null);
  });

  test('getQuestionCount should return 12', () => {
    assert.strictEqual(getQuestionCount(), 12);
  });

  test('should generate follow-up for fashion ideas', () => {
    const followUp = generateFollowUp('Build me a D2C fashion brand', 'marketplace', {});
    assert.ok(followUp);
    assert.ok(followUp.toLowerCase().includes('fashion'));
  });

  test('should generate follow-up for restaurant ideas', () => {
    const followUp = generateFollowUp('Build me a restaurant delivery app', 'restaurant', {});
    assert.ok(followUp);
    assert.ok(followUp.toLowerCase().includes('kitchen') || followUp.toLowerCase().includes('food'));
  });

  test('all questions should have required fields', () => {
    QUESTIONS.forEach((q, i) => {
      assert.ok(q.id, `Question ${i + 1} missing id`);
      assert.ok(q.text, `Question ${i + 1} missing text`);
      assert.ok(q.field, `Question ${i + 1} missing field`);
      assert.ok(q.type, `Question ${i + 1} missing type`);
    });
  });

});

describe('AI Architect — Interview Store', () => {

  beforeEach(() => {
    // Reset is not available in Map, so we test in isolation
  });

  test('should start an interview', () => {
    const result = startInterview('Build me a D2C fashion brand for Indian women');
    assert.ok(result.interviewId);
    assert.strictEqual(result.state, InterviewState.STARTED);
    assert.ok(result.currentQuestion);
    assert.strictEqual(result.currentQuestion.id, 1);
  });

  test('should start interview with short string (validation is in route handler)', () => {
    // Validation happens in the Express route, not in the store
    // Store accepts any non-empty string
    const result = startInterview('ab');
    assert.ok(result.interviewId);
  });

  test('should start interview with any non-empty string', () => {
    // Store accepts any non-empty string, validation is in route
    const result = startInterview('Fashion brand');
    assert.ok(result.interviewId);
    assert.strictEqual(result.state, InterviewState.STARTED);
  });

  test('should submit answer to first question', () => {
    const { interviewId } = startInterview('Build me a fashion brand');
    const result = submitAnswer(interviewId, 1, 'Maya Collective');
    assert.ok(result.success);
    assert.strictEqual(result.isComplete, false);
    assert.ok(result.currentQuestion);
    assert.strictEqual(result.currentQuestion.id, 2);
  });

  test('should track progress', () => {
    const { interviewId } = startInterview('Build me a fashion brand');
    const result = submitAnswer(interviewId, 1, 'Maya Collective');
    assert.ok(result.progress);
    assert.strictEqual(result.progress.current, 1);
    assert.strictEqual(result.progress.total, 12);
  });

  test('should skip question', () => {
    const { interviewId } = startInterview('Build me a fashion brand');
    const result = skipQuestion(interviewId, 1);
    assert.ok(result.success);
    assert.ok(result.skipped);
  });

  test('should complete interview after all questions', () => {
    const { interviewId } = startInterview('Build me a marketplace');

    // Answer all 12 questions
    const answers = {
      1: 'TradeHub',
      2: 'marketplace',
      3: ['retail', 'manufacturing'],
      4: ['ap-south', 'me'],
      5: ['en', 'hi'],
      6: 'INR',
      7: 'national',
      8: ['ceo', 'sales', 'procurement', 'finance'],
      9: ['india-dpdp'],
      10: 'yes-rfq',
      11: ['web'],
      12: 'yes'
    };

    let result;
    for (const [qId, answer] of Object.entries(answers)) {
      result = submitAnswer(interviewId, parseInt(qId), answer);
    }

    assert.ok(result.isComplete);
    assert.ok(result.blueprint);
    assert.strictEqual(result.blueprint.config.name, 'TradeHub');
  });

  test('should throw for non-existent interview', () => {
    assert.throws(() => {
      submitAnswer('non-existent-id', 1, 'test');
    }, /Interview not found/);
  });

  test('should get interview with blueprint', () => {
    const { interviewId } = startInterview('Build me a fashion brand');

    // Answer one question
    submitAnswer(interviewId, 1, 'Maya Collective');

    const interview = getInterviewWithBlueprint(interviewId);
    assert.ok(interview);
    assert.strictEqual(interview.idea, 'Build me a fashion brand');
    assert.ok(interview.progress);
  });

  test('should delete interview', () => {
    const { interviewId } = startInterview('Build me a fashion brand');
    const deleted = deleteInterview(interviewId);
    assert.strictEqual(deleted, true);

    // Should throw when trying to access deleted interview
    assert.throws(() => {
      submitAnswer(interviewId, 1, 'test');
    }, /Interview not found/);
  });

  test('should track interview stats', () => {
    startInterview('Brand 1');
    startInterview('Brand 2');

    const stats = getInterviewStats();
    assert.ok(stats.total >= 2);
    assert.ok(stats.avgQuestionsAnswered);
  });

});

describe('AI Architect — Blueprint Generator', () => {

  test('should generate blueprint from answers', () => {
    const answers = {
      name: 'Maya Collective',
      type: 'marketplace',
      industries: ['fashion', 'retail'],
      regions: ['ap-south', 'me'],
      languages: ['en', 'hi', 'ar'],
      currency: 'INR',
      marketSize: 'national',
      workforce: ['ceo', 'sales', 'procurement', 'finance', 'support'],
      compliance: ['india-dpdp'],
      commerce: 'yes-full',
      platforms: ['web', 'mobile-ios', 'mobile-android'],
      federation: 'yes'
    };

    const blueprint = generateBlueprint('test-interview', 'D2C fashion brand for Indian women', answers);

    assert.ok(blueprint.id);
    assert.strictEqual(blueprint.config.name, 'Maya Collective');
    assert.strictEqual(blueprint.config.type, 'marketplace');
    assert.strictEqual(blueprint.config.slug, 'maya-collective');
    assert.strictEqual(blueprint.config.currency, 'INR');
    assert.ok(blueprint.agents.length >= 4);
    assert.ok(blueprint.integrations.length > 0);
  });

  test('should generate slug from name', () => {
    const answers = {
      name: 'My Awesome Company!',
      type: 'company',
      regions: ['us-east'],
      languages: ['en'],
      currency: 'USD',
      marketSize: 'local',
      workforce: ['ceo'],
      compliance: [],
      commerce: 'no',
      platforms: ['web'],
      federation: 'no'
    };

    const blueprint = generateBlueprint('test', 'Test', answers);
    assert.strictEqual(blueprint.config.slug, 'my-awesome-company');
  });

  test('should include all apps for marketplace', () => {
    const answers = {
      name: 'TradeHub',
      type: 'marketplace',
      regions: ['us-east'],
      languages: ['en'],
      currency: 'USD',
      marketSize: 'local',
      workforce: ['ceo'],
      compliance: [],
      commerce: 'yes-full',
      platforms: ['web'],
      federation: 'no'
    };

    const blueprint = generateBlueprint('test', 'Test', answers);
    assert.strictEqual(blueprint.apps.buyerPortal, true);
    assert.strictEqual(blueprint.apps.sellerPortal, true);
    assert.strictEqual(blueprint.apps.adminDashboard, true);
    assert.strictEqual(blueprint.apps.mobileApp, true);
  });

  test('should include correct workforce for company type', () => {
    const answers = {
      name: 'CompanyOS',
      type: 'company',
      regions: ['us-east'],
      languages: ['en'],
      currency: 'USD',
      marketSize: 'local',
      workforce: ['ceo', 'sales', 'marketing', 'hr', 'finance', 'operations'],
      compliance: [],
      commerce: 'no',
      platforms: ['web'],
      federation: 'no'
    };

    const blueprint = generateBlueprint('test', 'Test', answers);
    assert.ok(blueprint.agents.find(a => a.key === 'ceo'));
    assert.ok(blueprint.agents.find(a => a.key === 'hr'));
    assert.ok(blueprint.agents.find(a => a.key === 'operations'));
  });

  test('should export blueprint as JSON', () => {
    const blueprint = generateBlueprint('test', 'Test', { name: 'Test', type: 'company' });
    const json = exportBlueprintJson(blueprint);
    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.config.name, 'Test');
  });

  test('should export blueprint as YAML', () => {
    const blueprint = generateBlueprint('test', 'Test', { name: 'Test', type: 'company' });
    const yaml = exportBlueprintYaml(blueprint);
    assert.ok(yaml.includes('id:'));
    assert.ok(yaml.includes('config:'));
    assert.ok(yaml.includes('Test'));
  });

  test('should generate next steps', () => {
    const blueprint = generateBlueprint('test', 'Test', {
      name: 'Test',
      type: 'marketplace',
      regions: ['us-east'],
      languages: ['en'],
      currency: 'USD',
      marketSize: 'local',
      workforce: ['ceo', 'sales'],
      compliance: [],
      commerce: 'yes-full',
      platforms: ['web'],
      federation: 'yes'
    });

    assert.ok(blueprint.nextSteps.length >= 4);
    assert.ok(blueprint.nextSteps[0].action);
    assert.ok(blueprint.nextSteps[0].description);
  });

  test('should include integrations for commerce', () => {
    const blueprint = generateBlueprint('test', 'Test', {
      name: 'Test',
      type: 'marketplace',
      regions: ['us-east'],
      languages: ['en'],
      currency: 'USD',
      marketSize: 'local',
      workforce: ['ceo'],
      compliance: [],
      commerce: 'yes-full',
      platforms: ['web'],
      federation: 'yes'
    });

    assert.ok(blueprint.integrations.includes('commerce'));
    assert.ok(blueprint.integrations.includes('rabtul'));
  });

  test('should include WhatsApp when platform selected', () => {
    const blueprint = generateBlueprint('test', 'Test', {
      name: 'Test',
      type: 'company',
      regions: ['us-east'],
      languages: ['en'],
      currency: 'USD',
      marketSize: 'local',
      workforce: ['ceo'],
      compliance: [],
      commerce: 'no',
      platforms: ['web', 'whatsapp'],
      federation: 'no'
    });

    assert.ok(blueprint.integrations.includes('whatsapp'));
  });

});

console.log('Running AI Architect tests...');

/**
 * Voice-to-Task Connector
 * Convert voice notes to structured tasks using Whisper + LLM
 */

const OpenAI = require('openai');
const FormData = require('form-data');
const axios = require('axios');

class VoiceToTaskClient {
  constructor(config) {
    this.openaiKey = config.openaiKey;
    this.openai = new OpenAI({ apiKey: this.openaiKey });
    this.aiServiceUrl = config.aiServiceUrl; // HOJAI Agent Runtime
  }

  // Transcribe audio using Whisper
  async transcribe(audioUrl, options = {}) {
    try {
      const response = await axios.get(audioUrl, { responseType: 'stream' });

      const transcription = await this.openai.audio.transcriptions.create({
        file: response.data,
        model: 'whisper-1',
        language: options.language || 'en',
        response_format: options.responseFormat || 'json',
      });

      return {
        success: true,
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Convert voice to structured tasks
  async voiceToTasks(audioUrl, options = {}) {
    // 1. Transcribe
    const transcription = await this.transcribe(audioUrl, options);

    if (!transcription.success) return transcription;

    // 2. Extract tasks using LLM
    const tasks = await this.extractTasks(transcription.text);

    return {
      success: true,
      transcript: transcription.text,
      tasks: tasks.tasks,
      metadata: {
        language: transcription.language,
        duration: transcription.duration,
      },
    };
  }

  // Extract structured tasks from transcript
  async extractTasks(transcript, options = {}) {
    if (!this.aiServiceUrl) {
      // Fallback: simple pattern matching
      return this.simpleExtract(transcript);
    }

    try {
      const response = await axios.post(`${this.aiServiceUrl}/extract`, {
        transcript,
        projectId: options.projectId,
        assignees: options.assignees || [],
        dueDate: options.dueDate,
      });

      return { success: true, tasks: response.data.tasks };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Simple pattern matching (fallback)
  simpleExtract(transcript) {
    const tasks = [];
    const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

    const taskPatterns = [
      /need to (.+)/i,
      /have to (.+)/i,
      /should (.+)/i,
      /remind me to (.+)/i,
      /don't forget to (.+)/i,
      /todo:? (.+)/i,
      /task:? (.+)/i,
      /action:? (.+)/i,
      /follow up on (.+)/i,
      /reach out to (.+)/i,
      /send (.+)/i,
      /create (.+)/i,
    ];

    const priorityPatterns = [
      { pattern: /urgent|asap|important/i, priority: 'high' },
      { pattern: /tomorrow|today|now/i, priority: 'high' },
      { pattern: /next week|this week/i, priority: 'medium' },
      { pattern: /sometime|later|eventually/i, priority: 'low' },
    ];

    for (const sentence of sentences) {
      for (const pattern of taskPatterns) {
        const match = sentence.match(pattern);
        if (match) {
          const task = {
            id: `task_${Date.now()}_${tasks.length}`,
            title: match[1].trim(),
            priority: 'medium',
            source: 'voice',
            raw: sentence,
            createdAt: new Date().toISOString(),
          };

          for (const { pattern, priority } of priorityPatterns) {
            if (pattern.test(sentence)) {
              task.priority = priority;
              break;
            }
          }

          // Extract assignee if mentioned
          const assigneeMatch = sentence.match(/(?:assign|delegate|give) to (\w+)/i);
          if (assigneeMatch) {
            task.assignee = assigneeMatch[1];
          }

          // Extract due date
          const dueMatch = sentence.match(/by (\w+ \w+|\w+day|tomorrow|today|monday|tuesday|wednesday|thursday|friday)/i);
          if (dueMatch) {
            task.dueDate = dueMatch[1];
          }

          tasks.push(task);
          break;
        }
      }
    }

    return { success: true, tasks };
  }

  // Create tasks in workflow/project
  async createTasks(tasks, projectId, destination = 'jira') {
    const results = [];

    for (const task of tasks) {
      const result = await this.createSingleTask(task, projectId, destination);
      results.push({ task, result });
    }

    return { success: true, created: results.length, results };
  }

  async createSingleTask(task, projectId, destination) {
    // Delegate to project tool
    if (destination === 'jira') {
      const jiraConnector = require('../jira-connector/src');
      // ... create issue
    }
    return { success: true, taskId: `${task.id}_created` };
  }

  // Full pipeline: Voice → Tasks → Project
  async process(audioUrl, projectId, options = {}) {
    // 1. Convert voice to tasks
    const tasksResult = await this.voiceToTasks(audioUrl, options);

    if (!tasksResult.success) return tasksResult;

    // 2. Create in project
    const creationResult = await this.createTasks(
      tasksResult.tasks,
      projectId,
      options.destination || 'jira'
    );

    return {
      success: true,
      transcript: tasksResult.transcript,
      tasks: tasksResult.tasks,
      created: creationResult.created,
    };
  }
}

module.exports = VoiceToTaskClient;

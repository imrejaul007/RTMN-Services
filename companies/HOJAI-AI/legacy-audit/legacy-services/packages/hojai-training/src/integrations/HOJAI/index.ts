/**
 * HOJAI Feedback Connector - Connect HOJAI feedback → Training
 *
 * HOJAI Agents → Training Pipeline
 */

import axios from 'axios';

// Feedback types
export interface HOJAIFeedback {
  agentId: string;
  type: 'correction' | 'rating' | 'outcome' | 'escalation';
  quality: number;
  tenantId: string;
  data: any;
}

export class HOJAIFeedbackConnector {
  private trainingUrl: string;

  constructor(trainingUrl = 'http://localhost:4880') {
    this.trainingUrl = trainingUrl;
  }

  // HOJAI feedback → Training
  async onFeedback(feedback: HOJAIFeedback) {
    if (feedback.quality > 0.7) {
      await axios.post(`${this.trainingUrl}/api/feedback`, {
        source: 'HOJAI_FEEDBACK',
        type: feedback.type,
        agentId: feedback.agentId,
        data: feedback.data,
        quality: feedback.quality
      });
    }
  }

  // Batch HOJAI corrections → Training
  async corrections(corrections: HOJAIFeedback[]) {
    const high = corrections.filter(f => f.quality < 0.5);
    if (high.length > 0) {
      await axios.post(`${this.trainingUrl}/api/corrections`, {
        source: 'HOJAI_CORRECTIONS',
        corrections: high
      });
    }
  }
}

export const hojaiFeedbackConnector = new HOJAIFeedbackConnector();

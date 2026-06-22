/**
 * REZ Signal Connector - Connect REZ signals → Training
 *
 * REZ Signal Aggregator (4142) → Training Pipeline
 * REZ Attribution System (4120) → Training
 */

import axios from 'axios';
import mongoose from 'mongoose';

// REZ Signal Schema - Signals from REZ ecosystem
const REZSignalSchema = new mongoose.Schema({
  signalId: String,
  userId: String,
  type: String,
  source: String,
  properties: mongoose.Schema.Types.Mixed,
  confidence: Number,
  tenantId: String,
  createdAt: Date
});

const REZSignal = mongoose.model('REZSignal', REZSignalSchema);

export interface REZSignalData {
  userId: string;
  type: string;
  source: string;
  properties: any;
  confidence: number;
  tenantId: string;
}

export class REZSignalConnector {
  private trainingUrl: string;

  constructor(trainingUrl = 'http://localhost:4880') {
    this.trainingUrl = trainingUrl;
  }

  // Send REZ signal → Training
  async onSignal(signal: REZSignalData) {
    // High quality signals → training
    if (signal.confidence > 0.8) {
      await axios.post(`${this.trainingUrl}/api/signals`, {
        source: 'REZ_SIGNAL',
        signalType: signal.type,
        userId: signal.userId,
        data: signal.properties,
        confidence: signal.confidence,
        tenantId: signal.tenantId
      });
    }
  }

  // Batch signals → Training
  async batchSignals(signals: REZSignalData[]) {
    const training = signals
      .filter(s => s.confidence > 0.7)
      .map(s => ({
        source: 'REZ_SIGNAL',
        type: s.type,
        data: s.properties
      }));

    if (training.length > 0) {
      await axios.post(`${this.trainingUrl}/api/batch`, { data: training });
    }
  }
}

export const rezSignalConnector = new REZSignalConnector();

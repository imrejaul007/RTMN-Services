// Feedback Model
import { FeedbackLoop } from '../types';

export class FeedbackModel {
  private feedbacks: Map<string, FeedbackLoop> = new Map();

  upsert(fb: FeedbackLoop): FeedbackLoop {
    this.feedbacks.set(fb.id, fb);
    return fb;
  }

  findById(id: string): FeedbackLoop | undefined { return this.feedbacks.get(id); }
  findAll(): FeedbackLoop[] { return Array.from(this.feedbacks.values()); }
  findUnprocessed(): FeedbackLoop[] {
    return Array.from(this.feedbacks.values()).filter(f => !f.processed);
  }
  count(): number { return this.feedbacks.size; }
}

export const feedbackModel = new FeedbackModel();
export default feedbackModel;

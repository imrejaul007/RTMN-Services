// ============================================================================
// Roadmap Model
// ============================================================================

import { Roadmap } from '../types';

export class RoadmapModel {
  private roadmaps: Map<string, Roadmap> = new Map();

  upsert(roadmap: Roadmap): Roadmap {
    this.roadmaps.set(roadmap.id, roadmap);
    return roadmap;
  }

  findById(id: string): Roadmap | undefined {
    return this.roadmaps.get(id);
  }

  findAll(filters?: { strategyId?: string; status?: Roadmap['status'] }): Roadmap[] {
    let results = Array.from(this.roadmaps.values());
    if (filters?.strategyId) results = results.filter(r => r.strategyId === filters.strategyId);
    if (filters?.status) results = results.filter(r => r.status === filters.status);
    return results;
  }

  delete(id: string): boolean {
    return this.roadmaps.delete(id);
  }
}

export const roadmapModel = new RoadmapModel();
export default roadmapModel;

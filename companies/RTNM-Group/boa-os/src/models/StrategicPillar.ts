// ============================================================================
// StrategicPillar Model
// ============================================================================

import { StrategicPillar } from '../types';

export class StrategicPillarModel {
  private pillars: Map<string, StrategicPillar> = new Map();

  upsert(pillar: StrategicPillar): StrategicPillar {
    this.pillars.set(pillar.id, pillar);
    return pillar;
  }

  findById(id: string): StrategicPillar | undefined {
    return this.pillars.get(id);
  }

  findByStrategy(strategyId: string): StrategicPillar[] {
    return Array.from(this.pillars.values()).filter(p =>
      p.name.includes(strategyId) // Simple heuristic - in real impl, link via strategy
    );
  }

  findAll(): StrategicPillar[] {
    return Array.from(this.pillars.values());
  }

  delete(id: string): boolean {
    return this.pillars.delete(id);
  }
}

export const strategicPillarModel = new StrategicPillarModel();
export default strategicPillarModel;

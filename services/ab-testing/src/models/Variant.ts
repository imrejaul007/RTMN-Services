import { v4 as uuidv4 } from 'uuid';

export interface Variant {
  id: string;
  experimentId: string;
  name: string;
  description?: string;
  config: Record<string, unknown>;
  isControl: boolean;
  impressions: number;
  conversions: number;
  createdAt: Date;
}

export interface CreateVariantDTO {
  experimentId: string;
  name: string;
  description?: string;
  config?: Record<string, unknown>;
  isControl?: boolean;
}

export interface UpdateVariantDTO {
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
}

export class VariantModel {
  private variants: Map<string, Variant> = new Map();

  create(dto: CreateVariantDTO): Variant {
    const id = `var-${uuidv4().slice(0, 8)}`;
    const variant: Variant = {
      id,
      experimentId: dto.experimentId,
      name: dto.name,
      description: dto.description,
      config: dto.config || {},
      isControl: dto.isControl || false,
      impressions: 0,
      conversions: 0,
      createdAt: new Date(),
    };

    this.variants.set(id, variant);
    return variant;
  }

  findById(id: string): Variant | undefined {
    return this.variants.get(id);
  }

  findByExperiment(experimentId: string): Variant[] {
    return Array.from(this.variants.values())
      .filter(v => v.experimentId === experimentId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  update(id: string, dto: UpdateVariantDTO): Variant | undefined {
    const variant = this.variants.get(id);
    if (!variant) return undefined;

    const updated: Variant = {
      ...variant,
      ...dto,
    };

    this.variants.set(id, updated);
    return updated;
  }

  incrementImpression(id: string): Variant | undefined {
    const variant = this.variants.get(id);
    if (!variant) return undefined;

    variant.impressions++;
    this.variants.set(id, variant);
    return variant;
  }

  incrementConversion(id: string): Variant | undefined {
    const variant = this.variants.get(id);
    if (!variant) return undefined;

    variant.conversions++;
    this.variants.set(id, variant);
    return variant;
  }

  delete(id: string): boolean {
    return this.variants.delete(id);
  }

  deleteByExperiment(experimentId: string): number {
    const toDelete = this.findByExperiment(experimentId);
    toDelete.forEach(v => this.variants.delete(v.id));
    return toDelete.length;
  }

  getStats(variantId: string): { impressions: number; conversions: number; rate: number } | undefined {
    const variant = this.variants.get(variantId);
    if (!variant) return undefined;

    return {
      impressions: variant.impressions,
      conversions: variant.conversions,
      rate: variant.impressions > 0 ? variant.conversions / variant.impressions : 0,
    };
  }
}

export const variantModel = new VariantModel();

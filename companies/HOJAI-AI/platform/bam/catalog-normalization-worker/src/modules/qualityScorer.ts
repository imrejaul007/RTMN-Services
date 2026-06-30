/**
 * Quality Scorer Module
 * Score product listing quality and suggest improvements
 */

interface ProductInput {
  product: any;
  normalized: any;
}

interface QualityScore {
  overall: number;
  images: number;
  description: number;
  specs: number;
  suggestions: string[];
}

export class QualityScorer {
  /**
   * Score product quality
   */
  async score(input: ProductInput): Promise<QualityScore> {
    const { product, normalized } = input;

    const imagesScore = this.scoreImages(product, normalized);
    const descriptionScore = this.scoreDescription(normalized);
    const specsScore = this.scoreSpecs(normalized);

    const overall =
      imagesScore * 0.3 +
      descriptionScore * 0.4 +
      specsScore * 0.3;

    const suggestions = this.generateSuggestions({
      overall,
      images: imagesScore,
      description: descriptionScore,
      specs: specsScore,
    });

    return {
      overall: Math.round(overall * 100) / 100,
      images: imagesScore,
      description: descriptionScore,
      specs: specsScore,
      suggestions,
    };
  }

  /**
   * Score images quality
   */
  private scoreImages(product: any, normalized: any): number {
    let score = 0;

    const images = product.images || [];
    const normalizedImages = normalized?.images || [];

    if (images.length === 0) return 0;
    if (images.length >= 1) score += 0.3;
    if (images.length >= 3) score += 0.2;
    if (normalizedImages.length > 0) score += 0.3;
    if (normalizedImages.length >= images.length) score += 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Score description quality
   */
  private scoreDescription(normalized: any): number {
    let score = 0;

    if (!normalized?.description) return 0;

    if (normalized.description.title) score += 0.2;
    if (normalized.description.bullets?.length >= 3) score += 0.3;
    if (normalized.description.description?.length > 200) score += 0.2;
    if (normalized.description.meta) score += 0.3;

    return Math.min(score, 1.0);
  }

  /**
   * Score specs quality
   */
  private scoreSpecs(normalized: any): number {
    let score = 0;

    if (!normalized?.specs) return 0;

    const attributes = normalized.specs.attributes || {};
    const attrCount = Object.keys(attributes).length;

    if (attrCount >= 3) score += 0.3;
    if (attrCount >= 5) score += 0.3;

    if (normalized.specs.completeness >= 0.6) score += 0.4;

    return Math.min(score, 1.0);
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(scores: any): string[] {
    const suggestions: string[] = [];

    if (scores.images < 0.7) {
      suggestions.push('Add more product images (recommended: 5+ from different angles)');
    }

    if (scores.description < 0.7) {
      suggestions.push('Improve product description with more details and SEO keywords');
    }

    if (scores.specs < 0.7) {
      suggestions.push('Fill in all technical specifications (color, weight, dimensions, etc.)');
    }

    if (scores.overall >= 0.9) {
      suggestions.push('Excellent quality! Listing is ready to publish');
    } else if (scores.overall >= 0.7) {
      suggestions.push('Good quality. Apply the suggested improvements for maximum impact');
    } else {
      suggestions.push('Quality needs improvement. Apply all suggestions before publishing');
    }

    return suggestions;
  }
}

export default new QualityScorer();

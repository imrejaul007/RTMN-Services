/**
 * Description Generator Module
 * Generate SEO-optimized product descriptions
 */

interface GenerateOptions {
  name: string;
  brand?: string;
  features?: string[];
  category?: string;
  seo?: boolean;
}

interface GeneratedDescription {
  title: string;
  bullets: string[];
  description: string;
  meta?: {
    title: string;
    description: string;
    keywords: string[];
  };
  languages?: Record<string, any>;
}

const QUALITY_TEMPLATES = {
  title: (data: any) => `${data.brand ? data.brand + ' ' : ''}${data.name} ${data.highlight || ''}`.trim(),

  bullet: (feature: string, idx: number) =>
    `${['✓', '★', '◆'][idx % 3]} ${feature.charAt(0).toUpperCase() + feature.slice(1)}`,

  description: (data: any) => `
Introducing the ${data.brand || ''} ${data.name}, designed for those who demand quality and reliability.

${data.features ? data.features.slice(0, 3).map((f: string) => '• ' + f).join('\n') : ''}

Whether for everyday use or special occasions, this product delivers exceptional performance and value.

Order now and experience the difference quality makes.
`.trim(),
};

const SEO_KEYWORDS = (name: string, brand?: string, category?: string) => {
  const keywords = [name, brand, category].filter(Boolean) as string[];
  // Add relevant long-tail keywords
  if (category) {
    keywords.push(`best ${category}`);
    keywords.push(`${category} online`);
    keywords.push(`buy ${name} online`);
  }
  return [...new Set(keywords)];
};

export class DescriptionGenerator {
  /**
   * Generate complete product description
   */
  async generate(options: GenerateOptions): Promise<GeneratedDescription> {
    const { name, brand, features = [], category, seo = true } = options;

    const title = this.generateTitle({ name, brand });
    const bullets = this.generateBullets(features, name);
    const description = this.generateFullDescription({ name, brand, features });

    const result: GeneratedDescription = {
      title,
      bullets,
      description,
    };

    if (seo) {
      result.meta = {
        title: `${title} - Buy Online at Best Price | ${brand || 'Marketplace'}`,
        description: `${description.substring(0, 155)}...`,
        keywords: SEO_KEYWORDS(name, brand, category),
      };
    }

    return result;
  }

  /**
   * Generate SEO title (max 60 chars)
   */
  private generateTitle(data: { name: string; brand?: string }): string {
    let title = data.brand ? `${data.brand} ${data.name}` : data.name;

    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }

    return title;
  }

  /**
   * Generate bullet points
   */
  private generateBullets(features: string[], productName: string): string[] {
    const bullets: string[] = [];

    if (features.length > 0) {
      features.slice(0, 5).forEach((feature, idx) => {
        bullets.push(QUALITY_TEMPLATES.bullet(feature, idx));
      });
    } else {
      bullets.push(
        `✓ Premium quality ${productName}`,
        `★ Trusted by thousands of customers`,
        `◆ Fast shipping and excellent customer service`
      );
    }

    return bullets;
  }

  /**
   * Generate full description
   */
  private generateFullDescription(data: { name: string; brand?: string; features: string[] }): string {
    return QUALITY_TEMPLATES.description(data);
  }

  /**
   * Generate translation (placeholder)
   */
  async generateTranslations(text: string, targetLanguages: string[] = ['hi', 'es', 'ar']): Promise<Record<string, string>> {
    // In production, call translation service
    const translations: Record<string, string> = {};
    for (const lang of targetLanguages) {
      translations[lang] = `[${lang}] ${text}`;
    }
    return translations;
  }
}

export default new DescriptionGenerator();

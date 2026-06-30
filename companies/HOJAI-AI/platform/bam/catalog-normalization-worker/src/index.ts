/**
 * Catalog Normalization Worker
 * Port: 5552
 *
 * AI Worker that normalizes product catalogs:
 * - Image processing (background removal, enhancement)
 * - Description generation (titles, bullets, SEO)
 * - Spec extraction (OCR, normalization)
 * - Quality scoring
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import imageProcessor from './modules/imageProcessor.js';
import descriptionGenerator from './modules/descriptionGenerator.js';
import specExtractor from './modules/specExtractor.js';
import qualityScorer from './modules/qualityScorer.js';

const PORT = parseInt(process.env.PORT || '5552', 10);
const SERVICE_NAME = 'catalog-normalization-worker';

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Main worker entry: POST /run
 * Body: { products: [...], options: { images, description, specs, quality } }
 */
app.post('/run', async (req, res) => {
  try {
    const { products, options = {} } = req.body;

    const defaultOptions = {
      images: true,
      description: true,
      specs: true,
      quality: true,
      seo: true,
    };

    const opts = { ...defaultOptions, ...options };
    const results: any[] = [];

    for (const product of products || []) {
      const result = await normalizeProduct(product, opts);
      results.push(result);
    }

    // Calculate aggregate metrics
    const avgQuality =
      results.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / results.length;

    res.json({
      success: true,
      processed: results.length,
      averageQuality: Math.round(avgQuality * 100) / 100,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'WORKER_ERROR', message: error.message },
    });
  }
});

async function normalizeProduct(product: any, options: any) {
  const result: any = {
    productId: product.id || product.sku,
    original: product,
    normalized: {},
  };

  // Process images
  if (options.images && product.images) {
    const processed = await imageProcessor.process(product.images);
    result.normalized.images = processed;
  }

  // Generate description
  if (options.description && product.name) {
    const description = await descriptionGenerator.generate({
      name: product.name,
      brand: product.brand,
      features: product.features,
      category: product.category,
      seo: options.seo,
    });
    result.normalized.description = description;
  }

  // Extract specs
  if (options.specs && product.rawSpecs) {
    const specs = await specExtractor.extract(product.rawSpecs);
    result.normalized.specs = specs;
  }

  // Quality scoring
  if (options.quality) {
    const quality = await qualityScorer.score({
      product,
      normalized: result.normalized,
    });
    result.qualityScore = quality.overall;
    result.suggestions = quality.suggestions;
  }

  return result;
}

/**
 * Process single image
 */
app.post('/image', async (req, res) => {
  const { image } = req.body;
  const processed = await imageProcessor.process([image]);
  res.json({ processed: processed[0] });
});

/**
 * Generate description
 */
app.post('/description', async (req, res) => {
  const { name, brand, features, category, seo } = req.body;
  const description = await descriptionGenerator.generate({
    name,
    brand,
    features,
    category,
    seo,
  });
  res.json(description);
});

/**
 * Extract specs
 */
app.post('/specs', async (req, res) => {
  const { rawSpecs } = req.body;
  const specs = await specExtractor.extract(rawSpecs);
  res.json({ specs });
});

/**
 * Score quality
 */
app.post('/score', async (req, res) => {
  const { product, normalized } = req.body;
  const score = await qualityScorer.score({ product, normalized });
  res.json(score);
});

app.listen(PORT, () => {
  console.log(`✅ Catalog Normalization Worker running on port ${PORT}`);
  console.log('   Skills: image-processing, description-generation, spec-extraction, quality-scoring');
});

export default app;

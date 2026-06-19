const express = require('express');
const router = express.Router();

// In-memory image storage
const imageGenerations = new Map();
const imagePresets = new Map();

// Image generation styles
const styles = [
  { id: 'realistic', name: 'Photorealistic', description: 'High-quality photographic images' },
  { id: 'artistic', name: 'Artistic', description: 'Paintings, illustrations, art styles' },
  { id: 'cartoon', name: 'Cartoon/Anime', description: 'Animated and cartoon styles' },
  { id: '3d', name: '3D Render', description: 'Three-dimensional rendered images' },
  { id: 'abstract', name: 'Abstract', description: 'Abstract and geometric art' },
  { id: 'minimalist', name: 'Minimalist', description: 'Clean, minimal designs' },
  { id: 'vintage', name: 'Vintage', description: 'Retro and vintage aesthetics' },
  { id: 'futuristic', name: 'Futuristic', description: 'Sci-fi and futuristic themes' }
];

// Aspect ratios
const aspectRatios = [
  { id: '1:1', name: 'Square', dimensions: '1024x1024', commonUse: 'Instagram, Social Media' },
  { id: '16:9', name: 'Landscape', dimensions: '1792x1024', commonUse: 'YouTube, Presentations' },
  { id: '9:16', name: 'Portrait', dimensions: '1024x1792', commonUse: 'Stories, TikTok' },
  { id: '4:3', name: 'Standard', dimensions: '1344x1024', commonUse: 'Blog, General' },
  { id: '3:2', name: 'Photo', dimensions: '1536x1024', commonUse: 'Photography' }
];

// Generate image
router.post('/generate', (req, res) => {
  const { userId, prompt, style, aspectRatio, quality, seed, variations } = req.body;

  if (!prompt) {
    return res.status(400).json({
      success: false,
      error: 'prompt is required'
    });
  }

  const imageStyle = styles.find(s => s.id === style) || styles[0];
  const ratio = aspectRatios.find(a => a.id === aspectRatio) || aspectRatios[0];

  const generation = {
    id: `img-${Date.now()}`,
    userId,
    prompt,
    style: imageStyle,
    aspectRatio: ratio,
    quality: quality || 'standard',
    seed: seed || Math.floor(Math.random() * 1000000),
    status: 'completed',
    results: generateMockImageResults(prompt, imageStyle, ratio),
    metadata: {
      generatedAt: new Date().toISOString(),
      processingTime: Math.round(Math.random() * 10 + 2),
      creditsUsed: quality === 'high' ? 2 : 1
    }
  };

  // Store generation
  if (!imageGenerations.has(userId)) {
    imageGenerations.set(userId, []);
  }
  imageGenerations.get(userId).push(generation);

  res.json({
    success: true,
    message: 'Image generated successfully',
    data: generation
  });
});

// Generate variations
router.post('/variations', (req, res) => {
  const { userId, imageId, count = 4 } = req.body;

  let original = null;
  for (const userImages of imageGenerations.values()) {
    const found = userImages.find(i => i.id === imageId);
    if (found) {
      original = found;
      break;
    }
  }

  if (!original) {
    return res.status(404).json({
      success: false,
      error: 'Original image not found'
    });
  }

  const variations = [];
  for (let i = 0; i < count; i++) {
    variations.push({
      id: `var-${Date.now()}-${i}`,
      parentId: imageId,
      prompt: original.prompt + ` (variation ${i + 1})`,
      style: original.style,
      aspectRatio: original.aspectRatio,
      seed: original.seed + i,
      results: generateMockImageResults(original.prompt, original.style, original.aspectRatio)
    });
  }

  res.json({
    success: true,
    data: {
      original: original.id,
      variations
    }
  });
});

// Edit image (inpaint/outpaint)
router.post('/edit', (req, res) => {
  const { userId, imageId, mask, instruction } = req.body;

  if (!instruction) {
    return res.status(400).json({
      success: false,
      error: 'instruction is required'
    });
  }

  const edit = {
    id: `edit-${Date.now()}`,
    userId,
    originalImageId: imageId,
    mask,
    instruction,
    status: 'completed',
    results: {
      url: `https://generated.images/edit-${Date.now()}.png`,
      prompt: instruction,
      modifiedAreas: mask ? 'selective' : 'full'
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      creditsUsed: 2
    }
  };

  res.json({
    success: true,
    message: 'Image edited successfully',
    data: edit
  });
});

// Get generation history
router.get('/history/:userId', (req, res) => {
  const { userId } = req.params;
  const { limit = 50 } = req.query;

  const history = imageGenerations.get(userId) || [];
  history.sort((a, b) => new Date(b.metadata.generatedAt) - new Date(a.metadata.generatedAt));

  res.json({
    success: true,
    data: {
      generations: history.slice(0, parseInt(limit)),
      count: history.length,
      totalCredits: history.reduce((sum, g) => sum + g.metadata.creditsUsed, 0)
    }
  });
});

// Create preset
router.post('/presets', (req, res) => {
  const { userId, name, prompt, style, aspectRatio } = req.body;

  if (!name || !prompt) {
    return res.status(400).json({
      success: false,
      error: 'name and prompt are required'
    });
  }

  const preset = {
    id: `preset-${Date.now()}`,
    userId,
    name,
    prompt,
    style: style || 'realistic',
    aspectRatio: aspectRatio || '1:1',
    createdAt: new Date().toISOString()
  };

  if (!imagePresets.has(userId)) {
    imagePresets.set(userId, []);
  }
  imagePresets.get(userId).push(preset);

  res.json({
    success: true,
    message: 'Preset created',
    data: preset
  });
});

// Get presets
router.get('/presets/:userId', (req, res) => {
  const { userId } = req.params;

  const presets = imagePresets.get(userId) || [];

  res.json({
    success: true,
    data: presets
  });
});

// Get styles
router.get('/styles', (req, res) => {
  res.json({
    success: true,
    data: styles
  });
});

// Get aspect ratios
router.get('/ratios', (req, res) => {
  res.json({
    success: true,
    data: aspectRatios
  });
});

// Helper function
function generateMockImageResults(prompt, style, ratio) {
  return {
    url: `https://generated.images/${Date.now()}.png`,
    thumbnail: `https://generated.images/${Date.now()}_thumb.png`,
    dimensions: ratio.dimensions,
    format: 'png',
    size: Math.round(Math.random() * 5000 + 1000) + 'KB'
  };
}

module.exports = router;
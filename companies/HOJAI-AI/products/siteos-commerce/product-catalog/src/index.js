/**
 * HOJAI SiteOS Product Catalog Service
 *
 * REST API microservice for managing product catalogs
 * Port: 5476
 *
 * Endpoints:
 *   GET  /api/products              - List products with pagination
 *   GET  /api/products/:id          - Get single product
 *   POST /api/products/search        - Search products
 *   POST /api/products              - Create product (admin)
 *   PUT  /api/products/:id          - Update product
 *   DELETE /api/products/:id        - Delete product
 *   GET  /api/categories             - List categories
 *   POST /api/categories             - Create category
 *   GET  /health                    - Health check
 *   GET  /                          - Service info
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const PORT = parseInt(process.env.PRODUCT_CATALOG_PORT || '5476');
const STORAGE_DIR = process.env.PRODUCT_CATALOG_STORAGE || '/tmp';
const REQUIRE_AUTH = process.env.PRODUCT_CATALOG_REQUIRE_AUTH !== 'false';
const API_KEY = process.env.PRODUCT_CATALOG_API_KEY || 'dev-api-key';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ── Auth Middleware ────────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  if (!REQUIRE_AUTH) return next();

  const auth = req.header('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);

  if (!m) {
    return res.status(401).json({ error: 'missing bearer token' });
  }
  if (m[1] !== API_KEY) {
    return res.status(403).json({ error: 'invalid api key' });
  }
  next();
}

// ── Storage Functions ─────────────────────────────────────────────────────────

function getStoragePath(companyId) {
  return path.join(STORAGE_DIR, `siteos-products-${companyId}.json`);
}

function getCategoriesPath(companyId) {
  return path.join(STORAGE_DIR, `siteos-categories-${companyId}.json`);
}

function loadData(filePath, defaultData = []) {
  if (!fs.existsSync(filePath)) {
    return defaultData;
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error loading data from ${filePath}:`, err.message);
    return defaultData;
  }
}

function saveData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error saving data to ${filePath}:`, err.message);
    return false;
  }
}

function loadProducts(companyId) {
  return loadData(getStoragePath(companyId), []);
}

function saveProducts(companyId, products) {
  return saveData(getStoragePath(companyId), products);
}

function loadCategories(companyId) {
  return loadData(getCategoriesPath(companyId), []);
}

function saveCategories(companyId, categories) {
  return saveData(getCategoriesPath(companyId), categories);
}

// ── Product Validation ─────────────────────────────────────────────────────────

function validateProduct(product, isUpdate = false) {
  const errors = [];

  if (!isUpdate) {
    if (!product.name || typeof product.name !== 'string' || product.name.trim() === '') {
      errors.push('name is required and must be a non-empty string');
    }
  } else if (product.name !== undefined && (typeof product.name !== 'string' || product.name.trim() === '')) {
    errors.push('name must be a non-empty string');
  }

  if (product.description !== undefined && typeof product.description !== 'string') {
    errors.push('description must be a string');
  }

  if (product.price !== undefined) {
    if (typeof product.price !== 'number' || product.price < 0) {
      errors.push('price must be a non-negative number');
    }
  }

  if (product.compareAtPrice !== undefined) {
    if (typeof product.compareAtPrice !== 'number' || product.compareAtPrice < 0) {
      errors.push('compareAtPrice must be a non-negative number');
    }
  }

  if (product.category !== undefined && typeof product.category !== 'string') {
    errors.push('category must be a string');
  }

  if (product.images !== undefined) {
    if (!Array.isArray(product.images)) {
      errors.push('images must be an array');
    } else if (!product.images.every(img => typeof img === 'string')) {
      errors.push('all images must be strings');
    }
  }

  if (product.variants !== undefined) {
    if (!Array.isArray(product.variants)) {
      errors.push('variants must be an array');
    } else {
      product.variants.forEach((variant, index) => {
        if (typeof variant !== 'object' || variant === null) {
          errors.push(`variant at index ${index} must be an object`);
        } else {
          if (variant.name !== undefined && typeof variant.name !== 'string') {
            errors.push(`variant[${index}].name must be a string`);
          }
          if (variant.price !== undefined && (typeof variant.price !== 'number' || variant.price < 0)) {
            errors.push(`variant[${index}].price must be a non-negative number`);
          }
          if (variant.inventory !== undefined && (typeof variant.inventory !== 'number' || variant.inventory < 0)) {
            errors.push(`variant[${index}].inventory must be a non-negative number`);
          }
        }
      });
    }
  }

  if (product.inventory !== undefined) {
    if (typeof product.inventory !== 'number' || product.inventory < 0) {
      errors.push('inventory must be a non-negative number');
    }
  }

  if (product.sku !== undefined && typeof product.sku !== 'string') {
    errors.push('sku must be a string');
  }

  if (product.tags !== undefined) {
    if (!Array.isArray(product.tags)) {
      errors.push('tags must be an array');
    } else if (!product.tags.every(tag => typeof tag === 'string')) {
      errors.push('all tags must be strings');
    }
  }

  if (product.status !== undefined) {
    if (!['active', 'draft', 'archived'].includes(product.status)) {
      errors.push('status must be one of: active, draft, archived');
    }
  }

  return errors;
}

// ── Routes: Health & Info ──────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'product-catalog',
    version: '1.0.0',
    port: PORT,
    storageDir: STORAGE_DIR,
    authEnabled: REQUIRE_AUTH
  });
});

app.get('/', (_req, res) => {
  res.json({
    service: 'product-catalog',
    version: '1.0.0',
    port: PORT,
    description: 'HOJAI SiteOS Product Catalog Service',
    endpoints: [
      'GET  /api/products              - List products with pagination',
      'GET  /api/products/:id          - Get single product',
      'POST /api/products/search        - Search products',
      'POST /api/products              - Create product (admin)',
      'PUT  /api/products/:id          - Update product',
      'DELETE /api/products/:id        - Delete product',
      'GET  /api/categories             - List categories',
      'POST /api/categories             - Create category',
      'GET  /health                    - Health check'
    ]
  });
});

// ── Routes: Products ───────────────────────────────────────────────────────────

// List products with pagination
app.get('/api/products', requireAuth, (req, res) => {
  const companyId = req.header('x-company-id') || 'default';
  const { limit = '20', offset = '0', category, status, minPrice, maxPrice } = req.query;

  let products = loadProducts(companyId);

  // Filter by category
  if (category) {
    products = products.filter(p => p.category === category);
  }

  // Filter by status
  if (status) {
    products = products.filter(p => p.status === status);
  }

  // Filter by price range
  if (minPrice !== undefined) {
    const min = parseFloat(minPrice);
    if (!isNaN(min)) {
      products = products.filter(p => p.price >= min);
    }
  }

  if (maxPrice !== undefined) {
    const max = parseFloat(maxPrice);
    if (!isNaN(max)) {
      products = products.filter(p => p.price <= max);
    }
  }

  // Pagination
  const total = products.length;
  const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const parsedOffset = Math.max(parseInt(offset) || 0, 0);

  const paginatedProducts = products
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(parsedOffset, parsedOffset + parsedLimit);

  res.json({
    products: paginatedProducts,
    pagination: {
      total,
      limit: parsedLimit,
      offset: parsedOffset,
      hasMore: parsedOffset + parsedLimit < total
    }
  });
});

// Get single product
app.get('/api/products/:id', requireAuth, (req, res) => {
  const companyId = req.header('x-company-id') || 'default';
  const { id } = req.params;

  const products = loadProducts(companyId);
  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ error: 'product not found' });
  }

  res.json(product);
});

// Search products
app.post('/api/products/search', requireAuth, (req, res) => {
  const companyId = req.header('x-company-id') || 'default';
  const { query, category, status, minPrice, maxPrice, tags, limit = 20, offset = 0 } = req.body || {};

  let products = loadProducts(companyId);

  // Text search in name, description, and tags
  if (query && typeof query === 'string' && query.trim() !== '') {
    const searchTerm = query.toLowerCase();
    products = products.filter(p => {
      const nameMatch = p.name && p.name.toLowerCase().includes(searchTerm);
      const descMatch = p.description && p.description.toLowerCase().includes(searchTerm);
      const tagMatch = p.tags && p.tags.some(tag => tag.toLowerCase().includes(searchTerm));
      return nameMatch || descMatch || tagMatch;
    });
  }

  // Filter by category
  if (category) {
    products = products.filter(p => p.category === category);
  }

  // Filter by status
  if (status) {
    products = products.filter(p => p.status === status);
  }

  // Filter by price range
  if (minPrice !== undefined) {
    const min = parseFloat(minPrice);
    if (!isNaN(min)) {
      products = products.filter(p => p.price >= min);
    }
  }

  if (maxPrice !== undefined) {
    const max = parseFloat(maxPrice);
    if (!isNaN(max)) {
      products = products.filter(p => p.price <= max);
    }
  }

  // Filter by tags
  if (tags && Array.isArray(tags)) {
    products = products.filter(p => {
      if (!p.tags) return false;
      return tags.some(tag => p.tags.includes(tag));
    });
  }

  // Pagination
  const total = products.length;
  const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const parsedOffset = Math.max(parseInt(offset) || 0, 0);

  const paginatedProducts = products
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(parsedOffset, parsedOffset + parsedLimit);

  res.json({
    products: paginatedProducts,
    pagination: {
      total,
      limit: parsedLimit,
      offset: parsedOffset,
      hasMore: parsedOffset + parsedLimit < total
    },
    query: query || null
  });
});

// Create product
app.post('/api/products', requireAuth, (req, res) => {
  const companyId = req.header('x-company-id') || 'default';
  const productData = req.body;

  // Validate required fields
  const errors = validateProduct(productData, false);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'validation failed', details: errors });
  }

  // Check for duplicate SKU
  if (productData.sku) {
    const products = loadProducts(companyId);
    if (products.some(p => p.sku === productData.sku)) {
      return res.status(409).json({ error: 'product with this SKU already exists' });
    }
  }

  const now = new Date().toISOString();
  const product = {
    id: uuidv4(),
    companyId,
    name: productData.name,
    description: productData.description || '',
    price: productData.price || 0,
    compareAtPrice: productData.compareAtPrice || 0,
    category: productData.category || 'uncategorized',
    images: productData.images || [],
    variants: productData.variants || [],
    inventory: productData.inventory || 0,
    sku: productData.sku || '',
    tags: productData.tags || [],
    status: productData.status || 'draft',
    createdAt: now,
    updatedAt: now
  };

  const products = loadProducts(companyId);
  products.push(product);

  if (!saveProducts(companyId, products)) {
    return res.status(500).json({ error: 'failed to save product' });
  }

  res.status(201).json(product);
});

// Update product
app.put('/api/products/:id', requireAuth, (req, res) => {
  const companyId = req.header('x-company-id') || 'default';
  const { id } = req.params;
  const updates = req.body;

  // Validate updates
  const errors = validateProduct(updates, true);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'validation failed', details: errors });
  }

  const products = loadProducts(companyId);
  const index = products.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'product not found' });
  }

  // Check for duplicate SKU (if updating SKU)
  if (updates.sku && updates.sku !== products[index].sku) {
    if (products.some(p => p.sku === updates.sku && p.id !== id)) {
      return res.status(409).json({ error: 'product with this SKU already exists' });
    }
  }

  // Apply updates
  const updatedProduct = {
    ...products[index],
    ...updates,
    id: products[index].id, // Prevent ID change
    companyId: products[index].companyId, // Prevent companyId change
    createdAt: products[index].createdAt, // Prevent createdAt change
    updatedAt: new Date().toISOString()
  };

  products[index] = updatedProduct;

  if (!saveProducts(companyId, products)) {
    return res.status(500).json({ error: 'failed to save product' });
  }

  res.json(updatedProduct);
});

// Delete product
app.delete('/api/products/:id', requireAuth, (req, res) => {
  const companyId = req.header('x-company-id') || 'default';
  const { id } = req.params;

  const products = loadProducts(companyId);
  const index = products.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'product not found' });
  }

  const deletedProduct = products.splice(index, 1)[0];

  if (!saveProducts(companyId, products)) {
    return res.status(500).json({ error: 'failed to delete product' });
  }

  res.json({ message: 'product deleted', product: deletedProduct });
});

// ── Routes: Categories ─────────────────────────────────────────────────────────

// List categories
app.get('/api/categories', requireAuth, (req, res) => {
  const companyId = req.header('x-company-id') || 'default';
  const { includeCount = 'false' } = req.query;

  if (includeCount === 'true') {
    const products = loadProducts(companyId);
    const categoryCount = {};

    products.forEach(p => {
      if (p.category) {
        categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
      }
    });

    const categories = Object.entries(categoryCount).map(([name, count]) => ({
      name,
      productCount: count
    }));

    return res.json({ categories });
  }

  const customCategories = loadCategories(companyId);
  res.json({ categories: customCategories });
});

// Create category
app.post('/api/categories', requireAuth, (req, res) => {
  const companyId = req.header('x-company-id') || 'default';
  const { name, description, parentId } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'category name is required' });
  }

  const categories = loadCategories(companyId);

  // Check for duplicate
  if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: 'category already exists' });
  }

  const category = {
    id: uuidv4(),
    name: name.trim(),
    description: description || '',
    parentId: parentId || null,
    createdAt: new Date().toISOString()
  };

  categories.push(category);

  if (!saveCategories(companyId, categories)) {
    return res.status(500).json({ error: 'failed to save category' });
  }

  res.status(201).json(category);
});

// ── Boot ───────────────────────────────────────────────────────────────────────
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => {
  console.log(`[product-catalog] listening on http://localhost:${PORT}`);
  console.log(`[product-catalog] storage: ${STORAGE_DIR}`);
  console.log(`[product-catalog] auth: ${REQUIRE_AUTH ? 'required' : 'disabled (dev mode)'}`);
});

module.exports = { app, PORT, STORAGE_DIR, REQUIRE_AUTH, API_KEY };
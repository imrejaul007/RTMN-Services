/**
 * Product Catalog Service Tests
 *
 * Tests for the SiteOS Product Catalog microservice
 * Covers: products CRUD, search, categories, pagination, validation, auth
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from '../../src/index.js';

// Test storage path
const TEST_COMPANY_ID = 'test-company-123';
const TEST_STORAGE_DIR = '/tmp';
const TEST_PRODUCTS_PATH = path.join(TEST_STORAGE_DIR, `siteos-products-${TEST_COMPANY_ID}.json`);
const TEST_CATEGORIES_PATH = path.join(TEST_STORAGE_DIR, `siteos-categories-${TEST_COMPANY_ID}.json`);
const TEST_API_KEY = 'dev-api-key';

// Helper to create auth headers
function authHeaders(companyId = TEST_COMPANY_ID) {
  return {
    'Authorization': `Bearer ${TEST_API_KEY}`,
    'x-company-id': companyId
  };
}

// Helper to clean test data
function cleanTestData() {
  try {
    if (fs.existsSync(TEST_PRODUCTS_PATH)) fs.unlinkSync(TEST_PRODUCTS_PATH);
    if (fs.existsSync(TEST_CATEGORIES_PATH)) fs.unlinkSync(TEST_CATEGORIES_PATH);
  } catch {}
}

describe('Product Catalog Service', () => {
  beforeEach(() => {
    cleanTestData();
  });

  afterEach(() => {
    cleanTestData();
  });

  // ── Health & Info ───────────────────────────────────────────────────────────

  describe('Health & Info Endpoints', () => {
    it('GET /health should return service status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('service', 'product-catalog');
      expect(res.body).toHaveProperty('version', '1.0.0');
    });

    it('GET / should return service info with endpoints', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('service', 'product-catalog');
      expect(res.body).toHaveProperty('endpoints');
      expect(Array.isArray(res.body.endpoints)).toBe(true);
    });
  });

  // ── Product CRUD ────────────────────────────────────────────────────────────

  describe('Product CRUD Operations', () => {
    const validProduct = {
      name: 'Test Product',
      description: 'A test product description',
      price: 29.99,
      compareAtPrice: 39.99,
      category: 'electronics',
      images: ['https://example.com/image1.jpg'],
      variants: [
        { id: 'var-1', name: 'Small', price: 29.99, inventory: 10 },
        { id: 'var-2', name: 'Large', price: 39.99, inventory: 5 }
      ],
      inventory: 100,
      sku: 'TEST-001',
      tags: ['test', 'sample'],
      status: 'active'
    };

    it('POST /api/products should create a new product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set(authHeaders())
        .send(validProduct);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', validProduct.name);
      expect(res.body).toHaveProperty('companyId', TEST_COMPANY_ID);
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
    });

    it('POST /api/products should validate required fields', async () => {
      const res = await request(app)
        .post('/api/products')
        .set(authHeaders())
        .send({ description: 'No name provided' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'validation failed');
      expect(res.body.details).toContain('name is required and must be a non-empty string');
    });

    it('GET /api/products should list products with pagination', async () => {
      // Create two products
      await request(app).post('/api/products').set(authHeaders()).send(validProduct);
      await request(app)
        .post('/api/products')
        .set(authHeaders())
        .send({ ...validProduct, name: 'Second Product', sku: 'TEST-002' });

      const res = await request(app)
        .get('/api/products')
        .set(authHeaders())
        .query({ limit: 1, offset: 0 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('products');
      expect(res.body.products.length).toBe(1);
      expect(res.body.pagination).toHaveProperty('total', 2);
      expect(res.body.pagination).toHaveProperty('hasMore', true);
    });

    it('GET /api/products/:id should return a single product', async () => {
      const createRes = await request(app)
        .post('/api/products')
        .set(authHeaders())
        .send(validProduct);

      const productId = createRes.body.id;

      const res = await request(app)
        .get(`/api/products/${productId}`)
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', productId);
      expect(res.body).toHaveProperty('name', validProduct.name);
    });

    it('GET /api/products/:id should return 404 for non-existent product', async () => {
      const res = await request(app)
        .get('/api/products/non-existent-id')
        .set(authHeaders());

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'product not found');
    });

    it('PUT /api/products/:id should update a product', async () => {
      const createRes = await request(app)
        .post('/api/products')
        .set(authHeaders())
        .send(validProduct);

      const productId = createRes.body.id;

      const res = await request(app)
        .put(`/api/products/${productId}`)
        .set(authHeaders())
        .send({ name: 'Updated Product Name', price: 49.99 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', 'Updated Product Name');
      expect(res.body).toHaveProperty('price', 49.99);
      expect(res.body.updatedAt).not.toBe(createRes.body.createdAt);
    });

    it('DELETE /api/products/:id should delete a product', async () => {
      const createRes = await request(app)
        .post('/api/products')
        .set(authHeaders())
        .send(validProduct);

      const productId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/products/${productId}`)
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'product deleted');
      expect(res.body.product).toHaveProperty('id', productId);

      // Verify deletion
      const getRes = await request(app)
        .get(`/api/products/${productId}`)
        .set(authHeaders());

      expect(getRes.status).toBe(404);
    });
  });

  // ── Search & Filters ────────────────────────────────────────────────────────

  describe('Search & Filters', () => {
    const createTestProducts = async () => {
      const products = [
        { name: 'iPhone 15', description: 'Latest Apple smartphone', price: 999, category: 'electronics', tags: ['apple', 'phone'], status: 'active' },
        { name: 'Samsung Galaxy', description: 'Android flagship', price: 899, category: 'electronics', tags: ['samsung', 'phone'], status: 'active' },
        { name: 'Nike Shoes', description: 'Running shoes', price: 129, category: 'footwear', tags: ['nike', 'shoes'], status: 'active' }
      ];

      for (const p of products) {
        await request(app).post('/api/products').set(authHeaders()).send(p);
      }
    };

    beforeEach(createTestProducts);

    it('POST /api/products/search should search by query term', async () => {
      const res = await request(app)
        .post('/api/products/search')
        .set(authHeaders())
        .send({ query: 'phone' });

      expect(res.status).toBe(200);
      expect(res.body.products.length).toBe(2);
      expect(res.body).toHaveProperty('query', 'phone');
    });

    it('POST /api/products/search should filter by category', async () => {
      const res = await request(app)
        .post('/api/products/search')
        .set(authHeaders())
        .send({ category: 'electronics' });

      expect(res.status).toBe(200);
      expect(res.body.products.length).toBe(2);
      res.body.products.forEach(p => expect(p.category).toBe('electronics'));
    });

    it('POST /api/products/search should filter by price range', async () => {
      const res = await request(app)
        .post('/api/products/search')
        .set(authHeaders())
        .send({ minPrice: 200, maxPrice: 1000 });

      expect(res.status).toBe(200);
      expect(res.body.products.length).toBe(2);
      res.body.products.forEach(p => {
        expect(p.price).toBeGreaterThanOrEqual(200);
        expect(p.price).toBeLessThanOrEqual(1000);
      });
    });

    it('GET /api/products should filter by status', async () => {
      // Add a draft product
      await request(app)
        .post('/api/products')
        .set(authHeaders())
        .send({ name: 'Draft Product', status: 'draft' });

      const res = await request(app)
        .get('/api/products')
        .set(authHeaders())
        .query({ status: 'active' });

      expect(res.status).toBe(200);
      res.body.products.forEach(p => expect(p.status).toBe('active'));
    });
  });

  // ── Categories ──────────────────────────────────────────────────────────────

  describe('Category Operations', () => {
    it('POST /api/categories should create a category', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set(authHeaders())
        .send({ name: 'Electronics', description: 'Electronic devices' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'Electronics');
      expect(res.body).toHaveProperty('description', 'Electronic devices');
    });

    it('POST /api/categories should reject duplicate names', async () => {
      await request(app)
        .post('/api/categories')
        .set(authHeaders())
        .send({ name: 'Electronics' });

      const res = await request(app)
        .post('/api/categories')
        .set(authHeaders())
        .send({ name: 'Electronics' });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error', 'category already exists');
    });

    it('GET /api/categories should list categories with product count', async () => {
      // Create category and product
      await request(app).post('/api/categories').set(authHeaders()).send({ name: 'Test Category' });
      await request(app)
        .post('/api/products')
        .set(authHeaders())
        .send({ name: 'Test Product', category: 'Test Category' });

      const res = await request(app)
        .get('/api/categories')
        .set(authHeaders())
        .query({ includeCount: 'true' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.categories)).toBe(true);
    });
  });

  // ── Validation ──────────────────────────────────────────────────────────────

  describe('Input Validation', () => {
    it('should reject negative prices', async () => {
      const res = await request(app)
        .post('/api/products')
        .set(authHeaders())
        .send({ name: 'Bad Product', price: -10 });

      expect(res.status).toBe(400);
      expect(res.body.details).toContain('price must be a non-negative number');
    });

    it('should reject invalid status values', async () => {
      const res = await request(app)
        .post('/api/products')
        .set(authHeaders())
        .send({ name: 'Bad Status Product', status: 'invalid-status' });

      expect(res.status).toBe(400);
      expect(res.body.details).toContain('status must be one of: active, draft, archived');
    });

    it('should reject invalid variant structure', async () => {
      const res = await request(app)
        .post('/api/products')
        .set(authHeaders())
        .send({ name: 'Bad Variants', variants: [{ price: -5 }] });

      expect(res.status).toBe(400);
      expect(res.body.details.some(d => d.includes('variant'))).toBe(true);
    });
  });

  // ── SKU Uniqueness ──────────────────────────────────────────────────────────

  describe('SKU Uniqueness', () => {
    it('should prevent duplicate SKUs', async () => {
      const product1 = { name: 'Product 1', sku: 'UNIQUE-SKU' };
      const product2 = { name: 'Product 2', sku: 'UNIQUE-SKU' };

      await request(app).post('/api/products').set(authHeaders()).send(product1);

      const res = await request(app)
        .post('/api/products')
        .set(authHeaders())
        .send(product2);

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error', 'product with this SKU already exists');
    });
  });
});
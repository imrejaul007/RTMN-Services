/**
 * HOJAI AI Recommendation Engine - In-Memory Data Store
 *
 * Mock data store for development.
 * In production, this would connect to a real database.
 */

import type { Product, UserPurchase, PurchasePattern, TrendingItem } from '../types/index.js';
import { textToEmbedding } from '../utils/embedding.js';
import { logger } from '../utils/logger.js';

// In-memory stores
const products: Map<string, Product> = new Map();
const purchases: UserPurchase[] = [];
const purchasePatterns: Map<string, PurchasePattern> = new Map();
const trendingItems: Map<string, TrendingItem> = new Map();

/**
 * Initialize mock product data
 */
export function initializeMockData(): void {
  logger.info('Initializing mock product data...');

  const mockProducts = [
    { id: 'p1', name: 'Wireless Headphones', category: 'electronics', price: 99.99, tags: ['audio', 'wireless', 'bluetooth'] },
    { id: 'p2', name: 'Bluetooth Speaker', category: 'electronics', price: 49.99, tags: ['audio', 'portable', 'wireless'] },
    { id: 'p3', name: 'Smart Watch', category: 'electronics', price: 199.99, tags: ['wearable', 'fitness', 'smart'] },
    { id: 'p4', name: 'Laptop Stand', category: 'accessories', price: 39.99, tags: ['office', 'ergonomic'] },
    { id: 'p5', name: 'USB-C Hub', category: 'accessories', price: 59.99, tags: ['connectivity', 'usb', 'laptop'] },
    { id: 'p6', name: 'Mechanical Keyboard', category: 'electronics', price: 129.99, tags: ['keyboard', 'gaming', 'mechanical'] },
    { id: 'p7', name: 'Wireless Mouse', category: 'electronics', price: 29.99, tags: ['mouse', 'wireless', 'ergonomic'] },
    { id: 'p8', name: 'Monitor Light Bar', category: 'accessories', price: 45.99, tags: ['lighting', 'desk', 'productivity'] },
    { id: 'p9', name: 'Webcam HD', category: 'electronics', price: 79.99, tags: ['video', 'streaming', 'camera'] },
    { id: 'p10', name: 'Desk Mat', category: 'accessories', price: 19.99, tags: ['desk', 'office', 'gaming'] },
    { id: 'p11', name: 'Phone Case', category: 'accessories', price: 15.99, tags: ['phone', 'protection'] },
    { id: 'p12', name: 'Screen Protector', category: 'accessories', price: 9.99, tags: ['phone', 'protection', 'screen'] },
    { id: 'p13', name: 'Charging Cable', category: 'accessories', price: 12.99, tags: ['charging', 'usb', 'cable'] },
    { id: 'p14', name: 'Power Bank', category: 'electronics', price: 35.99, tags: ['portable', 'charging', 'power'] },
    { id: 'p15', name: 'Earbuds', category: 'electronics', price: 149.99, tags: ['audio', 'wireless', 'earbuds'] },
    { id: 'p16', name: 'Smart Home Hub', category: 'electronics', price: 89.99, tags: ['smart-home', 'iot', 'automation'] },
    { id: 'p17', name: 'Fitness Tracker', category: 'electronics', price: 79.99, tags: ['fitness', 'wearable', 'health'] },
    { id: 'p18', name: 'Tablet Stand', category: 'accessories', price: 24.99, tags: ['tablet', 'stand', 'office'] },
    { id: 'p19', name: 'Laptop Sleeve', category: 'accessories', price: 29.99, tags: ['laptop', 'protection', 'travel'] },
    { id: 'p20', name: 'Portable SSD', category: 'electronics', price: 89.99, tags: ['storage', 'portable', 'ssd'] },
  ];

  const now = Date.now();

  for (const product of mockProducts) {
    const fullProduct: Product = {
      ...product,
      embedding: textToEmbedding(product.name + ' ' + product.tags.join(' ')),
      createdAt: new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    products.set(product.id, fullProduct);
  }

  // Initialize trending data based on categories
  for (const product of products.values()) {
    const purchaseCount = Math.floor(Math.random() * 100) + 10;
    const recentPurchases = Math.floor(Math.random() * 50);
    trendingItems.set(product.id, {
      productId: product.id,
      purchaseCount,
      recentPurchases,
      velocity: recentPurchases / 7, // purchases per day
    });
  }

  logger.info(`Initialized ${products.size} products`);
}

/**
 * Get all products
 */
export function getAllProducts(): Product[] {
  return Array.from(products.values());
}

/**
 * Get product by ID
 */
export function getProductById(id: string): Product | undefined {
  return products.get(id);
}

/**
 * Get multiple products by IDs
 */
export function getProductsByIds(ids: string[]): Product[] {
  return ids
    .map(id => products.get(id))
    .filter((p): p is Product => p !== undefined);
}

/**
 * Add a purchase record
 */
export function addPurchase(purchase: UserPurchase): void {
  purchases.push(purchase);

  // Update purchase patterns
  updatePurchasePatterns(purchase);

  // Update trending
  updateTrending(purchase.productId);
}

/**
 * Update purchase patterns for co-purchase analysis
 */
function updatePurchasePatterns(purchase: UserPurchase): void {
  const userPurchases = purchases.filter(p => p.userId === purchase.userId);
  const productIds = userPurchases.map(p => p.productId);

  for (const otherProductId of productIds) {
    if (otherProductId === purchase.productId) continue;

    let pattern = purchasePatterns.get(purchase.productId);
    if (!pattern) {
      pattern = {
        productId: purchase.productId,
        relatedProducts: new Map(),
        totalPurchases: 0,
      };
      purchasePatterns.set(purchase.productId, pattern);
    }

    const currentFreq = pattern.relatedProducts.get(otherProductId) ?? 0;
    pattern.relatedProducts.set(otherProductId, currentFreq + 1);
    pattern.totalPurchases++;
  }
}

/**
 * Update trending data for a product
 */
function updateTrending(productId: string): void {
  const item = trendingItems.get(productId);
  if (item) {
    item.purchaseCount++;
    item.recentPurchases++;
    item.velocity = item.recentPurchases / 7;
  }
}

/**
 * Get trending items for the last N days
 */
export function getTrendingItems(days: number = 7, limit: number = 10): TrendingItem[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recentPurchases = purchases.filter(p => new Date(p.timestamp).getTime() > cutoff);

  // Count purchases per product
  const counts: Map<string, number> = new Map();
  for (const purchase of recentPurchases) {
    const count = counts.get(purchase.productId) ?? 0;
    counts.set(purchase.productId, count + purchase.quantity);
  }

  // Convert to array and sort
  const trending = Array.from(counts.entries())
    .map(([productId, purchaseCount]) => {
      return {
        productId,
        purchaseCount,
        recentPurchases: purchaseCount,
        velocity: purchaseCount / days,
      };
    })
    .sort((a, b) => b.purchaseCount - a.purchaseCount)
    .slice(0, limit);

  return trending;
}

/**
 * Get purchase patterns for a product (frequently bought together)
 */
export function getFrequentlyBoughtTogether(
  productId: string,
  limit: number = 10
): Array<{ productId: string; frequency: number }> {
  const pattern = purchasePatterns.get(productId);

  if (!pattern) {
    return [];
  }

  const related = Array.from(pattern.relatedProducts.entries())
    .map(([id, frequency]) => ({ productId: id, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, limit);

  return related;
}

/**
 * Get user's purchase history
 */
export function getUserPurchaseHistory(userId: string): UserPurchase[] {
  return purchases.filter(p => p.userId === userId);
}

/**
 * Get user's purchased product IDs
 */
export function getUserPurchasedProductIds(userId: string): Set<string> {
  const purchases = getUserPurchaseHistory(userId);
  return new Set(purchases.map(p => p.productId));
}

/**
 * Get products by category
 */
export function getProductsByCategory(category: string): Product[] {
  return Array.from(products.values()).filter(p => p.category === category);
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  const categories = new Set<string>();
  for (const product of products.values()) {
    categories.add(product.category);
  }
  return Array.from(categories);
}

/**
 * Record a purchase (for API usage)
 */
export function recordPurchase(userId: string, productId: string, quantity: number = 1): void {
  addPurchase({
    userId,
    productId,
    quantity,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get data store stats
 */
export function getDataStats(): {
  productCount: number;
  purchaseCount: number;
  patternCount: number;
  categories: string[];
} {
  return {
    productCount: products.size,
    purchaseCount: purchases.length,
    patternCount: purchasePatterns.size,
    categories: getAllCategories(),
  };
}

// Initialize data on module load
initializeMockData();

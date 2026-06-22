/**
 * PRODFLOW - Database Utilities
 * MongoDB connection and management
 */

import mongoose from 'mongoose';
import { logger } from './logger';
import { config } from './config';
import { Product, Order, Inventory, QCReport } from '../models';

// Connection state
let isConnected = false;

// ============================================
// DATABASE CONNECTION
// ============================================

export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    logger.info('Database already connected');
    return;
  }

  try {
    const options = {
      maxPoolSize: config.mongodb.poolSize,
      serverSelectionTimeoutMS: config.mongodb.timeout,
      socketTimeoutMS: config.mongodb.socketTimeout,
    };

    await mongoose.connect(config.mongodb.uri, options);
    isConnected = true;

    logger.info('Database connected successfully', {
      host: mongoose.connection.host,
      name: mongoose.connection.name
    });

    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      logger.error('Database connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('Database disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      logger.info('Database reconnected');
    });

  } catch (error) {
    logger.error('Failed to connect to database', { error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) {
    logger.info('Database already disconnected');
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from database', { error });
    throw error;
  }
}

// ============================================
// INDEX CREATION
// ============================================

export async function createIndexes(): Promise<void> {
  try {
    logger.info('Creating database indexes...');

    await Promise.all([
      Product.createIndexes(),
      Order.createIndexes(),
      Inventory.createIndexes(),
      QCReport.createIndexes()
    ]);

    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error('Error creating indexes', { error });
    throw error;
  }
}

// ============================================
// SEED DATA
// ============================================

export async function seedDefaultData(): Promise<void> {
  try {
    // Check if data already exists
    const productCount = await Product.countDocuments();
    if (productCount > 0) {
      logger.info('Database already has data, skipping seed');
      return;
    }

    logger.info('Seeding default data...');

    // Seed products
    const products = await Product.insertMany([
      {
        name: 'Industrial Motor 1HP',
        sku: 'MOT-001',
        category: 'Motors',
        unitCost: 5000,
        unitPrice: 8500,
        stock: 100,
        reorderLevel: 20,
        leadTime: 7,
        isActive: true
      },
      {
        name: 'Industrial Motor 2HP',
        sku: 'MOT-002',
        category: 'Motors',
        unitCost: 8500,
        unitPrice: 14500,
        stock: 50,
        reorderLevel: 15,
        leadTime: 10,
        isActive: true
      },
      {
        name: 'Control Panel Standard',
        sku: 'CTL-001',
        category: 'Controls',
        unitCost: 12000,
        unitPrice: 20000,
        stock: 30,
        reorderLevel: 10,
        leadTime: 14,
        isActive: true
      },
      {
        name: 'Power Supply Unit',
        sku: 'PSU-001',
        category: 'Electronics',
        unitCost: 3500,
        unitPrice: 6000,
        stock: 200,
        reorderLevel: 50,
        leadTime: 5,
        isActive: true
      },
      {
        name: 'Sensor Array Kit',
        sku: 'SEN-001',
        category: 'Sensors',
        unitCost: 8000,
        unitPrice: 13500,
        stock: 25,
        reorderLevel: 8,
        leadTime: 12,
        isActive: true
      }
    ]);

    logger.info('Seeded products', { count: products.length });

    // Seed inventory
    const inventoryRecords = products.map(p => ({
      productId: p._id,
      quantity: p.stock,
      location: 'Main Warehouse',
      minStock: p.reorderLevel,
      maxStock: p.reorderLevel * 5
    }));

    await Inventory.insertMany(inventoryRecords);
    logger.info('Seeded inventory records', { count: inventoryRecords.length });

    // Seed sample orders
    const orders = await Order.insertMany([
      {
        orderNumber: 'ORD-2024-001',
        customerName: 'Acme Corporation',
        customerContact: { email: 'orders@acme.com', phone: '+919876543210' },
        items: [
          { productId: products[0]._id, productName: products[0].name, quantity: 10, unitPrice: products[0].unitPrice, total: products[0].unitPrice * 10 },
          { productId: products[1]._id, productName: products[1].name, quantity: 5, unitPrice: products[1].unitPrice, total: products[1].unitPrice * 5 }
        ],
        subtotal: 162500,
        tax: 29250,
        total: 191750,
        status: 'pending',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      {
        orderNumber: 'ORD-2024-002',
        customerName: 'Tech Industries',
        customerContact: { email: 'procurement@techind.com' },
        items: [
          { productId: products[2]._id, productName: products[2].name, quantity: 3, unitPrice: products[2].unitPrice, total: products[2].unitPrice * 3 }
        ],
        subtotal: 60000,
        tax: 10800,
        total: 70800,
        status: 'pending',
        priority: 'medium',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      }
    ]);

    logger.info('Seeded orders', { count: orders.length });

    logger.info('Default data seeding completed');
  } catch (error) {
    logger.error('Error seeding default data', { error });
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  connectDatabase,
  disconnectDatabase,
  createIndexes,
  seedDefaultData
};

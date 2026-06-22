/**
 * WAITRON - Restaurant OS for HOJAI
 *
 * "The Restaurant That Never Stopped Learning"
 *
 * Complete restaurant intelligence powered by HOJAI:
 * - 7:00 AM - Restaurant Twin (demand prediction)
 * - 8:00 AM - Owner Briefing (Genie)
 * - 9:00 AM - Customer Discovery (BuzzLocal)
 * - 9:15 AM - REZ QR (identity)
 * - 9:20 AM - Ordering (Waitron)
 * - 10:00 AM - Procurement (Nexha)
 * - Noon - Lunch Rush coordination
 * - 6:00 PM - Owner Dashboard
 * - 8:00 PM - Sutar Expansion
 *
 * @module WAITRON
 * @version 1.0.0
 * @port 4820
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import promClient from 'prom-client';
import winston from 'winston';
import axios from 'axios';

// Import Waitron Integration Hub
import {
  WaitronIntegrationHub,
  weatherConnector,
  qrTableConnector,
  nexhaProcurementConnector,
  genieRestaurantConnector,
  cateringHandler,
  assetMindConnector,
  restaurantExpansionAgent
} from './connectors/index.js';

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

// Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const waitronRequestsCounter = new promClient.Counter({
  name: 'waitron_requests_total',
  help: 'Total Waitron requests',
  labelNames: ['operation', 'status']
});
register.registerMetric(waitronRequestsCounter);

// Service URLs
const SERVICE_URLS = {
  // REZ Restaurant Services (RTNM)
  restaurant: process.env.REZ_RESTAURANT_URL || 'http://localhost:4017',
  pos: process.env.REZ_POS_URL || 'http://localhost:3100',
  analytics: process.env.REZ_ANALYTICS_URL || 'http://localhost:4019',
  inventory: process.env.REZ_INVENTORY_URL || 'http://localhost:4056',
  loyalty: process.env.REZ_LOYALTY_URL || 'http://localhost:4007',
  reservations: process.env.REZ_RESERVATIONS_URL || 'http://localhost:4020',
  crm: process.env.REZ_CRM_URL || 'http://localhost:4007',

  // AI Services
  ai: process.env.REZ_AI_URL || 'http://localhost:4018',
  mind: process.env.REZ_MIND_URL || 'http://localhost:4007',

  // HOJAI Core
  memory: process.env.HOJAI_MEMORY_URL || 'http://localhost:4520',
  intelligence: process.env.HOJAI_INTELLIGENCE_URL || 'http://localhost:4530',
  bridge: process.env.HOJAI_BRIDGE_URL || 'http://localhost:5140',

  // Commerce Network
  nexha: process.env.NEXHA_URL || 'http://localhost:4399',

  // RABTUL (Payments)
  rabtul_auth: process.env.RABTUL_AUTH_URL || 'http://localhost:4002',
  rabtul_payment: process.env.RABTUL_PAYMENT_URL || 'http://localhost:4001',
  rabtul_wallet: process.env.RABTUL_WALLET_URL || 'http://localhost:4004'
};

// Initialize Integration Hub
const integrationHub = new WaitronIntegrationHub();

// Express app
const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(compression());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ============================================
// HEALTH CHECKS
// ============================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'waitron',
    version: '1.0.0',
    tagline: 'The Restaurant That Never Stopped Learning',
    timestamp: new Date().toISOString()
  });
});

app.get('/metrics', async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.get('/services/status', async (req: Request, res: Response) => {
  const results = await Promise.all(
    Object.entries(SERVICE_URLS).map(async ([name, url]) => {
      try {
        await axios.get(`${url}/health`, { timeout: 2000 });
        return { name, status: 'online', url };
      } catch {
        return { name, status: 'offline', url };
      }
    })
  );
  res.json({ services: results });
});

// ============================================
// RESTAURANT TWIN - 7:00 AM
// Demand Prediction & Daily Preparation
// ============================================

/**
 * GET /api/twin/:merchantId
 * Restaurant Twin - Predicts today's demand based on:
 * - Historical sales
 * - Weather
 * - Events
 * - Traffic
 * - Reservations
 */
app.get('/api/twin/:merchantId', async (req: Request, res: Response) => {
  const { merchantId } = req.params;
  const startTime = Date.now();

  try {
    // Fetch all data sources in parallel using integrated connectors
    const [
      // Weather from BuzzLocal (REAL API CALL!)
      weatherPrediction,
      // Yesterday's orders
      ordersRes,
      // Today's reservations
      reservationsRes,
      // Current inventory
      inventoryRes
    ] = await Promise.allSettled([
      // REAL: Get weather from BuzzLocal via weather connector
      weatherConnector.getWeatherPrediction({
        latitude: 12.9716, // Bangalore
        longitude: 77.5946,
        name: 'Bangalore'
      }),
      // Yesterday's orders
      axios.get(`${SERVICE_URLS.restaurant}/api/orders`, {
        params: { restaurantId: merchantId, date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
        timeout: 5000
      }),
      // Today's reservations
      axios.get(`${SERVICE_URLS.reservations}/api/reservations`, {
        params: { entityId: merchantId, date: new Date().toISOString().split('T')[0] },
        timeout: 5000
      }),
      // Current inventory
      axios.get(`${SERVICE_URLS.inventory}/api/inventory`, {
        params: { restaurantId: merchantId },
        timeout: 5000
      })
    ]);

    const yesterdayOrders = ordersRes.status === 'fulfilled' ? ordersRes.value.data.orders || [] : [];
    const reservations = reservationsRes.status === 'fulfilled' ? reservationsRes.value.data.reservations || [] : [];
    const inventory = inventoryRes.status === 'fulfilled' ? inventoryRes.value.data.items || [] : [];

    // Use weather from connector (real data!)
    const weatherData = weatherPrediction.status === 'fulfilled' ? weatherPrediction.value : null;
    const weather = weatherData?.weather || { temperature: 28, condition: 'sunny', humidity: 65 };
    const demandMultiplier = weatherData?.demandMultiplier;

    // Calculate predictions with REAL weather multipliers
    const avgOrdersPerHour = calculateAvgOrders(yesterdayOrders);

    // Use weather connector's demand multiplier
    const weatherMultiplier = demandMultiplier?.overall || (
      weather.condition === 'rain' || weather.condition === 'light_rain' ? 1.15 :
      weather.temperature > 32 ? 0.9 : 1
    );

    // Calculate predictions
    const predictions = generatePredictions(avgOrdersPerHour, reservations.length, weatherMultiplier);

    // Check inventory alerts and trigger procurement if needed
    const inventoryAlerts = inventory.filter((item: any) =>
      item.currentStock < item.minStock
    ).map((item: any) => ({
      item: item.name,
      current: item.currentStock,
      min: item.minStock,
      urgency: item.currentStock < item.minStock * 0.5 ? 'critical' : 'high'
    }));

    // AUTO-PROCUREMENT: If critical alerts, trigger Nexha
    if (inventoryAlerts.some((a: any) => a.urgency === 'critical')) {
      // Trigger procurement connector
      nexhaProcurementConnector.processInventoryAlerts({
        merchantId,
        alerts: inventoryAlerts.map((a: any) => ({
          item: { itemId: a.item, name: a.item, currentStock: a.current, reorderPoint: a.min, unit: 'kg' },
          severity: a.urgency,
          urgency: a.urgency,
          message: `${a.item} is at ${a.current} (min: ${a.min})`
        }))
      }).catch(e => logger.warn('Procurement trigger failed:', e.message));
    }

    // Staff recommendations
    const staffRecommendation = calculateStaffing(predictions);

    // Get weather-based recommendations from connector
    const weatherRecommendations = weatherData?.recommendations || [];

    res.json({
      success: true,
      source: 'waitron-twin',
      merchantId,
      timestamp: new Date().toISOString(),
      prediction: {
        weather,
        date: new Date().toISOString().split('T')[0],
        expectedOrders: predictions.totalOrders,
        peakHours: predictions.peakHours,
        deliveryDemand: demandMultiplier?.delivery ?
          Math.round(predictions.totalOrders * demandMultiplier.delivery * 0.4) :
          Math.round(predictions.totalOrders * weatherMultiplier * 0.4),
        dineInDemand: demandMultiplier?.dineIn ?
          Math.round(predictions.totalOrders * demandMultiplier.dineIn * 0.6) :
          Math.round(predictions.totalOrders * (1 - weatherMultiplier * 0.4)),
        reservations: reservations.length
      },
      inventoryAlerts,
      recommendations: {
        staffing: staffRecommendation,
        inventory: inventoryAlerts.length > 0,
        delivery: weatherMultiplier > 1,
        weather: weatherRecommendations
      },
      confidence: weatherData?.confidence || 0.88,
      responseTime: Date.now() - startTime
    });
  } catch (error) {
    waitronRequestsCounter.inc({ operation: 'twin', status: 'error' });
    logger.error('Twin prediction error:', error);
    res.status(500).json({ error: 'Failed to generate twin prediction' });
  }
});

// ============================================
// OWNER BRIEFING - 8:00 AM
// Morning summary for restaurant owner
// ============================================

/**
 * GET /api/briefing/:merchantId
 * Owner Briefing - Morning summary including:
 * - Yesterday's revenue
 * - Profit margin
 * - Food waste
 * - Top dishes
 * - Inventory alerts
 * - Recommended actions
 */
app.get('/api/briefing/:merchantId', async (req: Request, res: Response) => {
  const { merchantId } = req.params;
  const startTime = Date.now();

  try {
    // Fetch yesterday's data
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const [ordersRes, inventoryRes, dashboardRes] = await Promise.allSettled([
      axios.get(`${SERVICE_URLS.restaurant}/api/orders`, {
        params: { restaurantId: merchantId, date: yesterday },
        timeout: 5000
      }),
      axios.get(`${SERVICE_URLS.inventory}/api/inventory/alerts`, {
        params: { restaurantId: merchantId },
        timeout: 5000
      }),
      axios.get(`${SERVICE_URLS.analytics}/api/dashboard`, {
        params: { merchantId, date: yesterday },
        timeout: 5000
      })
    ]);

    const orders = ordersRes.status === 'fulfilled' ? ordersRes.value.data.orders || [] : [];
    const inventory = inventoryRes.status === 'fulfilled' ? inventoryRes.value.data : { alerts: [] };
    const dashboard = dashboardRes.status === 'fulfilled' ? dashboardRes.value.data : {};

    // Calculate metrics
    const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0;
    const foodCost = totalRevenue * 0.28;
    const laborCost = totalRevenue * 0.22;
    const profit = totalRevenue - foodCost - laborCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Calculate waste (mock)
    const waste = orders.length > 0 ? 2.1 : 0;

    // Top dishes
    const dishCounts: Record<string, number> = {};
    orders.forEach((o: any) => {
      (o.items || []).forEach((item: any) => {
        dishCounts[item.name] = (dishCounts[item.name] || 0) + (item.qty || 1);
      });
    });
    const topDish = Object.entries(dishCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Generate recommendations
    const recommendations = [];
    if (inventory.alerts?.length > 0) {
      recommendations.push({
        action: `Restock ${inventory.alerts[0].item}`,
        priority: 'high',
        type: 'inventory'
      });
    }
    if (profitMargin < 20) {
      recommendations.push({
        action: 'Review food costs to improve margin',
        priority: 'medium',
        type: 'cost'
      });
    }

    res.json({
      success: true,
      source: 'waitron-briefing',
      merchantId,
      greeting: 'Good morning!',
      timestamp: new Date().toISOString(),
      briefing: {
        yesterday: {
          revenue: totalRevenue,
          revenueFormatted: `₹${(totalRevenue / 100000).toFixed(2)} Lakhs`,
          profitMargin: profitMargin.toFixed(1),
          foodWaste: waste,
          orders: orders.length,
          topDish
        },
        alerts: inventory.alerts || [],
        recommendations,
        actions: recommendations.length
      },
      responseTime: Date.now() - startTime
    });
  } catch (error) {
    logger.error('Briefing error:', error);
    res.status(500).json({ error: 'Failed to generate briefing' });
  }
});

// ============================================
// REZ QR - 9:15 AM
// Customer identity via QR scan
// ============================================

/**
 * POST /api/qr/scan
 * REZ QR Scan - Identifies customer from table QR:
 * - Returns customer profile
 * - Karma/tier
 * - Visit history
 * - Favorite dishes
 * - AUTO ASSIGNS TABLE via QRTableConnector
 */
app.post('/api/qr/scan', async (req: Request, res: Response) => {
  const { qrCode, merchantId, tableId, customerId, partySize, preferences } = req.body;

  try {
    // Use QR Table Connector for full scan + table assignment
    const scanResult = await qrTableConnector.processScan({
      qrData: qrCode,
      customerId: customerId,
      partySize,
      preferences
    });

    if (!scanResult.success) {
      return res.status(400).json({
        success: false,
        error: scanResult.error || 'Failed to process QR scan',
        source: 'waitron-qr'
      });
    }

    // Enhance response with additional data
    const response = {
      success: true,
      source: 'waitron-qr',
      table: {
        id: scanResult.table?.id,
        number: scanResult.table?.tableNumber,
        name: scanResult.table?.tableName,
        merchantId: scanResult.table?.restaurantId,
        capacity: scanResult.table?.capacity,
        scanned: true,
        assigned: true,
        sessionId: scanResult.assignment?.sessionId
      },
      customer: scanResult.customer ? {
        id: scanResult.customer.id,
        name: scanResult.customer.name,
        karma: scanResult.customer.karma,
        tier: scanResult.customer.tier,
        visits: scanResult.customer.visits,
        favorites: scanResult.customer.favorites,
        lastVisit: scanResult.customer.lastVisit
      } : null,
      session: scanResult.assignment ? {
        id: scanResult.assignment.sessionId,
        partySize: scanResult.assignment.partySize,
        estimatedDuration: scanResult.assignment.estimatedSeatingTime,
        seatedAt: scanResult.assignment.assignedAt
      } : null,
      timestamp: scanResult.timestamp
    };

    // Also update customer memory
    if (customerId && scanResult.customer) {
      try {
        await axios.put(`${SERVICE_URLS.memory}/api/context/${customerId}`, {
          context: {
            lastVisit: {
              restaurantId: merchantId || scanResult.table?.restaurantId,
              tableId: scanResult.table?.id,
              timestamp: new Date().toISOString()
            }
          }
        });
      } catch (e) {
        logger.warn('Memory update failed');
      }
    }

    res.json(response);
  } catch (error) {
    logger.error('QR scan error:', error);
    res.status(500).json({ error: 'Failed to scan QR' });
  }
});

// ============================================
// ORDER MANAGEMENT - 9:20 AM
// Place and track orders
// ============================================

/**
 * POST /api/orders
 * Create order - Routes to appropriate services
 */
app.post('/api/orders', async (req: Request, res: Response) => {
  const { merchantId, tableId, customerId, items, type = 'dine-in' } = req.body;

  try {
    // Create order in restaurant service
    const orderRes = await axios.post(`${SERVICE_URLS.restaurant}/api/orders`, {
      restaurantId: merchantId,
      tableId,
      userId: customerId,
      items,
      type
    }, { timeout: 5000 });

    const order = orderRes.data;

    // Update inventory
    try {
      await axios.patch(`${SERVICE_URLS.inventory}/api/inventory/deduct`, {
        restaurantId: merchantId,
        items: items.map((i: any) => ({ itemId: i.id, qty: i.qty }))
      });
    } catch (e) {
      logger.warn('Inventory update failed');
    }

    // Update customer memory
    if (customerId) {
      try {
        await axios.put(`${SERVICE_URLS.memory}/api/context/${customerId}`, {
          context: {
            lastOrder: {
              restaurantId: merchantId,
              orderId: order.id,
              items: items.map((i: any) => i.name),
              timestamp: new Date().toISOString()
            }
          }
        });
      } catch (e) {
        logger.warn('Memory update failed');
      }
    }

    // Award karma
    if (customerId) {
      try {
        await axios.post(`${SERVICE_URLS.loyalty}/api/loyalty/points/earn`, {
          customerId,
          points: Math.floor(items.reduce((sum: number, i: any) => sum + (i.price * i.qty), 0)),
          reason: 'purchase'
        });
      } catch (e) {
        logger.warn('Karma award failed');
      }
    }

    waitronRequestsCounter.inc({ operation: 'order', status: 'success' });

    res.json({
      success: true,
      source: 'waitron-order',
      order: {
        ...order,
        estimatedTime: calculatePrepTime(items)
      }
    });
  } catch (error) {
    waitronRequestsCounter.inc({ operation: 'order', status: 'error' });
    logger.error('Order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * GET /api/orders/:orderId
 * Get order status
 */
app.get('/api/orders/:orderId', async (req: Request, res: Response) => {
  const { orderId } = req.params;

  try {
    const response = await axios.get(`${SERVICE_URLS.restaurant}/api/orders/${orderId}`, {
      timeout: 5000
    });
    res.json({
      success: true,
      source: 'waitron-order',
      ...response.data
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get order' });
  }
});

// ============================================
// PROCUREMENT - 10:00 AM
// Auto-reorder low stock items
// ============================================

/**
 * GET /api/procurement/:merchantId/alerts
 * Get procurement alerts - Low stock items
 */
app.get('/api/procurement/:merchantId/alerts', async (req: Request, res: Response) => {
  const { merchantId } = req.params;

  try {
    // Get inventory alerts
    const response = await axios.get(`${SERVICE_URLS.inventory}/api/inventory/alerts`, {
      params: { restaurantId: merchantId },
      timeout: 5000
    });

    const alerts = response.data.alerts || [];

    // If Nexha is available, get supplier quotes
    let suppliers: any[] = [];
    if (alerts.length > 0) {
      try {
        const itemNames = alerts.map((a: any) => a.item).join(',');
        const supplierRes = await axios.get(`${SERVICE_URLS.nexha}/api/suppliers/search`, {
          params: { query: itemNames },
          timeout: 5000
        });
        suppliers = supplierRes.data.suppliers || [];
      } catch (e) {
        logger.warn('Nexha supplier search failed');
      }
    }

    res.json({
      success: true,
      source: 'waitron-procurement',
      merchantId,
      alerts,
      suppliers,
      action: alerts.length > 0 ? 'Procurement recommended' : 'Stock levels OK',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

/**
 * POST /api/procurement/:merchantId/order
 * Create procurement order
 */
app.post('/api/procurement/:merchantId/order', async (req: Request, res: Response) => {
  const { merchantId } = req.params;
  const { items, supplierId, urgency = 'normal' } = req.body;

  try {
    // Create PO in inventory
    const poRes = await axios.post(`${SERVICE_URLS.inventory}/api/purchase-orders`, {
      restaurantId: merchantId,
      items,
      supplierId,
      urgency
    }, { timeout: 5000 });

    // Emit demand signal to Nexha
    try {
      await axios.post(`${SERVICE_URLS.nexha}/api/events/demand`, {
        merchantId,
        productName: items[0]?.name,
        quantity: items[0]?.quantity,
        urgency
      });
    } catch (e) {
      logger.warn('Nexha demand signal failed');
    }

    res.json({
      success: true,
      source: 'waitron-procurement',
      purchaseOrder: poRes.data
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create procurement order' });
  }
});

// ============================================
// OWNER DASHBOARD - 6:00 PM
// Evening intelligence view
// ============================================

/**
 * GET /api/dashboard/:merchantId
 * Owner Dashboard - Evening summary:
 * - Today's revenue
 * - Occupancy
 * - Top dishes
 * - Waste
 * - Recommended actions
 */
app.get('/api/dashboard/:merchantId', async (req: Request, res: Response) => {
  const { merchantId } = req.params;
  const startTime = Date.now();

  try {
    const today = new Date().toISOString().split('T')[0];

    // Fetch all data
    const [ordersRes, tablesRes, inventoryRes] = await Promise.allSettled([
      axios.get(`${SERVICE_URLS.restaurant}/api/orders`, {
        params: { restaurantId: merchantId, date: today },
        timeout: 5000
      }),
      axios.get(`${SERVICE_URLS.restaurant}/api/tables`, {
        params: { restaurantId: merchantId },
        timeout: 5000
      }),
      axios.get(`${SERVICE_URLS.inventory}/api/inventory`, {
        params: { restaurantId: merchantId },
        timeout: 5000
      })
    ]);

    const orders = ordersRes.status === 'fulfilled' ? ordersRes.value.data.orders || [] : [];
    const tables = tablesRes.status === 'fulfilled' ? tablesRes.value.data.tables || [] : [];
    const inventory = inventoryRes.status === 'fulfilled' ? inventoryRes.value.data.items || [] : [];

    // Calculate metrics
    const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    const occupiedTables = tables.filter((t: any) => t.status === 'occupied').length;
    const totalTables = tables.length || 1;
    const occupancy = (occupiedTables / totalTables) * 100;

    // Top dishes
    const dishCounts: Record<string, number> = {};
    orders.forEach((o: any) => {
      (o.items || []).forEach((item: any) => {
        dishCounts[item.name] = (dishCounts[item.name] || 0) + (item.qty || 1);
      });
    });
    const topDishes = Object.entries(dishCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Inventory alerts
    const alerts = inventory.filter((item: any) => item.currentStock < item.minStock);
    const waste = orders.length > 0 ? 2.1 : 0; // Mock

    res.json({
      success: true,
      source: 'waitron-dashboard',
      merchantId,
      timestamp: new Date().toISOString(),
      dashboard: {
        occupancy: occupancy.toFixed(0),
        satisfaction: 4.8, // Mock
        topDishes,
        waste: waste.toFixed(1),
        recommendations: [
          alerts.length > 0 ? { action: 'Restock items', priority: 'high' } : null,
          occupancy > 90 ? { action: 'Consider reservations for peak hours', priority: 'medium' } : null
        ].filter(Boolean)
      },
      responseTime: Date.now() - startTime
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// ============================================
// EXPANSION - 8:00 PM
// Sutar-powered business expansion
// ============================================

/**
 * POST /api/expand/:merchantId
 * Business Expansion - Opens new locations via RestaurantExpansionAgent:
 * - Finds locations (RisnaEstate)
 * - Hires staff (CorpPerks)
 * - Sets up suppliers (Nexha)
 * - Creates contracts (SUTAR)
 */
app.post('/api/expand/:merchantId', async (req: Request, res: Response) => {
  const { merchantId } = req.params;
  const { targetLocations = 10, timeline = '12 months', preferredCities, preferredAreas, budgetPerLocation } = req.body;

  try {
    logger.info('Starting expansion', { merchantId, targetLocations, timeline });

    // Use RestaurantExpansionAgent for full expansion planning
    const expansionPlan = await restaurantExpansionAgent.createExpansionPlan({
      merchantId,
      merchantName: 'Restaurant Owner', // Would come from merchant profile
      targetLocations,
      timeline,
      preferredCities,
      preferredAreas,
      budgetPerLocation
    });

    res.json({
      success: true,
      source: 'waitron-expansion',
      intentId: expansionPlan.goal.id,
      expansion: {
        goal: `Open ${targetLocations} restaurants`,
        timeline,
        progress: expansionPlan.goal.progress,
        phases: expansionPlan.phases.map(p => ({
          name: p.name,
          status: p.status,
          progress: p.progress,
          tasks: p.tasks.length,
          blockers: p.blockers
        })),
        topLocations: expansionPlan.locations.slice(0, 5).map((l) => ({
          id: l.id,
          area: l.area,
          locality: l.locality,
          rent: l.rent,
          footfall: l.footfall,
          score: l.score,
          pros: l.pros
        })),
        staffRequirements: expansionPlan.staffRequirements.map(s => ({
          role: s.role,
          count: s.count,
          salary: s.salary
        })),
        supplierSetup: expansionPlan.supplierSetup.map(s => ({
          category: s.category,
          required: s.required,
          suppliers: s.suppliers.length
        })),
        estimatedInvestment: expansionPlan.estimatedInvestment,
        estimatedRevenue: expansionPlan.estimatedRevenue,
        roi: expansionPlan.roi,
        timeline: {
          startDate: expansionPlan.timeline.startDate,
          endDate: expansionPlan.timeline.endDate,
          milestones: expansionPlan.timeline.milestones
        }
      }
    });
  } catch (error: any) {
    logger.error('Expansion error:', error);
    res.status(500).json({ error: 'Failed to start expansion: ' + error.message });
  }
});

/**
 * GET /api/expand/:merchantId/progress
 * Get expansion progress
 */
app.get('/api/expand/:merchantId/progress', async (req: Request, res: Response) => {
  const { merchantId } = req.params;
  const { goalId } = req.query;

  try {
    if (!goalId) {
      return res.status(400).json({ error: 'goalId required' });
    }

    const progress = await restaurantExpansionAgent.getExpansionProgress(goalId as string);

    if (!progress) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({
      success: true,
      ...progress
    });
  } catch (error: any) {
    logger.error('Expansion progress error:', error);
    res.status(500).json({ error: 'Failed to get expansion progress' });
  }
});

/**
 * POST /api/expand/:merchantId/execute
 * Execute next phase of expansion
 */
app.post('/api/expand/:merchantId/execute', async (req: Request, res: Response) => {
  const { merchantId } = req.params;
  const { goalId } = req.body;

  try {
    if (!goalId) {
      return res.status(400).json({ error: 'goalId required' });
    }

    const result = await restaurantExpansionAgent.executeNextPhase(goalId);

    res.json({
      success: result.success,
      phase: result.phase,
      message: result.message
    });
  } catch (error: any) {
    logger.error('Expansion execute error:', error);
    res.status(500).json({ error: 'Failed to execute expansion phase' });
  }
});

// ============================================
// GENIE DISCOVERY - Customer Discovery Flow
// Connects Genie (HOJAI AI) to restaurant recommendations
// ============================================

/**
 * GET /api/discover
 * Natural language restaurant discovery
 * Flow: Customer asks Genie → Waitron discovers restaurants
 */
app.get('/api/discover', async (req: Request, res: Response) => {
  const { query, userId, latitude, longitude, city } = req.query;

  try {
    if (!query) {
      return res.status(400).json({ error: 'query parameter required' });
    }

    const result = await genieRestaurantConnector.discoverRestaurants({
      userId: userId as string,
      query: query as string,
      location: latitude && longitude ? {
        latitude: parseFloat(latitude as string),
        longitude: parseFloat(longitude as string),
        city: city as string
      } : undefined,
      limit: 5
    });

    res.json({
      success: result.success,
      source: 'waitron-genie',
      recommendations: result.recommendations,
      totalFound: result.totalFound,
      personalized: result.personalized,
      timestamp: result.timestamp
    });
  } catch (error: any) {
    logger.error('Discovery error:', error);
    res.status(500).json({ error: 'Failed to discover restaurants' });
  }
});

/**
 * GET /api/restaurants/nearby
 * Find restaurants near a location
 */
app.get('/api/restaurants/nearby', async (req: Request, res: Response) => {
  const { latitude, longitude, limit = 10 } = req.query;

  try {
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude required' });
    }

    const result = await genieRestaurantConnector.discoverRestaurants({
      query: 'restaurants nearby',
      location: {
        latitude: parseFloat(latitude as string),
        longitude: parseFloat(longitude as string)
      },
      filters: { openNow: true },
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      source: 'waitron-nearby',
      restaurants: result.recommendations.map(r => r.restaurant),
      count: result.recommendations.length,
      timestamp: result.timestamp
    });
  } catch (error: any) {
    logger.error('Nearby restaurants error:', error);
    res.status(500).json({ error: 'Failed to find nearby restaurants' });
  }
});

/**
 * GET /api/restaurants/:id
 * Get restaurant details
 */
app.get('/api/restaurants/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { includeMenu = 'true' } = req.query;

  try {
    const restaurant = await genieRestaurantConnector.getRestaurantDetails(
      id,
      includeMenu === 'true'
    );

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({
      success: true,
      source: 'waitron-restaurant',
      restaurant
    });
  } catch (error: any) {
    logger.error('Restaurant details error:', error);
    res.status(500).json({ error: 'Failed to get restaurant details' });
  }
});

// ============================================
// WEALTH TRANSFER - Profit to Wealth Management
// Connects restaurant profits to AssetMind
// ============================================

/**
 * POST /api/wealth/transfer
 * Transfer daily profits to wealth management
 * Flow: Daily profit → AssetMind → Portfolio update + Investment
 */
app.post('/api/wealth/transfer', async (req: Request, res: Response) => {
  const { merchantId, restaurantId, revenue, foodCost, laborCost, otherCosts } = req.body;

  try {
    const grossProfit = revenue - foodCost - laborCost - (otherCosts || 0);
    const netProfit = grossProfit * 0.8;

    const profitData = {
      merchantId,
      restaurantId,
      restaurantName: 'Restaurant',
      date: new Date().toISOString().split('T')[0],
      revenue,
      foodCost,
      laborCost,
      otherCosts: otherCosts || 0,
      grossProfit,
      netProfit,
      profitMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      orderCount: 0,
      averageOrderValue: 0
    };

    const result = await assetMindConnector.transferDailyProfits({
      merchantId,
      restaurantId,
      profitData
    });

    res.json({
      success: result.success,
      source: 'waitron-wealth',
      transfer: result.transfer,
      portfolio: result.portfolio,
      recommendations: result.recommendations.slice(0, 3),
      message: result.message,
      timestamp: result.timestamp
    });
  } catch (error: any) {
    logger.error('Wealth transfer error:', error);
    res.status(500).json({ error: 'Failed to transfer profits' });
  }
});

/**
 * GET /api/wealth/summary/:merchantId
 * Get wealth summary for merchant
 */
app.get('/api/wealth/summary/:merchantId', async (req: Request, res: Response) => {
  const { merchantId } = req.params;

  try {
    const summary = await assetMindConnector.getWealthSummary(merchantId);

    if (!summary) {
      return res.status(404).json({ error: 'Wealth summary not found' });
    }

    res.json({
      success: true,
      source: 'waitron-wealth',
      summary
    });
  } catch (error: any) {
    logger.error('Wealth summary error:', error);
    res.status(500).json({ error: 'Failed to get wealth summary' });
  }
});

// ============================================
// CATERING - Corporate Catering Handler
// Handles corporate inquiries and RFQ generation
// ============================================

/**
 * POST /api/catering/inquiry
 * Handle corporate catering inquiry
 * Flow: HR Manager asks CoPilot → Waitron → Match restaurants → RFQ
 */
app.post('/api/catering/inquiry', async (req: Request, res: Response) => {
  const {
    companyName,
    contactName,
    contactEmail,
    contactPhone,
    eventType,
    eventDate,
    eventTime,
    partySize,
    budget,
    dietaryRequirements,
    cuisinePreference,
    location,
    deliveryRequired,
    setupRequired,
    additionalNotes
  } = req.body;

  try {
    const result = await cateringHandler.handleInquiry({
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      eventType: eventType || 'corporate_event',
      eventDate,
      eventTime,
      partySize,
      budget: budget ? { perPerson: budget.perPerson, total: budget.total, currency: 'INR' } : undefined,
      dietaryRequirements,
      cuisinePreference,
      location: {
        address: location?.address || location,
        city: location?.city || 'Bangalore',
        locality: location?.locality
      },
      deliveryRequired: deliveryRequired ?? true,
      setupRequired: setupRequired ?? false,
      additionalNotes
    });

    res.json({
      success: result.success,
      source: 'waitron-catering',
      inquiry: result.inquiry,
      matchedRestaurants: result.matchedRestaurants.slice(0, 5).map(r => ({
        id: r.restaurantId,
        name: r.restaurantName,
        rating: r.rating,
        matchScore: r.matchScore,
        reasons: r.matchReasons,
        priceRange: r.priceRange
      })),
      rfqCreated: result.rfqCreated,
      rfqId: result.rfqId,
      message: result.message,
      timestamp: result.timestamp
    });
  } catch (error: any) {
    logger.error('Catering inquiry error:', error);
    res.status(500).json({ error: 'Failed to process catering inquiry' });
  }
});

/**
 * POST /api/catering/nlp
 * Handle natural language catering request
 * Flow: "Find catering for 500 employees" → Parsed → Handled
 */
app.post('/api/catering/nlp', async (req: Request, res: Response) => {
  const { request, userId, userContext } = req.body;

  try {
    const result = await cateringHandler.handleNaturalLanguageRequest({
      request,
      userId,
      userContext
    });

    if (!result.understood) {
      return res.status(400).json({
        understood: false,
        message: 'Could not understand request',
        needsClarification: result.needsClarification
      });
    }

    if (result.needsClarification?.length) {
      return res.json({
        understood: true,
        needsClarification: result.needsClarification,
        parsedInquiry: result.inquiry,
        message: 'Please provide the following details'
      });
    }

    res.json({
      understood: true,
      inquiry: result.inquiry,
      result: result.result ? {
        success: result.result.success,
        matchedCount: result.result.matchedRestaurants.length,
        rfqCreated: result.result.rfqCreated
      } : null,
      message: 'Catering inquiry processed successfully'
    });
  } catch (error: any) {
    logger.error('Catering NLP error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateAvgOrders(yesterdayOrders: any[]): Record<string, number> {
  const hourCounts: Record<string, number> = {};

  yesterdayOrders.forEach((order: any) => {
    const hour = new Date(order.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  // Fill in missing hours
  for (let i = 10; i <= 22; i++) {
    if (!hourCounts[i]) hourCounts[i] = 0;
  }

  return hourCounts;
}

function generatePredictions(avgOrders: Record<string, number>, reservations: number, weatherMultiplier: number): any {
  const predictions = [];
  let totalOrders = 0;
  let peakHours: string[] = [];

  Object.entries(avgOrders).forEach(([hour, count]) => {
    const adjusted = Math.round(count * weatherMultiplier + reservations * 0.1);
    totalOrders += adjusted;
    predictions.push({ hour: `${hour}:00`, orders: adjusted });
    if (adjusted > 25) peakHours.push(`${hour}:00`);
  });

  return { totalOrders, peakHours, predictions };
}

function calculateStaffing(predictions: any): any {
  const avgOrders = predictions.totalOrders / predictions.predictions.length;
  return {
    chefs: Math.max(2, Math.ceil(avgOrders / 15)),
    servers: Math.max(3, Math.ceil(avgOrders / 10)),
    hosts: Math.max(1, Math.ceil(avgOrders / 30))
  };
}

function calculatePrepTime(items: any[]): number {
  const baseTimes: Record<string, number> = {
    biryani: 15, pizza: 12, burger: 8, salad: 5, dessert: 5, beverage: 2
  };

  return items.reduce((total, item) => {
    const category = item.category || 'default';
    return total + (baseTimes[category] || 10) * (item.qty || 1);
  }, 0);
}

// ============================================
// START SERVER
// ============================================

const PORT = parseInt(process.env.PORT || '4820');
app.listen(PORT, async () => {
  // Initialize integration hub
  const hubStatus = await integrationHub.initialize();

  logger.info(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   WAITRON - Restaurant OS for HOJAI                                          ║
║   "The Restaurant That Never Stopped Learning"                               ║
║                                                                              ║
║   Port: ${PORT}                                                               ║
║                                                                              ║
║   ┌─────────────────────────────────────────────────────────────────────┐       ║
║   │ INTEGRATED CONNECTORS                                              │       ║
║   ├─────────────────────────────────────────────────────────────────────┤       ║
║   │ ✅ Weather → BuzzLocal Weather Service                            │       ║
║   │ ✅ QR Scan → REZ Table QR Service                                 │       ║
║   │ ✅ Table Assignment → TableTwin                                   │       ║
║   │ ✅ Procurement → Nexha/Reorder Engine                            │       ║
║   │ ✅ Discovery → Genie Restaurant Connector                         │       ║
║   │ ✅ Catering → Corporate Catering Handler                         │       ║
║   │ ✅ Wealth → AssetMind Wealth Management                          │       ║
║   │ ✅ Expansion → Restaurant Expansion Agent (SUTAR/Risna/CorpPerks) │       ║
║   └─────────────────────────────────────────────────────────────────────┘       ║
║                                                                              ║
║   ┌─────────────────────────────────────────────────────────────────────┐       ║
║   │ ENDPOINTS                                                        │       ║
║   ├─────────────────────────────────────────────────────────────────────┤       ║
║   │ 7 AM   │ GET  /api/twin/:merchantId     - Demand Twin           │       ║
║   │ 8 AM   │ GET  /api/briefing/:merchantId  - Owner Briefing       │       ║
║   │ 9 AM   │ POST /api/qr/scan              - QR + Table Assign    │       ║
║   │ 9:20AM │ POST /api/orders               - Ordering             │       ║
║   │ 10 AM  │ GET  /api/procurement/alerts   - Auto-Procurement     │       ║
║   │ 6 PM   │ GET  /api/dashboard/:merchantId - Evening Dashboard   │       ║
║   │ 8 PM   │ POST /api/expand/:merchantId   - SUTAR Expansion     │       ║
║   │ 10 PM  │ POST /api/wealth/transfer     - Profit Transfer     │       ║
║   ├─────────────────────────────────────────────────────────────────────┤       ║
║   │ NEW     │ GET  /api/discover             - Genie Discovery      │       ║
║   │ NEW     │ POST /api/catering/inquiry     - Corporate Catering  │       ║
║   │ NEW     │ GET  /api/wealth/summary      - Wealth Summary      │       ║
║   └─────────────────────────────────────────────────────────────────────┘       ║
║                                                                              ║
║   Connector Status: ${hubStatus.connected.length}/${hubStatus.connected.length + hubStatus.failed.length} online                                           ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);
});

export default app;

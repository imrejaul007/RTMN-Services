import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { PropertySync } from '../services/propertySync';
import {
  PropertyProfile,
  PropertyFilter,
  PropertyStats,
  createPropertyProfile
} from '../models/PropertyProfile';

// In-memory storage for demo (replace with database in production)
const propertiesStore: Map<string, PropertyProfile> = new Map();

/**
 * Properties routes for RisnaEstate Integration
 */
export default function propertiesRoutes(
  customerOpsBridge: CustomerOpsBridge,
  propertySync: PropertySync
) {
  const router = Router();

  /**
   * GET /api/properties
   * List all properties with optional filters
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const filters: PropertyFilter = {
        status: req.query.status as PropertyProfile['status'],
        listingType: req.query.listingType as PropertyProfile['listingType'],
        propertyType: req.query.propertyType as any,
        city: req.query.city as string,
        state: req.query.state as string,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        minBedrooms: req.query.minBedrooms ? Number(req.query.minBedrooms) : undefined,
        maxBedrooms: req.query.maxBedrooms ? Number(req.query.maxBedrooms) : undefined,
        featured: req.query.featured === 'true',
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      };

      let properties = Array.from(propertiesStore.values());

      // Apply filters
      if (filters.status) {
        properties = properties.filter(p => p.status === filters.status);
      }
      if (filters.listingType) {
        properties = properties.filter(p => p.listingType === filters.listingType);
      }
      if (filters.propertyType) {
        properties = properties.filter(p => p.details.propertyType === filters.propertyType);
      }
      if (filters.city) {
        properties = properties.filter(p =>
          p.location.city.toLowerCase().includes(filters.city!.toLowerCase())
        );
      }
      if (filters.state) {
        properties = properties.filter(p =>
          p.location.state.toLowerCase().includes(filters.state!.toLowerCase())
        );
      }
      if (filters.minPrice) {
        properties = properties.filter(p => p.pricing.price >= filters.minPrice!);
      }
      if (filters.maxPrice) {
        properties = properties.filter(p => p.pricing.price <= filters.maxPrice!);
      }
      if (filters.minBedrooms) {
        properties = properties.filter(p =>
          (p.details.bedrooms || 0) >= filters.minBedrooms!
        );
      }
      if (filters.maxBedrooms) {
        properties = properties.filter(p =>
          (p.details.bedrooms || 0) <= filters.maxBedrooms!
        );
      }
      if (filters.featured !== undefined) {
        properties = properties.filter(p => p.featured === filters.featured);
      }

      // Sort
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      properties.sort((a, b) => {
        let aVal: any, bVal: any;
        if (sortBy === 'price') {
          aVal = a.pricing.price;
          bVal = b.pricing.price;
        } else if (sortBy === 'views') {
          aVal = a.analytics.views;
          bVal = b.analytics.views;
        } else if (sortBy === 'daysOnMarket') {
          aVal = a.analytics.daysOnMarket;
          bVal = b.analytics.daysOnMarket;
        } else {
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
        }
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const total = properties.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedProperties = properties.slice(offset, offset + limit);

      res.json({
        success: true,
        data: paginatedProperties,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch properties',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/properties/stats
   * Get property statistics
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const properties = Array.from(propertiesStore.values());

      const stats: PropertyStats = {
        totalListings: properties.length,
        activeListings: properties.filter(p => p.status === 'active').length,
        soldProperties: properties.filter(p => p.status === 'sold').length,
        pendingListings: properties.filter(p => p.status === 'pending').length,
        averagePrice: properties.length > 0
          ? properties.reduce((sum, p) => sum + p.pricing.price, 0) / properties.length
          : 0,
        medianPrice: 0,
        totalViews: properties.reduce((sum, p) => sum + p.analytics.views, 0),
        totalInquiries: properties.reduce((sum, p) => sum + p.analytics.inquiries, 0),
        totalSiteVisits: properties.reduce((sum, p) => sum + p.analytics.siteVisitRequests, 0),
        byType: {},
        byCity: {}
      };

      // Calculate median price
      const prices = properties.map(p => p.pricing.price).sort((a, b) => a - b);
      const mid = Math.floor(prices.length / 2);
      stats.medianPrice = prices.length > 0
        ? prices.length % 2 !== 0
          ? prices[mid]
          : (prices[mid - 1] + prices[mid]) / 2
        : 0;

      // Group by type
      properties.forEach(p => {
        const type = p.details.propertyType;
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });

      // Group by city
      properties.forEach(p => {
        const city = p.location.city;
        stats.byCity[city] = (stats.byCity[city] || 0) + 1;
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch property statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/properties/featured
   * Get featured properties
   */
  router.get('/featured', async (req: Request, res: Response) => {
    try {
      const featured = Array.from(propertiesStore.values())
        .filter(p => p.featured && p.status === 'active')
        .slice(0, 10);

      res.json({
        success: true,
        data: featured
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch featured properties',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/properties/:id
   * Get single property by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const property = propertiesStore.get(req.params.id);

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      // Increment view count
      property.analytics.views += 1;
      propertiesStore.set(property.id, property);

      res.json({
        success: true,
        data: property
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch property',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/properties
   * Create new property listing
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const propertyData = createPropertyProfile({
        ...req.body,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        analytics: {
          views: 0,
          inquiries: 0,
          siteVisitRequests: 0,
          daysOnMarket: 0,
          priceHistory: [{
            date: new Date().toISOString(),
            price: req.body.pricing?.price || 0,
            changeType: 'initial'
          }]
        }
      });

      propertiesStore.set(propertyData.id, propertyData);

      // Sync to Asset Twin
      try {
        const syncResult = await propertySync.syncPropertyToTwin(propertyData);
        if (syncResult.success) {
          propertyData.syncedToTwin = true;
          propertyData.twinSyncStatus = 'synced';
          propertyData.twinId = syncResult.twinId;
          propertiesStore.set(propertyData.id, propertyData);
        }
      } catch (syncError) {
        propertyData.syncedToTwin = false;
        propertyData.twinSyncStatus = 'failed';
        propertiesStore.set(propertyData.id, propertyData);
      }

      // Create Lead in Lead Twin
      if (propertyData.customerId) {
        await customerOpsBridge.createLeadFromProperty(propertyData);
      }

      res.status(201).json({
        success: true,
        data: propertyData,
        message: 'Property created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create property',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PUT /api/properties/:id
   * Update property listing
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const existingProperty = propertiesStore.get(req.params.id);

      if (!existingProperty) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      const updatedProperty: PropertyProfile = {
        ...existingProperty,
        ...req.body,
        id: existingProperty.id,
        listingId: existingProperty.listingId,
        createdAt: existingProperty.createdAt,
        updatedAt: new Date().toISOString(),
        syncedToTwin: existingProperty.syncedToTwin,
        twinId: existingProperty.twinId
      };

      // Track price changes
      if (req.body.pricing?.price && req.body.pricing.price !== existingProperty.pricing.price) {
        const priceChange = req.body.pricing.price > existingProperty.pricing.price ? 'increase' : 'decrease';
        updatedProperty.analytics.priceHistory.push({
          date: new Date().toISOString(),
          price: req.body.pricing.price,
          changeType: priceChange
        });
      }

      propertiesStore.set(updatedProperty.id, updatedProperty);

      // Re-sync to Asset Twin
      if (updatedProperty.syncedToTwin) {
        await propertySync.syncPropertyToTwin(updatedProperty);
      }

      res.json({
        success: true,
        data: updatedProperty,
        message: 'Property updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update property',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * DELETE /api/properties/:id
   * Delete property listing
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const property = propertiesStore.get(req.params.id);

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      // Remove from Asset Twin if synced
      if (property.twinId) {
        await propertySync.removePropertyFromTwin(property.twinId);
      }

      propertiesStore.delete(req.params.id);

      res.json({
        success: true,
        message: 'Property deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete property',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/properties/:id/sync
   * Manually sync property to Asset Twin
   */
  router.post('/:id/sync', async (req: Request, res: Response) => {
    try {
      const property = propertiesStore.get(req.params.id);

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      const syncResult = await propertySync.syncPropertyToTwin(property);

      if (syncResult.success) {
        property.syncedToTwin = true;
        property.twinSyncStatus = 'synced';
        property.twinId = syncResult.twinId;
        propertiesStore.set(property.id, property);
      }

      res.json({
        success: syncResult.success,
        data: {
          synced: syncResult.success,
          twinId: syncResult.twinId,
          message: syncResult.message
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to sync property',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/properties/:id/interest
   * Register interest in a property (creates inquiry)
   */
  router.post('/:id/interest', async (req: Request, res: Response) => {
    try {
      const property = propertiesStore.get(req.params.id);

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      property.analytics.inquiries += 1;
      propertiesStore.set(property.id, property);

      // Create inquiry and sync to Customer Twin
      const inquiry = {
        id: uuidv4(),
        propertyId: property.id,
        propertyTitle: property.title,
        customerName: req.body.customerName || 'Anonymous',
        customerEmail: req.body.customerEmail,
        customerPhone: req.body.customerPhone,
        message: req.body.message || 'Interested in this property',
        interestType: req.body.interestType || 'inquiry',
        createdAt: new Date().toISOString()
      };

      // Sync to Customer Twin
      await customerOpsBridge.createCustomerFromInquiry(property, inquiry);

      res.json({
        success: true,
        data: inquiry,
        message: 'Interest registered successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to register interest',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}

// Export the store for use in other routes
export { propertiesStore };

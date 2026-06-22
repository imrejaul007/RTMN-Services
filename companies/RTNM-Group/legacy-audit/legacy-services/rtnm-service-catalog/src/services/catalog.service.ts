import { v4 as uuidv4 } from 'uuid';
import { Service, IServiceDocument, IPricing, ISLA, IAPIEndpoint } from '../models/catalog.model';
import logger from '../utils/logger';

export interface ServiceInput {
  corpId: string;
  name: string;
  description: string;
  category: string;
  tags?: string[];
  pricing: IPricing;
  sla: ISLA;
  api?: IAPIEndpoint[];
  capabilities: string[];
  documentation?: {
    docsUrl?: string;
    changelogUrl?: string;
    supportUrl?: string;
  };
  version?: string;
}

export interface ServiceFilters {
  search?: string;
  category?: string;
  corpId?: string;
  status?: 'active' | 'deprecated' | 'maintenance' | 'inactive';
  pricingModel?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  capabilities?: string[];
  page?: number;
  limit?: number;
}

export interface ServiceSearchResult {
  services: IServiceDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class CatalogService {
  /**
   * Publish a new service to the catalog
   */
  async publishService(serviceData: ServiceInput): Promise<IServiceDocument> {
    try {
      const serviceId = `svc_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

      const service = new Service({
        ...serviceData,
        serviceId,
        status: 'active',
      });

      await service.save();
      logger.info(`Service published: ${serviceId} by corpId: ${serviceData.corpId}`);

      return service;
    } catch (error) {
      logger.error('Failed to publish service:', error);
      throw error;
    }
  }

  /**
   * Get a service by its ID
   */
  async getService(serviceId: string): Promise<IServiceDocument | null> {
    try {
      const service = await Service.findOne({ serviceId });
      if (!service) {
        logger.warn(`Service not found: ${serviceId}`);
      }
      return service;
    } catch (error) {
      logger.error(`Failed to get service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing service
   */
  async updateService(
    serviceId: string,
    updates: Partial<ServiceInput>
  ): Promise<IServiceDocument | null> {
    try {
      const service = await Service.findOneAndUpdate(
        { serviceId },
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!service) {
        logger.warn(`Service not found for update: ${serviceId}`);
        return null;
      }

      logger.info(`Service updated: ${serviceId}`);
      return service;
    } catch (error) {
      logger.error(`Failed to update service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a service
   */
  async deleteService(serviceId: string): Promise<boolean> {
    try {
      const result = await Service.deleteOne({ serviceId });
      if (result.deletedCount === 0) {
        logger.warn(`Service not found for deletion: ${serviceId}`);
        return false;
      }
      logger.info(`Service deleted: ${serviceId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Search services with filters
   */
  async searchServices(filters: ServiceFilters): Promise<ServiceSearchResult> {
    try {
      const {
        search,
        category,
        corpId,
        status,
        pricingModel,
        minPrice,
        maxPrice,
        tags,
        capabilities,
        page = 1,
        limit = 20,
      } = filters;

      const query: Record<string, unknown> = {};

      // Text search
      if (search) {
        query.$text = { $search: search };
      }

      // Category filter
      if (category) {
        query.category = category;
      }

      // Company filter
      if (corpId) {
        query.corpId = corpId;
      }

      // Status filter
      if (status) {
        query.status = status;
      } else {
        // Default to active services only
        query.status = 'active';
      }

      // Pricing model filter
      if (pricingModel) {
        query['pricing.model'] = pricingModel;
      }

      // Price range filter
      if (minPrice !== undefined || maxPrice !== undefined) {
        query['pricing.rate'] = {};
        if (minPrice !== undefined) {
          (query['pricing.rate'] as Record<string, number>).$gte = minPrice;
        }
        if (maxPrice !== undefined) {
          (query['pricing.rate'] as Record<string, number>).$lte = maxPrice;
        }
      }

      // Tags filter
      if (tags && tags.length > 0) {
        query.tags = { $in: tags };
      }

      // Capabilities filter
      if (capabilities && capabilities.length > 0) {
        query.capabilities = { $all: capabilities };
      }

      const skip = (page - 1) * limit;

      const [services, total] = await Promise.all([
        Service.find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        Service.countDocuments(query),
      ]);

      return {
        services: services as IServiceDocument[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to search services:', error);
      throw error;
    }
  }

  /**
   * Get all services for a company
   */
  async getCompanyServices(
    corpId: string,
    options?: { status?: string; page?: number; limit?: number }
  ): Promise<ServiceSearchResult> {
    try {
      const { status, page = 1, limit = 20 } = options || {};

      const query: Record<string, unknown> = { corpId };
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const [services, total] = await Promise.all([
        Service.find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        Service.countDocuments(query),
      ]);

      logger.info(`Retrieved ${services.length} services for corpId: ${corpId}`);

      return {
        services: services as IServiceDocument[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error(`Failed to get company services for ${corpId}:`, error);
      throw error;
    }
  }

  /**
   * Get services by category
   */
  async getServicesByCategory(
    category: string,
    options?: { status?: string; page?: number; limit?: number }
  ): Promise<ServiceSearchResult> {
    try {
      const { status = 'active', page = 1, limit = 20 } = options || {};

      const query: Record<string, unknown> = { category, status };
      const skip = (page - 1) * limit;

      const [services, total] = await Promise.all([
        Service.find(query)
          .skip(skip)
          .limit(limit)
          .sort({ 'pricing.rate': 1, name: 1 })
          .lean(),
        Service.countDocuments(query),
      ]);

      logger.info(`Retrieved ${services.length} services in category: ${category}`);

      return {
        services: services as IServiceDocument[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error(`Failed to get services by category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Get all unique categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const categories = await Service.distinct('category', { status: 'active' });
      return categories;
    } catch (error) {
      logger.error('Failed to get categories:', error);
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  async getStats(): Promise<{
    totalServices: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    byPricingModel: Record<string, number>;
  }> {
    try {
      const [totalServices, byCategory, byStatus, byPricingModel] =
        await Promise.all([
          Service.countDocuments({ status: 'active' }),
          Service.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
          ]),
          Service.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ]),
          Service.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$pricing.model', count: { $sum: 1 } } },
          ]),
        ]);

      return {
        totalServices,
        byCategory: byCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        byPricingModel: byPricingModel.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
      };
    } catch (error) {
      logger.error('Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * Check if service exists
   */
  async serviceExists(serviceId: string): Promise<boolean> {
    try {
      const count = await Service.countDocuments({ serviceId });
      return count > 0;
    } catch (error) {
      logger.error(`Failed to check service existence ${serviceId}:`, error);
      throw error;
    }
  }
}

export default new CatalogService();

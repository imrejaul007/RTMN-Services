// ============================================================================
// SUTAR Marketplace - Service Catalog Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { storage, COLLECTIONS } from './storage';
import { economyOS } from './economyOS';
import {
  Service,
  ServiceStatus,
  ServiceSearchParams,
  ServiceStatistics,
  ServiceFeature,
  ApiResponse,
  PaginationInfo,
} from './types';

export class ServiceCatalogService {
  // Create a new service
  public createService(data: {
    name: string;
    description: string;
    shortDescription?: string;
    provider: string;
    providerId: string;
    categoryId: string;
    category: string;
    subcategory?: string;
    price: number;
    currency?: string;
    priceType?: 'fixed' | 'per_user' | 'per_usage' | 'tiered';
    tags?: string[];
    images?: string[];
    thumbnail?: string;
    demoUrl?: string;
    documentationUrl?: string;
    supportUrl?: string;
    termsUrl?: string;
    privacyUrl?: string;
    features?: Omit<ServiceFeature, 'id'>[];
    requirements?: string[];
    metadata?: Record<string, unknown>;
  }): Service {
    const service: Service = {
      id: `service-${uuidv4()}`,
      name: data.name,
      description: data.description,
      shortDescription: data.shortDescription || data.description.substring(0, 160),
      provider: data.provider,
      providerId: data.providerId,
      categoryId: data.categoryId,
      category: data.category,
      subcategory: data.subcategory,
      price: data.price,
      currency: data.currency || 'INR',
      priceType: data.priceType || 'fixed',
      rating: 0,
      reviewCount: 0,
      downloadCount: 0,
      viewCount: 0,
      status: 'active',
      featured: false,
      trending: false,
      tags: data.tags || [],
      images: data.images || [],
      thumbnail: data.thumbnail || '',
      demoUrl: data.demoUrl,
      documentationUrl: data.documentationUrl,
      supportUrl: data.supportUrl,
      termsUrl: data.termsUrl,
      privacyUrl: data.privacyUrl,
      features: (data.features || []).map(f => ({
        id: `feature-${uuidv4()}`,
        ...f,
      })),
      requirements: data.requirements || [],
      metadata: data.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };

    storage.create(COLLECTIONS.SERVICES, service);
    console.log(`[SERVICE-CATALOG] Created service: ${service.id} - ${service.name}`);

    return service;
  }

  // Get service by ID
  public getService(id: string): Service | undefined {
    return storage.get<Service>(COLLECTIONS.SERVICES, id);
  }

  // Update service
  public updateService(id: string, updates: Partial<Service>): Service | undefined {
    const service = storage.get<Service>(COLLECTIONS.SERVICES, id);
    if (!service) return undefined;

    const updated: Service = {
      ...service,
      ...updates,
      id: service.id,
      createdAt: service.createdAt,
      updatedAt: new Date().toISOString(),
    };

    storage.update(COLLECTIONS.SERVICES, id, updated);
    console.log(`[SERVICE-CATALOG] Updated service: ${id}`);

    return updated;
  }

  // Delete service
  public deleteService(id: string): boolean {
    return storage.delete(COLLECTIONS.SERVICES, id);
  }

  // Search services
  public searchServices(params: ServiceSearchParams): {
    services: Service[];
    pagination: PaginationInfo;
  } {
    const {
      query,
      category,
      subcategory,
      tags,
      minPrice,
      maxPrice,
      minRating,
      status,
      featured,
      trending,
      provider,
      sortBy = 'rating',
      sortOrder = 'desc',
      limit = 50,
      offset = 0,
    } = params;

    let results = storage.getAll<Service>(COLLECTIONS.SERVICES);

    // Apply filters
    if (query) {
      const searchLower = query.toLowerCase();
      results = results.filter(
        s =>
          s.name.toLowerCase().includes(searchLower) ||
          s.description.toLowerCase().includes(searchLower) ||
          s.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }

    if (category) {
      results = results.filter(s => s.categoryId === category || s.category === category);
    }

    if (subcategory) {
      results = results.filter(s => s.subcategory === subcategory);
    }

    if (tags && tags.length > 0) {
      results = results.filter(s => tags.some(t => s.tags.includes(t)));
    }

    if (minPrice !== undefined) {
      results = results.filter(s => s.price >= minPrice);
    }

    if (maxPrice !== undefined) {
      results = results.filter(s => s.price <= maxPrice);
    }

    if (minRating !== undefined) {
      results = results.filter(s => s.rating >= minRating);
    }

    if (status) {
      results = results.filter(s => s.status === status);
    }

    if (featured !== undefined) {
      results = results.filter(s => s.featured === featured);
    }

    if (trending !== undefined) {
      results = results.filter(s => s.trending === trending);
    }

    if (provider) {
      results = results.filter(s => s.providerId === provider || s.provider === provider);
    }

    // Apply sorting
    results.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'newest':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'popular':
          comparison = a.viewCount - b.viewCount;
          break;
        case 'trending':
          comparison = a.downloadCount - b.downloadCount;
          break;
        default:
          comparison = a.rating - b.rating;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      services: paginatedResults,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  // Get featured services
  public getFeaturedServices(limit = 10): Service[] {
    const services = storage.getAll<Service>(COLLECTIONS.SERVICES);
    return services
      .filter(s => s.featured && s.status === 'active')
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  // Get trending services
  public getTrendingServices(limit = 10): Service[] {
    const services = storage.getAll<Service>(COLLECTIONS.SERVICES);
    return services
      .filter(s => s.trending && s.status === 'active')
      .sort((a, b) => b.downloadCount - a.downloadCount)
      .slice(0, limit);
  }

  // Get services by category
  public getServicesByCategory(categoryId: string, limit = 50, offset = 0): {
    services: Service[];
    total: number;
  } {
    const services = storage.getAll<Service>(COLLECTIONS.SERVICES);
    const filtered = services.filter(
      s => (s.categoryId === categoryId || s.category === categoryId) && s.status === 'active'
    );
    return {
      services: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }

  // Get services by provider
  public getServicesByProvider(providerId: string): Service[] {
    return storage.find<Service>(
      COLLECTIONS.SERVICES,
      s => s.providerId === providerId
    );
  }

  // Update service status
  public updateServiceStatus(id: string, status: ServiceStatus): Service | undefined {
    return this.updateService(id, { status });
  }

  // Toggle featured status
  public toggleFeatured(id: string): Service | undefined {
    const service = this.getService(id);
    if (!service) return undefined;
    return this.updateService(id, { featured: !service.featured });
  }

  // Toggle trending status
  public toggleTrending(id: string): Service | undefined {
    const service = this.getService(id);
    if (!service) return undefined;
    return this.updateService(id, { trending: !service.trending });
  }

  // Increment view count
  public incrementViewCount(id: string): void {
    const service = this.getService(id);
    if (service) {
      this.updateService(id, { viewCount: service.viewCount + 1 });
    }
  }

  // Increment download count
  public incrementDownloadCount(id: string): void {
    const service = this.getService(id);
    if (service) {
      this.updateService(id, { downloadCount: service.downloadCount + 1 });
    }
  }

  // Get service statistics
  public getServiceStatistics(serviceId: string): ServiceStatistics | undefined {
    const service = this.getService(serviceId);
    if (!service) return undefined;

    const orders = storage.find<any>(
      COLLECTIONS.ORDERS,
      o => o.items.some((item: any) => item.serviceId === serviceId)
    );

    const totalRevenue = orders.reduce((sum, order) => {
      const item = order.items.find((i: any) => i.serviceId === serviceId);
      return sum + (item ? item.totalPrice : 0);
    }, 0);

    const completedOrders = orders.filter(o => o.status === 'completed');
    const conversionRate = service.viewCount > 0
      ? (completedOrders.length / service.viewCount) * 100
      : 0;

    return {
      serviceId,
      views: service.viewCount,
      uniqueViews: Math.floor(service.viewCount * 0.7), // Estimate
      purchases: completedOrders.length,
      revenue: totalRevenue,
      averageRating: service.rating,
      reviewCount: service.reviewCount,
      conversionRate: Math.round(conversionRate * 100) / 100,
      favorites: storage.count(`${COLLECTIONS.FAVORITES}_${serviceId}`),
      cartAdds: 0, // Would need cart tracking
      abandons: 0,
    };
  }

  // Get all services (admin)
  public getAllServices(params: {
    status?: ServiceStatus;
    limit?: number;
    offset?: number;
  } = {}): { services: Service[]; total: number } {
    const { status, limit = 100, offset = 0 } = params;
    let services = storage.getAll<Service>(COLLECTIONS.SERVICES);

    if (status) {
      services = services.filter(s => s.status === status);
    }

    return {
      services: services.slice(offset, offset + limit),
      total: services.length,
    };
  }

  // Validate service
  public validateService(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 3) {
      errors.push('Name must be at least 3 characters');
    }

    if (!data.description || data.description.trim().length < 50) {
      errors.push('Description must be at least 50 characters');
    }

    if (!data.provider || !data.providerId) {
      errors.push('Provider information is required');
    }

    if (!data.categoryId || !data.category) {
      errors.push('Category is required');
    }

    if (data.price === undefined || data.price < 0) {
      errors.push('Price must be a non-negative number');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Duplicate service
  public duplicateService(id: string, newName: string): Service | undefined {
    const original = this.getService(id);
    if (!original) return undefined;

    return this.createService({
      name: newName,
      description: original.description,
      shortDescription: original.shortDescription,
      provider: original.provider,
      providerId: original.providerId,
      categoryId: original.categoryId,
      category: original.category,
      subcategory: original.subcategory,
      price: original.price,
      currency: original.currency,
      priceType: original.priceType,
      tags: [...original.tags],
      images: [...original.images],
      thumbnail: original.thumbnail,
      demoUrl: original.demoUrl,
      documentationUrl: original.documentationUrl,
      supportUrl: original.supportUrl,
      termsUrl: original.termsUrl,
      privacyUrl: original.privacyUrl,
      features: original.features.map(f => ({
        name: f.name,
        description: f.description,
        included: f.included,
        limit: f.limit,
        icon: f.icon,
      })),
      requirements: [...original.requirements],
      metadata: { ...original.metadata, duplicatedFrom: original.id },
    });
  }
}

// Singleton instance
export const serviceCatalog = new ServiceCatalogService();
// ============================================================================
// SUTAR Marketplace - Favorites Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { storage, COLLECTIONS } from './storage';
import { serviceCatalog } from './serviceCatalog';
import { Favorite } from './types';

export class FavoritesService {
  // Add service to favorites
  public addFavorite(userId: string, serviceId: string, notes?: string): {
    success: boolean;
    favorite?: Favorite;
    error?: string;
  } {
    // Check if service exists
    const service = serviceCatalog.getService(serviceId);
    if (!service) {
      return { success: false, error: 'Service not found' };
    }

    // Check if already favorited
    const existing = this.getFavorite(userId, serviceId);
    if (existing) {
      return { success: false, error: 'Service is already in favorites' };
    }

    const favorite: Favorite = {
      id: `fav-${uuidv4()}`,
      userId,
      serviceId,
      serviceName: service.name,
      serviceThumbnail: service.thumbnail,
      servicePrice: service.price,
      notes,
      createdAt: new Date().toISOString(),
    };

    storage.create(`${COLLECTIONS.FAVORITES}_${userId}`, favorite);
    console.log(`[FAVORITES] Added ${serviceId} to favorites for user ${userId}`);

    return { success: true, favorite };
  }

  // Remove from favorites
  public removeFavorite(userId: string, serviceId: string): boolean {
    const favorite = this.getFavorite(userId, serviceId);
    if (!favorite) {
      return false;
    }

    const deleted = storage.delete(`${COLLECTIONS.FAVORITES}_${userId}`, favorite.id);
    if (deleted) {
      console.log(`[FAVORITES] Removed ${serviceId} from favorites for user ${userId}`);
    }
    return deleted;
  }

  // Get favorite by user and service
  public getFavorite(userId: string, serviceId: string): Favorite | undefined {
    return storage.findOne<Favorite>(
      `${COLLECTIONS.FAVORITES}_${userId}`,
      f => f.serviceId === serviceId
    );
  }

  // Get all favorites for user
  public getFavorites(userId: string, params: {
    limit?: number;
    offset?: number;
  } = {}): { favorites: Favorite[]; total: number } {
    const { limit = 50, offset = 0 } = params;
    const favorites = storage.getAll<Favorite>(`${COLLECTIONS.FAVORITES}_${userId}`);

    // Sort by most recent
    favorites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      favorites: favorites.slice(offset, offset + limit),
      total: favorites.length,
    };
  }

  // Check if service is favorited
  public isFavorited(userId: string, serviceId: string): boolean {
    return !!this.getFavorite(userId, serviceId);
  }

  // Update favorite notes
  public updateFavoriteNotes(userId: string, serviceId: string, notes: string): Favorite | undefined {
    const favorite = this.getFavorite(userId, serviceId);
    if (!favorite) return undefined;

    storage.update(`${COLLECTIONS.FAVORITES}_${userId}`, favorite.id, { notes });
    return { ...favorite, notes };
  }

  // Get favorite count for a service
  public getServiceFavoriteCount(serviceId: string): number {
    // This would need to iterate through all users to count
    // For performance, we could maintain a separate counter
    let count = 0;
    const allFavorites = storage.getAll<any>(COLLECTIONS.FAVORITES);
    // Check metadata for serviceId
    // Note: This is a simplified implementation
    return count;
  }

  // Get most favorited services
  public getMostFavoritedServices(limit = 10): {
    serviceId: string;
    serviceName: string;
    favoriteCount: number;
  }[] {
    const serviceCounts = new Map<string, { name: string; count: number }>();
    const allServices = storage.getAll<Favorite>(COLLECTIONS.FAVORITES);

    allServices.forEach(fav => {
      const existing = serviceCounts.get(fav.serviceId) || { name: fav.serviceName, count: 0 };
      serviceCounts.set(fav.serviceId, {
        name: fav.serviceName,
        count: existing.count + 1,
      });
    });

    return Array.from(serviceCounts.entries())
      .map(([serviceId, data]) => ({
        serviceId,
        serviceName: data.name,
        favoriteCount: data.count,
      }))
      .sort((a, b) => b.favoriteCount - a.favoriteCount)
      .slice(0, limit);
  }

  // Clear all favorites for user
  public clearFavorites(userId: string): number {
    const favorites = storage.getAll<Favorite>(`${COLLECTIONS.FAVORITES}_${userId}`);
    const count = favorites.length;
    favorites.forEach(fav => {
      storage.delete(`${COLLECTIONS.FAVORITES}_${userId}`, fav.id);
    });
    console.log(`[FAVORITES] Cleared ${count} favorites for user ${userId}`);
    return count;
  }

  // Get favorite services with details
  public getFavoriteServices(userId: string, params: {
    limit?: number;
    offset?: number;
  } = {}): { services: any[]; total: number } {
    const { limit = 50, offset = 0 } = params;
    const favorites = storage.getAll<Favorite>(`${COLLECTIONS.FAVORITES}_${userId}`);

    const services = favorites
      .map(fav => {
        const service = serviceCatalog.getService(fav.serviceId);
        if (!service) return null;
        return {
          ...service,
          favoritedAt: fav.createdAt,
          favoriteNotes: fav.notes,
        };
      })
      .filter(Boolean);

    return {
      services: services.slice(offset, offset + limit) as any[],
      total: services.length,
    };
  }

  // Move favorite position
  public moveFavorite(userId: string, serviceId: string, newPosition: number): boolean {
    const favorites = this.getFavorites(userId);
    const favoriteIndex = favorites.favorites.findIndex(f => f.serviceId === serviceId);

    if (favoriteIndex === -1) return false;

    const favorite = favorites.favorites[favoriteIndex];
    favorites.favorites.splice(favoriteIndex, 1);
    favorites.favorites.splice(newPosition, 0, favorite);

    // Re-save all with new order (using createdAt as sort key)
    // Note: This is a simplified implementation
    return true;
  }

  // Get favorites by category
  public getFavoritesByCategory(userId: string): Record<string, Favorite[]> {
    const favorites = this.getFavorites(userId);
    const byCategory: Record<string, Favorite[]> = {};

    favorites.favorites.forEach(fav => {
      const service = serviceCatalog.getService(fav.serviceId);
      const category = service?.category || 'Uncategorized';

      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(fav);
    });

    return byCategory;
  }

  // Share favorites list (generate shareable link)
  public shareFavorites(userId: string): {
    shareId: string;
    url: string;
  } {
    const shareId = `share-${uuidv4()}`;
    const url = `/favorites/shared/${shareId}`;

    // Store share info
    storage.create(`${COLLECTIONS.FAVORITES}_shared`, {
      id: shareId,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });

    return { shareId, url };
  }

  // Get shared favorites
  public getSharedFavorites(shareId: string): {
    valid: boolean;
    favorites?: Favorite[];
    error?: string;
  } {
    const share = storage.get<any>(`${COLLECTIONS.FAVORITES}_shared`, shareId);
    if (!share) {
      return { valid: false, error: 'Share link not found' };
    }

    if (new Date(share.expiresAt) < new Date()) {
      return { valid: false, error: 'Share link has expired' };
    }

    const favorites = this.getFavorites(share.userId);
    return { valid: true, favorites: favorites.favorites };
  }
}

// Singleton instance
export const favoritesService = new FavoritesService();
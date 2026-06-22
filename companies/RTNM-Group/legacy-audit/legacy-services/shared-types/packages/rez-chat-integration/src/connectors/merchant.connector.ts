// ── Merchant Connector ──────────────────────────────────────────────────────────────
// Connects to rez-merchant-service

import axios, { AxiosInstance } from 'axios';

export interface MerchantSearchParams {
  query: string;
  category?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  limit?: number;
}

export interface MerchantSearchResult {
  merchants: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    address: string;
    rating: number;
    reviewCount: number;
    priceRange: string;
    images: string[];
    hours: string;
    isOpen: boolean;
    distance?: number;
  }>;
  total: number;
}

export interface MerchantDetails {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website?: string;
  images: string[];
  rating: number;
  reviewCount: number;
  priceRange: string;
  features: string[];
  hours: Array<{
    day: string;
    open: string;
    close: string;
    isOpen: boolean;
  }>;
  tables?: Array<{
    id: string;
    name: string;
    capacity: number;
    available: boolean;
  }>;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  isAvailable: boolean;
  isVeg: boolean;
  isBestSeller: boolean;
  prepTime?: number;
  calories?: number;
  allergens?: string[];
  dietary?: string[];
  variants?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  addOns?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}

export interface Menu {
  merchantId: string;
  merchantName: string;
  categories: string[];
  items: MenuItem[];
}

export interface ProductSearchResult {
  products: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    originalPrice?: number;
    category: string;
    images: string[];
    inStock: boolean;
    rating: number;
  }>;
  total: number;
}

export interface TableAvailability {
  date: string;
  time: string;
  partySize: number;
  availableSlots: Array<{
    time: string;
    tableCount: number;
  }>;
}

export class MerchantConnector {
  private client: AxiosInstance;

  constructor(config?: { baseUrl?: string; apiKey?: string }) {
    const baseURL = config?.baseUrl || process.env.MERCHANT_SERVICE_URL || 'https://rez-merchant-service.onrender.com';
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config?.apiKey && { 'x-api-key': config.apiKey }),
      },
    });
  }

  /**
   * Search merchants/restaurants
   */
  async search(params: MerchantSearchParams): Promise<MerchantSearchResult> {
    try {
      const response = await this.client.post('/v1/stores/search', {
        query: params.query,
        category: params.category,
        location: params.location,
        lat: params.latitude,
        lng: params.longitude,
        radiusKm: params.radiusKm,
        limit: params.limit || 20,
      });

      const stores = response.data.stores || response.data || [];

      return {
        merchants: stores.map((s: any) => ({
          id: s._id || s.id,
          name: s.name,
          category: s.category || s.type || 'General',
          description: s.description || '',
          address: s.address || '',
          rating: s.rating || 0,
          reviewCount: s.reviewCount || 0,
          priceRange: s.priceRange || '$$',
          images: s.images || s.image ? [s.image] : [],
          hours: this.formatHours(s.operatingHours),
          isOpen: s.isOpen ?? true,
          distance: s.distance,
        })),
        total: response.data.total || stores.length,
      };
    } catch (error: any) {
      console.error('[MerchantConnector] Search error:', error.message);
      return { merchants: [], total: 0 };
    }
  }

  /**
   * Get merchant details
   */
  async getMerchant(merchantId: string): Promise<MerchantDetails | null> {
    try {
      const response = await this.client.get(`/v1/stores/${merchantId}`);
      const s = response.data;

      return {
        id: s._id || s.id,
        name: s.name,
        description: s.description || '',
        category: s.category || s.type || 'General',
        address: s.address || '',
        city: s.city || '',
        phone: s.phone || s.contact || '',
        email: s.email || '',
        website: s.website,
        images: s.images || [],
        rating: s.rating || 0,
        reviewCount: s.reviewCount || 0,
        priceRange: s.priceRange || '$$',
        features: s.features || [],
        hours: this.parseHours(s.operatingHours),
        tables: s.tables,
      };
    } catch (error: any) {
      console.error('[MerchantConnector] Get merchant error:', error.message);
      return null;
    }
  }

  /**
   * Get merchant menu
   */
  async getMenu(merchantId: string, category?: string): Promise<Menu | null> {
    try {
      const response = await this.client.get(`/v1/stores/${merchantId}/menu`);
      const data = response.data;

      const items = (data.items || data.menu || []).map((item: any) => ({
        id: item._id || item.id,
        name: item.name,
        description: item.description || '',
        price: item.price || 0,
        category: item.category || 'General',
        image: item.image || item.images?.[0],
        isAvailable: item.isAvailable ?? item.inStock ?? true,
        isVeg: item.isVeg ?? item.veg ?? false,
        isBestSeller: item.isBestSeller || item.bestseller || false,
        prepTime: item.prepTime || item.preparationTime,
        calories: item.calories,
        allergens: item.allergens,
        dietary: item.dietary,
        variants: item.variants?.map((v: any) => ({
          id: v._id || v.id,
          name: v.name,
          price: v.price,
        })),
        addOns: item.addOns?.map((a: any) => ({
          id: a._id || a.id,
          name: a.name,
          price: a.price,
        })),
      }));

      const categories = [...new Set(items.map(i => i.category))];

      return {
        merchantId,
        merchantName: data.name || 'Restaurant',
        categories,
        items: category ? items.filter(i => i.category === category) : items,
      };
    } catch (error: any) {
      console.error('[MerchantConnector] Get menu error:', error.message);
      return null;
    }
  }

  /**
   * Search products within a merchant
   */
  async searchProducts(params: {
    merchantId: string;
    query: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  }): Promise<ProductSearchResult> {
    try {
      const response = await this.client.post(`/v1/stores/${params.merchantId}/products/search`, {
        query: params.query,
        category: params.category,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        inStock: params.inStock,
      });

      const products = response.data.products || response.data || [];

      return {
        products: products.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          description: p.description || '',
          price: p.price || 0,
          originalPrice: p.originalPrice || p.mrp,
          category: p.category || 'General',
          images: p.images || [],
          inStock: p.inStock ?? p.isAvailable ?? true,
          rating: p.rating || 0,
        })),
        total: response.data.total || products.length,
      };
    } catch (error: any) {
      console.error('[MerchantConnector] Search products error:', error.message);
      return { products: [], total: 0 };
    }
  }

  /**
   * Get product details
   */
  async getProduct(productId: string): Promise<any | null> {
    try {
      const response = await this.client.get(`/v1/products/${productId}`);
      return response.data;
    } catch (error: any) {
      console.error('[MerchantConnector] Get product error:', error.message);
      return null;
    }
  }

  /**
   * Check table availability at restaurant
   */
  async checkTableAvailability(params: {
    merchantId: string;
    date: string;
    time: string;
    partySize: number;
  }): Promise<TableAvailability | null> {
    try {
      const response = await this.client.post(`/v1/stores/${params.merchantId}/tables/availability`, {
        date: params.date,
        time: params.time,
        partySize: params.partySize,
      });

      const data = response.data;

      return {
        date: params.date,
        time: params.time,
        partySize: params.partySize,
        availableSlots: data.slots || data.availableSlots || [],
      };
    } catch (error: any) {
      console.error('[MerchantConnector] Check table availability error:', error.message);
      return null;
    }
  }

  /**
   * Reserve a table
   */
  async reserveTable(params: {
    merchantId: string;
    date: string;
    time: string;
    partySize: number;
    name: string;
    phone: string;
    occasion?: string;
    specialRequests?: string;
  }): Promise<{ reservationId: string; status: string; message: string } | null> {
    try {
      const response = await this.client.post(`/v1/stores/${params.merchantId}/reservations`, {
        date: params.date,
        time: params.time,
        partySize: params.partySize,
        customerName: params.name,
        phone: params.phone,
        occasion: params.occasion,
        specialRequests: params.specialRequests,
      });

      return {
        reservationId: response.data.id,
        status: 'confirmed',
        message: `Table reserved for ${params.partySize} on ${params.date} at ${params.time}`,
      };
    } catch (error: any) {
      console.error('[MerchantConnector] Reserve table error:', error.message);
      return null;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private formatHours(hours: any): string {
    if (!hours) return 'Hours not available';
    if (typeof hours === 'string') return hours;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(d => {
      const h = hours[d] || hours[d.toLowerCase()];
      if (!h) return `${d}: Closed`;
      return `${d}: ${h.open || '00:00'} - ${h.close || '23:59'}`;
    }).join(', ');
  }

  private parseHours(hours: any): Array<{ day: string; open: string; close: string; isOpen: boolean }> {
    if (!hours) return [];

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    return dayKeys.map((key, i) => {
      const h = hours[key] || hours[days[i]];
      return {
        day: days[i],
        open: h?.open || '00:00',
        close: h?.close || '23:59',
        isOpen: h?.isOpen ?? true,
      };
    });
  }
}

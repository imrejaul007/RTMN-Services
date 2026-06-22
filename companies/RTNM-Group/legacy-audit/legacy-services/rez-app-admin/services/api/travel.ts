/**
 * Travel Admin API Service
 *
 * CRUD operations for travel bookings, categories, and services
 * Uses endpoints at /api/admin/travel/*
 */

import { apiClient } from './apiClient';
import { Pagination } from '../../types';

// Local type aliases — use existing Pagination from rez-shared-types
export type PaginationMeta = Pagination;

export interface TravelApiResponse<T> {
  data?: T;
  error?: string;
}

/**
 * Unwraps backend double-nesting: the response payload may itself wrap data in a `data` key.
 * If inner is truthy and has a `data` key, we return that inner value; otherwise we return inner.
 */
function unwrapPayload<T>(inner: T | undefined): T | null {
  if (!inner) return null;
  if (typeof inner === 'object' && inner !== null && 'data' in inner) {
    return ((inner as unknown) as { data: T | null }).data ?? null;
  }
  return inner;
}

// Types
export interface TravelCategory {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  cashbackPercentage: number;
  maxCashback?: number;
  isActive: boolean;
  serviceCount?: number;
}

export interface TravelService {
  _id: string;
  name: string;
  description?: string;
  images: string[];
  pricing: {
    original: number;
    selling: number;
    discount?: number;
    currency: string;
  };
  ratings: {
    average: number;
    count: number;
  };
  serviceCategory: {
    _id: string;
    name: string;
    slug: string;
    icon: string;
    cashbackPercentage?: number;
  };
  store?: {
    _id: string;
    name: string;
    logo?: string;
  };
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
}

export interface TravelBooking {
  _id: string;
  bookingNumber: string;
  user: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
  };
  service: {
    _id: string;
    name: string;
    images?: string[];
  };
  serviceCategory: {
    _id: string;
    name: string;
    slug: string;
    icon: string;
  };
  store?: {
    _id: string;
    name: string;
  };
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  status: string;
  paymentStatus: string;
  pricing: {
    basePrice: number;
    total: number;
    cashbackEarned?: number;
    cashbackPercentage?: number;
    currency: string;
  };
  cashbackStatus: string;
  cashbackCreditedAt?: string;
  verificationDays?: number;
  pnr?: string;
  externalReference?: string;
  eTicketUrl?: string;
  travelDetails?: {
    route?: { from: string; to: string; fromCode?: string; toCode?: string };
    class?: string;
    passengers?: { adults: number; children: number; infants?: number };
    tripType?: string;
  };
  refundPolicy?: {
    tiers: Array<{ hoursBeforeDeparture: number; refundPercentage: number }>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TravelDashboardStats {
  totalBookings: number;
  statusCounts: Record<string, number>;
  revenue: {
    total: number;
    average: number;
  };
  cashback: Record<string, { count: number; amount: number }>;
  revenueByCategory: Array<{
    categoryId: string;
    categoryName: string;
    categorySlug: string;
    revenue: number;
    bookingCount: number;
  }>;
  categories: TravelCategory[];
  recentBookings: TravelBooking[];
}

// PaginatedResponse imported from rez-shared via types/index.ts
export type { PaginatedResponse } from '../../types';

class TravelAdminService {
  // ==================== DASHBOARD ====================

  async getDashboard(): Promise<TravelDashboardStats | null> {
    const response = await apiClient.get<TravelDashboardStats>('/admin/travel/dashboard');
    return unwrapPayload(response.data);
  }

  // ==================== CATEGORIES ====================

  async getCategories(): Promise<TravelCategory[] | null> {
    const response = await apiClient.get<TravelCategory[]>('/admin/travel/categories');
    return unwrapPayload(response.data);
  }

  async updateCategory(id: string, data: Partial<TravelCategory>): Promise<TravelCategory | null> {
    const response = await apiClient.put<TravelCategory>(`/admin/travel/categories/${id}`, data);
    return unwrapPayload(response.data);
  }

  // ==================== SERVICES ====================

  async getServices(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    isActive?: string;
  }): Promise<{ services: TravelService[]; pagination: PaginationMeta | null } | null> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.isActive) queryParams.append('isActive', params.isActive);

    const url = `/admin/travel/services${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get<{ services: TravelService[]; pagination: PaginationMeta }>(url);
    const inner = unwrapPayload(response.data);
    if (!inner) return null;
    return {
      services: inner.services ?? [],
      pagination: inner.pagination ?? null,
    };
  }

  async updateService(id: string, data: Partial<TravelService>): Promise<TravelService | null> {
    const response = await apiClient.put<TravelService>(`/admin/travel/services/${id}`, data);
    return unwrapPayload(response.data);
  }

  // ==================== BOOKINGS ====================

  async getBookings(params?: {
    page?: number;
    limit?: number;
    status?: string;
    cashbackStatus?: string;
    category?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ bookings: TravelBooking[]; pagination: PaginationMeta | null } | null> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.status) queryParams.append('status', params.status);
    if (params?.cashbackStatus) queryParams.append('cashbackStatus', params.cashbackStatus);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);

    const url = `/admin/travel/bookings${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get<{ bookings: TravelBooking[]; pagination: PaginationMeta }>(url);
    const inner = unwrapPayload(response.data);
    if (!inner) return null;
    return {
      bookings: inner.bookings ?? [],
      pagination: inner.pagination ?? null,
    };
  }

  async getBookingById(id: string): Promise<TravelBooking | null> {
    const response = await apiClient.get<TravelBooking>(`/admin/travel/bookings/${id}`);
    return unwrapPayload(response.data);
  }

  async updateBookingStatus(id: string, status: string): Promise<TravelBooking | null> {
    const response = await apiClient.put<TravelBooking>(`/admin/travel/bookings/${id}/status`, { status });
    return unwrapPayload(response.data);
  }

  async overrideCashback(id: string, action: 'credit' | 'clawback'): Promise<TravelBooking | null> {
    const response = await apiClient.put<TravelBooking>(`/admin/travel/bookings/${id}/cashback`, { action });
    return unwrapPayload(response.data);
  }

  async updateBookingPnr(
    id: string,
    data: {
      pnr?: string;
      eTicketUrl?: string;
      externalReference?: string;
    }
  ): Promise<TravelBooking | null> {
    const response = await apiClient.put<TravelBooking>(`/admin/travel/bookings/${id}/pnr`, data);
    return unwrapPayload(response.data);
  }
}

export const travelAdminService = new TravelAdminService();

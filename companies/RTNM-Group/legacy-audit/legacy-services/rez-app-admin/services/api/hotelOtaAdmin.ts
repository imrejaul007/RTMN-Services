/**
 * Hotel OTA Admin API service
 *
 * SECURITY: All OTA admin calls are proxied through the backend
 * (admin/ota/*) instead of calling the external OTA API directly.
 * The OTA admin secret is stored server-side only.
 */

import { apiClient } from './apiClient';

export interface OtaAdminHotel {
  id: string;
  name: string;
  city: string;
  starRating: number;
  brandCoinEnabled: boolean;
  brandCoinName: string | null;
  brandCoinSymbol: string | null;
  totalBrandCoinLiabilityPaise: number;
  activeBookings: number;
  totalRevenuePaise: number;
  isActive: boolean;
}

export interface OtaAdminOverview {
  totalHotels: number;
  activeHotels: number;
  activeBookings: number;
  gmvTodayPaise: number;
  brandCoinTotalLiabilityPaise: number;
}

export async function getOtaAdminOverview(): Promise<OtaAdminOverview> {
  const res = await apiClient.get<any>('admin/ota/overview');
  if (!res.success) {
    throw new Error((res as any).error || res.message || 'Failed to fetch OTA admin overview');
  }
  const d = res.data ?? {};
  return {
    totalHotels: d.active_hotels ?? d.totalHotels ?? 0,
    activeHotels: d.active_hotels ?? d.activeHotels ?? 0,
    activeBookings: d.active_bookings ?? d.activeBookings ?? 0,
    gmvTodayPaise: d.gmv_today_paise ?? d.gmvTodayPaise ?? 0,
    brandCoinTotalLiabilityPaise:
      d.coin_liability_paise?.hotel_brand_coin ?? d.brandCoinTotalLiabilityPaise ?? 0,
  };
}

export async function getOtaAdminHotels(params?: {
  page?: number;
  status?: string;
}): Promise<{ hotels: OtaAdminHotel[]; total: number }> {
  const q = new URLSearchParams(
    Object.entries(params ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  const endpoint = `admin/ota/hotels${q ? `?${q}` : ''}`;
  const res = await apiClient.get<any>(endpoint);
  if (!res.success) {
    throw new Error((res as any).error || res.message || 'Failed to fetch OTA admin hotels');
  }
  const d = res.data ?? {};

  const hotels: OtaAdminHotel[] = (d.hotels ?? []).map((h: any) => ({
    id: h.id,
    name: h.name,
    city: h.city ?? '',
    starRating: h.starRating ?? h.star_rating ?? 0,
    brandCoinEnabled: h.brandCoinEnabled ?? h.brand_coin_enabled ?? false,
    brandCoinName: h.brandCoinName ?? h.brand_coin_name ?? null,
    brandCoinSymbol: h.brandCoinSymbol ?? h.brand_coin_symbol ?? null,
    totalBrandCoinLiabilityPaise: 0,
    activeBookings: 0,
    totalRevenuePaise: 0,
    isActive: h.onboardingStatus === 'active' || h.onboarding_status === 'active',
  }));

  return { hotels, total: d.total ?? hotels.length };
}

export async function toggleHotelBrandCoin(hotelId: string, enabled: boolean): Promise<void> {
  // Backend uses POST (not PATCH) for this endpoint
  const res = await apiClient.post<any>(`admin/ota/hotels/${hotelId}/brand-coin`, { enabled });
  if (!res.success) {
    throw new Error((res as any).error || res.message || 'Failed to toggle hotel brand coin');
  }
}

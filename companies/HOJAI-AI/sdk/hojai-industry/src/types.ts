/**
 * Common Industry OS types
 *
 * Many of the 24 Industry OS services share a common template surface
 * (menu/orders/tables/customers). The types here describe the common
 * shape — industries that have richer surfaces define their own
 * industry-specific types in their own files.
 */

/**
 * Each Industry OS exposes its API at a known port. The SDK defaults to
 * the documented port from the master plan, but you can override via the
 * HojaiConfig.baseUrl or by setting per-industry base paths.
 */
export const INDUSTRY_PORTS: Record<string, number> = {
  restaurant: 5010,
  hotel: 5025,
  healthcare: 5020,
  retail: 5030,
  legal: 5035,
  education: 5060,
  agriculture: 5070,
  automotive: 5080,
  beauty: 5090,
  fashion: 5095,
  fitness: 5110,
  gaming: 5120,
  government: 5130,
  homeServices: 5140,
  manufacturing: 5150,
  nonProfit: 5160,
  professional: 5170,
  sports: 5180,
  travel: 5190,
  entertainment: 5200,
  construction: 5210,
  financial: 5220,
  realEstate: 5230,
  transport: 5240,
  eventBanquet: 4751,
  exhibition: 5040,
};

/**
 * Sub-path each industry serves under. Most industries are at the root
 * (`/api/...`); the two newer ones (event-banquet, exhibition) live at
 * the RTMN root path and use `/api/events/...` and `/api/exhibitions/...`
 * respectively.
 */
export const INDUSTRY_PATH_PREFIX: Record<string, string> = {
  eventBanquet: '/api/events',
  exhibition: '/api/exhibitions',
};

/* ─────────── Common template-shape entities ─────────── */

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: { amount: number; currency: string };
  category?: string;
  available: boolean;
  metadata?: Record<string, unknown>;
}

export interface Order {
  id: string;
  /** Industry-specific — table for restaurant, room for hotel, etc. */
  reference?: string;
  customerId?: string;
  items: Array<{ menuItemId?: string; serviceId?: string; productId?: string; quantity: number; unitPrice: { amount: number; currency: string } }>;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  total: { amount: number; currency: string };
  createdAt: string;
  updatedAt: string;
}

export interface Table {
  id: string;
  /** Restaurant/venue identifier (e.g. 'T1', 'Banquet A') */
  name: string;
  capacity: number;
  /** 'available' | 'reserved' | 'occupied' | 'cleaning' */
  status: 'available' | 'reserved' | 'occupied' | 'cleaning';
  location?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  /** Loyalty / reward points */
  points: number;
  visits: number;
  createdAt: string;
}

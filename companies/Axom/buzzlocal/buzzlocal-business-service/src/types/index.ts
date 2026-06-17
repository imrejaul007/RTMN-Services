/**
 * BuzzLocal Business Service - Types
 *
 * Local business discovery, offers, reviews
 */

// ============================================
// Business
// ============================================

export interface LocalBusiness {
  id: string;
  name: string;
  description?: string;
  type: string;
  category: string;
  subcategory?: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    area: string;
    city: string;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  hours: {
    [day: string]: { open: string; close: string; closed?: boolean };
  };
  isOpen: boolean;
  rating: number;
  reviewCount: number;
  priceRange?: 'budget' | 'moderate' | 'expensive' | 'premium';
  images: string[];
  amenities?: string[];
  verified: boolean;
  ownerId?: string;
  createdAt: string;
}

// ============================================
// Review
// ============================================

export interface Review {
  id: string;
  businessId: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    reviewsCount: number;
  };
  rating: number;
  title?: string;
  content: string;
  images?: string[];
  service?: 'dine-in' | 'delivery' | 'pickup' | 'takeout';
  visitDate?: string;
  upvotes: number;
  downvotes: number;
  replies?: ReviewReply[];
  createdAt: string;
}

export interface ReviewReply {
  id: string;
  author: {
    id: string;
    name: string;
    type: 'user' | 'business';
  };
  content: string;
  createdAt: string;
}

// ============================================
// Offer
// ============================================

export interface LocalOffer {
  id: string;
  businessId: string;
  business: {
    id: string;
    name: string;
    logo?: string;
    rating: number;
  };
  title: string;
  description: string;
  type: 'discount' | 'bogo' | 'cashback' | 'free_delivery' | 'combo';
  discount: number;
  discountType: 'percentage' | 'flat' | 'bogo' | 'free_item';
  minOrder?: number;
  maxDiscount?: number;
  code?: string;
  url?: string;
  validFrom: string;
  validUntil: string;
  terms?: string;
  claimCount: number;
  viewCount: number;
  images?: string[];
  status: 'active' | 'expired' | 'paused';
  createdAt: string;
}

// ============================================
// Photos
// ============================================

export interface BusinessPhoto {
  id: string;
  businessId: string;
  url: string;
  caption?: string;
  author: {
    id: string;
    name: string;
  };
  likes: number;
  comments: number;
  createdAt: string;
}

// ============================================
// Q&A
// ============================================

export interface Question {
  id: string;
  businessId: string;
  author: {
    id: string;
    name: string;
  };
  question: string;
  answer?: {
    content: string;
    author: {
      id: string;
      name: string;
      type: 'business' | 'user';
    };
    createdAt: string;
  };
  upvotes: number;
  createdAt: string;
}

// ============================================
// Search
// ============================================

export interface SearchFilters {
  query?: string;
  category?: string;
  area?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  openNow?: boolean;
  priceRange?: string[];
  ratingMin?: number;
  sortBy?: 'distance' | 'rating' | 'reviews' | 'popularity';
  limit?: number;
  offset?: number;
}

// Universal Signal Types for ALL Apps

export interface UniversalSignal {
  id: string;
  userId: string;

  // Universal fields
  type: SignalType;
  action: string;
  data: SignalData;
  timestamp: Date;
  source: AppSource;

  // Context
  context?: {
    location?: string;
    device?: string;
    platform?: 'ios' | 'android' | 'web';
    sessionId?: string;
  };
}

export type SignalType =
  // Hotel
  | 'hotel.search'
  | 'hotel.view'
  | 'hotel.book'
  | 'hotel.cancel'
  | 'hotel.checkin'
  | 'hotel.checkout'
  | 'hotel.review'
  | 'hotel.service'

  // Restaurant
  | 'restaurant.search'
  | 'restaurant.order'
  | 'restaurant.review'

  // Salon
  | 'salon.search'
  | 'salon.book'
  | 'salon.review'

  // Rendez
  | 'rendez.search'
  | 'rendez.date'
  | 'rendez.moment'

  // Corporate
  | 'corporate.book'
  | 'corporate.approve'

  // Wallet
  | 'wallet.recharge'
  | 'wallet.spend'
  | 'wallet.earn'

  // General
  | 'auth.login'
  | 'auth.signup'
  | 'profile.update'
  | 'feedback.submit';

export type AppSource =
  | 'consumer-app'
  | 'merchant-app'
  | 'hotel-app'
  | 'rendez-app'
  | 'corpspark-app'
  | 'rez-mind'
  | 'rez-knowledge';

// Signal data types
export interface HotelSignalData {
  hotelId?: string;
  roomTypeId?: string;
  bookingId?: string;
  amount?: number;
  rating?: number;
  city?: string;
}

export interface RestaurantSignalData {
  storeId?: string;
  orderId?: string;
  amount?: number;
  cuisine?: string[];
}

export interface RendezSignalData {
  activityId?: string;
  dateType?: string;
  participants?: number;
}

export interface CorporateSignalData {
  bookingId?: string;
  companyId?: string;
  amount?: number;
  approved?: boolean;
}

export type SignalData = HotelSignalData | RestaurantSignalData | RendezSignalData | CorporateSignalData;

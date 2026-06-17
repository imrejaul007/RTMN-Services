export interface GuestProfile {
  id: string;
  customerTwinId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  nationality?: string;
  preferences: GuestPreferences;
  stayHistory: StayHistory[];
  diningHistory: DiningHistory[];
  totalStays: number;
  totalSpent: number;
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  vipStatus: boolean;
  specialNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuestPreferences {
  roomTypes: string[];
  dietaryRestrictions: string[];
  preferredCuisines: string[];
  amenities: string[];
  pillowType?: string;
  bedConfiguration?: 'single' | 'double' | 'twin' | 'king';
  smokingPreference?: 'smoking' | 'non-smoking';
  floorPreference?: 'low' | 'high' | 'any';
  earlyCheckIn?: boolean;
  lateCheckOut?: boolean;
}

export interface StayHistory {
  id: string;
  propertyId: string;
  propertyName: string;
  roomId: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalAmount: number;
  status: 'completed' | 'cancelled' | 'in-progress';
  purpose?: 'business' | 'leisure' | 'event';
  rating?: number;
  feedback?: string;
}

export interface DiningHistory {
  id: string;
  restaurantId: string;
  restaurantName: string;
  orderId: string;
  date: string;
  items: string[];
  totalAmount: number;
  rating?: number;
  feedback?: string;
}

export interface HotelBooking {
  id: string;
  assetTwinId?: string;
  guestId: string;
  guestName: string;
  guestEmail: string;
  propertyId: string;
  propertyName: string;
  roomId: string;
  roomType: string;
  roomNumber?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children?: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: 'pending' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';
  source: 'direct' | 'booking.com' | 'airbnb' | 'walk-in' | 'ota';
  specialRequests?: string[];
  addOns: BookingAddOn[];
  createdAt: string;
  updatedAt: string;
}

export interface BookingAddOn {
  id: string;
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface RestaurantOrder {
  id: string;
  orderTwinId?: string;
  guestId?: string;
  tableId: string;
  tableName?: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  tip?: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'partial';
  paymentMethod?: 'cash' | 'card' | 'digital' | 'room-charge';
  status: 'open' | 'preparing' | 'ready' | 'served' | 'closed' | 'cancelled';
  orderType: 'dine-in' | 'takeout' | 'delivery' | 'room-service';
  guestNotes?: string;
  rating?: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers?: string[];
  specialInstructions?: string;
}

export interface ServiceRequest {
  id: string;
  ticketTwinId?: string;
  guestId: string;
  bookingId?: string;
  propertyId: string;
  roomId: string;
  category: 'housekeeping' | 'maintenance' | 'concierge' | 'room-service' | 'laundry' | 'restaurant' | 'spa' | 'transport';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  assignedTo?: string;
  resolution?: string;
  guestSatisfaction?: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface Review {
  id: string;
  feedbackTwinId?: string;
  guestId: string;
  guestName: string;
  propertyId: string;
  propertyName: string;
  bookingId?: string;
  restaurantId?: string;
  type: 'hotel' | 'restaurant' | 'service' | 'experience';
  rating: number;
  title?: string;
  content: string;
  pros?: string[];
  cons?: string[];
  wouldRecommend: boolean;
  status: 'pending' | 'published' | 'responded' | 'flagged';
  ownerResponse?: string;
  ownerRespondedAt?: string;
  helpful: number;
  createdAt: string;
}

export interface Experience {
  id: string;
  guestId: string;
  guestName: string;
  journeyId?: string;
  propertyId: string;
  propertyName: string;
  touchpoints: ExperienceTouchpoint[];
  overallSatisfaction: number;
  netPromoterScore?: number;
  journeyStage: 'pre-arrival' | 'check-in' | 'stay' | 'check-out' | 'post-stay';
  painPoints: string[];
  highlights: string[];
  recommendations: string[];
  createdAt: string;
}

export interface ExperienceTouchpoint {
  name: string;
  category: 'booking' | 'check-in' | 'room' | 'dining' | 'amenities' | 'service' | 'check-out';
  rating: number;
  notes?: string;
  timestamp?: string;
}

export interface PropertyInfo {
  id: string;
  name: string;
  type: 'hotel' | 'resort' | 'inn' | 'homestay' | 'villa';
  brand?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  contact: {
    phone: string;
    email: string;
  };
  amenities: string[];
  rating: number;
  totalRooms: number;
  availableRooms: number;
  operatingSince: string;
}

export interface HospitalityStats {
  totalGuests: number;
  activeGuests: number;
  vipGuests: number;
  totalBookings: number;
  activeBookings: number;
  totalRevenue: number;
  averageRating: number;
  occupancyRate: number;
  revPAR: number;
}

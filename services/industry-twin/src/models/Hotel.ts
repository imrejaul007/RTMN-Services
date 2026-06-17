import mongoose, { Document, Schema } from 'mongoose';

// Hotel-specific entity types
export type HotelType = 'luxury' | 'boutique' | 'business' | 'resort' | 'budget' | 'extended_stay' | 'hostel';
export type RoomType = 'standard' | 'deluxe' | 'suite' | 'executive' | 'presidential' | 'studio' | 'penthouse';

// Room inventory
export interface HotelRoom {
  roomId: string;
  roomNumber: string;
  floor: number;
  type: RoomType;
  bedConfiguration: 'single' | 'double' | 'twin' | 'queen' | 'king' | 'suite';
  maxOccupancy: number;
  baseRate: number;
  currentRate: number;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_order';
  amenities: string[];
  view: 'city' | 'ocean' | 'garden' | 'pool' | 'mountain' | 'courtyard';
  size: number;
}

// Housekeeping status
export interface HousekeepingTask {
  taskId: string;
  roomId: string;
  roomNumber: string;
  status: 'pending' | 'in_progress' | 'completed' | 'inspected';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  type: 'checkout' | 'stayover' | 'deep_clean' | 'turndown';
  assignedTo?: string;
  estimatedTime: number;
  startTime?: Date;
  completedTime?: Date;
  notes?: string;
}

// Guest profile
export interface HotelGuest {
  guestId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  totalStays: number;
  totalSpent: number;
  preferences: string[];
  specialRequests: string[];
  vip: boolean;
}

// Booking/Reservation
export interface HotelBooking {
  bookingId: string;
  guestId: string;
  roomId?: string;
  roomNumber?: string;
  checkIn: Date;
  checkOut: Date;
  roomType: RoomType;
  guestCount: number;
  totalAmount: number;
  amountPaid: number;
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  source: 'direct' | 'ota' | 'corporate' | 'travel_agent' | 'wholesaler';
  specialRequests?: string[];
  extras: {
    name: string;
    price: number;
    quantity: number;
  }[];
}

// Amenity/Service
export interface HotelAmenity {
  amenityId: string;
  name: string;
  description: string;
  category: 'room' | 'property' | 'dining' | 'recreation' | 'business' | 'wellness';
  available24Hours: boolean;
  price?: number;
  capacity?: number;
  schedule?: string;
}

// Hotel profile
export interface IHotelProfile extends Document {
  tenantId: string;
  hotelId: string;
  name: string;
  type: HotelType;
  brand?: string;
  starRating: number;
  locations: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: { lat: number; lng: number };
  }[];
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  rooms: HotelRoom[];
  totalRooms: number;
  availableRooms: number;
  housekeepingTasks: HousekeepingTask[];
  guests: HotelGuest[];
  activeBookings: HotelBooking[];
  amenities: HotelAmenity[];
  metrics: {
    occupancyRate: number;
    adr: number;
    revpar: number;
    averageLengthOfStay: number;
    cancellationRate: number;
    repeatGuestRate: number;
    netPromoterScore: number;
  };
  integrations: {
    pms: string;
    channelManager: string;
    revenueManagement: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Schema definitions for subdocuments
const HotelRoomSchema = new Schema<HotelRoom>({
  roomId: { type: String, required: true },
  roomNumber: { type: String, required: true },
  floor: { type: Number, required: true },
  type: {
    type: String,
    enum: ['standard', 'deluxe', 'suite', 'executive', 'presidential', 'studio', 'penthouse'],
    required: true
  },
  bedConfiguration: {
    type: String,
    enum: ['single', 'double', 'twin', 'queen', 'king', 'suite'],
    required: true
  },
  maxOccupancy: { type: Number, required: true },
  baseRate: { type: Number, required: true },
  currentRate: { type: Number, required: true },
  status: {
    type: String,
    enum: ['available', 'occupied', 'cleaning', 'maintenance', 'out_of_order'],
    default: 'available'
  },
  amenities: [{ type: String }],
  view: {
    type: String,
    enum: ['city', 'ocean', 'garden', 'pool', 'mountain', 'courtyard'],
    default: 'city'
  },
  size: { type: Number, default: 0 }
}, { _id: false });

const HousekeepingTaskSchema = new Schema<HousekeepingTask>({
  taskId: { type: String, required: true },
  roomId: { type: String, required: true },
  roomNumber: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'inspected'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  type: {
    type: String,
    enum: ['checkout', 'stayover', 'deep_clean', 'turndown'],
    required: true
  },
  assignedTo: { type: String },
  estimatedTime: { type: Number, default: 30 },
  startTime: { type: Date },
  completedTime: { type: Date },
  notes: { type: String }
}, { _id: false });

const HotelGuestSchema = new Schema<HotelGuest>({
  guestId: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  loyaltyTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond']
  },
  totalStays: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  preferences: [{ type: String }],
  specialRequests: [{ type: String }],
  vip: { type: Boolean, default: false }
}, { _id: false });

const HotelBookingSchema = new Schema<HotelBooking>({
  bookingId: { type: String, required: true },
  guestId: { type: String, required: true },
  roomId: { type: String },
  roomNumber: { type: String },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  roomType: {
    type: String,
    enum: ['standard', 'deluxe', 'suite', 'executive', 'presidential', 'studio', 'penthouse'],
    required: true
  },
  guestCount: { type: Number, default: 1 },
  totalAmount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
    default: 'confirmed'
  },
  source: {
    type: String,
    enum: ['direct', 'ota', 'corporate', 'travel_agent', 'wholesaler'],
    default: 'direct'
  },
  specialRequests: [{ type: String }],
  extras: [{
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, default: 1 }
  }]
}, { _id: false });

const HotelAmenitySchema = new Schema<HotelAmenity>({
  amenityId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  category: {
    type: String,
    enum: ['room', 'property', 'dining', 'recreation', 'business', 'wellness'],
    required: true
  },
  available24Hours: { type: Boolean, default: false },
  price: { type: Number },
  capacity: { type: Number },
  schedule: { type: String }
}, { _id: false });

const HotelProfileSchema = new Schema<IHotelProfile>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    hotelId: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['luxury', 'boutique', 'business', 'resort', 'budget', 'extended_stay', 'hostel'],
      required: true
    },
    brand: { type: String },
    starRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    locations: [{
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number }
      }
    }],
    contact: {
      phone: { type: String, required: true },
      email: { type: String, required: true },
      website: { type: String }
    },
    rooms: [HotelRoomSchema],
    totalRooms: {
      type: Number,
      default: 0
    },
    availableRooms: {
      type: Number,
      default: 0
    },
    housekeepingTasks: [HousekeepingTaskSchema],
    guests: [HotelGuestSchema],
    activeBookings: [HotelBookingSchema],
    amenities: [HotelAmenitySchema],
    metrics: {
      occupancyRate: { type: Number, default: 0 },
      adr: { type: Number, default: 0 },
      revpar: { type: Number, default: 0 },
      averageLengthOfStay: { type: Number, default: 0 },
      cancellationRate: { type: Number, default: 0 },
      repeatGuestRate: { type: Number, default: 0 },
      netPromoterScore: { type: Number, default: 0 }
    },
    integrations: {
      pms: { type: String },
      channelManager: { type: String },
      revenueManagement: [{ type: String }]
    }
  },
  {
    timestamps: true,
    collection: 'hotel_profiles'
  }
);

// Indexes
HotelProfileSchema.index({ tenantId: 1 });
HotelProfileSchema.index({ 'locations.city': 1, 'locations.state': 1 });
HotelProfileSchema.index({ type: 1, starRating: 1 });

export const HotelProfile = mongoose.model<IHotelProfile>('HotelProfile', HotelProfileSchema);

export default HotelProfile;

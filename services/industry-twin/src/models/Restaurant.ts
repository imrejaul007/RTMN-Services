import mongoose, { Document, Schema } from 'mongoose';

// Restaurant-specific entity types
export type RestaurantType = 'fine_dining' | 'casual_dining' | 'fast_casual' | 'quick_service' | 'cafe' | 'bistro' | 'food_truck';
export type CuisineType = 'italian' | 'mexican' | 'chinese' | 'japanese' | 'indian' | 'american' | 'french' | 'thai' | 'mediterranean' | 'fusion' | 'other';

// Restaurant-specific menu item
export interface MenuItem {
  itemId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  margin: number;
  prepTime: number;
  allergens: string[];
  dietary: ('vegetarian' | 'vegan' | 'gluten_free' | 'dairy_free')[];
  popularity: number;
  seasonal: boolean;
}

// Restaurant-specific table
export interface RestaurantTable {
  tableId: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  section: string;
  position: { x: number; y: number };
  currentGuests?: number;
}

// Kitchen station
export interface KitchenStation {
  stationId: string;
  name: string;
  equipment: string[];
  staff: string[];
  currentOrders: string[];
  capacity: number;
}

// Restaurant-specific order
export interface RestaurantOrder {
  orderId: string;
  tableId?: string;
  items: {
    menuItemId: string;
    quantity: number;
    modifications: string[];
    status: 'pending' | 'preparing' | 'ready' | 'served';
    specialInstructions?: string;
  }[];
  server: string;
  kitchenStation?: string;
  priority: 'normal' | 'rush';
  guestCount: number;
  orderType: 'dine_in' | 'takeout' | 'delivery';
}

// Reservation
export interface Reservation {
  reservationId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  partySize: number;
  dateTime: Date;
  tableId?: string;
  status: 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  specialRequests?: string[];
  dietaryNotes?: string[];
  source: 'walk_in' | 'phone' | 'online' | 'app';
}

// Restaurant profile
export interface IRestaurantProfile extends Document {
  tenantId: string;
  restaurantId: string;
  name: string;
  type: RestaurantType;
  cuisine: CuisineType[];
  locations: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: { lat: number; lng: number };
  }[];
  hours: {
    day: string;
    open: string;
    close: string;
    closed: boolean;
  }[];
  menu: MenuItem[];
  tables: RestaurantTable[];
  kitchenStations: KitchenStation[];
  activeOrders: RestaurantOrder[];
  reservations: Reservation[];
  metrics: {
    coversPerDay: number;
    averageCheck: number;
    tableTurnoverRate: number;
    foodCostPercentage: number;
    laborCostPercentage: number;
    occupancyRate: number;
  };
  integrations: {
    pos: string;
    delivery: string[];
    reservation: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema<MenuItem>({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  cost: { type: Number, required: true },
  margin: { type: Number, default: 0 },
  prepTime: { type: Number, default: 15 },
  allergens: [{ type: String }],
  dietary: [{
    type: String,
    enum: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free']
  }],
  popularity: { type: Number, default: 0 },
  seasonal: { type: Boolean, default: false }
}, { _id: false });

const RestaurantTableSchema = new Schema<RestaurantTable>({
  tableId: { type: String, required: true },
  capacity: { type: Number, required: true },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'cleaning'],
    default: 'available'
  },
  section: { type: String, required: true },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  currentGuests: { type: Number, default: 0 }
}, { _id: false });

const KitchenStationSchema = new Schema<KitchenStation>({
  stationId: { type: String, required: true },
  name: { type: String, required: true },
  equipment: [{ type: String }],
  staff: [{ type: String }],
  currentOrders: [{ type: String }],
  capacity: { type: Number, default: 10 }
}, { _id: false });

const RestaurantOrderItemSchema = new Schema({
  menuItemId: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  modifications: [{ type: String }],
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'served'],
    default: 'pending'
  },
  specialInstructions: { type: String }
}, { _id: false });

const RestaurantOrderSchema = new Schema<RestaurantOrder>({
  orderId: { type: String, required: true },
  tableId: { type: String },
  items: [RestaurantOrderItemSchema],
  server: { type: String, required: true },
  kitchenStation: { type: String },
  priority: {
    type: String,
    enum: ['normal', 'rush'],
    default: 'normal'
  },
  guestCount: { type: Number, default: 1 },
  orderType: {
    type: String,
    enum: ['dine_in', 'takeout', 'delivery'],
    default: 'dine_in'
  }
}, { _id: false });

const ReservationSchema = new Schema<Reservation>({
  reservationId: { type: String, required: true },
  guestName: { type: String, required: true },
  guestPhone: { type: String, required: true },
  guestEmail: { type: String },
  partySize: { type: Number, required: true },
  dateTime: { type: Date, required: true },
  tableId: { type: String },
  status: {
    type: String,
    enum: ['confirmed', 'seated', 'completed', 'cancelled', 'no_show'],
    default: 'confirmed'
  },
  specialRequests: [{ type: String }],
  dietaryNotes: [{ type: String }],
  source: {
    type: String,
    enum: ['walk_in', 'phone', 'online', 'app'],
    default: 'phone'
  }
}, { _id: false });

const RestaurantProfileSchema = new Schema<IRestaurantProfile>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    restaurantId: {
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
      enum: ['fine_dining', 'casual_dining', 'fast_casual', 'quick_service', 'cafe', 'bistro', 'food_truck'],
      required: true
    },
    cuisine: [{
      type: String,
      enum: ['italian', 'mexican', 'chinese', 'japanese', 'indian', 'american', 'french', 'thai', 'mediterranean', 'fusion', 'other']
    }],
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
    hours: [{
      day: { type: String, required: true },
      open: { type: String, required: true },
      close: { type: String, required: true },
      closed: { type: Boolean, default: false }
    }],
    menu: [MenuItemSchema],
    tables: [RestaurantTableSchema],
    kitchenStations: [KitchenStationSchema],
    activeOrders: [RestaurantOrderSchema],
    reservations: [ReservationSchema],
    metrics: {
      coversPerDay: { type: Number, default: 0 },
      averageCheck: { type: Number, default: 0 },
      tableTurnoverRate: { type: Number, default: 0 },
      foodCostPercentage: { type: Number, default: 0 },
      laborCostPercentage: { type: Number, default: 0 },
      occupancyRate: { type: Number, default: 0 }
    },
    integrations: {
      pos: { type: String },
      delivery: [{ type: String }],
      reservation: [{ type: String }]
    }
  },
  {
    timestamps: true,
    collection: 'restaurant_profiles'
  }
);

// Indexes
RestaurantProfileSchema.index({ tenantId: 1 });
RestaurantProfileSchema.index({ 'locations.city': 1, 'locations.state': 1 });

export const RestaurantProfile = mongoose.model<IRestaurantProfile>('RestaurantProfile', RestaurantProfileSchema);

export default RestaurantProfile;

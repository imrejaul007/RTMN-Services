/**
 * KHAIRMOVE Profile Model
 * Represents a KHAIRMOVE user (driver, rider, or delivery partner)
 */

export interface KHAIRMOVECoordinates {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  pincode?: string;
}

export interface KHAIRMOVEVehicle {
  vehicleId: string;
  type: 'bike' | 'auto' | 'car' | 'van' | 'truck';
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  color: string;
  capacity?: {
    weight: number;
    volume?: number;
    passengers?: number;
  };
  registrationExpiry: Date;
  insuranceExpiry: Date;
}

export interface KHAIRMOVEDriver {
  driverId: string;
  name: string;
  phone: string;
  email?: string;
  profileImage?: string;
  rating: number;
  totalTrips: number;
  verified: boolean;
  documents: {
    license: string;
    aadhar?: string;
    pan?: string;
  };
  status: 'available' | 'busy' | 'offline' | 'suspended';
  vehicle?: KHAIRMOVEVehicle;
  currentLocation?: KHAIRMOVECoordinates;
}

export interface KHAIRMOVEPackage {
  packageId: string;
  description: string;
  weight: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  fragile?: boolean;
  temperatureSensitive?: boolean;
  value?: number;
  category: 'document' | 'parcel' | 'food' | 'pharma' | 'fragile' | 'bulk';
}

export interface KHAIRMOVEFleet {
  fleetId: string;
  name: string;
  ownerId: string;
  vehicles: KHAIRMOVEVehicle[];
  drivers: string[];
  status: 'active' | 'inactive' | 'suspended';
  zones: string[];
  averageRating: number;
}

export interface KHAIRMOVETrip {
  tripId: string;
  type: 'ride' | 'delivery';
  status: 'requested' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed';
  customerId: string;
  driverId?: string;
  pickup: KHAIRMOVECoordinates;
  dropoff: KHAIRMOVECoordinates;
  package?: KHAIRMOVEPackage;
  estimatedFare: number;
  actualFare?: number;
  distance: number;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  rating?: number;
  feedback?: string;
  paymentMethod: 'cash' | 'wallet' | 'card' | 'upi';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
}

export interface KHAIRMOVEServiceType {
  serviceId: string;
  name: string;
  type: 'ride' | 'delivery' | 'both';
  vehicleTypes: string[];
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
  maxDistance?: number;
  active: boolean;
}

export interface KHAIRMOVEZones {
  zoneId: string;
  name: string;
  city: string;
  coordinates: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  services: string[];
  surgeMultiplier: number;
  active: boolean;
}

// RTMN Twin Integration Types
export interface KHAIRMOVETwinLink {
  twinType: 'shipment' | 'order' | 'customer';
  twinId: string;
  linkType: 'owns' | 'operates' | 'contains' | 'delivers_to';
  metadata?: Record<string, unknown>;
}

export interface KHAIRMOVETripWithTwins extends KHAIRMOVETrip {
  linkedTwins: KHAIRMOVETwinLink[];
  shipmentTwinId?: string;
  orderTwinId?: string;
  customerTwinId?: string;
}

export class KHAIRMOVEProfile {
  constructor(
    public readonly profileId: string,
    public readonly type: 'driver' | 'rider' | 'fleet_owner',
    public readonly name: string,
    public readonly phone: string,
    public readonly email?: string,
    public readonly twinLinks: KHAIRMOVETwinLink[] = [],
    public readonly metadata: Record<string, unknown> = {}
  ) {}

  toJSON(): Record<string, unknown> {
    return {
      profileId: this.profileId,
      type: this.type,
      name: this.name,
      phone: this.phone,
      email: this.email,
      twinLinks: this.twinLinks,
      metadata: this.metadata
    };
  }

  addTwinLink(link: KHAIRMOVETwinLink): void {
    const existing = this.twinLinks.find(
      t => t.twinType === link.twinType && t.twinId === link.twinId
    );
    if (!existing) {
      this.twinLinks.push(link);
    }
  }

  removeTwinLink(twinType: string, twinId: string): void {
    const index = this.twinLinks.findIndex(
      t => t.twinType === twinType && t.twinId === twinId
    );
    if (index !== -1) {
      this.twinLinks.splice(index, 1);
    }
  }
}

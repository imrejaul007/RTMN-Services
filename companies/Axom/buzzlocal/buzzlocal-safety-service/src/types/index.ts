/**
 * BuzzLocal Safety Service - Types
 *
 * Safety alerts, SOS, trusted circles, live tracking
 */

// ============================================
// Safety Alert Types
// ============================================

export type SafetyAlertType =
  | 'unsafe_area'
  | 'accident'
  | 'fire'
  | 'flood'
  | 'road_closure'
  | 'power_cut'
  | 'water_shortage'
  | 'crime'
  | 'suspicious'
  | 'missing_person'
  | 'medical';

export type AlertSeverity = 'info' | 'warning' | 'urgent' | 'critical';

export type AlertStatus = 'active' | 'verified' | 'resolved' | 'false_alarm';

// ============================================
// Safety Alert
// ============================================

export interface SafetyAlert {
  id: string;
  type: SafetyAlertType;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    area: string;
    city: string;
  };
  reporter: {
    id: string;
    name: string;
    avatar?: string;
    verified: boolean;
  };
  photos?: string[];
  upvotes: number;
  comments: number;
  verified: boolean;
  verifiedBy?: {
    id: string;
    name: string;
    verifiedAt: string;
  };
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Crowd Report
// ============================================

export interface CrowdReport {
  id: string;
  type: 'traffic' | 'queue' | 'crowd' | 'parking' | 'waiting_time';
  location: {
    latitude: number;
    longitude: number;
    address: string;
    placeName: string;
  };
  status: 'light' | 'moderate' | 'heavy' | 'clear';
  waitTime?: number; // in minutes
  lastUpdated: string;
  reports: {
    userId: string;
    status: 'light' | 'moderate' | 'heavy' | 'clear';
    timestamp: string;
  }[];
}

// ============================================
// Trusted Circle
// ============================================

export interface TrustedCircle {
  id: string;
  ownerId: string;
  name: string;
  type: 'family' | 'friends' | 'apartment' | 'office' | 'custom';
  members: CircleMember[];
  createdAt: string;
}

export interface CircleMember {
  userId: string;
  name: string;
  phone: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  shareLocation: boolean;
  notifyOnArrival: boolean;
  joinedAt: string;
}

// ============================================
// Live Location
// ============================================

export interface LiveLocation {
  userId: string;
  circleId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  batteryLevel?: number;
  speed?: number;
  heading?: number;
  timestamp: string;
  expiresAt: string;
}

// ============================================
// SOS
// ============================================

export interface SOSAlert {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  type: 'emergency' | 'check_in' | 'custom';
  message?: string;
  circleIds: string[];
  status: 'triggered' | 'acknowledged' | 'resolved' | 'cancelled';
  responders: {
    userId: string;
    name: string;
    respondedAt: string;
    status: 'notified' | 'acknowledged' | 'helping';
  }[];
  triggeredAt: string;
  resolvedAt?: string;
}

// ============================================
// Safety Check-In
// ============================================

export interface SafeCheckIn {
  id: string;
  userId: string;
  destination: string;
  destinationLocation?: {
    latitude: number;
    longitude: number;
  };
  expectedArrival: string;
  autoAlertTime: string;
  status: 'pending' | 'checked_in' | 'alerted' | 'cancelled';
  notifyCircleIds: string[];
  checkedInAt?: string;
}

// ============================================
// Emergency Contact
// ============================================

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
  isVerified: boolean;
  notifyOnSOS: boolean;
}

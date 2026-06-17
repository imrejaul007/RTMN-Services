/**
 * BuzzLocal Society Service - Types
 *
 * Apartment/Community management
 */

// ============================================
// Society
// ============================================

export interface Society {
  id: string;
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  type: 'apartment' | 'gated_community' | 'villa' | 'pg';
  flats: number;
  towers: number;
  amenities: string[];
  admin: {
    id: string;
    name: string;
    phone: string;
  };
  createdAt: string;
}

// ============================================
// Resident
// ============================================

export interface Resident {
  id: string;
  societyId: string;
  flat: string;
  tower?: string;
  name: string;
  phone: string;
  email?: string;
  role: 'owner' | 'tenant' | 'family';
  avatar?: string;
  moveInDate: string;
  verified: boolean;
}

// ============================================
// Notice
// ============================================

export interface Notice {
  id: string;
  societyId: string;
  title: string;
  content: string;
  category: 'maintenance' | 'event' | 'security' | 'utility' | 'general' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  author: {
    id: string;
    name: string;
    role: string;
  };
  attachments?: string[];
  createdAt: string;
  expiresAt?: string;
  views: number;
}

// ============================================
// Poll
// ============================================

export interface Poll {
  id: string;
  societyId: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
  endDate: string;
  author: {
    id: string;
    name: string;
  };
  totalVotes: number;
  userVoted?: string;
  createdAt: string;
}

// ============================================
// Complaint
// ============================================

export interface Complaint {
  id: string;
  societyId: string;
  title: string;
  description: string;
  category: 'maintenance' | 'security' | 'cleanliness' | 'noise' | 'parking' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  author: {
    id: string;
    name: string;
    flat: string;
  };
  assignedTo?: string;
  images?: string[];
  comments: ComplaintComment[];
  createdAt: string;
  resolvedAt?: string;
}

export interface ComplaintComment {
  id: string;
  author: { id: string; name: string; role: string };
  content: string;
  createdAt: string;
}

// ============================================
// Visitor
// ============================================

export interface Visitor {
  id: string;
  societyId: string;
  visitorName: string;
  phone: string;
  flatToVisit: string;
  purpose: 'family' | 'friend' | 'delivery' | 'service' | 'vendor' | 'other';
  expectedArrival: string;
  checkedIn?: string;
  checkedOut?: string;
  status: 'expected' | 'checked_in' | 'checked_out' | 'cancelled';
  host: {
    id: string;
    name: string;
    flat: string;
  };
}

// ============================================
// Facility
// ============================================

export interface Facility {
  id: string;
  societyId: string;
  name: string;
  type: 'clubhouse' | 'pool' | 'gym' | 'tennis' | 'badminton' | 'party_hall' | 'garden' | 'parking';
  capacity: number;
  available: boolean;
  bookings: FacilityBooking[];
}

export interface FacilityBooking {
  id: string;
  facilityId: string;
  residentId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  guests: number;
  amount?: number;
}

// ============================================
// Emergency Contact
// ============================================

export interface EmergencyContact {
  id: string;
  societyId: string;
  name: string;
  phone: string;
  type: 'police' | 'ambulance' | 'fire' | 'society' | 'maintenance' | 'security';
}

// ============================================
// Maintenance
// ============================================

export interface MaintenanceBill {
  id: string;
  societyId: string;
  residentId: string;
  flat: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  period: string;
  paidAt?: string;
  transactionId?: string;
}

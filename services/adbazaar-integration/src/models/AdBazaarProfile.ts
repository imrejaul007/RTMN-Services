// AdBazaar Profile Model
// Represents a customer profile in AdBazaar ecosystem

export interface AdBazaarProfile {
  id: string;
  externalId?: string;
  email?: string;
  phone?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  language?: string;
  avatar?: string;
  profileImage?: string;

  // Demographics
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  interests?: string[];
  preferences?: Record<string, any>;

  // CRM Data
  leadScore?: number;
  leadStatus?: 'new' | 'engaged' | 'qualified' | 'nurturing' | 'converted' | 'lost';
  lifecycleStage?: 'subscriber' | 'lead' | 'mql' | 'sql' | 'customer' | 'advocate';
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;

  // Engagement
  engagementScore?: number;
  engagementLevel?: 'cold' | 'warm' | 'hot' | 'active';
  lastActivityDate?: string;
  lastEmailOpenDate?: string;
  lastEmailClickDate?: string;
  lastWebsiteVisit?: string;
  totalVisits?: number;
  pageViews?: number;
  averageSessionDuration?: number;

  // WhatsApp
  whatsappNumber?: string;
  whatsappOptIn?: boolean;
  whatsappConsentDate?: string;
  whatsappLastMessage?: string;
  whatsappLastMessageDate?: string;

  // DOOH
  doohExposureCount?: number;
  lastDOOHLocation?: string;
  lastDOOHTimestamp?: string;

  // Campaign
  campaignIds?: string[];
  lastCampaignId?: string;
  lastCampaignName?: string;
  lastCampaignDate?: string;

  // Custom fields
  customFields?: Record<string, any>;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  tags?: string[];
  notes?: string;
  isActive?: boolean;
  isDeleted?: boolean;
}

export interface AdBazaarLead {
  id: string;
  profileId?: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  companySize?: string;
  revenue?: string;
  source: string;
  campaign?: string;
  medium?: string;
  content?: string;
  term?: string;
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost';
  score: number;
  temperature?: 'cold' | 'warm' | 'hot';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  owner?: string;
  assignedTo?: string;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
  convertedAt?: string;
  convertedToCustomerId?: string;
}

export interface AdBazaarCampaign {
  id: string;
  name: string;
  description?: string;
  type: 'email' | 'sms' | 'whatsapp' | 'social' | 'paid' | 'dooh' | 'multi-channel';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  budget?: number;
  spent?: number;
  targetAudience?: {
    segment?: string;
    criteria?: Record<string, any>;
    count?: number;
  };
  channels: string[];
  content?: {
    subject?: string;
    body?: string;
    creativeIds?: string[];
  };
  metrics?: {
    impressions?: number;
    reaches?: number;
    clicks?: number;
    conversions?: number;
    revenue?: number;
    ctr?: number;
    cvr?: number;
    roas?: number;
    cpa?: number;
  };
  audienceIds?: string[];
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdBazaarWhatsAppMessage {
  id: string;
  from: string;
  to: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'image' | 'document' | 'video' | 'audio' | 'location' | 'template' | 'interactive';
  content: string;
  mediaUrl?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  campaignId?: string;
  leadId?: string;
  profileId?: string;
  metadata?: Record<string, any>;
}

export interface AdBazaarDOOHExposure {
  id: string;
  adId: string;
  adName?: string;
  locationId: string;
  locationName?: string;
  audienceId?: string;
  deviceId?: string;
  timestamp: string;
  duration?: number;
  impression: boolean;
  attentionScore?: number;
  audienceSegment?: string;
  demographics?: {
    ageRange?: string;
    gender?: string;
    mood?: string;
  };
  conversionTracked?: boolean;
  journeyStage?: string;
}

export interface AdBazaarJourneyEvent {
  id: string;
  profileId: string;
  eventType: 'impression' | 'click' | 'visit' | 'conversion' | 'purchase' | 'engagement' | 'dooh_exposure';
  channel: 'email' | 'sms' | 'whatsapp' | 'social' | 'paid' | 'dooh' | 'web' | 'app' | 'offline';
  source: string;
  campaignId?: string;
  adId?: string;
  contentId?: string;
  location?: string;
  device?: string;
  timestamp: string;
  properties?: Record<string, any>;
  journeyStage?: string;
  touchpointNumber?: number;
}

// Export type for Twin sync
export type AdBazaarTwinType = 'lead' | 'customer' | 'campaign' | 'journey';

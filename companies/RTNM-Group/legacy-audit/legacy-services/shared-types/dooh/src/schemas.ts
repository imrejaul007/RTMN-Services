/**
 * DOOH - Validation Schemas
 *
 * Zod schemas for runtime validation of all API inputs.
 * Use these schemas to validate request bodies, query params, and responses.
 */

import { z } from 'zod';

// ============================================================================
// Screen Schemas
// ============================================================================

export const ScreenTypeSchema = z.enum([
  'cab_tablet',
  'restaurant_tv',
  'mall_kiosk',
  'gym_screen',
  'salon_display',
  'hotel_lobby',
  'airport_display',
  'office_lobby',
  'bus_shelter',
  'billboard_digital',
  'generic_display',
]);

export const ScreenStatusSchema = z.enum([
  'active',
  'inactive',
  'offline',
  'maintenance',
  'unregistered',
  'suspended',
]);

export const LocationTypeSchema = z.enum([
  'cab',
  'restaurant',
  'mall',
  'gym',
  'salon',
  'hotel',
  'airport',
  'office',
  'street',
  'other',
]);

export const ScreenLocationSchema = z.object({
  city: z.string().min(1).max(100),
  area: z.string().min(1).max(100),
  zone: z.string().max(100).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().max(500).optional(),
});

export const TimeStringSchema = z.string().regex(
  /^([01]\d|2[0-3]):([0-5]\d)$/,
  'Time must be in HH:mm format (e.g., "09:00")'
);

export const OperatingHoursSchema = z.object({
  open: TimeStringSchema,
  close: TimeStringSchema,
  timezone: z.string().min(1),
});

export const HardwareSchema = z.object({
  model: z.string().optional(),
  os: z.string().optional(),
  resolution: z.string().optional(),
  screen_size: z.number().positive().optional(),
});

export const AudienceSegmentSchema = z.object({
  type: z.enum([
    'office_workers',
    'students',
    'families',
    'tourists',
    'fitness',
    'foodies',
    'shoppers',
    'general',
  ]),
  percentage: z.number().min(0).max(100),
});

export const TimeSlotSchema = z.object({
  start: TimeStringSchema,
  end: TimeStringSchema,
  day_type: z.enum(['weekday', 'weekend', 'all']),
});

export const AudienceProfileSchema = z.object({
  primary: z.array(AudienceSegmentSchema).min(1),
  secondary: z.array(AudienceSegmentSchema).optional(),
  peak_hours: z.array(TimeSlotSchema),
  avg_dwell_time: z.number().positive(),
  daily_footfall: z.number().int().nonnegative().optional(),
});

export const SlotPricingSchema = z.object({
  slot_type: z.enum(['prime', 'standard', 'off_peak']),
  duration_seconds: z.number().int().positive(),
  price: z.number().nonnegative(),
  multiplier: z.number().nonnegative(),
});

export const ScreenSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  type: ScreenTypeSchema,
  location_type: LocationTypeSchema,
  location: ScreenLocationSchema,
  hardware: HardwareSchema.optional(),
  network_id: z.string().optional(),
  ip_address: z.string().ip().optional(),
  mac_address: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).optional(),
  owner_id: z.string().min(1),
  owner_type: z.enum(['owned', 'partner', 'external']),
  status: ScreenStatusSchema,
  last_seen: z.date().optional(),
  last_sync: z.date().optional(),
  operating_hours: OperatingHoursSchema.optional(),
  audience_profile: AudienceProfileSchema.optional(),
  cpm: z.number().positive(),
  slot_pricing: z.array(SlotPricingSchema).optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

// Screen registration schema (subset of ScreenSchema)
export const ScreenRegistrationSchema = z.object({
  name: z.string().min(1).max(255),
  type: ScreenTypeSchema,
  network_type: z.enum(['1:1', 'mass']).optional(),
  location_type: LocationTypeSchema,
  location: ScreenLocationSchema,
  hardware: HardwareSchema.optional(),
  owner_id: z.string().min(1),
  owner_email: z.string().email().optional(),
  owner_phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  owner_type: z.enum(['owned', 'partner', 'external']).optional(),
  operating_hours: OperatingHoursSchema.optional(),
  audience_profile: AudienceProfileSchema.optional(),
  cpm: z.number().positive().optional(),
});

// Screen filter schema
export const ScreenFilterSchema = z.object({
  type: ScreenTypeSchema.optional(),
  network_type: z.enum(['1:1', 'mass']).optional(),
  city: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  status: ScreenStatusSchema.optional(),
  owner_id: z.string().optional(),
  owner_type: z.enum(['owned', 'partner', 'external']).optional(),
  min_cpm: z.number().nonnegative().optional(),
  max_cpm: z.number().nonnegative().optional(),
  min_footfall: z.number().int().nonnegative().optional(),
});

// Screen heartbeat schema
export const ScreenHeartbeatSchema = z.object({
  screen_id: z.string().min(1).max(100),
  timestamp: z.string().datetime().or(z.date()),
  status: ScreenStatusSchema.optional(),
  playlist_version: z.number().int().nonnegative().optional(),
  current_campaign_id: z.string().optional(),
  impressions_last_hour: z.number().int().nonnegative().optional(),
  errors: z.array(z.string()).optional(),
});

// ============================================================================
// Campaign Schemas
// ============================================================================

export const CreativeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['image', 'video', 'html5', 'interactive', 'audio']),
  url: z.string().url(),
  duration: z.number().positive(), // seconds
  thumbnail: z.string().url().optional(),
  name: z.string().min(1),
});

export const DayPartsSchema = z.object({
  morning: z.boolean().optional(),
  afternoon: z.boolean().optional(),
  evening: z.boolean().optional(),
});

export const ContextSignalSchema = z.object({
  signal_type: z.enum(['weather', 'time', 'location_density', 'event', 'category_intent']),
  condition: z.string(),
  action: z.enum(['boost', 'reduce', 'show', 'hide']),
  campaign_id: z.string().optional(),
});

export const DOOHTargetingSchema = z.object({
  cities: z.array(z.string()).optional(),
  areas: z.array(z.string()).optional(),
  screen_types: z.array(ScreenTypeSchema).optional(),
  location_types: z.array(LocationTypeSchema).optional(),
  audience_segments: z.array(AudienceSegmentSchema.shape.type).optional(),
  day_parts: DayPartsSchema.optional(),
  weekdays_only: z.boolean().optional(),
  context_signals: z.array(ContextSignalSchema).optional(),
});

export const CampaignTargetingFilterSchema = z.object({
  min_footfall: z.number().int().nonnegative().optional(),
  audience_overlap: z.number().min(0).max(100).optional(),
  cpm_max: z.number().nonnegative().optional(),
  cpm_min: z.number().nonnegative().optional(),
});

export const CampaignMetricsSchema = z.object({
  impressions: z.number().int().nonnegative(),
  unique_impressions: z.number().int().nonnegative(),
  scans: z.number().int().nonnegative(),
  visits: z.number().int().nonnegative(),
  purchases: z.number().int().nonnegative(),
  revenue: z.number().nonnegative(),
  scan_rate: z.number().nonnegative(),
  visit_rate: z.number().nonnegative(),
  purchase_rate: z.number().nonnegative(),
  total_spent: z.number().nonnegative(),
  cpm_actual: z.number().nonnegative(),
  cpc_actual: z.number().nonnegative(),
  cpu_actual: z.number().nonnegative(),
  cpp_actual: z.number().nonnegative(),
  last_updated: z.string().datetime().or(z.date()),
});

export const DOOHCampaignStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'completed',
  'budget_exhausted',
]);

export const DOOHCampaignSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  brand_id: z.string().min(1),
  creatives: z.array(CreativeSchema).min(1),
  targeting: DOOHTargetingSchema,
  budget: z.number().positive(),
  spent: z.number().nonnegative(),
  start_date: z.string().datetime().or(z.date()),
  end_date: z.string().datetime().or(z.date()),
  schedule_type: z.enum(['continuous', 'scheduled', 'time_slots']),
  screen_filter: CampaignTargetingFilterSchema.optional(),
  status: DOOHCampaignStatusSchema,
  metrics: CampaignMetricsSchema,
  created_at: z.string().datetime().or(z.date()),
  updated_at: z.string().datetime().or(z.date()),
});

// ============================================================================
// Playlist Schemas
// ============================================================================

export const PlaylistSlotSchema = z.object({
  position: z.number().int().nonnegative(),
  campaign_id: z.string().min(1),
  creative_id: z.string().min(1),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Time must be in HH:mm:ss format'),
  duration: z.number().positive(),
  scheduled_impressions: z.number().int().nonnegative(),
  actual_impressions: z.number().int().nonnegative().optional(),
});

export const PlaylistSchema = z.object({
  id: z.string().min(1),
  screen_id: z.string().min(1),
  date: z.string().datetime().or(z.date()),
  slots: z.array(PlaylistSlotSchema).min(1),
  total_duration: z.number().int().nonnegative(),
  generated_at: z.string().datetime().or(z.date()),
  version: z.number().int().nonnegative(),
});

// ============================================================================
// Delivery Schemas
// ============================================================================

export const DeliveryContextSchema = z.object({
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format'),
  day_type: z.enum(['weekday', 'weekend']),
  weather: z.enum(['sunny', 'partly_cloudy', 'cloudy', 'overcast', 'rainy', 'stormy', 'snowy', 'foggy', 'windy', 'hazy']).optional(),
  nearby_events: z.array(z.string()).optional(),
  audience: AudienceProfileSchema,
});

export const DeliverySlotSchema = z.object({
  position: z.number().int().nonnegative(),
  campaign_id: z.string().min(1),
  creative: CreativeSchema,
  duration: z.number().positive(),
  priority: z.number().nonnegative(),
  reason: z.string(),
});

export const DeliveryRequestSchema = z.object({
  request_id: z.string().optional(),
  screen_id: z.string().min(1),
  available_slots: z.number().int().positive(),
  context: DeliveryContextSchema,
});

export const DeliveryResponseSchema = z.object({
  request_id: z.string().optional(),
  screen_id: z.string().min(1),
  slots: z.array(DeliverySlotSchema),
  generated_at: z.string().datetime().or(z.date()),
  errors: z.array(z.string()).optional(),
});

// ============================================================================
// Analytics Schemas
// ============================================================================

export const ImpressionEventSchema = z.object({
  screen_id: z.string().min(1),
  campaign_id: z.string().min(1),
  creative_id: z.string().min(1),
  timestamp: z.string().datetime().or(z.date()),
  duration_played: z.number().nonnegative(),
  user_id: z.string().optional(),
});

// ============================================================================
// Revenue Schemas
// ============================================================================

export const RevenueModelSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('cpm'),
    cpm_rate: z.number().positive(),
  }),
  z.object({
    type: z.literal('slot'),
    slot_pricing: z.array(SlotPricingSchema).min(1),
  }),
  z.object({
    type: z.literal('performance'),
    performance_rate: z.number().positive(),
    performance_metric: z.enum(['scan', 'visit', 'purchase']),
  }),
  z.object({
    type: z.literal('hybrid'),
    base_cpm: z.number().positive(),
    performance_bonus: z.number().positive(),
    performance_metric: z.enum(['scan', 'visit', 'purchase']),
  }),
]);

export const RevenueShareSchema = z.object({
  screen_owner: z.number().min(0).max(100),
  platform: z.number().min(0).max(100),
  content_provider: z.number().min(0).max(100).optional(),
});

export const PayoutRecordSchema = z.object({
  screen_id: z.string().min(1),
  period_start: z.string().datetime().or(z.date()),
  period_end: z.string().datetime().or(z.date()),
  impressions: z.number().int().nonnegative(),
  revenue: z.number().nonnegative(),
  owner_share: z.number().nonnegative(),
  platform_share: z.number().nonnegative(),
  status: z.enum(['pending', 'processed', 'paid']),
});

// ============================================================================
// API Response Schemas
// ============================================================================

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    request_id: z.string().optional(),
  }),
});

export const ApiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z.object({
      timestamp: z.string().datetime(),
      request_id: z.string().optional(),
    }).optional(),
  });

export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
});

export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total_items: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
  has_next: z.boolean(),
  has_prev: z.boolean(),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: PaginationMetaSchema,
  });

// ============================================================================
// Type Exports
// ============================================================================

export type ScreenType = z.infer<typeof ScreenTypeSchema>;
export type ScreenStatus = z.infer<typeof ScreenStatusSchema>;
export type ScreenLocation = z.infer<typeof ScreenLocationSchema>;
export type ScreenRegistration = z.infer<typeof ScreenRegistrationSchema>;
export type ScreenFilter = z.infer<typeof ScreenFilterSchema>;
export type ScreenHeartbeat = z.infer<typeof ScreenHeartbeatSchema>;
export type DOOHCampaign = z.infer<typeof DOOHCampaignSchema>;
export type DeliveryRequest = z.infer<typeof DeliveryRequestSchema>;
export type DeliveryResponse = z.infer<typeof DeliveryResponseSchema>;
export type ImpressionEvent = z.infer<typeof ImpressionEventSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

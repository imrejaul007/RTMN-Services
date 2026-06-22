import { logger } from '../../shared/logger';
/**
 * Hotel PMS Sync Engine
 *
 * Synchronizes maintenance requests from Hotel PMS with NEXABIZZ
 * Creates service RFQs and syncs completion status
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  HotelPMSConnection,
  MaintenanceRequest,
  ServiceCategory,
  SyncResult,
  SyncOptions,
  CreateServiceRFQInput,
  ServiceRequest,
  Priority,
  HotelLaundryConfig,
  LaundryServiceRequest,
} from './types';
import {
  HotelPMSClient,
  createHotelPMSClient,
  mapMaintenanceRequestToServiceRequest,
} from './client';

// ============================================================================
// Sync Configuration
// ============================================================================

export interface SyncEngineConfig {
  connection: HotelPMSConnection;
  supabase: SupabaseClient;
  rfqService: RFQService;
  vendorService: VendorService;
}

/**
 * Supabase client interface (for type safety)
 */
interface SupabaseClient {
  from: (table: string) => TableOperations;
}

interface TableOperations {
  select: (columns?: string) => {
    eq: (column: string, value: unknown) => Promise<{ data: unknown; error: unknown }>;
    in: (column: string, values: unknown[]) => Promise<{ data: unknown; error: unknown }>;
    gte: (column: string, value: unknown) => Promise<{ data: unknown; error: unknown }>;
    order: (column: string, options?: { ascending: boolean }) => {
      limit: (count: number) => Promise<{ data: unknown; error: unknown }>;
    };
  };
  insert: (data: unknown) => {
    select: (columns?: string) => Promise<{ data: unknown; error: unknown }>;
  };
  update: (data: unknown) => {
    eq: (column: string, value: unknown) => Promise<{ data: unknown; error: unknown }>;
  };
  upsert: (data: unknown) => Promise<{ data: unknown; error: unknown }>;
  delete: () => {
    eq: (column: string, value: unknown) => Promise<{ data: unknown; error: unknown }>;
  };
}

/**
 * RFQ Service interface
 */
interface RFQService {
  createRFQ: (input: CreateServiceRFQInput) => Promise<{ id: string; rfqNumber: string }>;
  updateRFQStatus: (rfqId: string, status: 'open' | 'closed' | 'awarded' | 'cancelled') => Promise<void>;
  linkServiceRequest: (rfqId: string, serviceRequestId: string) => Promise<void>;
}

/**
 * Vendor Service interface
 */
interface VendorService {
  findVendorsByCategory: (category: ServiceCategory) => Promise<string[]>;
  getPreferredVendor: (merchantId: string, category: ServiceCategory) => Promise<string | null>;
}

// ============================================================================
// RFQ Category Mapping
// ============================================================================

const RFQ_CATEGORY_MAP: Record<ServiceCategory, string> = {
  plumbing: 'Plumbing Services',
  electrical: 'Electrical Services',
  hvac: 'HVAC Services',
  cleaning: 'Cleaning Services',
  laundry: 'Laundry Services',
  general: 'General Maintenance',
};

const RFQ_UNIT_MAP: Record<ServiceCategory, string> = {
  plumbing: 'service',
  electrical: 'service',
  hvac: 'service',
  cleaning: 'service',
  laundry: 'kg',
  general: 'service',
};

// ============================================================================
// Sync Engine
// ============================================================================

export class HotelPMSSyncEngine {
  private client: HotelPMSClient;
  private connection: HotelPMSConnection;
  private supabase: SupabaseClient;
  private rfqService: RFQService;
  private vendorService: VendorService;

  constructor(config: SyncEngineConfig) {
    this.client = createHotelPMSClient(config.connection);
    this.connection = config.connection;
    this.supabase = config.supabase;
    this.rfqService = config.rfqService;
    this.vendorService = config.vendorService;
  }

  /**
   * Run full sync from Hotel PMS
   */
  async runSync(options?: SyncOptions): Promise<SyncResult> {
    const errors: string[] = [];
    let syncedRequests = 0;
    let createdRFQs = 0;

    try {
      // Update connection status to syncing
      await this.updateConnectionStatus('syncing');

      // Fetch maintenance requests from Hotel PMS
      const since = options?.since || this.getLastSyncDate();
      const categories = options?.categories;

      const response = await this.client.getMaintenanceRequests({
        since,
        limit: 100,
        ...(categories && categories.length > 0 ? { category: categories[0] } : {}),
      });

      if (!response.success || !response.data) {
        const errorMsg = response.error || 'Failed to fetch maintenance requests';
        errors.push(errorMsg);
        await this.updateConnectionStatus('error', errorMsg);
        return this.buildSyncResult(false, errors, syncedRequests, createdRFQs);
      }

      // Process each maintenance request
      for (const request of response.data) {
        try {
          // Filter by categories if specified
          if (categories && !categories.includes(request.category)) {
            continue;
          }

          // Sync the request
          const synced = await this.syncMaintenanceRequest(request);
          if (synced) {
            syncedRequests++;

            // Create RFQ for applicable categories
            if (this.shouldCreateRFQ(request)) {
              const rfqCreated = await this.createServiceRFQ(request);
              if (rfqCreated) {
                createdRFQs++;
              }
            }
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Request ${request.id}: ${msg}`);
        }
      }

      // Update connection status and last sync time
      await this.updateConnectionStatus('connected');
      await this.updateLastSyncTime();

      return this.buildSyncResult(true, errors, syncedRequests, createdRFQs);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Sync failed';
      errors.push(errorMsg);
      await this.updateConnectionStatus('error', errorMsg);
      return this.buildSyncResult(false, errors, syncedRequests, createdRFQs);
    }
  }

  /**
   * Sync a single maintenance request
   */
  async syncMaintenanceRequest(request: MaintenanceRequest): Promise<boolean> {
    // Check if already synced
    const { data: existing } = await this.supabase
      .from('hotel_pms_service_requests')
      .select('id, status')
      .eq('hotel_pms_request_id', request.id)
      .eq('connection_id', this.connection.id)
      .single();

    if (existing) {
      // Update existing record if status changed
      if ((existing as { status: string }).status !== request.status) {
        await this.supabase
          .from('hotel_pms_service_requests')
          .update({
            status: request.status,
            actual_cost: request.actualCost,
            completed_at: request.completedAt ? new Date(request.completedAt) : null,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', (existing as { id: string }).id);
      }
      return true;
    }

    // Create new service request
    const serviceRequestData = mapMaintenanceRequestToServiceRequest(
      request,
      this.connection.id,
      this.connection.merchantId
    );

    await this.supabase
      .from('hotel_pms_service_requests')
      .insert({
        ...serviceRequestData,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id');

    return true;
  }

  /**
   * Check if RFQ should be created for this request
   */
  private shouldCreateRFQ(request: MaintenanceRequest): boolean {
    // Only create RFQ for open/pending requests
    if (request.status !== 'pending' && request.status !== 'in_progress') {
      return false;
    }

    // Create RFQ for service categories
    const rfqCategories: ServiceCategory[] = ['plumbing', 'electrical', 'hvac', 'cleaning', 'laundry'];
    return rfqCategories.includes(request.category);
  }

  /**
   * Create service RFQ for a maintenance request
   */
  async createServiceRFQ(request: MaintenanceRequest): Promise<boolean> {
    // Check if RFQ already exists for this request
    const { data: existing } = await this.supabase
      .from('hotel_pms_service_requests')
      .select('rfq_id')
      .eq('hotel_pms_request_id', request.id)
      .not('rfq_id', 'is', null)
      .single();

    if (existing) {
      return false; // RFQ already exists
    }

    // Get service request ID
    const { data: serviceRequest } = await this.supabase
      .from('hotel_pms_service_requests')
      .select('id')
      .eq('hotel_pms_request_id', request.id)
      .single();

    if (!serviceRequest) {
      return false;
    }

    // Get preferred vendor for category
    const preferredVendorId = await this.vendorService.getPreferredVendor(
      this.connection.merchantId,
      request.category
    );

    // Create RFQ
    try {
      const rfqInput: CreateServiceRFQInput = {
        merchantId: this.connection.merchantId,
        serviceRequestId: (serviceRequest as { id: string }).id,
        category: request.category,
        title: `Hotel Service: ${request.title}`,
        description: request.description,
        quantity: 1,
        unit: RFQ_UNIT_MAP[request.category],
        targetPrice: request.estimatedCost,
        preferredVendorIds: preferredVendorId ? [preferredVendorId] : undefined,
      };

      const rfq = await this.rfqService.createRFQ(rfqInput);

      // Link RFQ to service request
      await this.supabase
        .from('hotel_pms_service_requests')
        .update({ rfq_id: rfq.id })
        .eq('id', (serviceRequest as { id: string }).id);

      return true;
    } catch (error) {
      logger.error('Failed to create RFQ:', error);
      return false;
    }
  }

  /**
   * Get the last sync date from connection
   */
  private getLastSyncDate(): Date | undefined {
    return this.connection.lastSyncAt || undefined;
  }

  /**
   * Update connection status
   */
  private async updateConnectionStatus(
    status: 'connected' | 'disconnected' | 'error' | 'syncing',
    error?: string
  ): Promise<void> {
    await this.supabase
      .from('hotel_pms_connections')
      .update({
        status,
        last_error: error,
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.connection.id);
  }

  /**
   * Update last sync time
   */
  private async updateLastSyncTime(): Promise<void> {
    await this.supabase
      .from('hotel_pms_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.connection.id);
  }

  /**
   * Build sync result object
   */
  private buildSyncResult(
    success: boolean,
    errors: string[],
    syncedRequests: number,
    createdRFQs: number
  ): SyncResult {
    return {
      success,
      connectionId: this.connection.id,
      syncedRequests,
      createdRFQs,
      errors,
      syncedAt: new Date(),
    };
  }

  /**
   * Sync service completion status back to Hotel PMS
   */
  async syncCompletionToHotelPMS(serviceRequestId: string): Promise<boolean> {
    const { data: serviceRequest } = await this.supabase
      .from('hotel_pms_service_requests')
      .select('*')
      .eq('id', serviceRequestId)
      .single();

    if (!serviceRequest) {
      throw new Error('Service request not found');
    }

    const sr = serviceRequest as unknown as ServiceRequest;

    // Update Hotel PMS with completion status
    const response = await this.client.updateMaintenanceRequest(sr.hotelPmsRequestId, {
      status: sr.status,
      actualCost: sr.actualCost,
      vendorId: sr.vendorId,
    });

    if (!response.success) {
      logger.error('Failed to update Hotel PMS:', response.error);
      return false;
    }

    // Update sync status
    await this.supabase
      .from('hotel_pms_service_requests')
      .update({ sync_status: 'synced', last_synced_at: new Date().toISOString() })
      .eq('id', serviceRequestId);

    return true;
  }
}

// ============================================================================
// Laundry Sync
// ============================================================================

export interface LaundrySyncEngineConfig {
  connection: HotelPMSConnection;
  supabase: SupabaseClient;
  rfqService: RFQService;
}

export class HotelLaundrySyncEngine {
  private client: HotelPMSClient;
  private connection: HotelPMSConnection;
  private supabase: SupabaseClient;
  private rfqService: RFQService;

  constructor(config: LaundrySyncEngineConfig) {
    this.client = createHotelPMSClient(config.connection);
    this.connection = config.connection;
    this.supabase = config.supabase;
    this.rfqService = config.rfqService;
  }

  /**
   * Get or create hotel laundry configuration
   */
  async getLaundryConfig(): Promise<HotelLaundryConfig | null> {
    const { data } = await this.supabase
      .from('hotel_laundry_configs')
      .select('*')
      .eq('connection_id', this.connection.id)
      .single();

    return (data as HotelLaundryConfig) || null;
  }

  /**
   * Update laundry configuration
   */
  async updateLaundryConfig(config: Partial<HotelLaundryConfig>): Promise<void> {
    const existing = await this.getLaundryConfig();

    if (existing) {
      await this.supabase
        .from('hotel_laundry_configs')
        .update({
          ...config,
          updated_at: new Date().toISOString(),
        })
        .eq('connection_id', this.connection.id);
    } else {
      await this.supabase
        .from('hotel_laundry_configs')
        .insert({
          id: uuidv4(),
          connection_id: this.connection.id,
          merchant_id: this.connection.merchantId,
          is_active: true,
          ...config,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }
  }

  /**
   * Create laundry service request
   */
  async createLaundryRequest(input: {
    quantity: number;
    unit: 'kg' | 'pieces';
    vendorId?: string;
    notes?: string;
  }): Promise<LaundryServiceRequest> {
    const config = await this.getLaundryConfig();
    if (!config) {
      throw new Error('Laundry configuration not found');
    }

    // Get or create RFQ for laundry service
    const rfqInput: CreateServiceRFQInput = {
      merchantId: this.connection.merchantId,
      serviceRequestId: '', // Will be linked later
      category: 'laundry',
      title: 'Hotel Laundry Service',
      description: `${input.quantity} ${input.unit} of laundry`,
      quantity: input.quantity,
      unit: input.unit,
      preferredVendorIds: input.vendorId ? [input.vendorId] : undefined,
    };

    const rfq = await this.rfqService.createRFQ(rfqInput);

    // Create laundry request
    const laundryRequest = {
      id: uuidv4(),
      hotel_laundry_config_id: config.id,
      merchant_id: this.connection.merchantId,
      vendor_id: input.vendorId,
      requested_at: new Date().toISOString(),
      quantity: input.quantity,
      unit: input.unit,
      status: 'pending',
      rfq_id: rfq.id,
      notes: input.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.supabase.from('hotel_laundry_requests').insert(laundryRequest);

    return laundryRequest as unknown as LaundryServiceRequest;
  }

  /**
   * Update laundry request status
   */
  async updateLaundryRequestStatus(
    requestId: string,
    status: LaundryServiceRequest['status']
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'picked_up') {
      updates.pickup_date = new Date().toISOString();
    } else if (status === 'delivered' || status === 'completed') {
      updates.delivery_date = new Date().toISOString();
    }

    await this.supabase
      .from('hotel_laundry_requests')
      .update(updates)
      .eq('id', requestId);
  }

  /**
   * Get laundry vendors
   */
  async getLaundryVendors(): Promise<Array<{
    id: string;
    name: string;
    rating: number;
    isVerified: boolean;
  }>> {
    const response = await this.client.getVendors('laundry');

    if (!response.success || !response.data) {
      return [];
    }

    return response.data.map((v) => ({
      id: v.id,
      name: v.name,
      rating: v.rating,
      isVerified: v.isVerified,
    }));
  }
}

// ============================================================================
// Sync Engine Factory
// ============================================================================

export interface SyncEngineDependencies {
  supabase: SupabaseClient;
  rfqService: RFQService;
  vendorService: VendorService;
}

/**
 * Create sync engine from connection
 */
export function createSyncEngine(
  connection: HotelPMSConnection,
  dependencies: SyncEngineDependencies
): HotelPMSSyncEngine {
  return new HotelPMSSyncEngine({
    connection,
    ...dependencies,
  });
}

/**
 * Create laundry sync engine from connection
 */
export function createLaundrySyncEngine(
  connection: HotelPMSConnection,
  dependencies: Pick<SyncEngineDependencies, 'supabase' | 'rfqService'>
): HotelLaundrySyncEngine {
  return new HotelLaundrySyncEngine({
    connection,
    ...dependencies,
  });
}

export type { SyncEngineConfig, SyncEngineDependencies };

import { logger } from '../../shared/logger';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  ServiceOrder,
  ServiceOrderItem,
  ServiceOrderNote,
  ServiceOrderHistoryEntry,
  ServiceOrderStatus,
} from '@nextabizz/shared-types';
import { SERVICE_ORDER_STATUS_TRANSITIONS } from '@nextabizz/shared-types';

// Database client singleton
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdmin;
}

// UUID validation
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// Check if status transition is valid
export function isValidStatusTransition(
  currentStatus: ServiceOrderStatus,
  newStatus: ServiceOrderStatus
): boolean {
  const allowedTransitions = SERVICE_ORDER_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions?.includes(newStatus) ?? false;
}

// Transform database record to ServiceOrder entity (without items and notes - those are fetched separately)
function transformServiceOrder(
  record: Record<string, unknown>,
  items: ServiceOrderItem[] = [],
  notes: ServiceOrderNote[] = []
): ServiceOrder {
  // Parse schedule if it's stored as JSON string
  let schedule: ServiceOrder['schedule'];
  if (record.schedule) {
    if (typeof record.schedule === 'string') {
      try {
        const parsed = JSON.parse(record.schedule);
        schedule = {
          ...parsed,
          scheduledDate: new Date(parsed.scheduledDate),
          recurring: parsed.recurring ? {
            ...parsed.recurring,
            endDate: parsed.recurring.endDate ? new Date(parsed.recurring.endDate) : undefined,
          } : undefined,
        };
      } catch {
        schedule = undefined;
      }
    } else {
      schedule = record.schedule as ServiceOrder['schedule'];
    }
  } else {
    schedule = undefined;
  }

  return {
    id: record.id as string,
    orderNumber: record.order_number as string,
    merchantId: record.merchant_id as string,
    merchantName: record.merchant_name as string || 'Merchant',
    serviceProviderId: record.service_provider_id as string | undefined,
    serviceProviderName: record.service_provider_name as string | undefined,
    status: record.status as ServiceOrderStatus,
    priority: record.priority as 'low' | 'medium' | 'high' | 'urgent',
    title: record.title as string,
    description: record.description as string | undefined,
    schedule,
    items,
    notes,
    subtotal: record.subtotal as number,
    tax: record.tax as number,
    discount: record.discount as number,
    total: record.total as number,
    paymentStatus: record.payment_status as 'pending' | 'partial' | 'paid',
    paymentMethod: record.payment_method as 'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit' | undefined,
    scheduledStart: record.scheduled_start ? new Date(record.scheduled_start as string) : undefined,
    scheduledEnd: record.scheduled_end ? new Date(record.scheduled_end as string) : undefined,
    actualStart: record.actual_start ? new Date(record.actual_start as string) : undefined,
    actualEnd: record.actual_end ? new Date(record.actual_end as string) : undefined,
    cancellationReason: record.cancellation_reason as string | undefined,
    completionNotes: record.completion_notes as string | undefined,
    createdAt: new Date(record.created_at as string),
    updatedAt: new Date(record.updated_at as string),
  };
}

// Transform database record to ServiceOrderItem entity
function transformServiceOrderItem(record: Record<string, unknown>): ServiceOrderItem {
  return {
    id: record.id as string,
    serviceOrderId: record.service_order_id as string,
    serviceName: record.service_name as string,
    description: record.description as string | undefined,
    quantity: record.quantity as number,
    unit: record.unit as string,
    unitPrice: record.unit_price as number,
    total: record.total as number,
    createdAt: new Date(record.created_at as string),
  };
}

// Transform database record to ServiceOrderNote entity
function transformServiceOrderNote(record: Record<string, unknown>): ServiceOrderNote {
  return {
    id: record.id as string,
    serviceOrderId: record.service_order_id as string,
    authorId: record.author_id as string,
    authorName: record.author_name as string,
    authorType: record.author_type as 'merchant' | 'service_provider' | 'system',
    content: record.content as string,
    isInternal: record.is_internal as boolean,
    createdAt: new Date(record.created_at as string),
    updatedAt: new Date(record.updated_at as string),
  };
}

// Transform database record to ServiceOrderHistoryEntry entity
function transformHistoryEntry(record: Record<string, unknown>): ServiceOrderHistoryEntry {
  return {
    id: record.id as string,
    serviceOrderId: record.service_order_id as string,
    action: record.action as ServiceOrderHistoryEntry['action'],
    description: record.description as string,
    performedBy: record.performed_by as string,
    performedByName: record.performed_by_name as string,
    performedByType: record.performed_by_type as ServiceOrderHistoryEntry['performedByType'],
    oldValue: record.old_value as string | undefined,
    newValue: record.new_value as string | undefined,
    metadata: record.metadata as Record<string, unknown> | undefined,
    createdAt: new Date(record.created_at as string),
  };
}

// Create a new service order
export async function createServiceOrder(
  data: {
    merchantId: string;
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    serviceProviderId?: string;
    paymentMethod?: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit';
    schedule?: {
      scheduledDate: Date;
      startTime: string;
      endTime: string;
      recurring?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: number;
        endDate?: Date;
        daysOfWeek?: number[];
        dayOfMonth?: number;
      };
    };
    items: Array<{
      serviceName: string;
      description?: string;
      quantity: number;
      unit: string;
      unitPrice: number;
    }>;
    notes?: Array<{
      content: string;
      isInternal?: boolean;
    }>;
  }
): Promise<{ order: ServiceOrder; items: ServiceOrderItem[]; notes: ServiceOrderNote[]; history: ServiceOrderHistoryEntry[] }> {
  const supabase = getSupabaseAdmin();
  const orderId = crypto.randomUUID();
  const orderNumber = `SO-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 4).toUpperCase()}`;
  const now = new Date().toISOString();

  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxRate = 0.18; // 18% GST
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Insert service order
  const orderRecord = {
    id: orderId,
    order_number: orderNumber,
    merchant_id: data.merchantId,
    merchant_name: 'Merchant',
    service_provider_id: data.serviceProviderId || null,
    service_provider_name: data.serviceProviderId ? 'Service Provider' : null,
    status: 'pending' as const,
    priority: data.priority || 'medium',
    title: data.title,
    description: data.description || null,
    schedule: data.schedule ? JSON.stringify(data.schedule) : null,
    subtotal,
    tax,
    discount: 0,
    total,
    payment_status: 'pending' as const,
    payment_method: data.paymentMethod || null,
    scheduled_start: data.schedule ? new Date(data.schedule.scheduledDate).toISOString() : null,
    created_at: now,
    updated_at: now,
  };

  const { data: insertedOrder, error: orderError } = await supabase
    .from('service_orders')
    .insert(orderRecord)
    .select()
    .single();

  if (orderError) {
    throw new Error(`Failed to create service order: ${orderError.message}`);
  }

  // Insert items
  const insertedItems: ServiceOrderItem[] = [];
  if (data.items.length > 0) {
    const itemRecords = data.items.map((item) => ({
      id: crypto.randomUUID(),
      service_order_id: orderId,
      service_name: item.serviceName,
      description: item.description || null,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice,
      total: item.quantity * item.unitPrice,
      created_at: now,
    }));

    const { data: insertedItemsData, error: itemsError } = await supabase
      .from('service_order_items')
      .insert(itemRecords)
      .select();

    if (itemsError) {
      throw new Error(`Failed to create service order items: ${itemsError.message}`);
    }

    insertedItems.push(...(insertedItemsData || []).map(transformServiceOrderItem));
  }

  // Insert notes
  const insertedNotes: ServiceOrderNote[] = [];
  if (data.notes && data.notes.length > 0) {
    const noteRecords = data.notes.map((note) => ({
      id: crypto.randomUUID(),
      service_order_id: orderId,
      author_id: data.merchantId,
      author_name: 'Merchant',
      author_type: 'merchant' as const,
      content: note.content,
      is_internal: note.isInternal || false,
      created_at: now,
      updated_at: now,
    }));

    const { data: insertedNotesData, error: notesError } = await supabase
      .from('service_order_notes')
      .insert(noteRecords)
      .select();

    if (notesError) {
      throw new Error(`Failed to create service order notes: ${notesError.message}`);
    }

    insertedNotes.push(...(insertedNotesData || []).map(transformServiceOrderNote));
  }

  // Create initial history entry
  const historyEntries = await createHistoryEntry(
    orderId,
    'created',
    `Service order ${orderNumber} created`,
    data.merchantId,
    'Merchant',
    'merchant'
  );

  // Add scheduled history if schedule was provided
  if (data.schedule) {
    await createHistoryEntry(
      orderId,
      'scheduled',
      `Service scheduled for ${new Date(data.schedule.scheduledDate).toLocaleDateString()} from ${data.schedule.startTime} to ${data.schedule.endTime}`,
      data.merchantId,
      'Merchant',
      'merchant'
    );
  }

  return {
    order: transformServiceOrder(insertedOrder, insertedItems, insertedNotes),
    items: insertedItems,
    notes: insertedNotes,
    history: historyEntries,
  };
}

// Get service order by ID
export async function getServiceOrderById(orderId: string): Promise<{
  order: ServiceOrder | null;
  items: ServiceOrderItem[];
  notes: ServiceOrderNote[];
  history: ServiceOrderHistoryEntry[];
}> {
  const supabase = getSupabaseAdmin();

  const { data: order, error } = await supabase
    .from('service_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { order: null, items: [], notes: [], history: [] };
    }
    throw new Error(`Failed to fetch service order: ${error.message}`);
  }

  const [itemsResult, notesResult, historyResult] = await Promise.all([
    supabase.from('service_order_items').select('*').eq('service_order_id', orderId).order('created_at', { ascending: true }),
    supabase.from('service_order_notes').select('*').eq('service_order_id', orderId).order('created_at', { ascending: true }),
    supabase.from('service_order_history').select('*').eq('service_order_id', orderId).order('created_at', { ascending: true }),
  ]);

  const items = (itemsResult.data || []).map(transformServiceOrderItem);
  const notes = (notesResult.data || []).map(transformServiceOrderNote);
  const history = (historyResult.data || []).map(transformHistoryEntry);

  return {
    order: transformServiceOrder(order, items, notes),
    items,
    notes,
    history,
  };
}

// List service orders with pagination and filters
export async function listServiceOrders(params: {
  page: number;
  limit: number;
  merchantId?: string;
  serviceProviderId?: string;
  status?: ServiceOrderStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  paymentStatus?: 'pending' | 'partial' | 'paid';
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  orders: ServiceOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('service_orders')
    .select('*', { count: 'exact' });

  // Apply filters
  if (params.merchantId) {
    query = query.eq('merchant_id', params.merchantId);
  }
  if (params.serviceProviderId) {
    query = query.eq('service_provider_id', params.serviceProviderId);
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.priority) {
    query = query.eq('priority', params.priority);
  }
  if (params.paymentStatus) {
    query = query.eq('payment_status', params.paymentStatus);
  }
  if (params.startDate) {
    query = query.gte('created_at', params.startDate);
  }
  if (params.endDate) {
    query = query.lte('created_at', params.endDate);
  }
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,order_number.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }

  // Apply sorting
  const sortColumn = params.sortBy || 'created_at';
  const sortColumnMap: Record<string, string> = {
    createdAt: 'created_at',
    scheduledDate: 'scheduled_start',
    priority: 'priority',
    total: 'total',
    status: 'status',
  };
  query = query.order(sortColumnMap[sortColumn] || 'created_at', { ascending: params.sortOrder === 'asc' });

  // Apply pagination
  const from = (params.page - 1) * params.limit;
  const to = from + params.limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list service orders: ${error.message}`);
  }

  const orders = (data || []).map((record) => transformServiceOrder(record, [], []));
  const total = count || 0;
  const totalPages = Math.ceil(total / params.limit);

  return {
    orders,
    total,
    page: params.page,
    limit: params.limit,
    totalPages,
  };
}

// Update service order
export async function updateServiceOrder(
  orderId: string,
  data: Partial<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    serviceProviderId: string;
    paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit';
    schedule: {
      scheduledDate: string | Date;
      startTime: string;
      endTime: string;
      recurring?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: number;
        endDate?: string | Date;
        daysOfWeek?: number[];
        dayOfMonth?: number;
      };
    };
    items: Array<{
      serviceName: string;
      description?: string;
      quantity: number;
      unit: string;
      unitPrice: number;
    }>;
  }>
): Promise<{ order: ServiceOrder; items: ServiceOrderItem[]; history: ServiceOrderHistoryEntry[] }> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Get current order
  const { order: existingOrder } = await getServiceOrderById(orderId);
  if (!existingOrder) {
    throw new Error('Service order not found');
  }

  // Build update record
  const updateRecord: Record<string, unknown> = {
    updated_at: now,
  };

  const changes: string[] = [];

  if (data.title !== undefined && data.title !== existingOrder.title) {
    updateRecord.title = data.title;
    changes.push(`title: "${existingOrder.title}" -> "${data.title}"`);
  }

  if (data.description !== undefined && data.description !== existingOrder.description) {
    updateRecord.description = data.description;
    changes.push('description updated');
  }

  if (data.priority !== undefined && data.priority !== existingOrder.priority) {
    updateRecord.priority = data.priority;
    changes.push(`priority: "${existingOrder.priority}" -> "${data.priority}"`);
  }

  if (data.serviceProviderId !== undefined && data.serviceProviderId !== existingOrder.serviceProviderId) {
    updateRecord.service_provider_id = data.serviceProviderId;
    updateRecord.service_provider_name = 'Service Provider';
    changes.push('service provider assigned');
  }

  if (data.paymentMethod !== undefined && data.paymentMethod !== existingOrder.paymentMethod) {
    updateRecord.payment_method = data.paymentMethod;
    changes.push(`payment method: "${existingOrder.paymentMethod || 'none'}" -> "${data.paymentMethod}"`);
  }

  if (data.schedule !== undefined) {
    updateRecord.schedule = JSON.stringify(data.schedule);
    updateRecord.scheduled_start = new Date(data.schedule.scheduledDate).toISOString();
    changes.push(`schedule updated to ${new Date(data.schedule.scheduledDate).toLocaleDateString()}`);
  }

  let newItems: ServiceOrderItem[] = [];
  if (data.items !== undefined) {
    // Delete existing items
    await supabase.from('service_order_items').delete().eq('service_order_id', orderId);

    // Calculate new totals
    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxRate = 0.18;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    updateRecord.subtotal = subtotal;
    updateRecord.tax = tax;
    updateRecord.total = total;

    // Insert new items
    const itemRecords = data.items.map((item) => ({
      id: crypto.randomUUID(),
      service_order_id: orderId,
      service_name: item.serviceName,
      description: item.description || null,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice,
      total: item.quantity * item.unitPrice,
      created_at: now,
    }));

    const { data: insertedItemsData } = await supabase
      .from('service_order_items')
      .insert(itemRecords)
      .select();

    newItems = (insertedItemsData || []).map(transformServiceOrderItem);
    changes.push('items updated');
  }

  // Update order
  const { data: updatedOrder, error } = await supabase
    .from('service_orders')
    .update(updateRecord)
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update service order: ${error.message}`);
  }

  // Create history entry if there were changes
  if (changes.length > 0) {
    await createHistoryEntry(
      orderId,
      'updated',
      `Order updated: ${changes.join(', ')}`,
      'system',
      'System',
      'system'
    );
  }

  // Get updated history
  const { data: historyData } = await supabase
    .from('service_order_history')
    .select('*')
    .eq('service_order_id', orderId)
    .order('created_at', { ascending: true });

  return {
    order: transformServiceOrder(updatedOrder, newItems, existingOrder.notes),
    items: newItems,
    history: (historyData || []).map(transformHistoryEntry),
  };
}

// Update service order status
export async function updateServiceOrderStatus(
  orderId: string,
  newStatus: ServiceOrderStatus,
  performedBy: string,
  performedByName: string,
  performedByType: 'merchant' | 'service_provider' | 'system' | 'admin',
  notes?: string
): Promise<{ order: ServiceOrder; history: ServiceOrderHistoryEntry[] }> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Get current order
  const { order: existingOrder } = await getServiceOrderById(orderId);
  if (!existingOrder) {
    throw new Error('Service order not found');
  }

  // Validate status transition
  if (!isValidStatusTransition(existingOrder.status, newStatus)) {
    throw new Error(`Cannot transition from ${existingOrder.status} to ${newStatus}`);
  }

  // Build update record
  const updateRecord: Record<string, unknown> = {
    status: newStatus,
    updated_at: now,
  };

  if (newStatus === 'cancelled') {
    updateRecord.cancellation_reason = notes || null;
  }

  if (newStatus === 'completed') {
    updateRecord.completion_notes = notes || null;
    updateRecord.actual_end = now;
  }

  if (newStatus === 'in_progress' && !existingOrder.actualStart) {
    updateRecord.actual_start = now;
  }

  // Update order
  const { data: updatedOrder, error } = await supabase
    .from('service_orders')
    .update(updateRecord)
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update service order status: ${error.message}`);
  }

  // Create history entry
  await createHistoryEntry(
    orderId,
    'status_changed',
    `Status changed from ${existingOrder.status} to ${newStatus}${notes ? `: ${notes}` : ''}`,
    performedBy,
    performedByName,
    performedByType,
    existingOrder.status,
    newStatus
  );

  // Get updated history
  const { data: historyData } = await supabase
    .from('service_order_history')
    .select('*')
    .eq('service_order_id', orderId)
    .order('created_at', { ascending: true });

  return {
    order: transformServiceOrder(updatedOrder, existingOrder.items, existingOrder.notes),
    history: (historyData || []).map(transformHistoryEntry),
  };
}

// Add note to service order
export async function addServiceOrderNote(
  orderId: string,
  data: {
    content: string;
    isInternal?: boolean;
    authorId: string;
    authorName: string;
    authorType: 'merchant' | 'service_provider' | 'system';
  }
): Promise<{ order: ServiceOrder; note: ServiceOrderNote; history: ServiceOrderHistoryEntry[] }> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Check if order exists
  const { order: existingOrder } = await getServiceOrderById(orderId);
  if (!existingOrder) {
    throw new Error('Service order not found');
  }

  const noteId = crypto.randomUUID();
  const noteRecord = {
    id: noteId,
    service_order_id: orderId,
    author_id: data.authorId,
    author_name: data.authorName,
    author_type: data.authorType,
    content: data.content,
    is_internal: data.isInternal || false,
    created_at: now,
    updated_at: now,
  };

  const { data: insertedNote, error } = await supabase
    .from('service_order_notes')
    .insert(noteRecord)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add note: ${error.message}`);
  }

  // Create history entry
  await createHistoryEntry(
    orderId,
    'note_added',
    `Note added by ${data.authorName}`,
    data.authorId,
    data.authorName,
    data.authorType
  );

  // Get updated history
  const { data: historyData } = await supabase
    .from('service_order_history')
    .select('*')
    .eq('service_order_id', orderId)
    .order('created_at', { ascending: true });

  return {
    order: existingOrder,
    note: transformServiceOrderNote(insertedNote),
    history: (historyData || []).map(transformHistoryEntry),
  };
}

// Delete service order
export async function deleteServiceOrder(orderId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  // Check if order exists and is pending
  const { order } = await getServiceOrderById(orderId);
  if (!order) {
    throw new Error('Service order not found');
  }

  if (order.status !== 'pending') {
    throw new Error('Only pending orders can be deleted');
  }

  // Delete related records
  await Promise.all([
    supabase.from('service_order_items').delete().eq('service_order_id', orderId),
    supabase.from('service_order_notes').delete().eq('service_order_id', orderId),
    supabase.from('service_order_history').delete().eq('service_order_id', orderId),
  ]);

  // Delete order
  const { error } = await supabase.from('service_orders').delete().eq('id', orderId);

  if (error) {
    throw new Error(`Failed to delete service order: ${error.message}`);
  }

  return true;
}

// Create history entry helper
async function createHistoryEntry(
  serviceOrderId: string,
  action: ServiceOrderHistoryEntry['action'],
  description: string,
  performedBy: string,
  performedByName: string,
  performedByType: ServiceOrderHistoryEntry['performedByType'],
  oldValue?: string,
  newValue?: string
): Promise<ServiceOrderHistoryEntry[]> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const historyRecord = {
    id: crypto.randomUUID(),
    service_order_id: serviceOrderId,
    action,
    description,
    performed_by: performedBy,
    performed_by_name: performedByName,
    performed_by_type: performedByType,
    old_value: oldValue || null,
    new_value: newValue || null,
    created_at: now,
  };

  const { data, error } = await supabase
    .from('service_order_history')
    .insert(historyRecord)
    .select();

  if (error) {
    logger.error('Failed to create history entry:', error);
    return [];
  }

  return (data || []).map(transformHistoryEntry);
}

import { logger } from '../../shared/logger';
import { NextRequest, NextResponse } from 'next/server';
import {
  CreateServiceOrderRequestSchema,
  ListServiceOrdersQuerySchema,
  ServiceOrderStatus,
} from '@nextabizz/shared-types';
import {
  listServiceOrders,
  createServiceOrder,
  isValidUUID,
} from '@/lib/service-order-db';
import type {
  ServiceOrder,
  ServiceOrderItem,
  ServiceOrderNote,
  ServiceOrderHistoryEntry,
  PaginatedResponse,
  CreatedResponse,
  ValidationErrorResponse,
} from '@nextabizz/shared-types';

// GET /api/service-orders - List all service orders
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate query parameters
    const queryResult = ListServiceOrdersQuerySchema.safeParse({
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      merchantId: searchParams.get('merchantId') || undefined,
      serviceProviderId: searchParams.get('serviceProviderId') || undefined,
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      paymentStatus: searchParams.get('paymentStatus') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: queryResult.error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
        } as ValidationErrorResponse,
        { status: 400 }
      );
    }

    const { page, limit, merchantId, serviceProviderId, status, priority, paymentStatus, startDate, endDate, search, sortBy, sortOrder } = queryResult.data;

    const result = await listServiceOrders({
      page,
      limit,
      merchantId,
      serviceProviderId,
      status: status as ServiceOrderStatus | undefined,
      priority: priority as 'low' | 'medium' | 'high' | 'urgent' | undefined,
      paymentStatus: paymentStatus as 'pending' | 'partial' | 'paid' | undefined,
      startDate,
      endDate,
      search,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    return NextResponse.json({
      success: true,
      data: result.orders,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.page < result.totalPages,
        hasPrevPage: result.page > 1,
      },
    } as PaginatedResponse<ServiceOrder>);
  } catch (error) {
    logger.error('Error listing service orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list service orders',
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/service-orders - Create a new service order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = CreateServiceOrderRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validationResult.error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
        } as ValidationErrorResponse,
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validate merchantId if provided
    if (data.merchantId && !isValidUUID(data.merchantId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid merchant ID format',
          },
        },
        { status: 400 }
      );
    }

    try {
      // Convert schedule dates from string to Date
      const schedule = data.schedule ? {
        scheduledDate: new Date(data.schedule.scheduledDate),
        startTime: data.schedule.startTime,
        endTime: data.schedule.endTime,
        recurring: data.schedule.recurring ? {
          ...data.schedule.recurring,
          endDate: data.schedule.recurring.endDate ? new Date(data.schedule.recurring.endDate) : undefined,
        } : undefined,
      } : undefined;

      const result = await createServiceOrder({
        merchantId: data.merchantId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        serviceProviderId: data.serviceProviderId,
        paymentMethod: data.paymentMethod,
        schedule,
        items: data.items,
        notes: data.notes,
      });

      const responseData = {
        ...result.order,
        items: result.items,
        notes: result.notes,
        history: result.history,
      };

      return NextResponse.json(
        {
          success: true,
          data: responseData,
          message: 'Service order created successfully',
        } as CreatedResponse<typeof responseData>,
        { status: 201 }
      );
    } catch (dbError) {
      const error = dbError as Error;
      logger.error('Database error:', error);

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: error.message,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error creating service order:', error);

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid JSON in request body',
            details: [],
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create service order',
        },
      },
      { status: 500 }
    );
  }
}

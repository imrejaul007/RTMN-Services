import { logger } from '../../shared/logger';
import { NextRequest, NextResponse } from 'next/server';
import {
  CreateServiceQuoteRequestSchema,
  ListServiceQuotesQuerySchema,
  QuoteComparisonQuerySchema,
} from '@nextabizz/shared-types';
import {
  createServiceQuote,
  listServiceQuotes,
  getQuoteComparison,
  isValidUUID,
} from '@/lib/service-quote-db';
import type {
  ServiceQuote,
  MaterialLineItem,
  PaginatedResponse,
  ApiResponse,
  CreatedResponse,
  ValidationErrorResponse,
  NotFoundResponse,
} from '@nextabizz/shared-types';

// GET /api/service-quotes - List all quotes or get comparison
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Check if this is a comparison request
    const serviceRfqId = searchParams.get('serviceRfqId');
    const compare = searchParams.get('compare');

    if (compare === 'true' && serviceRfqId) {
      // Validate serviceRfqId format
      if (!isValidUUID(serviceRfqId)) {
        const errorResponse: ValidationErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid service RFQ ID format',
            details: [
              {
                field: 'serviceRfqId',
                message: 'Must be a valid UUID',
                code: 'invalid_format',
              },
            ],
          },
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }

      // Validate query params
      const queryResult = QuoteComparisonQuerySchema.safeParse({
        serviceRfqId,
      });

      if (!queryResult.success) {
        const errorResponse: ValidationErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: queryResult.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
              code: e.code,
            })),
          },
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }

      try {
        const comparison = await getQuoteComparison(serviceRfqId);

        const response: ApiResponse<typeof comparison> = {
          success: true,
          data: comparison,
          message: 'Quote comparison retrieved successfully',
        };
        return NextResponse.json(response);
      } catch (dbError) {
        const error = dbError as Error;
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
    }

    // Standard list request
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const merchantId = searchParams.get('merchantId') || undefined;
    const vendorId = searchParams.get('vendorId') || undefined;
    const status = searchParams.get('status') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const sortBy = searchParams.get('sortBy') || undefined;
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined;

    // Validate query params
    const queryResult = ListServiceQuotesQuerySchema.safeParse({
      page,
      limit,
      merchantId,
      vendorId,
      serviceRfqId,
      status,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });

    if (!queryResult.success) {
      const errorResponse: ValidationErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: queryResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    try {
      const result = await listServiceQuotes({
        page,
        limit,
        merchantId,
        vendorId,
        serviceRfqId: serviceRfqId || undefined,
        status: status as any,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      });

      const response: PaginatedResponse<ServiceQuote> = {
        success: true,
        data: result.quotes,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasNextPage: result.page < result.totalPages,
          hasPrevPage: result.page > 1,
        },
        message: 'Service quotes retrieved successfully',
      };
      return NextResponse.json(response);
    } catch (dbError) {
      const error = dbError as Error;
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
    logger.error('Error in GET /api/service-quotes:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/service-quotes - Create a new quote
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = CreateServiceQuoteRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errorResponse: ValidationErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const data = validationResult.data;

    // Validate UUIDs
    if (!isValidUUID(data.serviceRfqId)) {
      const errorResponse: ValidationErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid service RFQ ID format',
          details: [
            {
              field: 'serviceRfqId',
              message: 'Must be a valid UUID',
              code: 'invalid_format',
            },
          ],
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (!isValidUUID(data.vendorId)) {
      const errorResponse: ValidationErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid vendor ID format',
          details: [
            {
              field: 'vendorId',
              message: 'Must be a valid UUID',
              code: 'invalid_format',
            },
          ],
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (!isValidUUID(data.merchantId)) {
      const errorResponse: ValidationErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid merchant ID format',
          details: [
            {
              field: 'merchantId',
              message: 'Must be a valid UUID',
              code: 'invalid_format',
            },
          ],
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Prepare quote data
    const quoteData = {
      serviceRfqId: data.serviceRfqId,
      vendorId: data.vendorId,
      merchantId: data.merchantId,
      status: 'draft' as const,
      proposedStartDate: data.proposedStartDate ? new Date(data.proposedStartDate) : undefined,
      proposedEndDate: data.proposedEndDate ? new Date(data.proposedEndDate) : undefined,
      estimatedDurationDays: data.estimatedDurationDays,
      estimatedHours: data.estimatedHours,
      laborCost: data.laborCost,
      materialCost: data.materialCost,
      equipmentCost: data.equipmentCost,
      totalPrice: data.totalPrice,
      currency: data.currency || 'INR',
      paymentTerms: data.paymentTerms,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      warrantyInfo: data.warrantyInfo,
      notes: data.notes,
    };

    // Prepare materials
    const materials = data.materials?.map((m) => ({
      description: m.description,
      quantity: m.quantity,
      unit: m.unit,
      unitPrice: m.unitPrice,
      isOptional: m.isOptional || false,
      brand: m.brand,
      supplier: m.supplier,
      deliveryDate: m.deliveryDate,
    }));

    try {
      const result = await createServiceQuote(quoteData, materials);

      const response: CreatedResponse<{
        quote: ServiceQuote;
        materials: MaterialLineItem[];
      }> = {
        success: true,
        data: {
          quote: result.quote,
          materials: result.materials,
        },
        message: 'Service quote created successfully',
      };
      return NextResponse.json(response, { status: 201 });
    } catch (dbError) {
      const error = dbError as Error;
      logger.error('Database error:', error);

      // Check for specific error types
      if (error.message.includes('Foreign key violation')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'REFERENCE_ERROR',
              message: 'Referenced entity does not exist',
              details: {
                hint: 'Please verify the serviceRfqId, vendorId, and merchantId exist',
              },
            },
          },
          { status: 400 }
        );
      }

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
    logger.error('Error in POST /api/service-quotes:', error);

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      const errorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid JSON in request body',
          details: [],
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}

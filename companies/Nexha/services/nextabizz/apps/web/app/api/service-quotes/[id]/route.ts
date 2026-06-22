import { logger } from '../../shared/logger';
import { NextRequest, NextResponse } from 'next/server';
import {
  UpdateServiceQuoteRequestSchema,
  AcceptQuoteRequestSchema,
  RejectQuoteRequestSchema,
  SubmitQuoteRequestSchema,
} from '@nextabizz/shared-types';
import {
  getServiceQuoteById,
  updateServiceQuote,
  deleteServiceQuote,
  isValidUUID,
  isValidStatusTransition,
  acceptQuoteAndCreateServiceOrder,
} from '@/lib/service-quote-db';
import type {
  ServiceQuote,
  MaterialLineItem,
  ApiResponse,
  UpdatedResponse,
  DeletedResponse,
  ValidationErrorResponse,
  NotFoundResponse,
  ConflictResponse,
} from '@nextabizz/shared-types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/service-quotes/[id] - Get single quote with materials
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Validate UUID
    if (!isValidUUID(id)) {
      const errorResponse: ValidationErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid quote ID format',
          details: [
            {
              field: 'id',
              message: 'Must be a valid UUID',
              code: 'invalid_format',
            },
          ],
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    try {
      const result = await getServiceQuoteById(id);

      if (!result.quote) {
        const errorResponse: NotFoundResponse = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Service quote not found',
            resource: 'service_quote',
            id,
          },
        };
        return NextResponse.json(errorResponse, { status: 404 });
      }

      const response: ApiResponse<{
        quote: ServiceQuote;
        materials: MaterialLineItem[];
      }> = {
        success: true,
        data: {
          quote: result.quote,
          materials: result.materials,
        },
        message: 'Service quote retrieved successfully',
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
    logger.error('Error in GET /api/service-quotes/[id]:', error);
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

// PUT /api/service-quotes/[id] - Update quote or perform actions (submit, accept, reject)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Validate UUID
    if (!isValidUUID(id)) {
      const errorResponse: ValidationErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid quote ID format',
          details: [
            {
              field: 'id',
              message: 'Must be a valid UUID',
              code: 'invalid_format',
            },
          ],
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    // Handle action-based updates
    if (action) {
      return handleQuoteAction(id, action, data);
    }

    // Standard update
    return handleQuoteUpdate(id, body);
  } catch (error) {
    logger.error('Error in PUT /api/service-quotes/[id]:', error);

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

// Handle specific quote actions
async function handleQuoteAction(
  quoteId: string,
  action: string,
  data: Record<string, unknown>
): Promise<NextResponse> {
  switch (action) {
    case 'submit': {
      // Submit quote for review
      const validationResult = SubmitQuoteRequestSchema.safeParse(data);

      if (!validationResult.success) {
        const errorResponse: ValidationErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data for submit action',
            details: validationResult.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
              code: e.code,
            })),
          },
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }

      try {
        // Get current quote
        const { quote: existingQuote } = await getServiceQuoteById(quoteId);

        if (!existingQuote) {
          const errorResponse: NotFoundResponse = {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Service quote not found',
              resource: 'service_quote',
              id: quoteId,
            },
          };
          return NextResponse.json(errorResponse, { status: 404 });
        }

        // Validate status transition
        if (!isValidStatusTransition(existingQuote.status, 'submitted')) {
          const errorResponse: ConflictResponse = {
            success: false,
            error: {
              code: 'CONFLICT',
              message: `Cannot submit quote with status: ${existingQuote.status}`,
              existingResource: 'quote_status',
            },
          };
          return NextResponse.json(errorResponse, { status: 409 });
        }

        // Update status to submitted
        const now = new Date();
        const result = await updateServiceQuote(quoteId, {
          status: 'submitted',
          submittedAt: now,
        });

        const response: UpdatedResponse<{
          quote: ServiceQuote;
          materials: MaterialLineItem[];
        }> = {
          success: true,
          data: {
            quote: result.quote,
            materials: result.materials,
          },
          message: 'Quote submitted successfully',
          updated: true,
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

    case 'accept': {
      // Accept quote and create service order
      const validationResult = AcceptQuoteRequestSchema.safeParse(data);

      if (!validationResult.success) {
        const errorResponse: ValidationErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data for accept action',
            details: validationResult.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
              code: e.code,
            })),
          },
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }

      try {
        const { quote, serviceOrderId } = await acceptQuoteAndCreateServiceOrder(
          quoteId,
          validationResult.data.acceptedBy,
          validationResult.data.notes
        );

        const response: UpdatedResponse<{
          quote: ServiceQuote;
          serviceOrderId: string;
        }> = {
          success: true,
          data: {
            quote,
            serviceOrderId,
          },
          message: 'Quote accepted and service order created successfully',
          updated: true,
        };
        return NextResponse.json(response);
      } catch (dbError) {
        const error = dbError as Error;

        // Check for not found
        if (error.message.includes('not found')) {
          const errorResponse: NotFoundResponse = {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
              resource: 'service_quote',
              id: quoteId,
            },
          };
          return NextResponse.json(errorResponse, { status: 404 });
        }

        // Check for invalid status transition
        if (error.message.includes('Cannot accept')) {
          const errorResponse: ConflictResponse = {
            success: false,
            error: {
              code: 'CONFLICT',
              message: error.message,
              existingResource: 'quote_status',
            },
          };
          return NextResponse.json(errorResponse, { status: 409 });
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
    }

    case 'reject': {
      // Reject quote
      const validationResult = RejectQuoteRequestSchema.safeParse(data);

      if (!validationResult.success) {
        const errorResponse: ValidationErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data for reject action',
            details: validationResult.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
              code: e.code,
            })),
          },
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }

      try {
        // Get current quote
        const { quote: existingQuote } = await getServiceQuoteById(quoteId);

        if (!existingQuote) {
          const errorResponse: NotFoundResponse = {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Service quote not found',
              resource: 'service_quote',
              id: quoteId,
            },
          };
          return NextResponse.json(errorResponse, { status: 404 });
        }

        // Validate status transition
        if (!isValidStatusTransition(existingQuote.status, 'rejected')) {
          const errorResponse: ConflictResponse = {
            success: false,
            error: {
              code: 'CONFLICT',
              message: `Cannot reject quote with status: ${existingQuote.status}`,
              existingResource: 'quote_status',
            },
          };
          return NextResponse.json(errorResponse, { status: 409 });
        }

        // Update status to rejected
        const now = new Date();
        const result = await updateServiceQuote(quoteId, {
          status: 'rejected',
          rejectedAt: now,
          rejectedBy: validationResult.data.rejectedBy,
          notes: validationResult.data.reason
            ? `${existingQuote.notes || ''}\n\nRejection Reason: ${validationResult.data.reason}`.trim()
            : existingQuote.notes,
        });

        const response: UpdatedResponse<{
          quote: ServiceQuote;
          materials: MaterialLineItem[];
        }> = {
          success: true,
          data: {
            quote: result.quote,
            materials: result.materials,
          },
          message: 'Quote rejected successfully',
          updated: true,
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

    case 'withdraw': {
      // Withdraw quote (vendor action)
      try {
        // Get current quote
        const { quote: existingQuote } = await getServiceQuoteById(quoteId);

        if (!existingQuote) {
          const errorResponse: NotFoundResponse = {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Service quote not found',
              resource: 'service_quote',
              id: quoteId,
            },
          };
          return NextResponse.json(errorResponse, { status: 404 });
        }

        // Validate status transition
        if (!isValidStatusTransition(existingQuote.status, 'withdrawn')) {
          const errorResponse: ConflictResponse = {
            success: false,
            error: {
              code: 'CONFLICT',
              message: `Cannot withdraw quote with status: ${existingQuote.status}`,
              existingResource: 'quote_status',
            },
          };
          return NextResponse.json(errorResponse, { status: 409 });
        }

        // Update status to withdrawn
        const result = await updateServiceQuote(quoteId, {
          status: 'withdrawn',
        });

        const response: UpdatedResponse<{
          quote: ServiceQuote;
          materials: MaterialLineItem[];
        }> = {
          success: true,
          data: {
            quote: result.quote,
            materials: result.materials,
          },
          message: 'Quote withdrawn successfully',
          updated: true,
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

    case 'mark_expired': {
      // Mark quote as expired
      try {
        const { quote: existingQuote } = await getServiceQuoteById(quoteId);

        if (!existingQuote) {
          const errorResponse: NotFoundResponse = {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Service quote not found',
              resource: 'service_quote',
              id: quoteId,
            },
          };
          return NextResponse.json(errorResponse, { status: 404 });
        }

        // Validate status transition
        if (!isValidStatusTransition(existingQuote.status, 'expired')) {
          const errorResponse: ConflictResponse = {
            success: false,
            error: {
              code: 'CONFLICT',
              message: `Cannot mark quote as expired with status: ${existingQuote.status}`,
              existingResource: 'quote_status',
            },
          };
          return NextResponse.json(errorResponse, { status: 409 });
        }

        const result = await updateServiceQuote(quoteId, {
          status: 'expired',
        });

        const response: UpdatedResponse<{
          quote: ServiceQuote;
          materials: MaterialLineItem[];
        }> = {
          success: true,
          data: {
            quote: result.quote,
            materials: result.materials,
          },
          message: 'Quote marked as expired',
          updated: true,
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

    default: {
      const errorResponse: ValidationErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid action: ${action}`,
          details: [
            {
              field: 'action',
              message: `Action must be one of: submit, accept, reject, withdraw, mark_expired`,
              code: 'invalid_value',
            },
          ],
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }
  }
}

// Handle standard quote update
async function handleQuoteUpdate(
  quoteId: string,
  body: Record<string, unknown>
): Promise<NextResponse> {
  // Validate request body
  const validationResult = UpdateServiceQuoteRequestSchema.safeParse(body);

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

  try {
    // Get current quote to validate status transition
    const { quote: existingQuote } = await getServiceQuoteById(quoteId);

    if (!existingQuote) {
      const errorResponse: NotFoundResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Service quote not found',
          resource: 'service_quote',
          id: quoteId,
        },
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Validate status transition if status is being changed
    if (data.status && data.status !== existingQuote.status) {
      if (!isValidStatusTransition(existingQuote.status, data.status)) {
        const errorResponse: ConflictResponse = {
          success: false,
          error: {
            code: 'CONFLICT',
            message: `Cannot transition from ${existingQuote.status} to ${data.status}`,
            existingResource: 'quote_status',
          },
        };
        return NextResponse.json(errorResponse, { status: 409 });
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.proposedStartDate) updateData.proposedStartDate = new Date(data.proposedStartDate as string);
    if (data.proposedEndDate) updateData.proposedEndDate = new Date(data.proposedEndDate as string);
    if (data.estimatedDurationDays !== undefined) updateData.estimatedDurationDays = data.estimatedDurationDays;
    if (data.estimatedHours !== undefined) updateData.estimatedHours = data.estimatedHours;
    if (data.laborCost !== undefined) updateData.laborCost = data.laborCost;
    if (data.materialCost !== undefined) updateData.materialCost = data.materialCost;
    if (data.equipmentCost !== undefined) updateData.equipmentCost = data.equipmentCost;
    if (data.totalPrice !== undefined) updateData.totalPrice = data.totalPrice;
    if (data.currency) updateData.currency = data.currency;
    if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
    if (data.validUntil) updateData.validUntil = new Date(data.validUntil as string);
    if (data.warrantyInfo !== undefined) updateData.warrantyInfo = data.warrantyInfo;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes;
    if (data.status) updateData.status = data.status;

    const materials = data.materials as Array<{
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      isOptional?: boolean;
      brand?: string;
      supplier?: string;
      deliveryDate?: string;
    }> | undefined;

    const result = await updateServiceQuote(
      quoteId,
      updateData as any,
      materials
    );

    const response: UpdatedResponse<{
      quote: ServiceQuote;
      materials: MaterialLineItem[];
    }> = {
      success: true,
      data: {
        quote: result.quote,
        materials: result.materials,
      },
      message: 'Service quote updated successfully',
      updated: true,
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

// DELETE /api/service-quotes/[id] - Delete a quote
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Validate UUID
    if (!isValidUUID(id)) {
      const errorResponse: ValidationErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid quote ID format',
          details: [
            {
              field: 'id',
              message: 'Must be a valid UUID',
              code: 'invalid_format',
            },
          ],
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    try {
      // Check if quote exists
      const { quote: existingQuote } = await getServiceQuoteById(id);

      if (!existingQuote) {
        const errorResponse: NotFoundResponse = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Service quote not found',
            resource: 'service_quote',
            id,
          },
        };
        return NextResponse.json(errorResponse, { status: 404 });
      }

      // Only allow deletion of draft quotes
      if (existingQuote.status !== 'draft') {
        const errorResponse: ConflictResponse = {
          success: false,
          error: {
            code: 'CONFLICT',
            message: `Cannot delete quote with status: ${existingQuote.status}. Only draft quotes can be deleted.`,
            existingResource: 'quote_status',
          },
        };
        return NextResponse.json(errorResponse, { status: 409 });
      }

      await deleteServiceQuote(id);

      const response: DeletedResponse = {
        success: true,
        deleted: true,
        message: 'Service quote deleted successfully',
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
    logger.error('Error in DELETE /api/service-quotes/[id]:', error);
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

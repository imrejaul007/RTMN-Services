import { logger } from '../../shared/logger';
import { NextRequest, NextResponse } from 'next/server';
import {
  UpdateServiceOrderRequestSchema,
  UpdateServiceOrderStatusRequestSchema,
  AddServiceOrderNoteRequestSchema,
  SERVICE_ORDER_STATUS_LABELS,
} from '@nextabizz/shared-types';
import {
  getServiceOrderById,
  updateServiceOrder,
  updateServiceOrderStatus,
  addServiceOrderNote,
  deleteServiceOrder,
  isValidUUID,
} from '@/lib/service-order-db';
import type {
  ServiceOrder,
  ServiceOrderItem,
  ServiceOrderNote,
  ServiceOrderHistoryEntry,
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

// GET /api/service-orders/[id] - Get a single service order
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid order ID format',
          },
        } as ValidationErrorResponse,
        { status: 400 }
      );
    }

    try {
      const result = await getServiceOrderById(id);

      if (!result.order) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Service order not found',
              resource: 'service_order',
              id,
            },
          } as NotFoundResponse,
          { status: 404 }
        );
      }

      const responseData = {
        ...result.order,
        items: result.items,
        notes: result.notes,
        history: result.history,
      };

      return NextResponse.json({
        success: true,
        data: responseData,
      } as ApiResponse<typeof responseData>);
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
    logger.error('Error fetching service order:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch service order',
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/service-orders/[id] - Update a service order
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid order ID format',
          },
        } as ValidationErrorResponse,
        { status: 400 }
      );
    }

    // Determine the type of update based on the body
    const isStatusUpdate = 'status' in body && Object.keys(body).length === 1;
    const isNoteAdd = 'content' in body && Object.keys(body).length <= 3;

    if (isStatusUpdate) {
      // Handle status update
      const statusValidation = UpdateServiceOrderStatusRequestSchema.safeParse(body);

      if (!statusValidation.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid status update data',
              details: statusValidation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code,
              })),
            },
          } as ValidationErrorResponse,
          { status: 400 }
        );
      }

      const { status, notes } = statusValidation.data;

      try {
        const result = await updateServiceOrderStatus(
          id,
          status,
          body.performedBy || 'system',
          body.performedByName || 'System',
          body.performedByType || 'system',
          notes
        );

        const responseData = {
          ...result.order,
          history: result.history,
        };

        return NextResponse.json({
          success: true,
          data: responseData,
          message: `Order status updated to ${SERVICE_ORDER_STATUS_LABELS[status]}`,
          updated: true,
        } as UpdatedResponse<typeof responseData>);
      } catch (dbError) {
        const error = dbError as Error;

        if (error.message.includes('not found')) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: 'Service order not found',
                resource: 'service_order',
                id,
              },
            } as NotFoundResponse,
            { status: 404 }
          );
        }

        if (error.message.includes('Cannot transition')) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'CONFLICT',
                message: error.message,
                existingResource: 'order_status',
              },
            } as ConflictResponse,
            { status: 409 }
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
    }

    if (isNoteAdd) {
      // Handle adding a note
      const noteValidation = AddServiceOrderNoteRequestSchema.safeParse(body);

      if (!noteValidation.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid note data',
              details: noteValidation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code,
              })),
            },
          } as ValidationErrorResponse,
          { status: 400 }
        );
      }

      const { content, isInternal } = noteValidation.data;

      try {
        const result = await addServiceOrderNote(id, {
          content,
          isInternal,
          authorId: body.authorId || 'unknown',
          authorName: body.authorName || 'User',
          authorType: body.authorType || 'merchant',
        });

        const responseData = {
          ...result.order,
          notes: [...result.order.notes || [], result.note],
          history: result.history,
        };

        return NextResponse.json({
          success: true,
          data: responseData,
          message: 'Note added successfully',
        } as ApiResponse<typeof responseData>);
      } catch (dbError) {
        const error = dbError as Error;

        if (error.message.includes('not found')) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: 'Service order not found',
                resource: 'service_order',
                id,
              },
            } as NotFoundResponse,
            { status: 404 }
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
    }

    // Handle general update
    const updateValidation = UpdateServiceOrderRequestSchema.safeParse(body);

    if (!updateValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update data',
            details: updateValidation.error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
        } as ValidationErrorResponse,
        { status: 400 }
      );
    }

    const updateData = updateValidation.data;

    // Convert schedule dates from string to Date
    const schedule = updateData.schedule ? {
      scheduledDate: new Date(updateData.schedule.scheduledDate),
      startTime: updateData.schedule.startTime,
      endTime: updateData.schedule.endTime,
      recurring: updateData.schedule.recurring ? {
        ...updateData.schedule.recurring,
        endDate: updateData.schedule.recurring.endDate ? new Date(updateData.schedule.recurring.endDate) : undefined,
      } : undefined,
    } : undefined;

    try {
      const result = await updateServiceOrder(id, {
        title: updateData.title,
        description: updateData.description,
        priority: updateData.priority,
        serviceProviderId: updateData.serviceProviderId,
        paymentMethod: updateData.paymentMethod,
        schedule,
        items: updateData.items,
      });

      const responseData = {
        ...result.order,
        items: result.items,
        history: result.history,
      };

      return NextResponse.json({
        success: true,
        data: responseData,
        message: 'Order updated successfully',
        updated: true,
      } as UpdatedResponse<typeof responseData>);
    } catch (dbError) {
      const error = dbError as Error;

      if (error.message.includes('not found')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Service order not found',
              resource: 'service_order',
              id,
            },
          } as NotFoundResponse,
          { status: 404 }
        );
      }

      if (error.message.includes('Cannot update')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CONFLICT',
              message: error.message,
              existingResource: 'order_status',
            },
          } as ConflictResponse,
          { status: 409 }
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
    logger.error('Error updating service order:', error);

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
          message: 'Failed to update service order',
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/service-orders/[id] - Delete a service order
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid order ID format',
          },
        } as ValidationErrorResponse,
        { status: 400 }
      );
    }

    try {
      await deleteServiceOrder(id);

      return NextResponse.json({
        success: true,
        deleted: true,
        message: 'Service order deleted successfully',
      } as DeletedResponse);
    } catch (dbError) {
      const error = dbError as Error;

      if (error.message.includes('not found')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Service order not found',
              resource: 'service_order',
              id,
            },
          } as NotFoundResponse,
          { status: 404 }
        );
      }

      if (error.message.includes('Only pending orders')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CONFLICT',
              message: error.message,
              existingResource: 'order_status',
            },
          } as ConflictResponse,
          { status: 409 }
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
    logger.error('Error deleting service order:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete service order',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Hojai Model Registry - Error Handling Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../types';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

function createErrorResponse(error: ApiError): ApiError {
  return {
    ...error,
    timestamp: new Date().toISOString(),
  };
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ApiError>,
  _next: NextFunction
): void {
  console.error('Error:', err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    res.status(400).json(
      createErrorResponse({
        error: 'Validation Error',
        message: messages,
        statusCode: 400,
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      createErrorResponse({
        error: err.name,
        message: err.message,
        statusCode: err.statusCode,
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // Handle unknown errors
  res.status(500).json(
    createErrorResponse({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
      statusCode: 500,
      timestamp: new Date().toISOString(),
    })
  );
}

export function notFoundHandler(
  req: Request,
  res: Response<ApiError>,
  _next: NextFunction
): void {
  res.status(404).json(
    createErrorResponse({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
      statusCode: 404,
      timestamp: new Date().toISOString(),
    })
  );
}

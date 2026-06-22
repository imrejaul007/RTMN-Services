/**
 * Shared types index for rez-auth-service
 *
 * This file re-exports types from @rez/shared-types package.
 * If @rez/shared-types is not available, local types are used as fallback.
 */

// Local types - shared-types can be used when package is published
export interface AuthServiceUser {
  _id;
  phoneNumber: string;
  phone?: string;
  email?: string;
  name?: string;
}

// Type aliases for compatibility
export type User = AuthServiceUser;
export type Session = unknown;
export type Device = unknown;

// Common auth-related types
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthServiceUser;
  token?: AuthToken;
  error?: string;
}

export interface TokenPayload {
  sub: string;
  phone?: string;
  email?: string;
  role: string;
  iat: number;
}

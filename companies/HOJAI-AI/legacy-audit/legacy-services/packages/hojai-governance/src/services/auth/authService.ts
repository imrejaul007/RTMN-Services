import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import {
  User,
  UserStatus,
  ApiKey,
  ApiKeyType,
  ApiKeyStatus,
  AuditAction,
  AuditLog
} from '../../types/index.js';
import { auditLogger } from '../audit/auditLogger.js';

interface UserDocument extends User {}

const UserSchema = new Schema<UserDocument>(
  {
    tenantId: { type: Schema.Types.UUID, required: true, index: true },
    organizationId: { type: Schema.Types.UUID, index: true },

    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, sparse: true },
    passwordHash: { type: String, required: true },

    name: { type: String, required: true, minlength: 2, maxlength: 100 },
    avatar: { type: String },
    timezone: { type: String, default: 'Asia/Kolkata' },
    locale: { type: String, default: 'en-IN' },

    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.INVITED
    },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    mfaEnabled: { type: Boolean, default: false },

    lastLoginAt: { type: Date },
    lastLoginIP: { type: String },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date }
  },
  {
    timestamps: true,
    collection: 'users'
  }
);

// Indexes
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, phone: 1 }, { sparse: true });

// Pre-save hook to hash password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();

  if (!this.passwordHash.startsWith('$2')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  next();
});

// Method to verify password
UserSchema.methods.verifyPassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

// Method to check if account is locked
UserSchema.methods.isLocked = function (): boolean {
  if (!this.lockedUntil) return false;
  return new Date() < this.lockedUntil;
};

// Method to increment failed login attempts
UserSchema.methods.incrementFailedAttempts = async function (): Promise<void> {
  this.failedLoginAttempts += 1;

  // Lock account after 5 failed attempts for 30 minutes
  if (this.failedLoginAttempts >= 5) {
    this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  }

  await this.save();
};

// Method to reset failed login attempts
UserSchema.methods.resetFailedAttempts = async function (): Promise<void> {
  this.failedLoginAttempts = 0;
  this.lockedUntil = undefined;
  await this.save();
};

export const UserModel: Model<UserDocument> = mongoose.model<UserDocument>('User', UserSchema);

// ============================================================================
// API KEY MODEL
// ============================================================================

interface ApiKeyDocument extends ApiKey {}

const ApiKeySchema = new Schema<ApiKeyDocument>(
  {
    tenantId: { type: Schema.Types.UUID, required: true, index: true },
    userId: { type: Schema.Types.UUID, index: true },

    name: { type: String, required: true, minlength: 2, maxlength: 100 },
    type: {
      type: String,
      enum: Object.values(ApiKeyType),
      required: true
    },
    status: {
      type: String,
      enum: Object.values(ApiKeyStatus),
      default: ApiKeyStatus.ACTIVE
    },

    keyHash: { type: String, required: true },
    keyPrefix: { type: String, required: true, maxlength: 8 },

    permissions: { type: [String], default: [] },
    allowedIPs: { type: [String], default: [] },
    allowedOrigins: { type: [String], default: [] },

    rateLimitPerMinute: { type: Number, default: 60 },
    quotaPerDay: { type: Number },
    usedToday: { type: Number, default: 0 },

    expiresAt: { type: Date },
    lastUsedAt: { type: Date },
    lastUsedIP: { type: String }
  },
  {
    timestamps: true,
    collection: 'api_keys'
  }
);

// Indexes
ApiKeySchema.index({ tenantId: 1, keyHash: 1 }, { unique: true });
ApiKeySchema.index({ tenantId: 1, status: 1 });

// Static method to generate a new API key
ApiKeySchema.statics.generateKey = async function (
  tenantId: string,
  params: {
    name: string;
    type: ApiKeyType;
    permissions?: string[];
    expiresInDays?: number;
  }
): Promise<{ apiKey: ApiKeyDocument; rawKey: string }> {
  const rawKey = `hojai_${uuid().replace(/-/g, '')}`;
  const keyHash = rawKey; // In production, use proper hashing
  const keyPrefix = rawKey.slice(0, 8);

  const apiKey = new this({
    tenantId,
    name: params.name,
    type: params.type,
    keyHash,
    keyPrefix,
    permissions: params.permissions ?? [],
    expiresAt: params.expiresInDays
      ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
      : undefined
  });

  await apiKey.save();

  return { apiKey, rawKey };
}

// Method to verify API key
ApiKeySchema.statics.verifyKey = async function (
  tenantId: string,
  rawKey: string
): Promise<ApiKeyDocument | null> {
  const keyPrefix = rawKey.slice(0, 8);

  const apiKey = await this.findOne({
    tenantId,
    keyPrefix,
    status: ApiKeyStatus.ACTIVE
  });

  if (!apiKey) return null;

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    apiKey.status = ApiKeyStatus.EXPIRED;
    await apiKey.save();
    return null;
  }

  // In production, verify hash
  if (apiKey.keyHash !== rawKey) return null;

  // Update usage
  apiKey.lastUsedAt = new Date();
  apiKey.usedToday += 1;
  await apiKey.save();

  return apiKey;
};

// Method to revoke API key
ApiKeySchema.methods.revoke = async function (): Promise<void> {
  this.status = ApiKeyStatus.REVOKED;
  await this.save();
};

export const ApiKeyModel: Model<ApiKeyDocument> = mongoose.model<ApiKeyDocument>(
  'ApiKey',
  ApiKeySchema
);

// ============================================================================
// AUTH SERVICE
// ============================================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly accessTokenExpiry = '1h';
  private readonly refreshTokenExpiry = '7d';

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET ?? 'hojai-dev-secret-change-in-prod';
    this.jwtRefreshSecret =
      process.env.JWT_REFRESH_SECRET ?? 'hojai-dev-refresh-secret-change-in-prod';
  }

  /**
   * Register a new user
   */
  async register(params: {
    tenantId: string;
    email: string;
    password: string;
    name: string;
    phone?: string;
    organizationId?: string;
  }): Promise<AuthResult> {
    // Check if user already exists
    const existing = await UserModel.findOne({
      tenantId: params.tenantId,
      email: params.email.toLowerCase()
    });

    if (existing) {
      throw new Error('User with this email already exists');
    }

    // Create user
    const user = new UserModel({
      tenantId: params.tenantId,
      email: params.email.toLowerCase(),
      passwordHash: params.password, // Will be hashed by pre-save hook
      name: params.name,
      phone: params.phone,
      organizationId: params.organizationId,
      status: UserStatus.ACTIVE,
      emailVerified: false
    });

    await user.save();

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Log audit
    await auditLogger.log({
      tenantId: params.tenantId,
      userId: user.id,
      userEmail: user.email,
      action: AuditAction.USER_CREATED,
      resource: 'user',
      resourceId: user.id,
      success: true
    });

    return {
      user: user.toObject() as User,
      tokens
    };
  }

  /**
   * Authenticate user with email/password
   */
  async login(params: {
    tenantId: string;
    email: string;
    password: string;
    ip?: string;
    userAgent?: string;
  }): Promise<AuthResult> {
    const user = await UserModel.findOne({
      tenantId: params.tenantId,
      email: params.email.toLowerCase()
    });

    if (!user) {
      // Log failed attempt (without user ID)
      await auditLogger.log({
        tenantId: params.tenantId,
        action: AuditAction.AUTH_LOGIN_FAILED,
        resource: 'user',
        details: { email: params.email, reason: 'user_not_found' },
        ip: params.ip,
        userAgent: params.userAgent,
        success: false,
        error: 'Invalid credentials'
      });

      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (user.isLocked()) {
      await auditLogger.log({
        tenantId: params.tenantId,
        userId: user.id,
        userEmail: user.email,
        action: AuditAction.AUTH_LOGIN_FAILED,
        resource: 'user',
        details: { reason: 'account_locked' },
        ip: params.ip,
        userAgent: params.userAgent,
        success: false,
        error: 'Account is locked'
      });

      throw new Error('Account is locked. Please try again later.');
    }

    // Verify password
    const isValid = await user.verifyPassword(params.password);

    if (!isValid) {
      await user.incrementFailedAttempts();

      await auditLogger.log({
        tenantId: params.tenantId,
        userId: user.id,
        userEmail: user.email,
        action: AuditAction.AUTH_LOGIN_FAILED,
        resource: 'user',
        details: { reason: 'invalid_password' },
        ip: params.ip,
        userAgent: params.userAgent,
        success: false,
        error: 'Invalid credentials'
      });

      throw new Error('Invalid credentials');
    }

    // Reset failed attempts and update login info
    await user.resetFailedAttempts();
    user.lastLoginAt = new Date();
    user.lastLoginIP = params.ip;
    await user.save();

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Log successful login
    await auditLogger.log({
      tenantId: params.tenantId,
      userId: user.id,
      userEmail: user.email,
      action: AuditAction.AUTH_LOGIN,
      resource: 'user',
      ip: params.ip,
      userAgent: params.userAgent,
      success: true
    });

    return {
      user: user.toObject() as User,
      tokens
    };
  }

  /**
   * Generate JWT tokens for a user
   */
  private generateTokens(user: UserDocument): AuthTokens {
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      type: 'user'
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry
    });

    const refreshToken = jwt.sign(
      { ...payload, tokenType: 'refresh' },
      this.jwtRefreshSecret,
      { expiresIn: this.refreshTokenExpiry }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600 // 1 hour in seconds
    };
  }

  /**
   * Verify JWT access token
   */
  verifyAccessToken(token: string): {
    sub: string;
    tenantId: string;
    email: string;
    type: string;
  } {
    try {
      return jwt.verify(token, this.jwtSecret) as {
        sub: string;
        tenantId: string;
        email: string;
        type: string;
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh access token
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as {
        sub: string;
        tenantId: string;
        email: string;
        type: string;
        tokenType: string;
      };

      if (payload.tokenType !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const user = await UserModel.findById(payload.sub);
      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new Error('User not found or inactive');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Create API key for a tenant
   */
  async createApiKey(params: {
    tenantId: string;
    userId?: string;
    name: string;
    type: ApiKeyType;
    permissions?: string[];
    expiresInDays?: number;
  }): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const { apiKey, rawKey } = await ApiKeyModel.generateKey(
      params.tenantId,
      params
    );

    // Log audit
    await auditLogger.log({
      tenantId: params.tenantId,
      userId: params.userId,
      action: AuditAction.API_KEY_CREATED,
      resource: 'api_key',
      resourceId: apiKey.id,
      details: { name: params.name, type: params.type },
      success: true
    });

    return {
      apiKey: apiKey.toObject() as ApiKey,
      rawKey
    };
  }

  /**
   * Verify API key
   */
  async verifyApiKey(tenantId: string, rawKey: string): Promise<ApiKey | null> {
    const apiKey = await ApiKeyModel.verifyKey(tenantId, rawKey);
    return apiKey ? (apiKey.toObject() as ApiKey) : null;
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(tenantId: string, apiKeyId: string): Promise<void> {
    const apiKey = await ApiKeyModel.findOne({
      _id: apiKeyId,
      tenantId
    });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    await apiKey.revoke();

    await auditLogger.log({
      tenantId,
      action: AuditAction.API_KEY_REVOKED,
      resource: 'api_key',
      resourceId: apiKeyId,
      success: true
    });
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    const user = await UserModel.findById(userId);
    return user ? (user.toObject() as User) : null;
  }

  /**
   * List API keys for a tenant
   */
  async listApiKeys(tenantId: string): Promise<ApiKey[]> {
    const apiKeys = await ApiKeyModel.find({ tenantId });
    return apiKeys.map(k => k.toObject() as ApiKey);
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await user.verifyPassword(currentPassword);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    user.passwordHash = newPassword;
    await user.save();

    await auditLogger.log({
      tenantId: user.tenantId,
      userId: user.id,
      userEmail: user.email,
      action: AuditAction.AUTH_PASSWORD_RESET,
      resource: 'user',
      resourceId: user.id,
      success: true
    });
  }
}

export const authService = new AuthService();

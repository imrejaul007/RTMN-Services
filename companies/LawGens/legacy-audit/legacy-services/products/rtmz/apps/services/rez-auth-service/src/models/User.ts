import mongoose, { Schema, Document } from 'mongoose';

export interface IPatchTest {
  serviceCategory: string;
  testedAt: Date;
  expiresAt: Date;
  result: 'pass' | 'reaction';
  conductedBy?: string;
}

export interface IUser extends Document {
  phoneNumber: string;
  email?: string;
  name?: string;
  profileImage?: string;
  role: string;
  isActive: boolean;
  isSuspended?: boolean;
  patchTests?: IPatchTest[];
  referralCode?: string;
  socialProfiles?: {
    google?: { id: string; connected: boolean; connectedAt?: Date };
    apple?: { id: string; connected: boolean; connectedAt?: Date };
    facebook?: { id: string; connected: boolean; connectedAt?: Date };
  };
  authMethods?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const PatchTestSchema = new Schema<IPatchTest>({
  serviceCategory: { type: String, required: true },
  testedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  result: { type: String, enum: ['pass', 'reaction'], required: true },
  conductedBy: { type: String, default: 'staff' },
}, { _id: false });

/**
 * User Schema - STRICT by default, with explicit field definitions
 *
 * FIX: Changed from strict:false to strict:true to prevent:
 * 1. Schema drift - unknown fields being silently added
 * 2. Data injection - malicious fields being stored
 * 3. Type safety - ensuring TypeScript types match actual schema
 *
 * For monolith compatibility (reading from shared collections):
 * - The canonical schema defines all known fields
 * - Unknown fields are NOT stored (strict:true)
 * - For legacy data with extra fields, use .lean() for reads
 *
 * To add new fields:
 * 1. Add field to IUser interface
 * 2. Add field to UserSchema
 * 3. Create migration if needed
 */
const UserSchema = new Schema<IUser>({
  phoneNumber: { type: String, required: true, unique: true, index: true },
  email: { type: String, sparse: true, lowercase: true, trim: true },
  name: { type: String, trim: true },
  profileImage: { type: String },
  role: {
    type: String,
    enum: ['user', 'admin', 'merchant', 'driver', 'support', 'operator'],
    default: 'user',
    index: true,
  },
  isActive: { type: Boolean, default: true, index: true },
  isSuspended: { type: Boolean, default: false, index: true },
  patchTests: { type: [PatchTestSchema], default: [] },
  referralCode: { type: String, unique: true, sparse: true },
  socialProfiles: {
    google: {
      id: String,
      connected: { type: Boolean, default: true },
      connectedAt: Date,
    },
    apple: {
      id: String,
      connected: { type: Boolean, default: true },
      connectedAt: Date,
    },
    facebook: {
      id: String,
      connected: { type: Boolean, default: true },
      connectedAt: Date,
    },
  },
  authMethods: { type: [String], default: [] },
}, {
  timestamps: true,
  strict: true, // FIX: Enforce strict schema - no unknown fields
});

// ─── Indexes ─────────────────────────────────────────────────────────────────

// Composite indexes for common queries
UserSchema.index({ isActive: 1, role: 1 });
UserSchema.index({ isSuspended: 1, isActive: 1 });
UserSchema.index({ createdAt: -1 });

// Sparse unique index on email (for users who have email)
UserSchema.index(
  { email: 1 },
  { unique: true, sparse: true, partialFilterExpression: { email: { $exists: true } } }
);

// ─── Pre-save Hooks ─────────────────────────────────────────────────────────────

// Normalize email on save
UserSchema.pre('save', function (next) {
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  if (this.name) {
    this.name = this.name.trim();
  }
  next();
});

// ─── Methods ───────────────────────────────────────────────────────────────────

// Check if user has a specific role
UserSchema.methods.hasRole = function (role: string): boolean {
  return this.role === role || this.role === 'admin';
};

// Check if user can perform action based on role
UserSchema.methods.canPerform = function (action: string): boolean {
  const rolePermissions: Record<string, string[]> = {
    user: ['read', 'write:own'],
    merchant: ['read', 'write:own', 'write:merchant'],
    admin: ['read', 'write', 'delete', 'admin'],
    support: ['read', 'write:support'],
    operator: ['read', 'write:operate'],
    driver: ['read', 'write:own', 'write:driver'],
  };

  const permissions = rolePermissions[this.role] || [];
  const actionParts = action.split(':');
  const [primary] = actionParts;

  return permissions.includes('admin') ||
         permissions.includes(primary) ||
         permissions.includes(action);
};

// ─── Statics ────────────────────────────────────────────────────────────────────

// Find active users
UserSchema.statics.findActive = function (limit: number = 100) {
  return this.find({ isActive: true, isSuspended: false })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Find by phone with active check
UserSchema.statics.findByPhone = function (phoneNumber: string) {
  return this.findOne({ phoneNumber, isActive: true });
};

// Find users by role
UserSchema.statics.findByRole = function (role: string, limit: number = 100) {
  return this.find({ role, isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Search by name or email
UserSchema.statics.search = function (query: string, limit: number = 20) {
  return this.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
      { phoneNumber: { $regex: query, $options: 'i' } },
    ],
    isActive: true,
  })
    .select('-patchTests') // Exclude large field from search results
    .limit(limit);
};

export const User = mongoose.model<IUser>('User', UserSchema);

// RTMN Onboarding Portal - Client Self-Service
// Port: 4006
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

const app = express();
const PORT = process.env.PORT || 4006;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// In-memory store (replace with database in production)
const users = new Map<string, any>();
const workspaces = new Map<string, any>();
const onboardingSteps = new Map<string, any>();
const teams = new Map<string, any>();
const brands = new Map<string, any>();
const reviewSources = new Map<string, any>();

// === MODELS ===
interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  company: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: Date;
  emailVerified: boolean;
  lastLogin?: Date;
}

interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'pending' | 'active' | 'suspended';
  stripeCustomerId?: string;
  createdAt: Date;
  settings: {
    timezone: string;
    language: string;
    notifications: boolean;
  };
}

interface Brand {
  id: string;
  workspaceId: string;
  name: string;
  website: string;
  industry: string;
  description?: string;
  logo?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  createdAt: Date;
  status: 'pending' | 'active' | 'inactive';
}

interface ReviewSource {
  id: string;
  brandId: string;
  sourceType: 'google' | 'yelp' | 'tripadvisor' | 'facebook' | 'custom';
  sourceId: string;
  status: 'pending' | 'verified' | 'active' | 'error';
  credentials?: Record<string, string>;
  lastSync?: Date;
  createdAt: Date;
}

interface TeamMember {
  id: string;
  workspaceId: string;
  userId?: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'pending' | 'active' | 'inactive';
  invitedAt: Date;
  joinedAt?: Date;
}

// === AUTH ROUTES ===

// Register new user
app.post('/api/v1/auth/register', async (req, res) => {
  const { email, password, name, company } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Email, password, and name are required' }
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' }
    });
  }

  if (users.has(email.toLowerCase())) {
    return res.status(409).json({
      error: { code: 'EMAIL_EXISTS', message: 'Email already registered' }
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = uuidv4();

  const user: User = {
    id: userId,
    email: email.toLowerCase(),
    passwordHash,
    name,
    company: company || '',
    role: 'owner',
    createdAt: new Date(),
    emailVerified: false,
  };

  users.set(email.toLowerCase(), user);

  // Create workspace for user
  const workspaceId = uuidv4();
  const workspace: Workspace = {
    id: workspaceId,
    name: company || `${name}'s Workspace`,
    ownerId: userId,
    plan: 'free',
    status: 'pending',
    createdAt: new Date(),
    settings: {
      timezone: 'UTC',
      language: 'en',
      notifications: true,
    },
  };
  workspaces.set(workspaceId, workspace);

  // Generate email verification token
  const verificationToken = uuidv4();
  onboardingSteps.set(`verify:${verificationToken}`, {
    userId,
    workspaceId,
    email: email.toLowerCase(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });

  console.log(`User registered: ${email}, verification token: ${verificationToken}`);

  res.status(201).json({
    data: {
      user: { id: userId, email, name, role: 'owner' },
      workspace: { id: workspaceId, name: workspace.name, plan: 'free' },
      verificationToken,
      message: 'Registration successful. Please verify your email.',
    },
  });
});

// Login
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' }
    });
  }

  const user = users.get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    });
  }

  // Update last login
  user.lastLogin = new Date();

  const token = uuidv4();
  const tokenData = {
    userId: user.id,
    workspaceId: Array.from(workspaces.values()).find(
      (w: Workspace) => w.ownerId === user.id
    )?.id || null,
    createdAt: Date.now(),
  };
  onboardingSteps.set(`token:${token}`, tokenData);

  res.json({
    data: {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    },
  });
});

// Verify email
app.post('/api/v1/auth/verify-email', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Token is required' }
    });
  }

  const data = onboardingSteps.get(`verify:${token}`);

  if (!data) {
    return res.status(400).json({
      error: { code: 'INVALID_TOKEN', message: 'Invalid verification token' }
    });
  }

  if (data.expiresAt && Date.now() > data.expiresAt) {
    onboardingSteps.delete(`verify:${token}`);
    return res.status(400).json({
      error: { code: 'TOKEN_EXPIRED', message: 'Verification token has expired' }
    });
  }

  const user = Array.from(users.values()).find((u: User) => u.id === data.userId);
  if (user) {
    user.emailVerified = true;
  }

  const workspace = workspaces.get(data.workspaceId);
  if (workspace) {
    workspace.status = 'active';
  }

  onboardingSteps.delete(`verify:${token}`);

  res.json({ data: { message: 'Email verified successfully' } });
});

// Resend verification email
app.post('/api/v1/auth/resend-verification', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Email is required' }
    });
  }

  const user = users.get(email.toLowerCase());
  if (!user) {
    // Don't reveal if email exists
    return res.json({ data: { message: 'If the email exists, a verification link has been sent' } });
  }

  if (user.emailVerified) {
    return res.status(400).json({
      error: { code: 'ALREADY_VERIFIED', message: 'Email is already verified' }
    });
  }

  // Generate new verification token
  const verificationToken = uuidv4();
  onboardingSteps.set(`verify:${verificationToken}`, {
    userId: user.id,
    workspaceId: Array.from(workspaces.values()).find(
      (w: Workspace) => w.ownerId === user.id
    )?.id,
    email: user.email,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });

  console.log(`Verification token resent for ${email}: ${verificationToken}`);

  res.json({ data: { message: 'Verification email sent' } });
});

// Forgot password
app.post('/api/v1/auth/forgot-password', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Email is required' }
    });
  }

  const user = users.get(email.toLowerCase());
  if (!user) {
    // Don't reveal if email exists
    return res.json({ data: { message: 'If the email exists, a password reset link has been sent' } });
  }

  const resetToken = uuidv4();
  onboardingSteps.set(`reset:${resetToken}`, {
    userId: user.id,
    email: user.email,
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
  });

  console.log(`Password reset token for ${email}: ${resetToken}`);

  res.json({ data: { message: 'Password reset email sent' } });
});

// Reset password
app.post('/api/v1/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Token and new password are required' }
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' }
    });
  }

  const data = onboardingSteps.get(`reset:${token}`);

  if (!data) {
    return res.status(400).json({
      error: { code: 'INVALID_TOKEN', message: 'Invalid reset token' }
    });
  }

  if (Date.now() > data.expiresAt) {
    onboardingSteps.delete(`reset:${token}`);
    return res.status(400).json({
      error: { code: 'TOKEN_EXPIRED', message: 'Reset token has expired' }
    });
  }

  const user = Array.from(users.values()).find((u: User) => u.id === data.userId);
  if (!user) {
    return res.status(404).json({
      error: { code: 'USER_NOT_FOUND', message: 'User not found' }
    });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  onboardingSteps.delete(`reset:${token}`);

  // Invalidate all existing tokens for this user
  for (const [key, value] of onboardingSteps.entries()) {
    if (key.startsWith('token:') && value.userId === user.id) {
      onboardingSteps.delete(key);
    }
  }

  res.json({ data: { message: 'Password reset successfully' } });
});

// Logout
app.post('/api/v1/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'No token provided' }
    });
  }

  const token = authHeader.substring(7);
  onboardingSteps.delete(`token:${token}`);

  res.json({ data: { message: 'Logged out successfully' } });
});

// === WORKSPACE ROUTES ===

// Get workspace
app.get('/api/v1/workspace/:id', (req, res) => {
  const workspace = workspaces.get(req.params.id);
  if (!workspace) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Workspace not found' }
    });
  }

  res.json({ data: workspace });
});

// Update workspace
app.patch('/api/v1/workspace/:id', (req, res) => {
  const workspace = workspaces.get(req.params.id);
  if (!workspace) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Workspace not found' }
    });
  }

  const { name, plan, settings } = req.body;
  if (name) workspace.name = name;
  if (plan) workspace.plan = plan;
  if (settings) workspace.settings = { ...workspace.settings, ...settings };

  res.json({ data: workspace });
});

// Get workspace by token (authenticated)
app.get('/api/v1/workspace', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'No token provided' }
    });
  }

  const token = authHeader.substring(7);
  const tokenData = onboardingSteps.get(`token:${token}`);

  if (!tokenData || !tokenData.workspaceId) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' }
    });
  }

  const workspace = workspaces.get(tokenData.workspaceId);
  if (!workspace) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Workspace not found' }
    });
  }

  res.json({ data: workspace });
});

// === ONBOARDING ROUTES ===

// Get onboarding steps
app.get('/api/v1/onboarding/:workspaceId/steps', (req, res) => {
  const { workspaceId } = req.params;

  const workspace = workspaces.get(workspaceId);
  if (!workspace) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Workspace not found' }
    });
  }

  const brandCount = Array.from(brands.values()).filter(
    (b: Brand) => b.workspaceId === workspaceId && b.status !== 'inactive'
  ).length;

  const sourceCount = Array.from(reviewSources.values()).filter(
    (s: ReviewSource) => s.status === 'active'
  ).length;

  const teamCount = Array.from(teams.values()).filter(
    (t: TeamMember) => t.workspaceId === workspaceId && t.status === 'active'
  ).length;

  const steps = [
    {
      id: 'account',
      name: 'Account Setup',
      status: workspace.status !== 'pending' ? 'completed' : 'pending',
      description: 'Create your account',
      order: 1,
    },
    {
      id: 'workspace',
      name: 'Workspace Setup',
      status: workspace.status === 'active' ? 'completed' : 'pending',
      description: 'Configure your workspace',
      order: 2,
    },
    {
      id: 'brand',
      name: 'Add Your First Brand',
      status: brandCount > 0 ? 'completed' : 'pending',
      description: 'Add your brand to start monitoring',
      order: 3,
    },
    {
      id: 'sources',
      name: 'Connect Review Sources',
      status: sourceCount > 0 ? 'completed' : 'pending',
      description: 'Connect Google, Yelp, TripAdvisor',
      order: 4,
    },
    {
      id: 'team',
      name: 'Invite Team Members',
      status: teamCount > 1 ? 'completed' : 'pending',
      description: 'Add team members to collaborate',
      order: 5,
    },
    {
      id: 'billing',
      name: 'Choose a Plan',
      status: workspace.plan !== 'free' ? 'completed' : 'pending',
      description: 'Select your subscription plan',
      order: 6,
    },
  ];

  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const progress = Math.round((completedCount / steps.length) * 100);

  res.json({
    data: {
      steps,
      progress,
      isComplete: completedCount === steps.length,
    },
  });
});

// Complete onboarding step
app.post('/api/v1/onboarding/:workspaceId/steps/:stepId/complete', (req, res) => {
  const { workspaceId, stepId } = req.params;

  const stepKey = `onboarding:${workspaceId}:${stepId}`;
  onboardingSteps.set(stepKey, {
    completed: true,
    completedAt: Date.now(),
  });

  res.json({ data: { message: 'Step marked as complete' } });
});

// === BRAND ROUTES ===

// Get brands
app.get('/api/v1/brands/:workspaceId', (req, res) => {
  const { workspaceId } = req.params;

  const workspaceBrands = Array.from(brands.values()).filter(
    (b: Brand) => b.workspaceId === workspaceId
  );

  res.json({ data: workspaceBrands });
});

// Create brand
app.post('/api/v1/onboarding/:workspaceId/brands', (req, res) => {
  const { workspaceId } = req.params;
  const { name, website, industry, description, socialLinks } = req.body;

  if (!name) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Brand name is required' }
    });
  }

  const workspace = workspaces.get(workspaceId);
  if (!workspace) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Workspace not found' }
    });
  }

  // Check plan limits
  const currentBrandCount = Array.from(brands.values()).filter(
    (b: Brand) => b.workspaceId === workspaceId && b.status !== 'inactive'
  ).length;

  const planLimits: Record<string, number> = {
    free: 1,
    starter: 5,
    professional: 25,
    enterprise: -1, // Unlimited
  };

  const limit = planLimits[workspace.plan] || 1;
  if (limit !== -1 && currentBrandCount >= limit) {
    return res.status(403).json({
      error: {
        code: 'PLAN_LIMIT_REACHED',
        message: `Your ${workspace.plan} plan allows ${limit} brands. Please upgrade to add more.`
      }
    });
  }

  const brandId = uuidv4();
  const brand: Brand = {
    id: brandId,
    workspaceId,
    name,
    website: website || '',
    industry: industry || 'general',
    description,
    socialLinks,
    createdAt: new Date(),
    status: 'pending',
  };

  brands.set(brandId, brand);

  res.status(201).json({
    data: {
      brand,
      message: 'Brand created. Next: Connect review sources.',
      nextStep: 'sources',
    },
  });
});

// Update brand
app.patch('/api/v1/brands/:brandId', (req, res) => {
  const brand = brands.get(req.params.brandId);
  if (!brand) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Brand not found' }
    });
  }

  const { name, website, industry, description, socialLinks, status } = req.body;
  if (name) brand.name = name;
  if (website !== undefined) brand.website = website;
  if (industry !== undefined) brand.industry = industry;
  if (description !== undefined) brand.description = description;
  if (socialLinks) brand.socialLinks = { ...brand.socialLinks, ...socialLinks };
  if (status) brand.status = status;

  res.json({ data: brand });
});

// Delete brand
app.delete('/api/v1/brands/:brandId', (req, res) => {
  const brandId = req.params.brandId;
  const brand = brands.get(brandId);

  if (!brand) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Brand not found' }
    });
  }

  brand.status = 'inactive';
  res.json({ data: { message: 'Brand deleted successfully' } });
});

// === REVIEW SOURCE ROUTES ===

// Get review sources for brand
app.get('/api/v1/sources/:brandId', (req, res) => {
  const { brandId } = req.params;

  const sources = Array.from(reviewSources.values()).filter(
    (s: ReviewSource) => s.brandId === brandId
  );

  res.json({ data: sources });
});

// Add review source
app.post('/api/v1/onboarding/:workspaceId/sources', (req, res) => {
  const { workspaceId } = req.params;
  const { sourceType, sourceId, credentials, brandId } = req.body;

  if (!sourceType || !sourceId) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Source type and ID are required' }
    });
  }

  // Get first brand if not specified
  let targetBrandId = brandId;
  if (!targetBrandId) {
    const workspaceBrands = Array.from(brands.values()).filter(
      (b: Brand) => b.workspaceId === workspaceId && b.status !== 'inactive'
    );
    if (workspaceBrands.length === 0) {
      return res.status(400).json({
        error: { code: 'CREATE_BRAND_FIRST', message: 'Please create a brand first' }
      });
    }
    targetBrandId = workspaceBrands[0].id;
  }

  const connectionId = uuidv4();
  const connection: ReviewSource = {
    id: connectionId,
    brandId: targetBrandId,
    sourceType,
    sourceId,
    status: 'pending_verification',
    credentials,
    createdAt: new Date(),
  };

  reviewSources.set(connectionId, connection);

  console.log(`Review source added: ${sourceType} for workspace ${workspaceId}`);

  const instructions: Record<string, string> = {
    google: 'Verify ownership via Google Search Console or add a verification meta tag',
    yelp: 'Enter your Yelp Business ID (found in your Yelp for Business Dashboard)',
    tripadvisor: 'Enter your TripAdvisor Restaurant ID from your management dashboard',
    facebook: 'Connect via Facebook OAuth and grant page access permissions',
    custom: 'Configure your custom review source with the provided credentials',
  };

  res.status(201).json({
    data: {
      connection,
      message: 'Source added. Verification pending.',
      instructions: instructions[sourceType] || instructions.custom,
      verificationMethods: getVerificationMethods(sourceType),
    },
  });
});

// Verify review source
app.post('/api/v1/sources/:sourceId/verify', (req, res) => {
  const { sourceId } = req.params;
  const { verificationCode, credentials } = req.body;

  const source = reviewSources.get(sourceId);
  if (!source) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Source not found' }
    });
  }

  // Simulate verification (in production, this would actually verify)
  source.status = 'active';
  source.lastSync = new Date();

  if (credentials) {
    source.credentials = { ...source.credentials, ...credentials };
  }

  // Update brand status
  const brand = brands.get(source.brandId);
  if (brand && brand.status === 'pending') {
    brand.status = 'active';
  }

  res.json({
    data: {
      source,
      message: 'Source verified and connected successfully',
    },
  });
});

// Sync review source
app.post('/api/v1/sources/:sourceId/sync', async (req, res) => {
  const { sourceId } = req.params;

  const source = reviewSources.get(sourceId);
  if (!source) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Source not found' }
    });
  }

  if (source.status !== 'active') {
    return res.status(400).json({
      error: { code: 'SOURCE_NOT_ACTIVE', message: 'Source must be verified before syncing' }
    });
  }

  // Simulate sync (in production, this would fetch reviews)
  source.lastSync = new Date();

  res.json({
    data: {
      source,
      message: 'Sync initiated successfully',
      estimatedCompletion: '30 seconds',
    },
  });
});

// Delete review source
app.delete('/api/v1/sources/:sourceId', (req, res) => {
  const { sourceId } = req.params;

  const source = reviewSources.get(sourceId);
  if (!source) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Source not found' }
    });
  }

  reviewSources.delete(sourceId);
  res.json({ data: { message: 'Source removed successfully' } });
});

// Helper function for verification methods
function getVerificationMethods(sourceType: string): string[] {
  const methods: Record<string, string[]> = {
    google: [
      'Add meta tag to your website',
      'Upload HTML file to your domain',
      'Verify via Google Search Console',
      'Use DNS verification',
    ],
    yelp: [
      'Enter your Yelp Business ID',
      'Claim your Yelp Business page',
      'Link from your website',
    ],
    tripadvisor: [
      'Enter your TripAdvisor ID',
      'Claim your TripAdvisor listing',
    ],
    facebook: [
      'Authenticate via Facebook OAuth',
      'Grant page management permissions',
    ],
    custom: [
      'Enter API credentials',
      'Configure webhook endpoint',
      'Add verification token',
    ],
  };

  return methods[sourceType] || methods.custom;
}

// === TEAM ROUTES ===

// Get team members
app.get('/api/v1/team/:workspaceId', (req, res) => {
  const { workspaceId } = req.params;

  const members = Array.from(teams.values()).filter(
    (t: TeamMember) => t.workspaceId === workspaceId
  );

  res.json({ data: members });
});

// Invite team member
app.post('/api/v1/workspace/:id/invite', (req, res) => {
  const { id } = req.params;
  const { email, name, role = 'member' } = req.body;

  if (!email) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Email is required' }
    });
  }

  const workspace = workspaces.get(id);
  if (!workspace) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Workspace not found' }
    });
  }

  // Check if already a member
  const existingMember = Array.from(teams.values()).find(
    (t: TeamMember) => t.workspaceId === id && t.email.toLowerCase() === email.toLowerCase()
  );

  if (existingMember) {
    return res.status(409).json({
      error: { code: 'ALREADY_MEMBER', message: 'User is already a team member' }
    });
  }

  const inviteToken = uuidv4();
  const memberId = uuidv4();

  const member: TeamMember = {
    id: memberId,
    workspaceId: id,
    email: email.toLowerCase(),
    name: name || email.split('@')[0],
    role,
    status: 'pending',
    invitedAt: new Date(),
  };

  teams.set(memberId, member);
  onboardingSteps.set(`invite:${inviteToken}`, {
    memberId,
    workspaceId: id,
    email: email.toLowerCase(),
    role,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(201).json({
    data: {
      inviteToken,
      inviteUrl: `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/invite/${inviteToken}`,
      member: {
        id: memberId,
        email,
        role,
        status: 'pending',
      },
      message: 'Invitation sent successfully',
    },
  });
});

// Accept invitation
app.post('/api/v1/invite/:token/accept', async (req, res) => {
  const { token } = req.params;
  const { email, password, name } = req.body;

  if (!token) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Token is required' }
    });
  }

  if (!email || !password) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' }
    });
  }

  const invite = onboardingSteps.get(`invite:${token}`);

  if (!invite) {
    return res.status(400).json({
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired invitation' }
    });
  }

  if (invite.expiresAt && Date.now() > invite.expiresAt) {
    onboardingSteps.delete(`invite:${token}`);
    return res.status(400).json({
      error: { code: 'TOKEN_EXPIRED', message: 'Invitation has expired' }
    });
  }

  // Check if email matches invitation
  if (email.toLowerCase() !== invite.email) {
    return res.status(400).json({
      error: { code: 'EMAIL_MISMATCH', message: 'Email does not match invitation' }
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = uuidv4();

  const user: User = {
    id: userId,
    email: email.toLowerCase(),
    passwordHash,
    name: name || email.split('@')[0],
    company: invite.workspaceId,
    role: invite.role,
    createdAt: new Date(),
    emailVerified: true,
    lastLogin: new Date(),
  };

  users.set(email.toLowerCase(), user);

  // Update team member
  const member = teams.get(invite.memberId);
  if (member) {
    member.userId = userId;
    member.status = 'active';
    member.joinedAt = new Date();
  }

  onboardingSteps.delete(`invite:${token}`);

  res.json({
    data: {
      user: { id: userId, email, name: user.name, role: invite.role },
      workspace: workspaces.get(invite.workspaceId),
      message: 'Invitation accepted successfully',
    },
  });
});

// Update team member role
app.patch('/api/v1/team/:memberId', (req, res) => {
  const { memberId } = req.params;
  const { role } = req.body;

  const member = teams.get(memberId);
  if (!member) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Team member not found' }
    });
  }

  if (role) {
    member.role = role;
  }

  res.json({ data: member });
});

// Remove team member
app.delete('/api/v1/team/:memberId', (req, res) => {
  const { memberId } = req.params;

  const member = teams.get(memberId);
  if (!member) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Team member not found' }
    });
  }

  member.status = 'inactive';
  res.json({ data: { message: 'Team member removed successfully' } });
});

// Resend invitation
app.post('/api/v1/team/:memberId/resend', (req, res) => {
  const { memberId } = req.params;

  const member = teams.get(memberId);
  if (!member) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Team member not found' }
    });
  }

  if (member.status !== 'pending') {
    return res.status(400).json({
      error: { code: 'NOT_PENDING', message: 'Invitation already accepted' }
    });
  }

  // Generate new invitation token
  const inviteToken = uuidv4();
  onboardingSteps.set(`invite:${inviteToken}`, {
    memberId,
    workspaceId: member.workspaceId,
    email: member.email,
    role: member.role,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    data: {
      inviteToken,
      inviteUrl: `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/invite/${inviteToken}`,
      message: 'Invitation resent successfully',
    },
  });
});

// === USER ROUTES ===

// Get current user
app.get('/api/v1/user', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'No token provided' }
    });
  }

  const token = authHeader.substring(7);
  const tokenData = onboardingSteps.get(`token:${token}`);

  if (!tokenData) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' }
    });
  }

  const user = Array.from(users.values()).find((u: User) => u.id === tokenData.userId);
  if (!user) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'User not found' }
    });
  }

  res.json({
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    },
  });
});

// Update user profile
app.patch('/api/v1/user', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'No token provided' }
    });
  }

  const token = authHeader.substring(7);
  const tokenData = onboardingSteps.get(`token:${token}`);

  if (!tokenData) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' }
    });
  }

  const user = Array.from(users.values()).find((u: User) => u.id === tokenData.userId);
  if (!user) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'User not found' }
    });
  }

  const { name, company } = req.body;
  if (name) user.name = name;
  if (company !== undefined) user.company = company;

  res.json({
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      role: user.role,
    },
  });
});

// Change password
app.post('/api/v1/user/change-password', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'No token provided' }
    });
  }

  const token = authHeader.substring(7);
  const tokenData = onboardingSteps.get(`token:${token}`);

  if (!tokenData) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' }
    });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Current and new password are required' }
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' }
    });
  }

  const user = Array.from(users.values()).find((u: User) => u.id === tokenData.userId);
  if (!user) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'User not found' }
    });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(401).json({
      error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' }
    });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);

  res.json({ data: { message: 'Password changed successfully' } });
});

// === HEALTH CHECK ===

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'onboarding-portal',
    timestamp: new Date().toISOString(),
    stats: {
      users: users.size,
      workspaces: workspaces.size,
      brands: brands.size,
      teams: teams.size,
      reviewSources: reviewSources.size,
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Onboarding portal running on port ${PORT}`);
});

export default app;

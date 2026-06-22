/**
 * HOJAI Collaboration
 * Comments, reviews, team sharing
 * Port: 4598
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4598;

app.use(express.json({ limit: "10kb" }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ============================================
// TYPES
// ============================================

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar?: string;
}

interface Comment {
  id: string;
  resourceType: 'prompt' | 'workflow' | 'agent';
  resourceId: string;
  userId: string;
  userName: string;
  content: string;
  lineNumber?: number;
  status: 'open' | 'resolved';
  replies: Comment[];
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

interface Review {
  id: string;
  promptId: string;
  version: number;
  status: 'draft' | 'in_review' | 'approved' | 'rejected';
  reviewerId: string;
  reviewerName: string;
  comments: string[];
  decision?: 'approve' | 'request_changes' | 'reject';
  notes?: string;
  createdAt: Date;
  completedAt?: Date;
}

interface Share {
  id: string;
  resourceType: 'prompt' | 'workflow' | 'agent';
  resourceId: string;
  sharedWith: { userId: string; email: string; permission: 'view' | 'edit' }[];
  link?: string;
  expiresAt?: Date;
  createdAt: Date;
}

interface Activity {
  id: string;
  userId: string;
  userName: string;
  action: 'created' | 'updated' | 'shared' | 'commented' | 'approved' | 'rejected';
  resourceType: string;
  resourceId: string;
  resourceName: string;
  details?: string;
  createdAt: Date;
}

const comments = new Map();
const reviews = new Map();
const shares = new Map();
const activities = new Map();
const users = new Map();

// Seed demo users
function seed() {
  const demoUsers: User[] = [
    { id: 'u1', name: 'Admin User', email: 'admin@hojai.ai', role: 'admin' },
    { id: 'u2', name: 'Dev User', email: 'dev@hojai.ai', role: 'editor' },
    { id: 'u3', name: 'Viewer User', email: 'viewer@hojai.ai', role: 'viewer' }
  ];
  demoUsers.forEach(u => users.set(u.id, u));
  console.log(`HOJAI Collaboration seeded ${demoUsers.length} users`);
}

// ============================================
// ENDPOINTS
// ============================================

app.get('/health', (_, res) => res.json({
  service: 'hojai-collaboration',
  status: 'healthy',
  port: PORT,
  tagline: 'Comments, reviews, team sharing'
}));

// Users
app.get('/api/users', (_, res) => res.json({ success: true, data: Array.from(users.values()) });

app.get('/api/users/:id', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true, data: user });
});

// Comments
app.post('/api/comments', (req, res) => {
  const { resourceType, resourceId, userId, content, lineNumber } = req.body;
  const user = users.get(userId);
  if (!user) return res.status(400).json({ error: 'User not found' });

  const comment: Comment = {
    id: uuidv4().slice(0, 8),
    resourceType,
    resourceId,
    userId,
    userName: user.name,
    content,
    lineNumber,
    status: 'open',
    replies: [],
    createdAt: new Date()
  };

  comments.set(comment.id, comment);

  // Log activity
  logActivity(userId, 'commented', resourceType, resourceId, content);

  res.status(201).json({ success: true, data: comment });
});

app.get('/api/comments', (req, res) => {
  const { resourceType, resourceId, status } = req.query;
  let result = Array.from(comments.values());
  if (resourceType) result = result.filter(c => c.resourceType === resourceType);
  if (resourceId) result = result.filter(c => c.resourceId === resourceId);
  if (status) result = result.filter(c => c.status === status);
  res.json({ success: true, data: result });
});

app.post('/api/comments/:id/resolve', (req, res) => {
  const comment = comments.get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  comment.status = 'resolved';
  comment.resolvedAt = new Date();
  comment.resolvedBy = req.body.userId;
  comments.set(comment.id, comment);

  res.json({ success: true, data: comment });
});

app.post('/api/comments/:id/reply', (req, res) => {
  const parent = comments.get(req.params.id);
  if (!parent) return res.status(404).json({ error: 'Comment not found' });

  const { userId, content } = req.body;
  const user = users.get(userId);
  if (!user) return res.status(400).json({ error: 'User not found' });

  const reply: Comment = {
    id: uuidv4().slice(0, 8),
    resourceType: parent.resourceType,
    resourceId: parent.resourceId,
    userId,
    userName: user.name,
    content,
    status: 'open',
    replies: [],
    createdAt: new Date()
  };

  parent.replies.push(reply);
  comments.set(parent.id, parent);

  res.status(201).json({ success: true, data: reply });
});

// Reviews
app.post('/api/reviews', (req, res) => {
  const { promptId, version, reviewerId } = req.body;
  const reviewer = users.get(reviewerId);
  if (!reviewer) return res.status(400).json({ error: 'Reviewer not found' });

  const review: Review = {
    id: uuidv4().slice(0, 8),
    promptId,
    version,
    status: 'draft',
    reviewerId,
    reviewerName: reviewer.name,
    comments: [],
    createdAt: new Date()
  };

  reviews.set(review.id, review);
  logActivity(reviewerId, 'created', 'review', reviewId, `Review for ${promptId}`);

  res.status(201).json({ success: true, data: review });
});

app.post('/api/reviews/:id/submit', (req, res) => {
  const review = reviews.get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });

  review.status = 'in_review';
  reviews.set(review.id, review);

  res.json({ success: true, data: review });
});

app.post('/api/reviews/:id/decision', (req, res) => {
  const review = reviews.get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });

  const { decision, notes } = req.body;
  review.decision = decision;
  review.notes = notes;
  review.status = decision === 'approve' ? 'approved' : 'rejected';
  review.completedAt = new Date();
  reviews.set(review.id, review);

  logActivity(review.reviewerId, decision === 'approve' ? 'approved' : 'rejected', 'review', review.id, notes);

  res.json({ success: true, data: review });
});

app.get('/api/reviews', (req, res) => {
  const { status, promptId } = req.query;
  let result = Array.from(reviews.values());
  if (status) result = result.filter(r => r.status === status);
  if (promptId) result = result.filter(r => r.promptId === promptId);
  res.json({ success: true, data: result });
});

// Shares
app.post('/api/shares', (req, res) => {
  const { resourceType, resourceId, sharedWith } = req.body;

  const share: Share = {
    id: uuidv4().slice(0, 8),
    resourceType,
    resourceId,
    sharedWith,
    link: `https://hojai.ai/share/${uuidv4().slice(0, 8)}`,
    createdAt: new Date()
  };

  shares.set(share.id, share);

  // Log activity
  sharedWith.forEach(s => {
    logActivity(s.userId, 'shared', resourceType, resourceId, `Shared with ${s.email}`);
  });

  res.status(201).json({ success: true, data: share });
});

app.get('/api/shares', (req, res) => {
  const { resourceType, resourceId } = req.query;
  let result = Array.from(shares.values());
  if (resourceType) result = result.filter(s => s.resourceType === resourceType);
  if (resourceId) result = result.filter(s => s.resourceId === resourceId);
  res.json({ success: true, data: result });
});

app.post('/api/shares/:id/revoke', (req, res) => {
  shares.delete(req.params.id);
  res.json({ success: true, message: 'Share revoked' });
});

// Activity feed
app.get('/api/activity', (req, res) => {
  const { resourceId, limit = 50 } = req.query;
  let result = Array.from(activities.values());
  if (resourceId) result = result.filter(a => a.resourceId === resourceId);
  result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  res.json({ success: true, data: result.slice(0, Number(limit) });
});

// Activity log helper
function logActivity(userId: string, action: Activity['action'], resourceType: string, resourceId: string, details?: string) {
  const user = users.get(userId);
  const activity: Activity = {
    id: uuidv4().slice(0, 8),
    userId,
    userName: user?.name || 'Unknown',
    action,
    resourceType,
    resourceId,
    details,
    createdAt: new Date()
  };
  activities.set(activity.id, activity);
}

seed();
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   HOJAI COLLABORATION                        ║
║   Comments, reviews, team sharing              ║
║   Port: ${PORT}                                   ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;

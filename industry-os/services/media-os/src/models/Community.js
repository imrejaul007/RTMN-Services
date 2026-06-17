/**
 * Media OS - Community Model
 * Fan communities, groups, and discussions
 */

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  // Content reference
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator' },

  // Author
  author: {
    viewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    type: { type: String, enum: ['viewer', 'creator', 'admin'], required: true },
    displayName: String,
    avatar: String,
    isVerified: { type: Boolean, default: false },
  },

  // Post content
  content: {
    text: { type: String, maxLength: 5000 },
    media: [{
      type: { type: String, enum: ['image', 'video', 'gif'] },
      url: String,
      thumbnail: String,
      caption: String,
    }],
    poll: {
      question: String,
      options: [{
        text: String,
        votes: { type: Number, default: 0 },
      }],
      endsAt: Date,
      totalVotes: { type: Number, default: 0 },
      allowMultiple: { type: Boolean, default: false },
    },
  },

  // Post type
  type: {
    type: String,
    enum: ['text', 'media', 'poll', 'link', 'discussion', 'question', 'review', 'clip', 'highlight'],
    default: 'text',
  },

  // Tags & Topics
  tags: [String],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' }],
  topics: [String],

  // Engagement
  engagement: {
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' }],
    likeCount: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    saves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' }],
    saveCount: { type: Number, default: 0 },
  },

  // Thread
  thread: {
    isReply: { type: Boolean, default: false },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    replyCount: { type: Number, default: 0 },
    rootId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  },

  // Community
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },

  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'removed', 'flagged', 'archived'],
    default: 'published',
  },

  // Moderation
  moderation: {
    flagged: { type: Boolean, default: false },
    flaggedReason: String,
    flaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    removed: { type: Boolean, default: false },
    removedReason: String,
    removedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  },

  // Pinning
  pinned: { type: Boolean, default: false },
  pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  pinnedAt: Date,

}, { timestamps: true });

// Indexes
postSchema.index({ contentId: 1, createdAt: -1 });
postSchema.index({ 'thread.parentId': 1 });
postSchema.index({ community: 1, createdAt: -1 });
postSchema.index({ 'author.viewerId': 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ 'engagement.likeCount': -1 });
postSchema.index({ status: 1 });

// Virtuals
postSchema.virtual('isLiked').get(function(viewerId) {
  return this.engagement.likes?.includes(viewerId);
});

postSchema.virtual('engagementRate').get(function() {
  if (this.engagement.views === 0) return 0;
  return ((this.engagement.likeCount + this.engagement.comments + this.engagement.shares) / this.engagement.views) * 100;
});

// Methods
postSchema.methods.like = async function(viewerId) {
  if (!this.engagement.likes.includes(viewerId)) {
    this.engagement.likes.push(viewerId);
    this.engagement.likeCount = this.engagement.likes.length;
    await this.save();
  }
  return this;
};

postSchema.methods.unlike = async function(viewerId) {
  this.engagement.likes = this.engagement.likes.filter(id => id.toString() !== viewerId.toString());
  this.engagement.likeCount = this.engagement.likes.length;
  await this.save();
  return this;
};

postSchema.methods.comment = function(viewerId, text) {
  this.engagement.comments += 1;
  return this;
};

postSchema.methods.share = function() {
  this.engagement.shares += 1;
  return this;
};

// Statics
postSchema.statics.findFeed = function(filters = {}) {
  const query = { status: 'published', 'thread.isReply': false };

  if (filters.creatorId) query['author.viewerId'] = filters.creatorId;
  if (filters.contentId) query.contentId = filters.contentId;
  if (filters.community) query.community = filters.community;

  return this.find(query)
    .sort('-createdAt')
    .populate('contentId', 'title thumbnail')
    .limit(filters.limit || 20);
};

postSchema.statics.findTrending = function(limit = 10) {
  return this.find({
    status: 'published',
    'thread.isReply': false,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  })
    .sort({ 'engagement.likeCount': -1, 'engagement.comments': -1 })
    .limit(limit);
};

const Post = mongoose.model('Post', postSchema);

// Community Schema
const communitySchema = new mongoose.Schema({
  // Community info
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: String,

  // Ownership
  owner: {
    type: { type: String, enum: ['creator', 'channel', 'admin', 'system'] },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: String,
    avatar: String,
  },

  // Type
  type: {
    type: String,
    enum: ['fan_club', 'discussion', 'support', 'official', 'interest'],
    required: true,
  },

  // About topic
  topic: String,
  tags: [String],

  // Media
  icon: String,
  coverImage: String,

  // Settings
  settings: {
    isPrivate: { type: Boolean, default: false },
    requiresApproval: { type: Boolean, default: false },
    allowMemberPosts: { type: Boolean, default: true },
    allowMedia: { type: Boolean, default: true },
    moderationLevel: { type: String, enum: ['none', 'light', 'strict'], default: 'light' },
    minPostsToJoin: { type: Number, default: 0 },
  },

  // Stats
  stats: {
    members: { type: Number, default: 0 },
    posts: { type: Number, default: 0 },
    postsToday: { type: Number, default: 0 },
    activeMembers: { type: Number, default: 0 },
  },

  // Members
  members: [{
    viewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    role: { type: String, enum: ['member', 'moderator', 'admin'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    notifications: { type: Boolean, default: true },
  }],

  // Rules
  rules: [{
    order: Number,
    text: String,
  }],

  // Moderators
  moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' }],

  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active',
  },

}, { timestamps: true });

// Indexes
communitySchema.index({ slug: 1 }, { unique: true });
communitySchema.index({ 'owner.entityId': 1 });
communitySchema.index({ type: 1 });
communitySchema.index({ tags: 1 });

// Methods
communitySchema.methods.addMember = async function(viewerId, role = 'member') {
  const existing = this.members.find(m => m.viewerId.toString() === viewerId.toString());
  if (!existing) {
    this.members.push({ viewerId, role });
    this.stats.members += 1;
    await this.save();
  }
  return this;
};

communitySchema.methods.removeMember = async function(viewerId) {
  this.members = this.members.filter(m => m.viewerId.toString() !== viewerId.toString());
  this.stats.members = Math.max(0, this.stats.members - 1);
  await this.save();
  return this;
};

communitySchema.methods.isMember = function(viewerId) {
  return this.members.some(m => m.viewerId.toString() === viewerId.toString());
};

communitySchema.methods.isModerator = function(viewerId) {
  return this.members.some(m =>
    m.viewerId.toString() === viewerId.toString() &&
    ['moderator', 'admin'].includes(m.role)
  );
};

// Statics
communitySchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, status: 'active' });
};

communitySchema.statics.findTrending = function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ 'stats.members': -1 })
    .limit(limit);
};

communitySchema.statics.findForViewer = function(viewerId) {
  return this.find({
    status: 'active',
    'members.viewerId': viewerId,
  });
};

const Community = mongoose.model('Community', communitySchema);

module.exports = { Post, Community };

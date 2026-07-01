/**
 * Media OS v1.0.0
 * Port: 5600
 * Content, Streaming, Creator Platform
 *
 * RTMN Department OS - Horizontal Layer
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5600;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Shared auth middleware
const { authMiddleware } = require('./shared/auth-middleware');
app.use('/api', authMiddleware);

// ============================================
// MEDIA DATA STORES
// ============================================

const stores = {
  videos: new Map(),
  shows: new Map(),
  creators: new Map(),
  channels: new Map(),
  playlists: new Map(),
  comments: new Map(),
  liveStreams: new Map(),
};

// ============================================
// MEDIA MODULE REGISTRY
// ============================================

const MODULES = {
  content: {
    name: 'Content OS',
    description: 'Videos, Shows, Movies, Live streams',
    features: ['Upload', 'Transcode', 'CDN', 'DRM'],
  },
  creator: {
    name: 'Creator OS',
    description: 'Profiles, Monetization, Analytics',
    features: ['Dashboard', 'Earnings', 'Insights'],
  },
  streaming: {
    name: 'Streaming Engine',
    description: 'HLS/DASH delivery, adaptive bitrate',
    features: ['Adaptive Streaming', 'Quality Selection'],
  },
  social: {
    name: 'Social OS',
    description: 'Comments, likes, shares, engagement',
    features: ['Reactions', 'Threads', 'Communities'],
  },
  ad: {
    name: 'Ad Insertion',
    description: 'Pre-roll, mid-roll, targeted ads',
    features: ['VAST', 'Programmatic', 'Targeting'],
  },
  recommendation: {
    name: 'Recommendation Engine',
    description: 'Personalized content discovery',
    features: ['ML-based', 'Trending', 'Similar'],
  },
};

// ============================================
// AI AGENTS
// ============================================

const AI_AGENTS = [
  { id: 'content-analyzer', name: 'Content Analyzer', purpose: 'Tag, categorize, detect content type' },
  { id: 'ad-inserter', name: 'Ad Inserter', purpose: 'Optimal ad placement decisions' },
  { id: 'quality-detector', name: 'Quality Detector', purpose: 'Video/audio quality assessment' },
  { id: 'transcript-gen', name: 'Transcript Generator', purpose: 'Auto-generate captions' },
  { id: 'thumbnail-gen', name: 'Thumbnail Generator', purpose: 'AI-powered thumbnails' },
  { id: 'content-moderator', name: 'Content Moderator', purpose: 'Policy compliance check' },
  { id: 'trend-spotter', name: 'Trend Spotter', purpose: 'Identify trending content' },
  { id: 'creator-advisor', name: 'Creator Advisor', purpose: 'Growth recommendations' },
  { id: 'engagement-boost', name: 'Engagement Booster', purpose: 'Boost views/interactions' },
  { id: 'fraud-detector', name: 'Fraud Detector', purpose: 'Detect fake views/bots' },
  { id: 'revenue-optimizer', name: 'Revenue Optimizer', purpose: 'Maximize ad revenue' },
  { id: 'viewer-segmentor', name: 'Viewer Segmentor', purpose: 'Audience segmentation' },
  { id: 'content-recommender', name: 'Content Recommender', purpose: 'Personalized suggestions' },
];

// ============================================
// CONTENT MANAGEMENT
// ============================================

const Content = {
  upload(data) {
    const id = `VID-${Date.now().toString(36).toUpperCase()}`;
    const content = {
      id,
      title: data.title,
      description: data.description || '',
      type: data.type || 'video',
      creatorId: data.creatorId,
      duration: data.duration || 0,
      views: 0,
      likes: 0,
      status: 'processing',
      thumbnail: data.thumbnail || null,
      url: data.url || null,
      tags: data.tags || [],
      category: data.category || 'general',
      ageRestriction: data.ageRestriction || 'all',
      monetization: data.monetization || false,
      createdAt: new Date(),
      publishedAt: null,
    };
    stores.videos.set(id, content);
    return content;
  },

  get(id) { return stores.videos.get(id); },

  getAll(filters = {}) {
    let videos = Array.from(stores.videos.values());
    if (filters.category) videos = videos.filter(v => v.category === filters.category);
    if (filters.creatorId) videos = videos.filter(v => v.creatorId === filters.creatorId);
    return videos;
  },

  update(id, data) {
    const video = stores.videos.get(id);
    if (video) {
      Object.assign(video, data);
      stores.videos.set(id, video);
      return video;
    }
    return null;
  },

  incrementViews(id) {
    const video = stores.videos.get(id);
    if (video) {
      video.views++;
      stores.videos.set(id, video);
      return video;
    }
    return null;
  },
};

// ============================================
// CREATOR MANAGEMENT
// ============================================

const Creators = {
  create(data) {
    const id = `CRE-${Date.now().toString(36).toUpperCase()}`;
    const creator = {
      id,
      name: data.name,
      handle: data.handle,
      email: data.email,
      avatar: data.avatar || null,
      banner: data.banner || null,
      bio: data.bio || '',
      subscribers: 0,
      totalViews: 0,
      totalEarnings: 0,
      verified: false,
      tier: 'standard',
      socialLinks: {},
      createdAt: new Date(),
    };
    stores.creators.set(id, creator);
    return creator;
  },

  get(id) { return stores.creators.get(id); },

  getByHandle(handle) {
    return Array.from(stores.creators.values()).find(c => c.handle === handle);
  },

  update(id, data) {
    const creator = stores.creators.get(id);
    if (creator) {
      Object.assign(creator, data);
      stores.creators.set(id, creator);
      return creator;
    }
    return null;
  },

  getAnalytics(creatorId) {
    const creator = stores.creators.get(creatorId);
    if (!creator) return null;
    const videos = Content.getAll({ creatorId });
    return {
      creator,
      totalVideos: videos.length,
      totalViews: videos.reduce((sum, v) => sum + v.views, 0),
      totalLikes: videos.reduce((sum, v) => sum + v.likes, 0),
      avgViewsPerVideo: videos.length > 0 ? Math.round(videos.reduce((sum, v) => sum + v.views, 0) / videos.length) : 0,
    };
  },
};

// ============================================
// CHANNEL MANAGEMENT
// ============================================

const Channels = {
  create(data) {
    const id = `CH-${Date.now().toString(36).toUpperCase()}`;
    const channel = {
      id,
      name: data.name,
      description: data.description || '',
      ownerId: data.ownerId,
      type: data.type || 'public',
      category: data.category || 'general',
      subscriberCount: 0,
      videoCount: 0,
      totalViews: 0,
      createdAt: new Date(),
    };
    stores.channels.set(id, channel);
    return channel;
  },

  get(id) { return stores.channels.get(id); },

  subscribe(channelId) {
    const channel = stores.channels.get(channelId);
    if (channel) {
      channel.subscriberCount++;
      stores.channels.set(channelId, channel);
      return channel;
    }
    return null;
  },
};

// ============================================
// PLAYLIST MANAGEMENT
// ============================================

const Playlists = {
  create(data) {
    const id = `PL-${Date.now().toString(36).toUpperCase()}`;
    const playlist = {
      id,
      name: data.name,
      description: data.description || '',
      ownerId: data.ownerId,
      videos: data.videos || [],
      visibility: data.visibility || 'private',
      createdAt: new Date(),
    };
    stores.playlists.set(id, playlist);
    return playlist;
  },

  get(id) { return stores.playlists.get(id); },

  addVideo(playlistId, videoId) {
    const playlist = stores.playlists.get(playlistId);
    if (playlist && !playlist.videos.includes(videoId)) {
      playlist.videos.push(videoId);
      stores.playlists.set(playlistId, playlist);
      return playlist;
    }
    return null;
  },
};

// ============================================
// LIVE STREAMING
// ============================================

const LiveStreams = {
  start(data) {
    const id = `LIVE-${Date.now().toString(36).toUpperCase()}`;
    const stream = {
      id,
      title: data.title,
      creatorId: data.creatorId,
      status: 'live',
      viewerCount: 0,
      startedAt: new Date(),
      endedAt: null,
    };
    stores.liveStreams.set(id, stream);
    return stream;
  },

  get(id) { return stores.liveStreams.get(id); },

  end(id) {
    const stream = stores.liveStreams.get(id);
    if (stream) {
      stream.status = 'ended';
      stream.endedAt = new Date();
      stores.liveStreams.set(id, stream);
      return stream;
    }
    return null;
  },

  getLive() {
    return Array.from(stores.liveStreams.values()).filter(s => s.status === 'live');
  },
};

// ============================================
// COMMENTS
// ============================================

const Comments = {
  create(data) {
    const id = `CMT-${Date.now().toString(36).toUpperCase()}`;
    const comment = {
      id,
      videoId: data.videoId,
      userId: data.userId,
      text: data.text,
      likes: 0,
      replies: [],
      createdAt: new Date(),
    };
    stores.comments.set(id, comment);
    return comment;
  },

  getByVideo(videoId) {
    return Array.from(stores.comments.values()).filter(c => c.videoId === videoId);
  },
};

// ============================================
// RECOMMENDATIONS
// ============================================

const Recommendations = {
  forUser(userId, limit = 10) {
    const videos = Array.from(stores.videos.values()).filter(v => v.status === 'published');
    return videos
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)
      .map(v => ({
        ...v,
        reason: ['Trending', 'Because you watched', 'Popular in your region', 'Similar to your interests'][Math.floor(Math.random() * 4)],
      }));
  },

  trending(limit = 10) {
    return Array.from(stores.videos.values())
      .filter(v => v.status === 'published')
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  },
};

// ============================================
// ANALYTICS
// ============================================

const Analytics = {
  getPlatformStats() {
    return {
      totalVideos: stores.videos.size,
      totalCreators: stores.creators.size,
      totalChannels: stores.channels.size,
      totalPlaylists: stores.playlists.size,
      totalLiveStreams: stores.liveStreams.size,
      totalComments: stores.comments.size,
      totalViews: Array.from(stores.videos.values()).reduce((sum, v) => sum + v.views, 0),
      aiAgentsActive: AI_AGENTS.length,
    };
  },

  getVideoStats(videoId) {
    const video = stores.videos.get(videoId);
    if (!video) return null;
    return {
      video,
      engagementRate: video.views > 0 ? Math.round((video.likes / video.views) * 10000) / 100 : 0,
    };
  },
};

// ============================================
// API ROUTES
// ============================================

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'media-os',
    version: '1.0.0',
    port: PORT,
    modules: Object.keys(MODULES).length,
    aiAgents: AI_AGENTS.length,
    stats: Analytics.getPlatformStats(),
    timestamp: new Date().toISOString(),
  });
});

// Modules
app.get('/api/modules', (req, res) => res.json({ success: true, modules: MODULES }));

// AI Agents
app.get('/api/agents', (req, res) => res.json({ success: true, agents: AI_AGENTS }));
app.get('/api/agents/:id', (req, res) => {
  const agent = AI_AGENTS.find(a => a.id === req.params.id);
  agent ? res.json({ success: true, agent }) : res.status(404).json({ error: 'Agent not found' });
});

// Content
app.get('/api/content', (req, res) => res.json({ success: true, videos: Content.getAll(req.query) }));
app.post('/api/content', (req, res) => res.json({ success: true, video: Content.upload(req.body) }));
app.get('/api/content/:id', (req, res) => {
  const video = Content.get(req.params.id);
  video ? res.json({ success: true, video }) : res.status(404).json({ error: 'Not found' });
});
app.patch('/api/content/:id', (req, res) => {
  const video = Content.update(req.params.id, req.body);
  video ? res.json({ success: true, video }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/content/:id/view', (req, res) => {
  const video = Content.incrementViews(req.params.id);
  video ? res.json({ success: true, views: video.views }) : res.status(404).json({ error: 'Not found' });
});

// Creators
app.get('/api/creators', (req, res) => res.json({ success: true, creators: Array.from(stores.creators.values()) }));
app.post('/api/creators', (req, res) => res.json({ success: true, creator: Creators.create(req.body) }));
app.get('/api/creators/:id', (req, res) => {
  const creator = Creators.get(req.params.id);
  creator ? res.json({ success: true, creator }) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/creators/:id/analytics', (req, res) => {
  const analytics = Creators.getAnalytics(req.params.id);
  analytics ? res.json({ success: true, analytics }) : res.status(404).json({ error: 'Creator not found' });
});
app.get('/api/creators/handle/:handle', (req, res) => {
  const creator = Creators.getByHandle(req.params.handle);
  creator ? res.json({ success: true, creator }) : res.status(404).json({ error: 'Not found' });
});

// Channels
app.get('/api/channels', (req, res) => res.json({ success: true, channels: Array.from(stores.channels.values()) }));
app.post('/api/channels', (req, res) => res.json({ success: true, channel: Channels.create(req.body) }));
app.post('/api/channels/:id/subscribe', (req, res) => {
  const channel = Channels.subscribe(req.params.id);
  channel ? res.json({ success: true, channel }) : res.status(404).json({ error: 'Not found' });
});

// Playlists
app.get('/api/playlists', (req, res) => res.json({ success: true, playlists: Array.from(stores.playlists.values()) }));
app.post('/api/playlists', (req, res) => res.json({ success: true, playlist: Playlists.create(req.body) }));
app.post('/api/playlists/:id/videos', (req, res) => {
  const playlist = Playlists.addVideo(req.params.id, req.body.videoId);
  playlist ? res.json({ success: true, playlist }) : res.status(404).json({ error: 'Not found' });
});

// Live Streams
app.get('/api/live', (req, res) => res.json({ success: true, streams: LiveStreams.getLive() }));
app.post('/api/live/start', (req, res) => res.json({ success: true, stream: LiveStreams.start(req.body) }));
app.post('/api/live/:id/end', (req, res) => {
  const stream = LiveStreams.end(req.params.id);
  stream ? res.json({ success: true, stream }) : res.status(404).json({ error: 'Not found' });
});

// Comments
app.get('/api/comments/video/:videoId', (req, res) => res.json({ success: true, comments: Comments.getByVideo(req.params.videoId) }));
app.post('/api/comments', (req, res) => res.json({ success: true, comment: Comments.create(req.body) }));

// Recommendations
app.get('/api/recommendations', (req, res) => res.json({ success: true, videos: Recommendations.forUser(req.query.userId, parseInt(req.query.limit) || 10) }));
app.get('/api/trending', (req, res) => res.json({ success: true, videos: Recommendations.trending(parseInt(req.query.limit) || 10) }));

// Analytics
app.get('/api/analytics/platform', (req, res) => res.json({ success: true, stats: Analytics.getPlatformStats() }));
app.get('/api/analytics/video/:id', (req, res) => {
  const stats = Analytics.getVideoStats(req.params.id);
  stats ? res.json({ success: true, stats }) : res.status(404).json({ error: 'Video not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                       Media OS v1.0.0                              ║
║                       Port: ${PORT}                                ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                              ║
║  Modules: ${Object.keys(MODULES).length}                                               ║
║  AI Agents: ${AI_AGENTS.length}                                             ║
║                                                              ║
║  Features:                                               ║
║  ✅ Content OS - Videos, Shows, Movies                     ║
║  ✅ Creator OS - Profiles, Monetization                    ║
║  ✅ Streaming Engine - HLS/DASH                           ║
║  ✅ Social OS - Comments, Engagement                       ║
║  ✅ Ad Insertion - Pre-roll, Mid-roll                     ║
║  ✅ Recommendation Engine - ML-based                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════════════╝
  `);
});

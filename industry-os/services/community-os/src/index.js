/**
 * Community OS - Forums, Groups, Events, and Developer Ecosystem
 * Port: 4761
 *
 * Provides:
 * - Forums and discussions
 * - Groups and communities
 * - Events and meetups
 * - Developer ecosystem
 * - Hackathons
 * - Knowledge sharing
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4761;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// Shared auth middleware
const { authMiddleware } = require('./shared/auth-middleware');
app.use('/api', authMiddleware);

// In-memory stores
const forums = new Map();
const posts = new Map();
const comments = new Map();
const groups = new Map();
const events = new Map();
const members = new Map();
const reactions = new Map();
const tags = new Map();
const notifications = new Map();

// Seed sample data
function seedData() {
  // Sample forums
  const sampleForums = [
    {
      id: 'forum-ai',
      name: 'AI & Machine Learning',
      description: 'Discussions about AI, ML, and intelligent systems',
      category: 'technology',
      members: 1523,
      posts: 3421,
      icon: '🤖',
      createdAt: new Date().toISOString()
    },
    {
      id: 'forum-commerce',
      name: 'Autonomous Commerce',
      description: 'SUTAR OS, Nexha, and agent commerce discussions',
      category: 'business',
      members: 892,
      posts: 1847,
      icon: '🛒',
      createdAt: new Date().toISOString()
    },
    {
      id: 'forum-developers',
      name: 'Developer Hub',
      description: 'APIs, SDKs, integrations, and developer tools',
      category: 'development',
      members: 2341,
      posts: 5623,
      icon: '👨‍💻',
      createdAt: new Date().toISOString()
    },
    {
      id: 'forum-business',
      name: 'Business & Strategy',
      description: 'Business models, strategies, and growth',
      category: 'business',
      members: 1102,
      posts: 2156,
      icon: '📈',
      createdAt: new Date().toISOString()
    }
  ];
  sampleForums.forEach(f => forums.set(f.id, f));

  // Sample groups
  const sampleGroups = [
    {
      id: 'group-nexha-founders',
      name: 'Nexha Founders',
      description: 'Community for Nexha operators and founders',
      forumId: 'forum-business',
      type: 'public',
      members: 247,
      createdAt: new Date().toISOString()
    },
    {
      id: 'group-ai-engineers',
      name: 'AI Engineers Collective',
      description: 'For AI/ML engineers building on HOJAI',
      forumId: 'forum-ai',
      type: 'public',
      members: 534,
      createdAt: new Date().toISOString()
    },
    {
      id: 'group-startups',
      name: 'AI Startup Founders',
      description: 'Founders building AI-native businesses',
      forumId: 'forum-business',
      type: 'invite',
      members: 189,
      createdAt: new Date().toISOString()
    }
  ];
  sampleGroups.forEach(g => groups.set(g.id, g));

  // Sample events
  const sampleEvents = [
    {
      id: 'event-hackathon-q3',
      title: 'HOJAI Global Hackathon Q3 2026',
      description: 'Build AI-native apps on HOJAI platform. $50K in prizes!',
      type: 'hackathon',
      startDate: '2026-09-15',
      endDate: '2026-09-17',
      location: 'Virtual + Bangalore',
      participants: 847,
      maxParticipants: 1000,
      prize: '$50,000',
      status: 'upcoming',
      createdAt: new Date().toISOString()
    },
    {
      id: 'event-nexha-summit',
      title: 'Nexha Global Summit 2026',
      description: 'Annual gathering of Nexha operators worldwide',
      type: 'conference',
      startDate: '2026-11-20',
      endDate: '2026-11-22',
      location: 'Singapore',
      participants: 423,
      maxParticipants: 500,
      status: 'upcoming',
      createdAt: new Date().toISOString()
    },
    {
      id: 'event-weekly-ai',
      title: 'AI Weekly Deep Dive',
      description: 'Weekly discussion on latest AI developments',
      type: 'webinar',
      startDate: '2026-06-28',
      location: 'Online',
      participants: 156,
      recurring: 'weekly',
      status: 'upcoming',
      createdAt: new Date().toISOString()
    }
  ];
  sampleEvents.forEach(e => events.set(e.id, e));

  // Sample posts
  const samplePosts = [
    {
      id: 'post-1',
      forumId: 'forum-developers',
      authorId: 'user-1',
      authorName: 'DevExpert',
      title: 'How to integrate with SUTAR OS API',
      content: 'Guide to connecting your app to SUTAR OS for autonomous commerce...',
      tags: ['sutar', 'api', 'integration'],
      upvotes: 45,
      comments: 12,
      createdAt: new Date().toISOString()
    },
    {
      id: 'post-2',
      forumId: 'forum-ai',
      authorId: 'user-2',
      authorName: 'AIResearcher',
      title: 'Best practices for prompt engineering',
      content: 'Sharing my learnings from building production AI applications...',
      tags: ['prompt-engineering', 'best-practices'],
      upvotes: 78,
      comments: 23,
      createdAt: new Date().toISOString()
    }
  ];
  samplePosts.forEach(p => posts.set(p.id, p));

  console.log(`[CommunityOS] Seeded: ${forums.size} forums, ${groups.size} groups, ${events.size} events, ${posts.size} posts`);
}

seedData();

// ==================== FORUMS ====================

app.get('/api/forums', (req, res) => {
  const { category } = req.query;
  let result = Array.from(forums.values());

  if (category) {
    result = result.filter(f => f.category === category);
  }

  res.json({ success: true, count: result.length, data: result });
});

app.get('/api/forums/:id', (req, res) => {
  const forum = forums.get(req.params.id);
  if (!forum) {
    return res.status(404).json({ success: false, error: 'Forum not found' });
  }
  res.json({ success: true, data: forum });
});

app.post('/api/forums', (req, res) => {
  const { name, description, category, icon } = req.body;
  if (!name || !description) {
    return res.status(400).json({ success: false, error: 'name and description required' });
  }

  const forum = {
    id: `forum-${uuidv4()}`,
    name,
    description,
    category: category || 'general',
    icon: icon || '💬',
    members: 0,
    posts: 0,
    createdAt: new Date().toISOString()
  };

  forums.set(forum.id, forum);
  res.status(201).json({ success: true, data: forum });
});

// ==================== POSTS ====================

app.get('/api/forums/:forumId/posts', (req, res) => {
  const { sort, tag, page, limit } = req.query;
  let forumPosts = Array.from(posts.values())
    .filter(p => p.forumId === req.params.forumId);

  if (tag) {
    forumPosts = forumPosts.filter(p => p.tags.includes(tag));
  }

  // Sort
  if (sort === 'top') {
    forumPosts.sort((a, b) => b.upvotes - a.upvotes);
  } else {
    forumPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Pagination
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const start = (pageNum - 1) * limitNum;
  const paginated = forumPosts.slice(start, start + limitNum);

  res.json({
    success: true,
    page: pageNum,
    total: forumPosts.length,
    data: paginated
  });
});

app.get('/api/posts/:id', (req, res) => {
  const post = posts.get(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  // Get comments
  const postComments = Array.from(comments.values())
    .filter(c => c.postId === req.params.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({ success: true, data: { ...post, comments: postComments } });
});

app.post('/api/posts', (req, res) => {
  const { forumId, authorId, authorName, title, content, tags } = req.body;
  if (!forumId || !authorId || !title || !content) {
    return res.status(400).json({ success: false, error: 'forumId, authorId, title, content required' });
  }

  const post = {
    id: `post-${uuidv4()}`,
    forumId,
    authorId,
    authorName: authorName || 'Anonymous',
    title,
    content,
    tags: tags || [],
    upvotes: 0,
    downvotes: 0,
    comments: 0,
    views: 0,
    createdAt: new Date().toISOString()
  };

  posts.set(post.id, post);

  // Update forum stats
  const forum = forums.get(forumId);
  if (forum) {
    forum.posts++;
    forums.set(forumId, forum);
  }

  res.status(201).json({ success: true, data: post });
});

// ==================== COMMENTS ====================

app.post('/api/posts/:postId/comments', (req, res) => {
  const { authorId, authorName, content, parentId } = req.body;
  if (!authorId || !content) {
    return res.status(400).json({ success: false, error: 'authorId and content required' });
  }

  const comment = {
    id: `comment-${uuidv4()}`,
    postId: req.params.postId,
    authorId,
    authorName: authorName || 'Anonymous',
    content,
    parentId: parentId || null,
    upvotes: 0,
    createdAt: new Date().toISOString()
  };

  comments.set(comment.id, comment);

  // Update post comment count
  const post = posts.get(req.params.postId);
  if (post) {
    post.comments++;
    posts.set(post.id, post);
  }

  res.status(201).json({ success: true, data: comment });
});

app.get('/api/posts/:postId/comments', (req, res) => {
  const postComments = Array.from(comments.values())
    .filter(c => c.postId === req.params.postId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({ success: true, count: postComments.length, data: postComments });
});

// ==================== REACTIONS ====================

app.post('/api/posts/:postId/react', (req, res) => {
  const { userId, type } = req.body; // type: 'up' or 'down'
  if (!userId || !type) {
    return res.status(400).json({ success: false, error: 'userId and type required' });
  }

  const post = posts.get(req.params.postId);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  const key = `${req.params.postId}:${userId}`;
  const existing = reactions.get(key);

  if (existing === type) {
    // Remove reaction
    reactions.delete(key);
    if (type === 'up') post.upvotes--;
    else post.downvotes--;
  } else {
    // Change reaction
    if (existing) {
      if (existing === 'up') post.upvotes--;
      else post.downvotes--;
    }
    reactions.set(key, type);
    if (type === 'up') post.upvotes++;
    else post.downvotes++;
  }

  posts.set(post.id, post);

  res.json({ success: true, data: { upvotes: post.upvotes, downvotes: post.downvotes } });
});

// ==================== GROUPS ====================

app.get('/api/groups', (req, res) => {
  const { type, forumId } = req.query;
  let result = Array.from(groups.values());

  if (type) result = result.filter(g => g.type === type);
  if (forumId) result = result.filter(g => g.forumId === forumId);

  res.json({ success: true, count: result.length, data: result });
});

app.get('/api/groups/:id', (req, res) => {
  const group = groups.get(req.params.id);
  if (!group) {
    return res.status(404).json({ success: false, error: 'Group not found' });
  }

  // Get members
  const groupMembers = Array.from(members.values())
    .filter(m => m.groupId === req.params.id);

  res.json({ success: true, data: { ...group, members: groupMembers } });
});

app.post('/api/groups', (req, res) => {
  const { name, description, forumId, type } = req.body;
  if (!name || !description) {
    return res.status(400).json({ success: false, error: 'name and description required' });
  }

  const group = {
    id: `group-${uuidv4()}`,
    name,
    description,
    forumId: forumId || null,
    type: type || 'public',
    members: 1, // Creator
    createdAt: new Date().toISOString()
  };

  groups.set(group.id, group);

  // Auto-join creator as admin (would need userId in real scenario)
  res.status(201).json({ success: true, data: group });
});

app.post('/api/groups/:id/join', (req, res) => {
  const { userId, userName } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId required' });
  }

  const group = groups.get(req.params.id);
  if (!group) {
    return res.status(404).json({ success: false, error: 'Group not found' });
  }

  const member = {
    id: `member-${uuidv4()}`,
    groupId: req.params.id,
    userId,
    userName: userName || 'Member',
    role: 'member',
    joinedAt: new Date().toISOString()
  };

  members.set(member.id, member);
  group.members++;
  groups.set(group.id, group);

  res.json({ success: true, data: member });
});

// ==================== EVENTS ====================

app.get('/api/events', (req, res) => {
  const { type, status } = req.query;
  let result = Array.from(events.values());

  if (type) result = result.filter(e => e.type === type);
  if (status) result = result.filter(e => e.status === status);

  res.json({ success: true, count: result.length, data: result });
});

app.get('/api/events/:id', (req, res) => {
  const event = events.get(req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }
  res.json({ success: true, data: event });
});

app.post('/api/events', (req, res) => {
  const { title, description, type, startDate, endDate, location, maxParticipants, prize } = req.body;
  if (!title || !startDate) {
    return res.status(400).json({ success: false, error: 'title and startDate required' });
  }

  const event = {
    id: `event-${uuidv4()}`,
    title,
    description: description || '',
    type: type || 'meetup',
    startDate,
    endDate: endDate || null,
    location: location || 'Online',
    participants: 0,
    maxParticipants: maxParticipants || 100,
    prize: prize || null,
    status: 'upcoming',
    createdAt: new Date().toISOString()
  };

  events.set(event.id, event);
  res.status(201).json({ success: true, data: event });
});

app.post('/api/events/:id/register', (req, res) => {
  const { userId, userName } = req.body;
  const event = events.get(req.params.id);

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  if (event.participants >= event.maxParticipants) {
    return res.status(400).json({ success: false, error: 'Event full' });
  }

  event.participants++;
  events.set(event.id, event);

  res.json({ success: true, data: { participants: event.participants } });
});

// ==================== SEARCH ====================

app.get('/api/search', (req, res) => {
  const { q, type } = req.query;
  if (!q) {
    return res.status(400).json({ success: false, error: 'q (query) required' });
  }

  const term = q.toLowerCase();
  const results = { posts: [], forums: [], groups: [], events: [] };

  // Search posts
  if (!type || type === 'posts') {
    Array.from(posts.values())
      .filter(p => p.title.toLowerCase().includes(term) || p.content.toLowerCase().includes(term))
      .slice(0, 10)
      .forEach(p => results.posts.push(p));
  }

  // Search forums
  if (!type || type === 'forums') {
    Array.from(forums.values())
      .filter(f => f.name.toLowerCase().includes(term) || f.description.toLowerCase().includes(term))
      .forEach(f => results.forums.push(f));
  }

  // Search groups
  if (!type || type === 'groups') {
    Array.from(groups.values())
      .filter(g => g.name.toLowerCase().includes(term) || g.description.toLowerCase().includes(term))
      .forEach(g => results.groups.push(g));
  }

  // Search events
  if (!type || type === 'events') {
    Array.from(events.values())
      .filter(e => e.title.toLowerCase().includes(term) || e.description.toLowerCase().includes(term))
      .forEach(e => results.events.push(e));
  }

  res.json({ success: true, query: q, data: results });
});

// ==================== TAGS ====================

app.get('/api/tags', (req, res) => {
  const allTags = {};
  Array.from(posts.values()).forEach(p => {
    (p.tags || []).forEach(tag => {
      allTags[tag] = (allTags[tag] || 0) + 1;
    });
  });

  const sorted = Object.entries(allTags)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  res.json({ success: true, count: sorted.length, data: sorted });
});

// ==================== STATS ====================

app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      forums: forums.size,
      posts: posts.size,
      comments: comments.size,
      groups: groups.size,
      events: events.size,
      members: members.size,
      tags: Object.keys(
        Array.from(posts.values()).reduce((acc, p) => {
          (p.tags || []).forEach(t => acc[t] = true);
          return acc;
        }, {})
      ).length
    }
  });
});

// ==================== HEALTH ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'community-os',
    port: PORT,
    stats: {
      forums: forums.size,
      posts: posts.size,
      groups: groups.size,
      events: events.size
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Community OS',
    version: '1.0.0',
    port: PORT,
    endpoints: [
      'GET /api/forums',
      'GET /api/forums/:id',
      'GET /api/forums/:forumId/posts',
      'POST /api/posts',
      'GET /api/posts/:id',
      'POST /api/posts/:postId/comments',
      'GET /api/groups',
      'POST /api/groups',
      'GET /api/events',
      'POST /api/events',
      'GET /api/search?q=term',
      'GET /api/tags',
      'GET /api/stats'
    ]
  });
});

app.use((err, req, res, next) => {
  console.error('[CommunityOS] Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[CommunityOS] Running on port ${PORT}`);
  console.log(`[CommunityOS] ${forums.size} forums, ${groups.size} groups, ${events.size} events`);
});

module.exports = app;

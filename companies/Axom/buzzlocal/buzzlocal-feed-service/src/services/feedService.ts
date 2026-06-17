/**
 * BuzzLocal Feed Service - Core Logic
 *
 * Manages local feed, news, events, offers
 */

import type { FeedItem, FeedFilters, FeedResponse, Alert, Offer, Event, TrendingTopic, FeedComment } from '../types';

// Mock data
const MOCK_FEED_ITEMS: FeedItem[] = [
  {
    id: 'feed-1',
    type: 'news',
    title: 'New Italian Restaurant Opens in Koramangala',
    description: 'Pasta Paradise brings authentic Italian cuisine to the neighborhood',
    author: { id: 'biz-1', name: 'Pasta Paradise', isVerified: true, type: 'business' },
    location: { latitude: 12.9352, longitude: 77.6245, area: 'Koramangala', city: 'Bangalore' },
    radius: 'neighborhood',
    category: 'food',
    tags: ['restaurant', 'italian', 'opening'],
    likes: 234, comments: 45, shares: 12, saved: 67, views: 1523,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'feed-2',
    type: 'alert',
    title: 'Traffic Jam on MG Road Due to Road Work',
    description: 'Expect 30 min delays. Alternative routes suggested.',
    author: { id: 'sys-1', name: 'BuzzLocal', isVerified: true, type: 'system' },
    location: { latitude: 12.9716, longitude: 77.5946, area: 'MG Road', city: 'Bangalore' },
    radius: 'area',
    category: 'traffic',
    tags: ['traffic', 'mg-road', 'roadwork'],
    likes: 89, comments: 23, shares: 56, saved: 12, views: 892,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'feed-3',
    type: 'offer',
    title: '50% Off on All Pizzas Today',
    description: 'Celebrating our first week with amazing deals!',
    author: { id: 'biz-2', name: 'Pizza Hub', isVerified: true, type: 'business' },
    location: { latitude: 12.9352, longitude: 77.6245, area: 'Koramangala', city: 'Bangalore' },
    radius: 'neighborhood',
    category: 'food',
    tags: ['pizza', 'discount', 'offer'],
    likes: 567, comments: 89, shares: 234, saved: 456, views: 4521,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: 'feed-4',
    type: 'event',
    title: 'Weekend Jazz Night at UB City',
    description: 'Live jazz performance by local artists. Food and drinks available.',
    author: { id: 'evt-1', name: 'Jazz Club Bangalore', isVerified: true, type: 'business' },
    location: { latitude: 12.9716, longitude: 77.5946, area: 'UB City', city: 'Bangalore' },
    radius: 'city',
    category: 'music',
    tags: ['jazz', 'live-music', 'weekend', 'ub-city'],
    likes: 892, comments: 156, shares: 345, saved: 678, views: 8934,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'feed-5',
    type: 'update',
    title: 'Metro Line 2 Extension Approved for Whitefield',
    description: 'The new metro extension will connect Whitefield to Central Bangalore by 2027.',
    author: { id: 'news-1', name: 'Local News', isVerified: true, type: 'system' },
    location: { latitude: 12.9698, longitude: 77.7499, area: 'Whitefield', city: 'Bangalore' },
    radius: 'area',
    category: 'infrastructure',
    tags: ['metro', 'whitefield', 'infrastructure'],
    likes: 2345, comments: 456, shares: 1234, saved: 890, views: 23456,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'feed-6',
    type: 'trending',
    title: 'New Park Inaugurated in HSR Layout',
    description: 'A green oasis opens in HSR with jogging track, gym equipment, and kids play area.',
    author: { id: 'gov-1', name: 'BBMP', isVerified: true, type: 'system' },
    location: { latitude: 12.9115, longitude: 77.6380, area: 'HSR Layout', city: 'Bangalore' },
    radius: 'neighborhood',
    category: 'infrastructure',
    tags: ['park', 'hsr', 'inauguration'],
    likes: 1234, comments: 234, shares: 567, saved: 890, views: 12345,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

const MOCK_TRENDING: TrendingTopic[] = [
  { id: '1', tag: '#JazzNight', count: 2345, category: 'music', recent: true },
  { id: '2', tag: '#PizzaFestival', count: 1890, category: 'food', recent: true },
  { id: '3', tag: '#MetroUpdate', count: 1567, category: 'infrastructure', recent: false },
  { id: '4', tag: '#WeekendPlans', count: 1234, category: 'events', recent: true },
  { id: '5', tag: '#NewOpening', count: 987, category: 'business', recent: true },
];

class FeedService {
  // Get personalized feed
  async getFeed(filters: FeedFilters = {}): Promise<FeedResponse> {
    let items = [...MOCK_FEED_ITEMS];

    // Apply filters
    if (filters.types?.length) {
      items = items.filter(item => filters.types!.includes(item.type));
    }
    if (filters.categories?.length) {
      items = items.filter(item => filters.categories!.includes(item.category));
    }
    if (filters.area) {
      items = items.filter(item => item.location.area === filters.area);
    }
    if (filters.city) {
      items = items.filter(item => item.location.city === filters.city);
    }

    // Sort by relevance (views + likes)
    items.sort((a, b) => (b.views + b.likes * 2) - (a.views + a.likes * 2));

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    return {
      items: items.slice(offset, offset + limit),
      pagination: {
        total: items.length,
        limit,
        offset,
        hasMore: offset + limit < items.length,
      },
      trends: MOCK_TRENDING.slice(0, 5),
    };
  }

  // Get nearby alerts
  async getAlerts(lat: number, lng: number, radiusKm: number = 5): Promise<Alert[]> {
    return MOCK_FEED_ITEMS.filter(item => item.type === 'alert') as Alert[];
  }

  // Get local offers
  async getOffers(lat: number, lng: number, limit: number = 20): Promise<Offer[]> {
    return MOCK_FEED_ITEMS.filter(item => item.type === 'offer') as Offer[];
  }

  // Get local events
  async getEvents(lat: number, lng: number, limit: number = 20): Promise<Event[]> {
    return MOCK_FEED_ITEMS.filter(item => item.type === 'event') as Event[];
  }

  // Get trending topics
  async getTrending(city?: string): Promise<TrendingTopic[]> {
    return MOCK_TRENDING;
  }

  // Like/unlike feed item
  async toggleLike(itemId: string, userId: string): Promise<{ liked: boolean; count: number }> {
    return { liked: true, count: Math.floor(Math.random() * 500) + 100 };
  }

  // Save/unsave feed item
  async toggleSave(itemId: string, userId: string): Promise<{ saved: boolean }> {
    return { saved: true };
  }

  // Get comments
  async getComments(itemId: string, limit: number = 20): Promise<FeedComment[]> {
    return [
      {
        id: 'comment-1',
        feedItemId: itemId,
        author: { id: 'user-1', name: 'Rahul S.' },
        content: 'This is amazing! Definitely going to check it out.',
        likes: 45,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'comment-2',
        feedItemId: itemId,
        author: { id: 'user-2', name: 'Priya M.' },
        content: 'Thanks for sharing!',
        likes: 12,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
  }

  // Add comment
  async addComment(itemId: string, userId: string, content: string): Promise<FeedComment> {
    return {
      id: `comment-${Date.now()}`,
      feedItemId: itemId,
      author: { id: userId, name: 'User' },
      content,
      likes: 0,
      createdAt: new Date().toISOString(),
    };
  }

  // Report item
  async reportItem(itemId: string, userId: string, reason: string): Promise<{ success: boolean }> {
    return { success: true };
  }
}

export const feedService = new FeedService();
export default feedService;

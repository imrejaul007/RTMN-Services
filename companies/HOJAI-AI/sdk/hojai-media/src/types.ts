export const MEDIA_PORT = 5600;

export interface Video {
  id: string;
  title: string;
  description: string;
  /** URL to the video file (HLS / DASH / MP4) */
  videoUrl: string;
  /** URL to the thumbnail */
  thumbnailUrl: string;
  durationSec: number;
  creatorId: string;
  channelId?: string;
  /** Tags for search */
  tags: string[];
  category?: string;
  visibility: 'public' | 'unlisted' | 'private' | 'premium';
  /** DRM-protected? */
  drmProtected: boolean;
  viewCount: number;
  likeCount: number;
  /** Whether the content is part of a live stream */
  live: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Creator {
  id: string;
  handle: string;
  name: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  verified: boolean;
  subscriberCount: number;
  videoCount: number;
  totalViews: number;
  createdAt: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  /** Number of subscribers */
  subscriberCount: number;
  /** Whether this is a verified channel */
  verified: boolean;
  /** Channel artwork */
  bannerUrl?: string;
  createdAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  videoIds: string[];
  visibility: 'public' | 'unlisted' | 'private';
  createdAt: string;
  updatedAt: string;
}

export interface LiveStream {
  id: string;
  title: string;
  description?: string;
  creatorId: string;
  status: 'starting' | 'live' | 'ended';
  /** HLS ingest URL */
  ingestUrl: string;
  /** Public playback URL */
  playbackUrl: string;
  viewerCount: number;
  startedAt: string;
  endedAt?: string;
}

export interface Comment {
  id: string;
  videoId: string;
  authorId: string;
  authorName: string;
  body: string;
  /** Parent comment id (for replies) */
  parentId?: string;
  likeCount: number;
  createdAt: string;
}

export interface CreatorAnalytics {
  creatorId: string;
  totalViews: number;
  totalWatchTimeMin: number;
  subscriberGrowth: { date: string; count: number }[];
  topVideos: Array<{ videoId: string; title: string; views: number }>;
  revenue: { amount: number; currency: string };
}

export interface PlatformAnalytics {
  totalVideos: number;
  totalCreators: number;
  totalWatchTimeMin: number;
  /** Top categories by view share */
  topCategories: Array<{ category: string; share: number }>;
  /** Active live streams */
  liveNow: number;
}

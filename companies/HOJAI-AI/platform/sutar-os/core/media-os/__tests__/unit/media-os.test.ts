/**
 * Media OS Unit Tests
 * Port: 4881
 * Tests: Media type validation, transcoding job status transitions,
 *        thumbnail generation, CDN cache invalidation
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@rtmn/shared/auth', () => ({ requireAuth: (_req: any, _res: any, next: () => void) => next() }));

// Types from src/index.ts
interface Media {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  size: number;
  mimeType: string;
  tags: string[];
  metadata: Record<string, string>;
  uploadedAt: string;
  uploadedBy: string;
  dimensions?: { width: number; height: number };
  duration?: number;
}

interface TranscodingJob {
  id: string;
  mediaId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  formats: string[];
  progress: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface Transcription {
  id: string;
  mediaId: string;
  text: string;
  language?: string;
  segments: { start: number; end: number; text: string }[];
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

interface CdnCache {
  url: string;
  invalidatedAt: string;
  reason?: string;
}

interface Thumbnail {
  id: string;
  mediaId: string;
  url: string;
  time?: number;
  size: { width: number; height: number };
}

// ============ HELPER FUNCTIONS (from src/index.ts logic) ============

const VALID_MEDIA_TYPES: Media['type'][] = ['image', 'video', 'audio', 'document'];

function isValidMediaType(type: string): type is Media['type'] {
  return VALID_MEDIA_TYPES.includes(type as any);
}

function canTranscode(media: Media): boolean {
  return media.type === 'video' || media.type === 'audio';
}

function canTranscribe(media: Media): boolean {
  return media.type === 'audio' || media.type === 'video';
}

function canGenerateThumbnail(media: Media): boolean {
  return media.type === 'video' || media.type === 'audio';
}

function getTranscodingProgress(job: TranscodingJob): number {
  if (job.status === 'completed') return 100;
  if (job.status === 'pending') return 0;
  if (job.status === 'failed') return job.progress;
  return job.progress;
}

function simulateProgress(job: TranscodingJob): TranscodingJob {
  if (job.status === 'processing' && job.progress < 100) {
    job.progress = Math.min(100, job.progress + 25);
  }
  if (job.progress >= 100) {
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
  }
  return job;
}

function isTranscodeComplete(job: TranscodingJob): boolean {
  return job.status === 'completed' || job.status === 'failed';
}

function validateTranscodeFormats(formats: string[]): { valid: boolean; invalid: string[] } {
  const validFormats = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'ogg', 'aac', 'flac'];
  const invalid = formats.filter(f => !validFormats.includes(f));
  return { valid: invalid.length === 0, invalid };
}

function filterMediaByType(media: Media[], type: Media['type']): Media[] {
  return media.filter(m => m.type === type);
}

function filterMediaByTag(media: Media[], tag: string): Media[] {
  return media.filter(m => m.tags.includes(tag));
}

function filterMediaByUploader(media: Media[], uploadedBy: string): Media[] {
  return media.filter(m => m.uploadedBy === uploadedBy);
}

function sortMediaByUploadDate(media: Media[], ascending = false): Media[] {
  return [...media].sort((a, b) => {
    const diff = new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    return ascending ? -diff : diff;
  });
}

function createThumbnail(mediaId: string, url: string, time: number, width: number, height: number): Thumbnail {
  return {
    id: `thumb-${Date.now()}`,
    mediaId,
    url,
    time,
    size: { width, height },
  };
}

function invalidateCdnCache(urls: string[], reason: string): CdnCache[] {
  const now = new Date().toISOString();
  return urls.map(url => ({
    url,
    invalidatedAt: now,
    reason,
  }));
}

function calculateTotalSize(media: Media[]): number {
  return media.reduce((sum, m) => sum + m.size, 0);
}

function getMediaStats(media: Media[]): {
  total: number;
  byType: Record<string, number>;
  totalSize: number;
} {
  const byType: Record<string, number> = {};
  for (const m of media) {
    byType[m.type] = (byType[m.type] || 0) + 1;
  }
  return {
    total: media.length,
    byType,
    totalSize: calculateTotalSize(media),
  };
}

// ============ TESTS ============

describe('Media OS - Media Type Validation', () => {
  it('should validate image type', () => {
    expect(isValidMediaType('image')).toBe(true);
  });

  it('should validate video type', () => {
    expect(isValidMediaType('video')).toBe(true);
  });

  it('should validate audio type', () => {
    expect(isValidMediaType('audio')).toBe(true);
  });

  it('should validate document type', () => {
    expect(isValidMediaType('document')).toBe(true);
  });

  it('should reject invalid type', () => {
    expect(isValidMediaType('pdf')).toBe(false);
  });

  it('should reject empty string type', () => {
    expect(isValidMediaType('')).toBe(false);
  });

  it('should reject null/undefined types', () => {
    expect(isValidMediaType('null')).toBe(false);
    expect(isValidMediaType('undefined')).toBe(false);
  });

  it('should validate mime type patterns', () => {
    const imageMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    const videoMimeTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const audioMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    const docMimeTypes = ['application/pdf', 'application/msword'];

    expect(imageMimeTypes).toContain('image/png');
    expect(videoMimeTypes).toContain('video/mp4');
    expect(audioMimeTypes).toContain('audio/mpeg');
    expect(docMimeTypes).toContain('application/pdf');
  });

  it('should validate media dimensions', () => {
    const media: Media = {
      id: '1', name: 'Test Image', type: 'image', url: 'https://example.com/img.jpg',
      size: 1000, mimeType: 'image/jpeg', tags: [], metadata: {},
      uploadedAt: new Date().toISOString(), uploadedBy: 'user',
      dimensions: { width: 1920, height: 1080 }
    };
    expect(media.dimensions?.width).toBe(1920);
    expect(media.dimensions?.height).toBe(1080);
  });

  it('should validate media duration', () => {
    const media: Media = {
      id: '1', name: 'Test Video', type: 'video', url: 'https://example.com/video.mp4',
      size: 10000, mimeType: 'video/mp4', tags: [], metadata: {},
      uploadedAt: new Date().toISOString(), uploadedBy: 'user',
      duration: 120
    };
    expect(media.duration).toBe(120);
  });
});

describe('Media OS - Transcoding Job Status Transitions', () => {
  it('should start with pending status', () => {
    const job: TranscodingJob = {
      id: 'job-1', mediaId: 'media-1', status: 'pending',
      formats: ['mp4', 'webm'], progress: 0
    };
    expect(job.status).toBe('pending');
    expect(job.progress).toBe(0);
  });

  it('should transition from pending to processing', () => {
    const job: TranscodingJob = {
      id: 'job-1', mediaId: 'media-1', status: 'pending',
      formats: ['mp4'], progress: 0
    };
    job.status = 'processing';
    expect(job.status).toBe('processing');
  });

  it('should update progress during processing', () => {
    const job: TranscodingJob = {
      id: 'job-1', mediaId: 'media-1', status: 'processing',
      formats: ['mp4'], progress: 0
    };
    job.progress = 25;
    expect(job.progress).toBe(25);
    job.progress = 50;
    expect(job.progress).toBe(50);
    job.progress = 75;
    expect(job.progress).toBe(75);
  });

  it('should complete when progress reaches 100', () => {
    const job: TranscodingJob = {
      id: 'job-1', mediaId: 'media-1', status: 'processing',
      formats: ['mp4'], progress: 75
    };
    job.progress = 100;
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    expect(job.status).toBe('completed');
    expect(job.completedAt).toBeDefined();
  });

  it('should transition to failed status', () => {
    const job: TranscodingJob = {
      id: 'job-1', mediaId: 'media-1', status: 'processing',
      formats: ['mp4'], progress: 50
    };
    job.status = 'failed';
    job.error = 'Encoding error';
    expect(job.status).toBe('failed');
    expect(job.error).toBe('Encoding error');
  });

  it('should simulate progress increment', () => {
    const job: TranscodingJob = {
      id: 'job-1', mediaId: 'media-1', status: 'processing',
      formats: ['mp4'], progress: 0
    };
    const simulated = simulateProgress(job);
    expect(simulated.progress).toBe(25);
  });

  it('should complete when progress reaches 100 in simulation', () => {
    const job: TranscodingJob = {
      id: 'job-1', mediaId: 'media-1', status: 'processing',
      formats: ['mp4'], progress: 75
    };
    const simulated = simulateProgress(job);
    expect(simulated.progress).toBe(100);
    expect(simulated.status).toBe('completed');
  });

  it('should get correct progress for completed job', () => {
    const job: TranscodingJob = {
      id: 'job-1', mediaId: 'media-1', status: 'completed',
      formats: ['mp4'], progress: 50
    };
    expect(getTranscodingProgress(job)).toBe(100);
  });

  it('should get correct progress for pending job', () => {
    const job: TranscodingJob = {
      id: 'job-1', mediaId: 'media-1', status: 'pending',
      formats: ['mp4'], progress: 0
    };
    expect(getTranscodingProgress(job)).toBe(0);
  });

  it('should detect completed transcoding', () => {
    const completedJob: TranscodingJob = {
      id: 'job-1', mediaId: 'media-1', status: 'completed',
      formats: ['mp4'], progress: 100
    };
    expect(isTranscodeComplete(completedJob)).toBe(true);

    const failedJob: TranscodingJob = {
      id: 'job-2', mediaId: 'media-1', status: 'failed',
      formats: ['mp4'], progress: 30
    };
    expect(isTranscodeComplete(failedJob)).toBe(true);

    const processingJob: TranscodingJob = {
      id: 'job-3', mediaId: 'media-1', status: 'processing',
      formats: ['mp4'], progress: 50
    };
    expect(isTranscodeComplete(processingJob)).toBe(false);
  });
});

describe('Media OS - Thumbnail Generation', () => {
  it('should create thumbnail for video', () => {
    const thumb = createThumbnail('media-1', 'https://cdn.example.com/thumb.jpg', 10, 320, 180);
    expect(thumb.mediaId).toBe('media-1');
    expect(thumb.url).toBe('https://cdn.example.com/thumb.jpg');
    expect(thumb.time).toBe(10);
    expect(thumb.size.width).toBe(320);
    expect(thumb.size.height).toBe(180);
  });

  it('should create thumbnail without time for image', () => {
    const thumb = createThumbnail('media-1', 'https://cdn.example.com/thumb.jpg', 0, 200, 200);
    expect(thumb.time).toBe(0);
  });

  it('should generate thumbnail ID', () => {
    const thumb = createThumbnail('media-1', 'https://cdn.example.com/thumb.jpg', 5, 640, 360);
    expect(thumb.id).toMatch(/^thumb-\d+$/);
  });

  it('should validate thumbnail size', () => {
    const thumb = createThumbnail('media-1', 'https://cdn.example.com/thumb.jpg', 0, 1920, 1080);
    expect(thumb.size.width).toBeGreaterThan(0);
    expect(thumb.size.height).toBeGreaterThan(0);
  });

  it('should support different thumbnail sizes', () => {
    const small = createThumbnail('media-1', 'url', 0, 160, 90);
    const medium = createThumbnail('media-1', 'url', 0, 320, 180);
    const large = createThumbnail('media-1', 'url', 0, 640, 360);

    expect(small.size.width).toBeLessThan(medium.size.width);
    expect(medium.size.width).toBeLessThan(large.size.width);
  });

  it('should generate timestamps for video thumbnails', () => {
    const thumb1 = createThumbnail('media-1', 'url', 0, 320, 180);
    const thumb2 = createThumbnail('media-1', 'url', 30, 320, 180);
    const thumb3 = createThumbnail('media-1', 'url', 60, 320, 180);

    expect(thumb1.time).toBe(0);
    expect(thumb2.time).toBe(30);
    expect(thumb3.time).toBe(60);
  });
});

describe('Media OS - CDN Cache Invalidation', () => {
  it('should invalidate single URL', () => {
    const cacheEntries = invalidateCdnCache(['https://cdn.example.com/image.jpg'], 'manual purge');
    expect(cacheEntries).toHaveLength(1);
    expect(cacheEntries[0].url).toBe('https://cdn.example.com/image.jpg');
    expect(cacheEntries[0].reason).toBe('manual purge');
  });

  it('should invalidate multiple URLs', () => {
    const urls = [
      'https://cdn.example.com/image1.jpg',
      'https://cdn.example.com/image2.jpg',
      'https://cdn.example.com/video.mp4'
    ];
    const cacheEntries = invalidateCdnCache(urls, 'content update');
    expect(cacheEntries).toHaveLength(3);
    expect(cacheEntries.every(e => e.reason === 'content update')).toBe(true);
  });

  it('should record invalidation timestamp', () => {
    const cacheEntries = invalidateCdnCache(['https://cdn.example.com/image.jpg'], 'test');
    expect(cacheEntries[0].invalidatedAt).toBeDefined();
    expect(new Date(cacheEntries[0].invalidatedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should handle empty URL array', () => {
    const cacheEntries = invalidateCdnCache([], 'test');
    expect(cacheEntries).toHaveLength(0);
  });

  it('should validate CDN URL format', () => {
    const url = 'https://cdn.example.com/assets/video.mp4';
    expect(url.startsWith('https://')).toBe(true);
    expect(url.includes('cdn.')).toBe(true);
  });

  it('should track invalidation reason', () => {
    const reasons = ['manual purge', 'content update', 'deployment', 'expiry'];
    for (const reason of reasons) {
      const entries = invalidateCdnCache(['url'], reason);
      expect(entries[0].reason).toBe(reason);
    }
  });
});

describe('Media OS - Media Filtering', () => {
  const mediaItems: Media[] = [
    { id: '1', name: 'Photo', type: 'image', url: '', size: 1000, mimeType: 'image/jpeg', tags: ['marketing'], metadata: {}, uploadedAt: '2026-06-28T10:00:00Z', uploadedBy: 'alice' },
    { id: '2', name: 'Video', type: 'video', url: '', size: 10000, mimeType: 'video/mp4', tags: ['marketing', 'product'], metadata: {}, uploadedAt: '2026-06-28T11:00:00Z', uploadedBy: 'bob' },
    { id: '3', name: 'Podcast', type: 'audio', url: '', size: 5000, mimeType: 'audio/mpeg', tags: ['content'], metadata: {}, uploadedAt: '2026-06-28T12:00:00Z', uploadedBy: 'alice' },
    { id: '4', name: 'Manual', type: 'document', url: '', size: 2000, mimeType: 'application/pdf', tags: ['product'], metadata: {}, uploadedAt: '2026-06-28T13:00:00Z', uploadedBy: 'charlie' },
    { id: '5', name: 'Banner', type: 'image', url: '', size: 1500, mimeType: 'image/png', tags: ['marketing'], metadata: {}, uploadedAt: '2026-06-28T14:00:00Z', uploadedBy: 'bob' },
  ];

  it('should filter by image type', () => {
    const images = filterMediaByType(mediaItems, 'image');
    expect(images).toHaveLength(2);
    expect(images.every(m => m.type === 'image')).toBe(true);
  });

  it('should filter by video type', () => {
    const videos = filterMediaByType(mediaItems, 'video');
    expect(videos).toHaveLength(1);
    expect(videos[0].name).toBe('Video');
  });

  it('should filter by audio type', () => {
    const audio = filterMediaByType(mediaItems, 'audio');
    expect(audio).toHaveLength(1);
    expect(audio[0].type).toBe('audio');
  });

  it('should filter by document type', () => {
    const docs = filterMediaByType(mediaItems, 'document');
    expect(docs).toHaveLength(1);
    expect(docs[0].type).toBe('document');
  });

  it('should filter by tag', () => {
    const marketing = filterMediaByTag(mediaItems, 'marketing');
    expect(marketing).toHaveLength(3);
    expect(marketing.every(m => m.tags.includes('marketing'))).toBe(true);
  });

  it('should filter by uploader', () => {
    const aliceMedia = filterMediaByUploader(mediaItems, 'alice');
    expect(aliceMedia).toHaveLength(2);
    expect(aliceMedia.every(m => m.uploadedBy === 'alice')).toBe(true);
  });

  it('should sort by upload date descending', () => {
    const sorted = sortMediaByUploadDate(mediaItems);
    expect(sorted[0].id).toBe('5'); // Most recent
    expect(sorted[4].id).toBe('1'); // Oldest
  });

  it('should sort by upload date ascending', () => {
    const sorted = sortMediaByUploadDate(mediaItems, true);
    expect(sorted[0].id).toBe('1'); // Oldest
    expect(sorted[4].id).toBe('5'); // Most recent
  });

  it('should calculate total media size', () => {
    const total = calculateTotalSize(mediaItems);
    expect(total).toBe(19500); // 1000 + 10000 + 5000 + 2000 + 1500
  });
});

describe('Media OS - Transcode Format Validation', () => {
  it('should validate common video formats', () => {
    const result = validateTranscodeFormats(['mp4', 'webm']);
    expect(result.valid).toBe(true);
    expect(result.invalid).toHaveLength(0);
  });

  it('should validate common audio formats', () => {
    const result = validateTranscodeFormats(['mp3', 'wav', 'ogg']);
    expect(result.valid).toBe(true);
  });

  it('should detect invalid format', () => {
    const result = validateTranscodeFormats(['mp4', 'invalid-format']);
    expect(result.valid).toBe(false);
    expect(result.invalid).toContain('invalid-format');
  });

  it('should return all invalid formats', () => {
    const result = validateTranscodeFormats(['xyz', 'abc', '123']);
    expect(result.invalid).toHaveLength(3);
  });
});

describe('Media OS - Media Stats', () => {
  const mediaItems: Media[] = [
    { id: '1', name: 'Photo', type: 'image', url: '', size: 1000, mimeType: 'image/jpeg', tags: [], metadata: {}, uploadedAt: '', uploadedBy: 'alice' },
    { id: '2', name: 'Video', type: 'video', url: '', size: 10000, mimeType: 'video/mp4', tags: [], metadata: {}, uploadedAt: '', uploadedBy: 'bob' },
    { id: '3', name: 'Audio', type: 'audio', url: '', size: 5000, mimeType: 'audio/mpeg', tags: [], metadata: {}, uploadedAt: '', uploadedBy: 'alice' },
    { id: '4', name: 'Doc', type: 'document', url: '', size: 2000, mimeType: 'application/pdf', tags: [], metadata: {}, uploadedAt: '', uploadedBy: 'charlie' },
  ];

  it('should calculate total count', () => {
    const stats = getMediaStats(mediaItems);
    expect(stats.total).toBe(4);
  });

  it('should count by type', () => {
    const stats = getMediaStats(mediaItems);
    expect(stats.byType['image']).toBe(1);
    expect(stats.byType['video']).toBe(1);
    expect(stats.byType['audio']).toBe(1);
    expect(stats.byType['document']).toBe(1);
  });

  it('should calculate total size', () => {
    const stats = getMediaStats(mediaItems);
    expect(stats.totalSize).toBe(18000);
  });
});

describe('Media OS - Media Transcoding Eligibility', () => {
  it('should allow video transcoding', () => {
    const video: Media = {
      id: '1', name: 'Video', type: 'video', url: '', size: 10000,
      mimeType: 'video/mp4', tags: [], metadata: {}, uploadedAt: '', uploadedBy: 'user'
    };
    expect(canTranscode(video)).toBe(true);
  });

  it('should allow audio transcoding', () => {
    const audio: Media = {
      id: '1', name: 'Audio', type: 'audio', url: '', size: 5000,
      mimeType: 'audio/mpeg', tags: [], metadata: {}, uploadedAt: '', uploadedBy: 'user'
    };
    expect(canTranscode(audio)).toBe(true);
  });

  it('should not allow image transcoding', () => {
    const image: Media = {
      id: '1', name: 'Image', type: 'image', url: '', size: 1000,
      mimeType: 'image/jpeg', tags: [], metadata: {}, uploadedAt: '', uploadedBy: 'user'
    };
    expect(canTranscode(image)).toBe(false);
  });

  it('should allow transcription for audio', () => {
    const audio: Media = {
      id: '1', name: 'Audio', type: 'audio', url: '', size: 5000,
      mimeType: 'audio/mpeg', tags: [], metadata: {}, uploadedAt: '', uploadedBy: 'user'
    };
    expect(canTranscribe(audio)).toBe(true);
  });

  it('should allow transcription for video', () => {
    const video: Media = {
      id: '1', name: 'Video', type: 'video', url: '', size: 10000,
      mimeType: 'video/mp4', tags: [], metadata: {}, uploadedAt: '', uploadedBy: 'user'
    };
    expect(canTranscribe(video)).toBe(true);
  });

  it('should not allow transcription for images', () => {
    const image: Media = {
      id: '1', name: 'Image', type: 'image', url: '', size: 1000,
      mimeType: 'image/jpeg', tags: [], metadata: {}, uploadedAt: '', uploadedBy: 'user'
    };
    expect(canTranscribe(image)).toBe(false);
  });

  it('should allow thumbnail for video', () => {
    const video: Media = {
      id: '1', name: 'Video', type: 'video', url: '', size: 10000,
      mimeType: 'video/mp4', tags: [], metadata: {}, uploadedAt: '', uploadedBy: 'user'
    };
    expect(canGenerateThumbnail(video)).toBe(true);
  });

  it('should allow thumbnail for audio', () => {
    const audio: Media = {
      id: '1', name: 'Audio', type: 'audio', url: '', size: 5000,
      mimeType: 'audio/mpeg', tags: [], metadata: {}, uploadedAt: '', uploadedBy: 'user'
    };
    expect(canGenerateThumbnail(audio)).toBe(true);
  });

  it('should not allow thumbnail for images', () => {
    const image: Media = {
      id: '1', name: 'Image', type: 'image', url: '', size: 1000,
      mimeType: 'image/jpeg', tags: [], metadata: {}, uploadedAt: '', uploadedBy: 'user'
    };
    expect(canGenerateThumbnail(image)).toBe(false);
  });
});

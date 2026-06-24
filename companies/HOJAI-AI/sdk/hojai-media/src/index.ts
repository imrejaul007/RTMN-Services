/**
 * @hojai/media SDK — Media OS (port 5600).
 *
 * Content + streaming + creator + channels + playlists + live + comments
 * + 13 AI Media Brain agents. HLS/DASH streaming, DRM, GCC support,
 * 20 languages.
 *
 * @example
 * ```ts
 * import { Media } from '@hojai/media';
 *
 * const m = new Media({ apiKey, baseUrl: 'https://api.hojai.ai' });
 *
 * // 1. Upload a video
 * const video = await m.content.upload({ title: 'My Show', videoUrl: '...', creatorId: 'c-1', durationSec: 600 });
 *
 * // 2. Get recommendations
 * const recs = await m.content.getRecommendations({ userId: 'u-1' });
 *
 * // 3. Create a creator + get analytics
 * const creator = await m.creators.create({ handle: 'maya', name: 'Maya Collective' });
 * const stats = await m.creators.getAnalytics(creator.id);
 *
 * // 4. Start a live stream
 * const stream = await m.live.start({ title: 'Live Q&A', creatorId: 'c-1', ingestUrl: '...', playbackUrl: '...' });
 * await m.live.end(stream.id);
 * ```
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { MediaContentClient } from './content.js';
import { MediaCreatorsClient } from './creators.js';
import { MediaChannelsClient } from './channels.js';
import { MediaPlaylistsClient } from './playlists.js';
import { MediaLiveClient } from './live.js';
import { MediaCommentsClient } from './comments.js';
import { MEDIA_PORT, type Video, type Creator, type Channel, type Playlist, type LiveStream, type Comment, type CreatorAnalytics, type PlatformAnalytics } from './types.js';

export type { HojaiConfig } from './foundation-config.js';
export { resolveConfig } from './foundation-config.js';
export { MediaContentClient } from './content.js';
export { MediaCreatorsClient } from './creators.js';
export { MediaChannelsClient } from './channels.js';
export { MediaPlaylistsClient } from './playlists.js';
export { MediaLiveClient } from './live.js';
export { MediaCommentsClient } from './comments.js';
export { MEDIA_PORT, type Video, type Creator, type Channel, type Playlist, type LiveStream, type Comment, type CreatorAnalytics, type PlatformAnalytics } from './types.js';

export class Media {
  public readonly content: MediaContentClient;
  public readonly creators: MediaCreatorsClient;
  public readonly channels: MediaChannelsClient;
  public readonly playlists: MediaPlaylistsClient;
  public readonly live: MediaLiveClient;
  public readonly comments: MediaCommentsClient;
  public readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.content = new MediaContentClient(resolved);
    this.creators = new MediaCreatorsClient(resolved);
    this.channels = new MediaChannelsClient(resolved);
    this.playlists = new MediaPlaylistsClient(resolved);
    this.live = new MediaLiveClient(resolved);
    this.comments = new MediaCommentsClient(resolved);
  }
}

export default Media;

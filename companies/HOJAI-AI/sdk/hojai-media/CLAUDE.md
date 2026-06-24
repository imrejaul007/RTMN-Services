# @hojai/media — Media OS SDK

> **Package:** `@hojai/media` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18
> **Status:** ✅ **PRODUCTION-READY** — Wraps Media OS (port 5600): content, streaming, creators, channels, playlists, live, comments + 13 AI Media Brain agents.

---

## What this SDK is

**The official client for HOJAI Media OS.** Media OS is a full content + streaming platform: videos, shows, movies, live streams, channels, playlists, creator profiles, comments, recommendations, analytics. It supports HLS/DASH streaming, DRM, GCC (6 countries, 20 languages), and includes 13 AI Media Brain agents.

Any developer building a video / streaming / creator platform on HOJAI should use this SDK.

It handles:
- HTTP transport (retries, timeouts, exponential backoff)
- Authentication
- Error handling
- TypeScript types for every entity (Video, Creator, Channel, Playlist, LiveStream, Comment)
- Subpath exports for tree-shaking

---

## Quick Start

```ts
import { Media } from '@hojai/media';

const media = new Media({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// 1. Upload a video
const video = await media.content.upload({
  title: 'My Show',
  videoUrl: 'https://cdn.example.com/video.m3u8',
  creatorId: 'c-1',
  durationSec: 600
});

// 2. Get personalized recommendations
const recs = await media.content.getRecommendations({ userId: 'u-1' });

// 3. Create a creator profile + get analytics
const creator = await media.creators.create({ handle: 'maya', name: 'Maya Collective' });
const stats = await media.creators.getAnalytics(creator.id);

// 4. Start a live stream
const stream = await media.live.start({
  title: 'Live Q&A',
  creatorId: 'c-1',
  ingestUrl: 'rtmp://ingest.example.com/live',
  playbackUrl: 'https://cdn.example.com/live/playlist.m3u8'
});

// 5. Add comments to a video
const comment = await media.comments.create({
  videoId: video.id,
  userId: 'u-1',
  text: 'Loved it!'
});
```

---

## Sub-Clients (6 total)

| Sub-client | Purpose | Key methods |
|---|---|---|
| `media.content` | Video / show / movie CRUD, viewing events, recommendations, trending, platform analytics | `upload`, `get`, `list`, `update`, `delete`, `recordView`, `getRecommendations`, `getTrending`, `getPlatformAnalytics` |
| `media.creators` | Creator profiles, handle lookup, per-creator analytics | `create`, `get`, `getByHandle`, `update`, `delete`, `listVideos`, `getAnalytics` |
| `media.channels` | Subscription-based channels (like YouTube channels) | `create`, `get`, `subscribe`, `unsubscribe`, `listVideos`, `getAnalytics` |
| `media.playlists` | Curated video collections | `create`, `addVideo`, `removeVideo`, `reorder`, `getVideos` |
| `media.live` | Live stream lifecycle (start / end / status) | `start`, `end`, `get`, `getStatus`, `listViewers`, `getChat` |
| `media.comments` | Threaded comments on videos / streams | `create`, `reply`, `list`, `like`, `unlike`, `delete`, `report` |

---

## Subpath Imports

```ts
import { MediaContentClient } from '@hojai/media/content';
import { MediaCreatorsClient } from '@hojai/media/creators';
import { MediaChannelsClient } from '@hojai/media/channels';
import { MediaPlaylistsClient } from '@hojai/media/playlists';
import { MediaLiveClient } from '@hojai/media/live';
import { MediaCommentsClient } from '@hojai/media/comments';
import type { Video, Creator } from '@hojai/media/types';
```

---

## Architecture

```
@hojai/media
├── Media                         # Main client (facade)
│   ├── content                   # MediaContentClient — content CRUD + recs
│   ├── creators                  # MediaCreatorsClient — creator profiles
│   ├── channels                  # MediaChannelsClient — subscription channels
│   ├── playlists                 # MediaPlaylistsClient — curated collections
│   ├── live                      # MediaLiveClient — live stream lifecycle
│   └── comments                  # MediaCommentsClient — threaded comments
├── HojaiConfig                   # Shared config interface
├── resolveConfig()               # Apply defaults
└── request()                     # HTTP with retries + backoff
```

Built on `@hojai/foundation`'s `HojaiConfig` pattern (same as all other `@hojai/*` SDKs).

---

## Configuration

```ts
const media = new Media({
  apiKey: 'hojai_live_...',         // required
  baseUrl: 'https://api.hojai.ai',  // required
  timeout: 15_000,                  // optional, default 10s
  maxRetries: 3,                    // optional, default 3
  fetchImpl: customFetch,           // optional, for testing/proxies
  logger: (level, msg, meta) => {}  // optional
});
```

---

## Constants

| Constant | Value | Description |
|---|---|---|
| `MEDIA_PORT` | 5600 | Default port for Media OS |

---

## Use Cases

**Build a Netflix-style streaming app:**
```ts
const homeFeed = await media.content.getTrending({ category: 'movies', limit: 20 });
const watchList = await media.playlists.create({ title: 'My Watchlist', userId: 'u-1' });
```

**Build a Twitch-style live platform:**
```ts
const stream = await media.live.start({ title: 'Live Coding', creatorId: 'c-1', ingestUrl, playbackUrl });
const chat = await media.live.getChat(stream.id);
```

**Build a YouTube-style creator economy:**
```ts
const creator = await media.creators.create({ handle: 'maya', name: 'Maya' });
const subs = await media.channels.subscribe({ channelId: 'ch-1', userId: 'u-1' });
const earnings = await media.creators.getAnalytics(creator.id);
```

---

## Build

```bash
npm install
npm run build
npm test
```

---

## Files

```
hojai-media/
├── CLAUDE.md                    # This file
├── README.md                    # Quick start
├── package.json                 # npm config with subpath exports
├── tsconfig.json
├── src/
│   ├── foundation-config.ts     # HojaiConfig + resolveConfig
│   ├── utils.ts                 # request, buildQueryString
│   ├── types.ts                 # Video, Creator, Channel, Playlist, LiveStream, Comment, MEDIA_PORT
│   ├── content.ts               # MediaContentClient
│   ├── creators.ts              # MediaCreatorsClient
│   ├── channels.ts              # MediaChannelsClient
│   ├── playlists.ts             # MediaPlaylistsClient
│   ├── live.ts                  # MediaLiveClient
│   ├── comments.ts              # MediaCommentsClient
│   ├── index.ts                 # Main Media facade
│   └── __tests__/
│       └── index.test.ts        # Tests
└── dist/                        # Compiled output
    ├── index.{js,mjs,d.ts}
    ├── content.{js,mjs,d.ts}
    ├── creators.{js,mjs,d.ts}
    ├── channels.{js,mjs,d.ts}
    ├── playlists.{js,mjs,d.ts}
    ├── live.{js,mjs,d.ts}
    ├── comments.{js,mjs,d.ts}
    ├── types.{js,mjs,d.ts}
    └── __tests__/index.test.js
```

---

## See also

- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — CorpID, Memory, Twin, Trust, Flow, Policy clients
- [Media OS Documentation](../../../industry-os/services/media-os/CLAUDE.md) — Full Media OS architecture
- [@hojai/payment](../hojai-payment/CLAUDE.md) — Payment SDK (pay for subscriptions, tips, creator payouts)
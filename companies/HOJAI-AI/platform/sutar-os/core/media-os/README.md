# Media OS

Media asset management, transcoding, transcription, thumbnail generation, and CDN management.

**Port:** 4881

## Purpose

Media OS provides a comprehensive media management platform with support for uploads, transcoding, transcription services, thumbnail generation, and CDN cache invalidation.

## Features

- Media asset storage and management
- Multi-format transcoding (video/audio)
- Speech-to-text transcription
- Thumbnail generation
- CDN cache management
- Media metadata storage
- Tag-based organization
- Progress tracking for transcoding jobs

## API Endpoints

### Media

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api` | List media assets |
| GET | `/api/:id` | Get media details |
| POST | `/api/upload` | Upload media |
| PUT | `/api/:id` | Update media |
| DELETE | `/api/:id` | Delete media |

### Transcoding

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transcode/:id` | Start transcoding |
| GET | `/api/transcode/:id` | Get job status |
| GET | `/api/transcode/:id/progress` | Get progress |

### Thumbnails

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/:id/thumbnail` | Generate thumbnail |

### Transcription

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transcribe` | Start transcription |
| GET | `/api/transcriptions/:mediaId` | Get transcription |

### CDN

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cdn/purge` | Purge CDN cache |
| GET | `/api/cdn/status` | CDN status |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get statistics |

## Media Types

| Type | Description | Supports |
|------|-------------|----------|
| `image` | Static images | Thumbnails |
| `video` | Video files | Transcoding, thumbnails, transcription |
| `audio` | Audio files | Transcoding, transcription |
| `document` | Documents | - |

## Request/Response Examples

### Upload Media

```bash
curl -X POST http://localhost:4881/api/upload \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "name": "Product Demo Video",
    "type": "video",
    "url": "https://cdn.example.com/videos/demo.mp4",
    "size": 52428800,
    "mimeType": "video/mp4",
    "duration": 180,
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "tags": ["demo", "product", "marketing"],
    "uploadedBy": "marketing@company.com"
  }'
```

### Start Transcoding

```bash
curl -X POST http://localhost:4881/api/transcode/media-123 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "formats": ["mp4", "webm", "hls"]
  }'
```

### Check Transcoding Progress

```bash
curl http://localhost:4881/api/transcode/job-456/progress
```

### Request Transcription

```bash
curl -X POST http://localhost:4881/api/transcribe \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "mediaId": "media-123",
    "language": "en-US"
  }'
```

### Generate Thumbnail

```bash
curl -X POST http://localhost:4881/api/media-123/thumbnail \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "url": "https://cdn.example.com/thumbnails/demo-thumb.jpg",
    "time": 30,
    "size": {
      "width": 320,
      "height": 180
    }
  }'
```

### Purge CDN Cache

```bash
curl -X POST http://localhost:4881/api/cdn/purge \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "urls": [
      "https://cdn.example.com/videos/demo.mp4",
      "https://cdn.example.com/thumbnails/demo-thumb.jpg"
    ],
    "reason": "Content update"
  }'
```

## Supported Transcoding Formats

| Format | Type | Description |
|--------|------|-------------|
| `mp4` | Video | Most compatible |
| `webm` | Video | Web optimized |
| `hls` | Video | Adaptive streaming |
| `mp3` | Audio | Compressed audio |
| `aac` | Audio | High quality audio |

## Transcription Features

- Segment-level timestamps
- Language detection
- Speaker identification (future)
- Punctuation restoration
- Custom vocabulary support

## CDN Operations

- Bulk URL purging
- Selective cache invalidation
- Purge history tracking
- Reason tracking for audit

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4881 | Service port |
| `JWT_SECRET` | - | JWT secret for authentication |

## Dependencies

- `@rtmn/shared` - Shared utilities
- `express` - HTTP framework
- `helmet` - Security headers
- `cors` - CORS support
- `zod` - Schema validation
- `uuid` - ID generation

## Commands

```bash
npm install        # Install dependencies
npm start          # Start the service
npm test           # Run tests
```

## Supported Mime Types

| Type | Mime Types |
|------|------------|
| Image | image/jpeg, image/png, image/gif, image/webp |
| Video | video/mp4, video/webm, video/quicktime |
| Audio | audio/mpeg, audio/wav, audio/ogg |
| Document | application/pdf, application/msword |

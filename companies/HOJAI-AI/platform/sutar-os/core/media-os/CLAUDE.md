# MediaOS - Port 4881

## Overview
Images, video, audio processing.

## Purpose
Media processing and management for AI agents.

## Key Features
- Media storage
- Image processing
- Video processing
- Audio processing
- Transcription
- Thumbnail generation

## API Endpoints

### Media
- `POST /api/media` - Upload media
- `GET /api/media` - List media
- `GET /api/media/:id` - Get media

### Processing
- `POST /api/process` - Process media

### Transcription
- `POST /api/transcribe` - Transcribe audio
- `GET /api/transcriptions/:mediaId` - Get transcription

## Media Types
- `image` - Images
- `video` - Videos
- `audio` - Audio files
- `document` - Documents

## Tests
Vitest tests: `__tests__/media-os.test.ts`

## Environment
- Port: 4881

## Startup
```bash
cd platform/sutar-os/core/media-os && npm run dev
```

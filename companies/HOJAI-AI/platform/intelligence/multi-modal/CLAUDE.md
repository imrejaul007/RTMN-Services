# Multi-Modal OS

**Port:** 4897  
**Status:** ✅ Built  
**Purpose:** Image, audio, video processing, OCR, and transcription for the RTMN ecosystem

---

## Overview

Multi-Modal OS provides comprehensive media processing capabilities:
- Image processing (resize, crop, thumbnail, filter, watermark)
- Audio processing (transcode, normalize, trim, effects)
- Video processing (transcode, trim, thumbnail, effects)
- OCR (Optical Character Recognition)
- Transcription (audio/video to text)
- Batch processing

---

## Tech Stack

- Node.js
- Express.js
- JWT Authentication (`@rtmn/shared/auth`)

---

## Supported Formats

### Image Formats
PNG, JPG, JPEG, GIF, WEBP, BMP, TIFF

### Audio Formats
MP3, WAV, FLAC, AAC, OGG, M4A

### Video Formats
MP4, AVI, MOV, MKV, WEBM, FLV

---

## API Endpoints

### File Detection

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/detect` | Detect file type from filename/magic bytes |

### Image Processing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/image/process` | Process image |

**Operations:** resize, crop, thumbnail, rotate, flip, filter, watermark, enhance

### Audio Processing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/audio/process` | Process audio |

**Operations:** transcode, normalize, trim, volume, fade, effects

### Video Processing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/video/process` | Process video |

**Operations:** transcode, trim, thumbnail, rotate, effects

### OCR

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ocr` | Extract text from images |

### Transcription

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transcribe` | Convert audio/video to text |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List jobs (filter: type, status) |
| GET | `/api/jobs/:id` | Get job details |

### Formats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/formats` | List supported formats |

### Batch Processing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/batch` | Process multiple files |

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/intelligence/multi-modal
npm install
npm start
```

---

## Example Usage

### Process Image
```javascript
const response = await fetch('http://localhost:4897/api/image/process', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    filename: 'photo.jpg',
    operation: 'thumbnail',
    params: { width: 200, height: 200 },
    metadata: { format: 'jpg', size: 1024000 }
  })
});
```

### OCR Document
```javascript
const result = await fetch('http://localhost:4897/api/ocr', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    filename: 'document.pdf',
    metadata: { width: 1920, height: 1080, format: 'png' }
  })
});
```

### Batch Process
```javascript
await fetch('http://localhost:4897/api/batch', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    tasks: [
      { type: 'image', filename: 'a.jpg', operation: 'resize', params: { width: 800 } },
      { type: 'image', filename: 'b.jpg', operation: 'thumbnail', params: { size: 200 } },
      { type: 'audio', filename: 'voice.mp3', operation: 'normalize' }
    ]
  })
});
```

---

## Integration with Other Services

| Service | Integration |
|---------|-------------|
| `rag-platform` | Document OCR → knowledge extraction |
| `vector-db` | Media embeddings |
| `knowledge-extraction` | Media content analysis |
| `genie-skills` | Vision capabilities |
| `ai-intelligence` | Media understanding |

---

## Health Endpoints

- `GET /health` - Service health
- `GET /ready` - Readiness check

---

## Related Services

- [rag-platform](rag-platform/) - RAG with media
- [knowledge-extraction](knowledge-extraction/) - Content extraction
- [vector-db](vector-db/) - Media embeddings

# REZ MCP Deepfake Detector

MCP server for detecting AI-generated content, deepfakes, and digital identity manipulation.

## Features

- **Image Analysis**: Detect AI-generated images
- **Video Analysis**: Face swap detection
- **Audio Analysis**: Voice cloning detection
- **EXIF Analysis**: Metadata inspection
- **Confidence Scoring**: 0-1 scale

## Tools

| Tool | Description |
|------|-------------|
| `analyze_image` | Analyze image for AI generation |
| `analyze_video` | Analyze video for manipulation |
| `analyze_audio` | Analyze audio for voice cloning |
| `check_exif` | Check EXIF metadata |
| `generate_report` | Generate detection report |
| `batch_analyze` | Analyze multiple files |

## HTTP API

### Analyze File
```bash
curl -X POST http://localhost:3121/analyze \
  -F "file=@media.jpg"
```

Response:
```json
{
  "success": true,
  "confidence": 0.75,
  "verdict": "LIKELY_AI_GENERATED",
  "findings": ["AI generation marker: Stable Diffusion"]
}
```

### Check EXIF
```bash
curl -X POST http://localhost:3121/analyze/exif \
  -F "file=@image.jpg"
```

## Verdict Scale

| Confidence | Verdict |
|------------|---------|
| > 0.7 | LIKELY_AI_GENERATED |
| 0.4-0.7 | UNCERTAIN |
| < 0.4 | LIKELY_AUTHENTIC |

## Environment

```
PORT=3121
TRANSPORT=http|stdio
```

## Usage

```bash
npm install
npm run build
npm start
```
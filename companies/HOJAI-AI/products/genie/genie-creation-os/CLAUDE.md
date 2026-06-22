# Genie Creation OS - Documentation

> **Version:** 1.0.0  
> **Port:** 4725  
> **Status:** ✅ Complete - All Routes Built  
> **Last Updated:** June 22, 2026

---
---

## 🔐 Auth (Phase 7)

This service now requires a **Bearer JWT** (CorpID-issued) on every request except `/health`, `/`, and `/ready`. Auth is enforced via `app.use(requireAuth)` from `@rtmn/shared/auth`.

**Get a token:**

```bash
# Dev shortcut (base64 JSON token — matches what requireAuth verifies):
TOKEN=$(curl -s -X POST http://localhost:4702/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"dev"}' | jq -r .token)
```

**Call this service:**

```bash
curl http://localhost:PORT/health                      # public, no token
curl http://localhost:PORT/your-endpoint \
  -H "Authorization: Bearer $TOKEN"                   # protected
```

**Disable in dev/test:** Set `SERVICE_REQUIRE_AUTH=false` env var.

See [shared/MIGRATION-GUIDE.md](../../shared/MIGRATION-GUIDE.md) for the full `@rtmn/shared/auth` pattern and the canonical thin-shim approach.

## 🎯 Overview

Genie Creation OS provides comprehensive content creation capabilities including AI-powered content generation, image creation, video production, document generation, audio synthesis, and reusable templates.

---

## 🏗️ Architecture

```
Port 4725
└── Creation OS
    ├── /content   - AI content generation (blogs, social, email)
    ├── /image    - AI image generation and editing
    ├── /video    - Video creation and editing
    ├── /document - Documents (PDF, presentations, resumes)
    ├── /audio    - Text-to-speech, podcasts, music
    └── /templates - Reusable content templates
```

---

## 📚 Routes

### Content Generation (`/content`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/generate` | POST | Generate AI content |
| `/draft` | POST | Create content draft |
| `/draft/:draftId` | PUT | Update draft |
| `/drafts/:userId` | GET | Get all drafts |
| `/draft/:draftId` | DELETE | Delete draft |
| `/library/:userId` | GET | Get content library |
| `/repurpose` | POST | Repurpose content for different formats |
| `/improve` | POST | Get content improvement suggestions |
| `/types` | GET | Get content types |
| `/styles` | GET | Get writing styles |

**Content Types:** Blog Post, Article, Social Media, Email, Marketing Copy, Script, Story, Poem, Song, Speech

**Writing Styles:** Professional, Casual, Persuasive, Informative, Humorous, Emotional, Technical, Creative

### Image Generation (`/image`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/generate` | POST | Generate AI image |
| `/variations` | POST | Generate image variations |
| `/edit` | POST | Edit existing image |
| `/history/:userId` | GET | Get generation history |
| `/presets` | POST | Create prompt preset |
| `/presets/:userId` | GET | Get user presets |
| `/styles` | GET | Get image styles |
| `/ratios` | GET | Get aspect ratios |

**Styles:** Realistic, Artistic, Cartoon/Anime, 3D Render, Abstract, Minimalist, Vintage, Futuristic

**Aspect Ratios:** 1:1 (Square), 16:9 (Landscape), 9:16 (Portrait), 4:3 (Standard), 3:2 (Photo)

### Video Production (`/video`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/project` | POST | Create video project |
| `/script` | POST | Generate video script |
| `/project/:projectId/scene` | POST | Add scene |
| `/project/:projectId/render` | POST | Render video |
| `/projects/:userId` | GET | Get projects |
| `/types` | GET | Get video types |

**Video Types:** Short Form (15-60s), Long Form (5-30 min), Tutorial/How-To, Promotional, Social Media

### Document Generation (`/document`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/create` | POST | Create document |
| `/presentation` | POST | Generate presentation |
| `/report` | POST | Generate report |
| `/resume` | POST | Generate resume |
| `/proposal` | POST | Generate business proposal |
| `/:userId` | GET | Get documents |
| `/types/all` | GET | Get document types |

**Document Types:** PDF, Presentation, Report, Proposal, Resume, Contract, Invoice, Letter

### Audio Generation (`/audio`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/tts` | POST | Text-to-Speech |
| `/podcast` | POST | Generate podcast episode |
| `/music` | POST | Generate music |
| `/voiceover` | POST | Generate voiceover |
| `/project` | POST | Create audio project |
| `/projects/:userId` | GET | Get projects |
| `/voices` | GET | Get available voices |
| `/languages` | GET | Get supported languages |
| `/styles` | GET | Get music styles |

**Voices:** Professional Male/Female, Casual Male/Female, Narrator, News Anchor, Friendly Assistant, Deep Male

**Music Styles:** Upbeat, Calm, Dramatic, Corporate, Cinematic, Ambient, Acoustic, Electronic

### Templates (`/templates`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/categories` | GET | Get template categories |
| `/content` | GET | Get content templates |
| `/design` | GET | Get design templates |
| `/:templateId` | GET | Get specific template |
| `/use/:templateId` | POST | Use template with variables |
| `/create` | POST | Create custom template |
| `/user/:userId` | GET | Get user templates |
| `/user/:templateId` | PUT | Update template |
| `/user/:templateId` | DELETE | Delete template |
| `/popular/all` | GET | Get popular templates |
| `/suggestions` | POST | Get template suggestions |

---

## 🎨 Creative Features

### Content Types Supported
- **Written Content:** 10 types (blogs, articles, social posts, emails, etc.)
- **Visual Content:** Images with 8 styles
- **Video Content:** Scripts, scenes, rendering
- **Documents:** 8 document types
- **Audio:** TTS, podcasts, music, voiceovers

### AI Capabilities
- Multi-format content generation
- Style customization
- Content repurposing
- SEO optimization suggestions
- Engagement scoring

---

## 🔗 Integration

**RTMN Integration:**
- Marketing OS (5500) - Content for campaigns
- Media OS (5600) - Content library
- Genie Companion (4716) - Personal content creation
- RAZO Keyboard (4725) - Multi-channel distribution

---

## 🚀 Quick Start

```bash
cd products/genie/genie-creation-os
npm install
npm start  # Port 4725
```

### Test Commands

```bash
# Generate blog post
curl -X POST http://localhost:4725/content/generate \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "type": "blog", "topic": "Productivity Tips", "tone": "professional"}'

# Generate image
curl -X POST http://localhost:4725/image/generate \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "prompt": "A futuristic office", "style": "realistic", "aspectRatio": "16:9"}'

# Generate presentation
curl -X POST http://localhost:4725/document/presentation \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "topic": "Q4 Strategy", "slides": 15, "style": "professional"}'

# Text-to-Speech
curl -X POST http://localhost:4725/audio/tts \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "text": "Welcome to our podcast!", "voice": "professional-female"}'

# Get templates
curl http://localhost:4725/templates/content
```

---

## 📊 Statistics

| Category | Count |
|----------|-------|
| Content Types | 10 |
| Image Styles | 8 |
| Aspect Ratios | 5 |
| Video Types | 5 |
| Document Types | 8 |
| Voice Options | 8 |
| Languages | 10 |
| Music Styles | 8 |

---

## 🎯 Key Features

1. **Multi-Format Content:** Generate blogs, social posts, emails, scripts
2. **AI Image Generation:** Create images with style variations
3. **Video Production:** Script generation, scene building, rendering
4. **Document Templates:** Presentations, reports, resumes, proposals
5. **Audio Synthesis:** TTS, podcasts, music generation
6. **Template Library:** Reusable templates with customization
7. **Content Repurposing:** Adapt content across formats
8. **SEO Optimization:** Content suggestions and scoring

---

*Genie Creation OS - Create Anything, Everywhere*
# Media OS - AI-Native Media Operating System

> **Version:** 2.0.0  
> **Status:** ✅ **PHASE 1-2 COMPLETE**  
> **Port:** 5600

---

## Overview

Media OS is a complete AI-native operating system for media companies, built on the RTMN ecosystem.

### Architecture

```
Media OS (5600)
│
├── Content OS
│   ├── Channels, Programs, Episodes, Content
│   ├── Editorial Calendar (planning, workflow, approval)
│   ├── Script & Storyboard (versioning, collaboration)
│   └── Metadata (SEO, taxonomy, distribution)
│
├── Production OS
│   ├── Studios, Equipment, Crew management
│   ├── Productions with daily reports
│   ├── Call sheets & scene tracking
│   └── Budget & timeline management
│
├── Creator OS
├── Audience OS
├── Advertising OS
├── Revenue OS
├── Rights OS
│
├── AI Media Brain (7 Specialized Agents)
│   ├── Script Writer Agent
│   ├── Thumbnail Designer Agent
│   ├── SEO Optimizer Agent
│   ├── Content Repurposer Agent
│   ├── Translator Agent
│   ├── Moderator Agent
│   └── Trend Hunter Agent
│
└── RTMN Integration
```

---

## Phase 1: Foundation ✅

### Core Features
- **Winston Logger**: Structured JSON logging with file rotation
- **MongoDB**: 15+ models with indexes
- **Joi Validation**: All request validation
- **JWT Auth**: Token-based authentication with CorpID integration
- **Rate Limiting**: Protection against abuse
- **Health Endpoints**: `/health`, `/health/detailed`, `/ready`, `/live`

### Digital Twins (4 Core)
- **Viewer Twin**: Demographics, watch patterns, engagement, segments
- **Creator Twin**: Profile, audience, monetization, brand deals
- **Content Twin**: Metadata, rights, performance, recommendations
- **Campaign Twin**: Targeting, budget, performance, optimization

---

## Phase 2: Content & Production OS ✅

### Editorial Calendar
- Content planning across channels
- Workflow: Idea → Writing → Review → Approval → Scheduled → Published
- Assignment to users with role-based tasks
- Priority levels and deadline tracking
- Dependency management between entries
- Team collaboration with notes

### Script Management
- Screenplay, teleplay, and visual scripts
- Scene-by-scene breakdown
- Character management with arcs
- Version control with full history
- Scene locking for approved content
- Collaborative commenting with resolution
- Export to standard screenplay format

### Production OS
- Full production lifecycle management
- Pre-production, production, post-production tracking
- Scene scheduling and tracking
- Daily production reports
- Call sheets generation
- Equipment booking and tracking
- Crew management with roles
- Budget allocation and tracking
- Progress calculation

### Metadata Management
- Dublin Core taxonomy + custom fields
- Genre and tag management
- Language versions (dubbed, subtitles)
- Technical specifications
- Distribution platform management
- SEO optimization
- Version history

### AI Content Agents

| Agent | Capabilities |
|-------|-------------|
| **Script Writer** | Generate scripts, dialogues, plot twists |
| **Thumbnail Designer** | Create thumbnails, optimize for platforms |
| **SEO Optimizer** | Meta tags, keywords, content scoring |
| **Content Repurposer** | Convert to shorts, clips, social posts |
| **Translator** | 18 languages, subtitle generation |
| **Moderator** | Policy compliance, content warnings |
| **Trend Hunter** | Discover trends, predict virality, generate ideas |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Health check
curl http://localhost:5600/health
```

---

## API Endpoints

### Foundation
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with RTMN services
- `GET /api/layers` - All 15 RTMN layers

### Authentication
- `POST /auth/register` - Register user
- `POST /auth/login` - Login
- `GET /auth/verify` - Verify token

### Viewers & Content
- `GET /api/viewers` - List viewers (admin)
- `GET /api/viewers/:id` - Get viewer
- `POST /api/viewers/:id/watch` - Update watch history
- `GET /api/content` - List content
- `GET /api/content/:id` - Get content with recommendations
- `POST /api/content/:id/publish` - Publish content

### Phase 2 - Content & Production

#### Editorial Calendar
- `GET /api/content-ops/calendar` - List entries
- `GET /api/content-ops/calendar/view` - Calendar view (grouped)
- `POST /api/content-ops/calendar` - Create entry
- `PATCH /api/content-ops/calendar/:id` - Update entry
- `POST /api/content-ops/calendar/:id/assign` - Assign user
- `POST /api/content-ops/calendar/:id/submit-approval` - Submit for approval
- `POST /api/content-ops/calendar/:id/approve` - Approve entry
- `GET /api/content-ops/calendar/overdue` - Overdue entries
- `GET /api/content-ops/calendar/my-tasks` - User's tasks

#### Scripts
- `GET /api/content-ops/scripts` - List scripts
- `GET /api/content-ops/scripts/:id` - Get script
- `POST /api/content-ops/scripts` - Create script
- `PATCH /api/content-ops/scripts/:id` - Update script
- `POST /api/content-ops/scripts/:id/version` - Create new version
- `POST /api/content-ops/scripts/:id/scenes` - Add scene
- `POST /api/content-ops/scripts/:id/lock` - Lock script

#### Productions
- `GET /api/content-ops/productions` - List productions
- `GET /api/content-ops/productions/:id` - Get production
- `POST /api/content-ops/productions` - Create production
- `PATCH /api/content-ops/productions/:id` - Update production
- `POST /api/content-ops/productions/:id/daily-report` - Add daily report
- `GET /api/content-ops/productions/stats/summary` - Production stats

#### Metadata
- `GET /api/content-ops/metadata/:type/:id` - Get metadata
- `PATCH /api/content-ops/metadata/:type/:id` - Update metadata

### AI Agents

#### Script Writer
- `POST /api/content-ops/ai/script/generate` - Generate script
- `POST /api/content-ops/ai/script/dialogue` - Generate dialogue
- `POST /api/content-ops/ai/script/twists` - Suggest plot twists

#### Thumbnail Designer
- `POST /api/content-ops/ai/thumbnail/generate` - Generate thumbnail
- `POST /api/content-ops/ai/thumbnail/optimize` - Optimize for platform

#### SEO Optimizer
- `POST /api/content-ops/ai/seo/optimize` - Optimize content
- `POST /api/content-ops/ai/seo/report` - Generate SEO report

#### Content Repurposer
- `POST /api/content-ops/ai/repurpose` - Repurpose content
- `POST /api/content-ops/ai/clips/generate` - Generate clips

#### Translator
- `POST /api/content-ops/ai/translate` - Translate content
- `POST /api/content-ops/ai/subtitles/generate` - Generate subtitles
- `GET /api/content-ops/ai/languages` - Supported languages

#### Moderator
- `POST /api/content-ops/ai/moderate` - Moderate content
- `POST /api/content-ops/ai/rating` - Get content rating

#### Trend Hunter
- `POST /api/content-ops/ai/trends/discover` - Discover trends
- `POST /api/content-ops/ai/trends/virality` - Predict virality
- `POST /api/content-ops/ai/trends/ideas` - Generate content ideas

---

## Environment Variables

```bash
# Server
PORT=5600
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/media-os

# JWT
JWT_SECRET=your-secret-key

# RTMN Services
HOJAI_AI_URL=http://localhost:4560
CORPID_URL=http://localhost:4702
MEMORY_OS_URL=http://localhost:4703
TWIN_OS_URL=http://localhost:4705
ADBAZAAR_DSP_URL=http://localhost:4990
RABTUL_WALLET_URL=http://localhost:4004
```

---

## What's Next (Phase 3-7)

### Phase 3: Broadcasting & Streaming OS
- Program Grid builder
- Electronic Program Guide (EPG)
- HLS/DASH streaming
- DRM integration

### Phase 4: Rights & Monetization OS
- License management
- Royalty calculator
- Subscription engine
- AdBazaar integration

### Phase 5: Audience & Creator OS
- Viewer Twin enrichment
- Brand deal pipeline
- Community features
- Social publishing

### Phase 6: AI Media Brain
- AI Editor
- AI News Writer
- AI Fact Checker
- AI Community Manager
- CEO Dashboard

### Phase 7: GCC & Expansion
- Arabic/RTL support
- Multi-currency
- Regional compliance

---

## Contributing

1. Follow the service template structure
2. Add proper validation with Joi
3. Include Winston logging
4. Add health endpoints
5. Update PORT-REGISTRY.md

---

*Last Updated: June 17, 2026*

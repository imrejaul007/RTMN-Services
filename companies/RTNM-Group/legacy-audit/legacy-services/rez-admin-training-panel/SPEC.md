# REZ Admin Training Panel - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Group
**Category:** Admin

---

## Overview

Admin dashboard for training AI models with books, articles, and FAQs. Provides content management and training pipeline configuration for AI services.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   REZ Admin Training Panel                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── Content Manager  → Books, articles, FAQ management                   │
│  ├── Training Config  → AI training pipeline settings                    │
│  ├── Analytics View  → Training metrics and progress                     │
│  └── Job Scheduler   → Batch training jobs                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### TrainingContent
```typescript
{
  contentId: string
  type: 'book' | 'article' | 'faq'
  title: string
  content: string
  metadata: Record<string, any>
  status: 'pending' | 'processing' | 'trained'
  createdAt: Date
}
```

### TrainingJob
```typescript
{
  jobId: string
  type: 'full' | 'incremental'
  contentIds: string[]
  status: 'queued' | 'running' | 'completed' | 'failed'
  progress: number
  startedAt?: Date
  completedAt?: Date
}
```

---

## API Endpoints

### Content
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/content` | Add content |
| GET | `/api/content` | List content |
| GET | `/api/content/:id` | Content details |
| PUT | `/api/content/:id` | Update content |
| DELETE | `/api/content/:id` | Delete content |

### Training
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/training/jobs` | Create training job |
| GET | `/api/training/jobs` | List jobs |
| GET | `/api/training/jobs/:id` | Job details |
| POST | `/api/training/jobs/:id/cancel` | Cancel job |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Training overview |
| GET | `/api/analytics/content` | Content stats |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Dependencies

```json
{
  "axios": "^1.6.7",
  "lucide-react": "^0.344.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.22.0",
  "recharts": "^2.15.4"
}
```

---

## Status

- [x] Content management
- [x] Training jobs
- [x] Analytics
- [x] Job scheduling


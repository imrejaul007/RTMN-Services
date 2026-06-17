# BPO Manager Service

**Version:** 1.0.0
**Port:** 4891
**Status:** Production Ready

## Overview

BPO Manager handles Business Process Outsourcing operations including worker management, job assignment, and voice-based BPO services for call center operations.

## Service Types

| Type | Description | Skills Required |
|------|-------------|-----------------|
| CUSTOMER_SUPPORT | Inbound/Outbound customer service | Communication, CRM, Problem solving |
| DATA_ENTRY | Data processing and entry | Typing, Attention to detail, MS Office |
| CONTENT_MODERATION | Content review and filtering | Language proficiency, Guidelines knowledge |
| TRANSCRIPTION | Audio to text conversion | Fast typing, Listening skills |
| IMAGE_ANNOTATION | Image labeling and tagging | Visual attention, Categorization |
| RESEARCH | Market and data research | Analytical skills, Research methodology |
| VOICE | Call center operations | Telephony, CRM, Soft skills |

## Multi-Tenant Support

Each request must include `X-Tenant-ID` header to identify the organization.

## API Endpoints

### Workers
- `GET /api/workers` - List all workers (with filters)
- `GET /api/workers/:id` - Get worker details
- `POST /api/workers` - Create new worker
- `PUT /api/workers/:id` - Update worker
- `DELETE /api/workers/:id` - Remove worker
- `GET /api/workers/:id/stats` - Get worker statistics
- `PUT /api/workers/:id/status` - Update worker status

### Jobs
- `GET /api/jobs` - List all jobs (with filters)
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create new job
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Cancel job
- `POST /api/jobs/:id/assign` - Manually assign job
- `POST /api/jobs/:id/complete` - Mark job complete

### Voice BPO
- `POST /api/voice/call` - Initiate outbound call
- `GET /api/voice/calls` - List voice calls
- `GET /api/voice/calls/:id` - Get call details
- `POST /api/voice/webhook` - Twilio webhook handler

## Worker Status

- `AVAILABLE` - Ready to accept jobs
- `BUSY` - Currently working on a job
- `OFFLINE` - Not available
- `BREAK` - On break

## Job Status

- `PENDING` - Awaiting assignment
- `ASSIGNED` - Assigned to a worker
- `IN_PROGRESS` - Work started
- `COMPLETED` - Work finished
- `CANCELLED` - Job cancelled

## Job Priority

- `LOW` (1)
- `NORMAL` (2)
- `HIGH` (3)
- `URGENT` (4)
- `CRITICAL` (5)

## Auto-Assignment Logic

Jobs are automatically assigned based on:
1. Worker availability status
2. Matching skills for job type
3. Language requirements
4. Current workload (prefer workers with fewer active jobs)
5. Worker performance stats

## Voice Integration

Uses Twilio for:
- Outbound call initiation
- Call recordings
- Transcription services
- Call status updates

## Environment Variables

See `.env.example` for configuration.

## Quick Start

```bash
cd services/bpo-manager
npm install
cp .env.example .env  # Configure your values
npm run dev
```

## Health Check

```
GET /health
```

Returns service status and database connectivity.
# VerificationOS - Port 4866

## Overview
Source validation, cross-reference checks, confidence scoring.

## Purpose
Validates AI agent outputs and provides confidence scores.

## Key Features
- Source validation
- Cross-reference checks
- Confidence scoring
- Dispute resolution
- Quality metrics

## API Endpoints

### Verification
- `POST /api/verify` - Verify content
- `GET /api/verification/:id` - Get result

### Confidence
- `GET /api/confidence/:source` - Source confidence

## Tests
Vitest tests: `__tests__/verification-os.test.ts`

## Environment
- Port: 4866

## Startup
```bash
cd platform/sutar-os/core/verification-os && npm run dev
```

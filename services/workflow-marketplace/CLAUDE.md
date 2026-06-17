# Workflow Marketplace Service

**Version:** 1.0.0  
**Port:** 4938  
**Status:** Active

## Overview

The Workflow Marketplace is a centralized hub for discovering, installing, and managing pre-built industry workflows. It enables businesses to quickly deploy proven automation workflows with a single click.

## Features

- Browse workflows by industry and category
- One-click workflow installation
- Reviews and ratings system
- Search with filters
- Featured and popular workflows
- Installation management
- Trigger tracking

## API Endpoints

### Health & Info

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/` | GET | Service information |

### Workflows

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/marketplace/workflows` | GET | List all workflows |
| `/api/marketplace/workflows/featured` | GET | Get featured workflows |
| `/api/marketplace/workflows/popular` | GET | Get popular workflows |
| `/api/marketplace/workflows/industry/:industry` | GET | Get by industry |
| `/api/marketplace/workflows/category/:category` | GET | Get by category |
| `/api/marketplace/workflows/:workflowId` | GET | Get workflow details |

### Categories & Industries

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/marketplace/categories` | GET | List all categories |
| `/api/marketplace/categories/industries` | GET | List all industries |

### Installation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/marketplace/:workflowId/install` | POST | Install workflow |
| `/api/marketplace/:workflowId/install` | DELETE | Uninstall workflow |
| `/api/marketplace/installations` | GET | Get client installations |
| `/api/marketplace/installations/:id` | GET | Get installation details |
| `/api/marketplace/installations/:id/status` | PATCH | Update status |
| `/api/marketplace/installations/:id/trigger` | POST | Record trigger |

### Reviews

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/marketplace/:workflowId/reviews` | GET | Get reviews |
| `/api/marketplace/:workflowId/reviews` | POST | Add review |
| `/api/marketplace/:workflowId/reviews/:id` | DELETE | Delete review |
| `/api/marketplace/:workflowId/rating` | GET | Get rating summary |

## Industries

- retail
- restaurant
- hotel
- healthcare
- insurance
- fitness
- beauty
- automotive
- realestate
- legal
- education
- general

## Categories

- refund
- cancellation
- upgrade
- claim
- support
- onboarding
- checkout
- feedback
- loyalty
- compliance
- general

## Usage Examples

### Install a workflow

```bash
curl -X POST http://localhost:4938/api/marketplace/WF-123/install \
  -H "Content-Type: application/json" \
  -d '{"clientId": "CLIENT-001", "config": {"notifications": true}}'
```

### Search workflows

```bash
curl "http://localhost:4938/api/marketplace/workflows?industry=retail&category=refund"
```

### Add a review

```bash
curl -X POST http://localhost:4938/api/marketplace/WF-123/reviews \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "comment": "Great workflow!", "userId": "USER-001"}'
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4938 | Service port |
| `MONGODB_URI` | mongodb://localhost:27017/workflow-marketplace | MongoDB connection |
| `NODE_ENV` | development | Environment |

## Quick Start

```bash
cd services/workflow-marketplace
npm install
npm run dev
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Workflow Marketplace                       │
├─────────────────────────────────────────────────────────────┤
│  Routes: Workflows | Categories | Install | Reviews        │
├─────────────────────────────────────────────────────────────┤
│  Services: SearchService | InstallerService                │
├─────────────────────────────────────────────────────────────┤
│  Models: Workflow | Installation                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
               ┌──────────────────┐
               │     MongoDB      │
               └──────────────────┘
```

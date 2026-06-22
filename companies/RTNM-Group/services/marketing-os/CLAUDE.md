# Marketing OS

## Overview
Multi-industry marketing orchestration engine for RTMN.

## Port: 3020

## Features
- **Campaign Management**: Create and manage campaigns across 24 industries
- **Channel Orchestration**: Social, email, SEO, PPC, content, affiliate, influencer
- **Content Library**: Centralized content management
- **Analytics**: Campaign and channel performance analytics

## Routes
- `campaigns.js` - Campaign CRUD and management
- `channels.js` - Channel management
- `content.js` - Content library
- `analytics.js` - Marketing analytics

## API Endpoints
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/channels` - List channels
- `POST /api/channels` - Create channel
- `GET /api/content` - List content
- `POST /api/content` - Create content
- `GET /api/analytics` - Analytics overview

## Industry Coverage
All 24 RTMN industries supported.

## Dependencies
- express, cors, helmet, redis, uuid, winston

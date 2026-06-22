# Developer Cloud

## Overview
Unified API platform for RTMN ecosystem. Provides SDKs, documentation, and API gateway for developers.

## Port: 3040

## Features
- **API Gateway**: Unified access to all RTMN APIs
- **SDK Generator**: Multi-language SDK generation
- **Interactive Documentation**: API documentation portal
- **Developer Auth**: API key management

## SDK Languages
- JavaScript, Python, TypeScript, Go, Java, Ruby

## API Categories
- core, industry, platform, data, ai

## Plan Types
- free: 1,000 requests/min
- starter: 10,000 requests/min
- professional: 100,000 requests/min
- enterprise: unlimited

## Routes
- `apis.js` - API registry and documentation
- `sdk.js` - SDK generation
- `docs.js` - Documentation portal
- `auth.js` - Developer authentication

## API Endpoints
- `GET /api/apis` - List all APIs
- `GET /api/apis/:id` - Get API details
- `GET /api/apis/:id/docs` - Get API docs
- `GET /api/sdk` - List SDKs
- `GET /api/sdk/:language` - Get SDK for language
- `GET /api/docs` - Documentation index
- `POST /api/auth/register` - Register developer
- `POST /api/auth/token` - Generate token

## Default APIs
- capability-matrix, unified-twin, memory-network, boa-council, economic-graph, simulation, marketing, workforce, commerce, finance

## Dependencies
- express, cors, helmet, redis, uuid, winston

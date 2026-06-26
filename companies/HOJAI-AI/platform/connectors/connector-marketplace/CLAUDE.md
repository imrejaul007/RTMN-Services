# Connector Marketplace

## Overview
Marketplace for connector discovery.

## Purpose
Browse and install connectors for TwinOS.

## Key Features
- Connector catalog
- Installation
- Reviews and ratings
- Search and filter

## API Endpoints
- `GET /connectors` - Browse connectors
- `GET /connectors/:id` - Connector details
- `POST /install/:id` - Install connector

## Startup
```bash
cd platform/connectors/connector-marketplace && npm run dev
```

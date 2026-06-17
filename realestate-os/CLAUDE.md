# RealEstate OS

**Industry:** Real Estate  
**Port:** 5230  
**Status:** ✅ RUNNING  
**Digital Twins:** Property, Listing, Lead, Agent

## Overview

RealEstate OS is a comprehensive real estate management system that handles:
- Property management
- Listings
- Lead management
- Agent management
- Viewings & offers

## Quick Start

```bash
cd realestate-os
npm install
npm start
```

## API Endpoints

### Properties
- `GET /api/properties` - List properties
- `POST /api/properties` - Add property
- `GET /api/properties/:id` - Get property
- `PUT /api/properties/:id` - Update property

### Listings
- `GET /api/listings` - List listings
- `POST /api/listings` - Create listing
- `GET /api/listings/:id` - Get listing

### Leads
- `GET /api/leads` - List leads
- `POST /api/leads` - Add lead
- `GET /api/leads/:id` - Get lead
- `PATCH /api/leads/:id/status` - Update status

### Agents
- `GET /api/agents` - List agents
- `POST /api/agents` - Add agent
- `GET /api/agents/:id` - Get agent

### Viewings
- `GET /api/viewings` - List viewings
- `POST /api/viewings` - Schedule viewing

### Offers
- `GET /api/offers` - List offers
- `POST /api/offers` - Submit offer
- `PATCH /api/offers/:id/respond` - Respond to offer

### Analytics
- `GET /api/analytics` - Dashboard analytics

### Health
- `GET /health` - Health check

## Digital Twins

| Twin | Purpose |
|------|---------|
| Property Twin | Property details |
| Listing Twin | Active listings |
| Lead Twin | Lead tracking |
| Agent Twin | Agent profiles |
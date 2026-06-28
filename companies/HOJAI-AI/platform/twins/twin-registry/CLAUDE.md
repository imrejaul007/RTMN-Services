# Twin Registry

> **Service:** Twin Registry  
> **Port:** 4903  
> **Phase:** 35  
> **Status:** Production-ready

## Overview

Registry for digital twin types and instances — manage twin schemas, create instances, track relationships, and version twin data.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/types` | List twin types |
| POST | `/api/types` | Create twin type (name, schema, attributes, relationships) |
| GET | `/api/types/:id` | Get twin type |
| PUT | `/api/types/:id` | Update twin type |
| DELETE | `/api/types/:id` | Delete twin type |
| GET | `/api/instances` | List instances (filter by typeId, tags, search) |
| POST | `/api/instances` | Create instance (typeId, name, data, tags) |
| GET | `/api/instances/:id` | Get instance |
| PUT | `/api/instances/:id` | Update instance |
| DELETE | `/api/instances/:id` | Delete instance |
| GET | `/api/instances/:id/versions` | List instance versions |
| POST | `/api/instances/:id/versions` | Create new version |
| GET | `/api/instances/:id/relationships` | List relationships (incoming + outgoing) |
| POST | `/api/instances/:id/relationships` | Create relationship (toId, type) |
| DELETE | `/api/instances/:id/relationships/:relId` | Remove relationship |
| GET | `/api/stats` | Registry statistics |

## Instance Status

`active` | `archived` | `deprecated`
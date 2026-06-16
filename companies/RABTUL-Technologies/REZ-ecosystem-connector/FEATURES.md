# REZ-ecosystem-connector - Features

**Version:** 1.0.0  
**Last Updated:** June 17, 2026

---

## Core Features

### 1. Service Registry

| Feature | Description | Status |
|---------|-------------|--------|
| **Service Registration** | Register services with name, port, industry | ✅ |
| **Service Discovery** | Find services by name or industry | ✅ |
| **Heartbeat Monitoring** | Track service health via heartbeats | ✅ |
| **Auto-cleanup** | Remove stale services (no heartbeat) | ✅ |
| **Version Tracking** | Track service versions | ✅ |

### 2. Service Management

| Feature | Description | Status |
|---------|-------------|--------|
| **List Services** | Get all registered services | ✅ |
| **Get Service** | Get details of specific service | ✅ |
| **Update Status** | Update service health status | ✅ |
| **Unregister** | Remove service from registry | ✅ |
| **Bulk Register** | Register multiple services at once | ✅ |

### 3. Statistics & Monitoring

| Feature | Description | Status |
|---------|-------------|--------|
| **Total Count** | Number of registered services | ✅ |
| **By Industry** | Services grouped by industry | ✅ |
| **By Status** | Services grouped by health status | ✅ |
| **Last Updated** | Timestamp of last registry change | ✅ |

### 4. Health Checks

| Feature | Description | Status |
|---------|-------------|--------|
| **Basic Health** | Returns service health status | ✅ |
| **Detailed Health** | Returns registry statistics | ✅ |
| **Liveness Check** | Simple uptime check | ✅ |
| **Readiness Check** | Registry availability check | ✅ |

---

## API Features

### Service Registration

- **POST /api/services/register**
- Validate required fields (name, port, industry)
- Auto-generate URL from name and port
- Store in memory registry
- Return registered service info

### Service Discovery

- **GET /api/services**
- Returns array of all registered services
- Includes: name, port, industry, version, status, url

- **GET /api/services/:name**
- Returns specific service details
- 404 if not found

### Heartbeat System

- **POST /api/services/:name/heartbeat**
- Updates lastHeartbeat timestamp
- Resets unhealthy status if service recovers
- Auto-removes services after 60 seconds of no heartbeat

### Statistics

- **GET /api/stats**
- Total services count
- Services by industry
- Services by status
- Uptime information

---

## Integration Points

### Connected Services (via Event Bus)

| Event | Publisher | Subscriber |
|-------|-----------|------------|
| `service.registered` | Any service | Monitoring |
| `service.unregistered` | Any service | Monitoring |
| `service.heartbeat` | Any service | Registry |

### Used By

| Service | Purpose |
|---------|---------|
| REZ-event-bus | Service discovery |
| REZ-graphql-federation | Service federation |
| All Industry OS | Service registration |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Response Time | < 50ms |
| Max Services | 1000 |
| Heartbeat Interval | 30 seconds |
| Cleanup Interval | 60 seconds |

---

## Error Handling

| Error | Response | Handling |
|-------|----------|----------|
| Missing name | 400 Bad Request | Validation |
| Missing port | 400 Bad Request | Validation |
| Missing industry | 400 Bad Request | Validation |
| Service not found | 404 Not Found | Error response |
| Duplicate service | 409 Conflict | Update existing |

---

*Last Updated: June 17, 2026*

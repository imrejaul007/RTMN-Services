# Production Migration Guide

## Pre-Migration Checklist

### Infrastructure
- [ ] Production MongoDB cluster
- [ ] Production Redis cluster
- [ ] CDN configured
- [ ] DNS configured
- [ ] SSL certificates

### Services
- [ ] All services containerized
- [ ] Health checks implemented
- [ ] Graceful shutdown
- [ ] Environment variables

### Data
- [ ] Backup strategy
- [ ] Data migration scripts
- [ ] Rollback plan

## Migration Steps

### Phase 1: Infrastructure
1. Provision production servers
2. Set up load balancers
3. Configure SSL
4. Deploy monitoring

### Phase 2: Database Migration
1. Create production DB
2. Run migrations
3. Verify data integrity
4. Switch DNS

### Phase 3: Service Deployment
1. Deploy auth service
2. Deploy core services
3. Deploy dependent services
4. Verify connectivity

### Phase 4: Cutover
1. Enable traffic
2. Monitor error rates
3. Verify SLAs
4. Complete cutover

## Rollback Plan

### If critical errors:
1. Revert DNS
2. Switch to old system
3. Investigate
4. Fix and retry

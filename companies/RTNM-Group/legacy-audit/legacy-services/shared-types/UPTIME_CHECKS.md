# External Uptime Monitoring

This configuration enables 24/7 external uptime monitoring for all REZ services.

## Recommended Services

### Free Tier
- **Better Stack** (betterstack.com) - Free 10 monitors
- **UptimeRobot** - Free 50 monitors
- **Checkly** - Free 25k checks/month

### Paid Tier
- **Better Stack Team** - $50/mo unlimited monitors
- **Pingdom** - Enterprise monitoring
- **Datadog** - Full APM + monitoring

## Setup

1. Copy `uptime-monitoring.yml` to your monitoring service
2. Set up Slack channel `#uptime-alerts`
3. Configure PagerDuty for critical alerts
4. Set check interval to 60s for APIs, 120s for apps

## Response Time SLAs

| Service | P95 Target | P99 Target |
|---------|-------------|------------|
| Auth | <100ms | <500ms |
| Payments | <200ms | <1s |
| Orders | <300ms | <2s |
| Health | <50ms | <100ms |

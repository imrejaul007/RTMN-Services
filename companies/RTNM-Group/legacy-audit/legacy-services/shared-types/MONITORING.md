# Cost Monitoring

## AWS/Vercel Cost Tracking

### Recommended Setup

1. **AWS Cost Explorer**
   - Enable cost allocation tags
   - Set up budget alerts at 80%, 90%, 100%

2. **Vercel Analytics**
   - Already integrated
   - Monitor bandwidth and serverless execution

3. **Custom Cost Metrics**
   - Track API calls per customer
   - Monitor database connections
   - Log storage usage

### Budget Alerts

| Service | Monthly Budget | Alert Threshold |
|---------|---------------|-----------------|
| rez-api-gateway | $500 | $400 |
| rez-auth-service | $200 | $160 |
| rez-payment-service | $300 | $240 |
| Database (Atlas) | $1000 | $800 |
| Redis (Upstash) | $100 | $80 |

### Cost Optimization

- [ ] Enable auto-scaling off-peak
- [ ] Set up reserved instances
- [ ] Review expensive queries weekly
- [ ] Monitor cold start latency
- [ ] Set up cost anomaly detection

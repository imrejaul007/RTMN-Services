# Security Audit Checklist

## Authentication
- [ ] JWT secret is >32 characters
- [ ] JWT expiry is reasonable (15m access, 7d refresh)
- [ ] Refresh tokens are rotated
- [ ] OTP has rate limiting
- [ ] Password policy enforced (8+ chars, mixed case, numbers)

## Authorization
- [ ] RBAC implemented
- [ ] Least privilege principle
- [ ] Internal endpoints protected
- [ ] Admin actions logged

## Data Protection
- [ ] MongoDB AUTH enabled
- [ ] Redis AUTH enabled
- [ ] TLS in transit
- [ ] Secrets in vault (not env)
- [ ] Sensitive data encrypted at rest

## API Security
- [ ] Rate limiting on all endpoints
- [ ] Input validation (Zod)
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF tokens
- [ ] CORS configured

## Payment Security
- [ ] Webhook signature verification
- [ ] PCI compliance
- [ ] Idempotency keys
- [ ] Fraud detection

## Infrastructure
- [ ] Containers run as non-root
- [ ] No secrets in images
- [ ] Network segmentation
- [ ] WAF in front
- [ ] DDoS protection

## Monitoring
- [ ] Audit logging
- [ ] Anomaly detection
- [ ] Alert on suspicious activity
- [ ] Log retention policy

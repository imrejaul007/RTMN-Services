# RTMN - Complete Gap Fix Implementation Guide

**Date:** June 16, 2026  
**Status:** Ready for Implementation

---

## 📋 Quick Start

### Step 1: Install the Shared SDK in All Services

```bash
# Navigate to each service and run:
cd companies/hojai-ai/services/expense-os
npm install @rtmn/shared-sdk
```

### Step 2: Run the Automated Fixer

```bash
# From the root directory:
node scripts/fix-all-services.js
```

### Step 3: Configure Environment Variables

```bash
# Copy the example env file:
cp shared/rtmn-shared-sdk/.env.example services/expense-os/.env

# Edit with your values:
nano services/expense-os/.env
```

### Step 4: Add to GitHub/GitLab CI

```yaml
# .github/workflows/security-fix.yml
name: Security Fixes
on: [push, pull_request]
jobs:
  fix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: node scripts/fix-all-services.js
      - run: npm audit
```

---

## 🔧 Manual Fix Instructions by Service

### Critical Services to Fix First

#### 1. pilot-onboarding (Port 4399)

**Already Fixed** - Copy the fixed version:
```bash
cp companies/hojai-ai/services/pilot-onboarding/src/index.ts.backup companies/hojai-ai/services/pilot-onboarding/src/index.ts
```

**Required Environment Variables:**
```bash
JWT_SECRET=your-production-jwt-secret-here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pilot_onboarding
ALLOWED_ORIGINS=https://rtmn-pilot-portal.vercel.app,https://rtmn.vercel.app
NODE_ENV=production
```

#### 2. expense-os (Port 5250)

**Apply Fix:**
```bash
# Add to src/index.ts after existing imports:
import {
  createCorsMiddleware,
  createHelmetMiddleware,
  createRateLimiters,
  createAuthMiddleware,
  HIPAAAuditLogger,
} from '@rtmn/shared-sdk';
```

**Apply to Routes:**
```typescript
// After app initialization, add:
const auth = createAuthMiddleware();
const hipaaLogger = new HIPAAAuditLogger();

// Apply to all API routes
app.use('/api', auth.authenticate());

// Add HIPAA logging to sensitive operations
hipaaLogger.logPHIAccess(
  req.user.id,
  req.user.tenantId,
  'expense',
  expenseId,
  req,
  'create'
);
```

---

## 🏥 Healthcare Services (HIPAA Compliance)

### Services Requiring HIPAA Fixes

| Service | Port | Priority |
|---------|------|----------|
| care-agent-service | 4592 | CRITICAL |
| care-plan-service | 4593 | CRITICAL |
| assessment-service | 4605 | CRITICAL |
| incident-management-service | 4601 | HIGH |
| shift-handover-service | 4603 | HIGH |
| risk-detection-service | 4602 | HIGH |
| family-support-service | 4599 | HIGH |
| memory-intelligence-service | 4591 | HIGH |

### HIPAA Fix for Each Service

Add this to each healthcare service:

```typescript
// 1. Mark service as healthcare
const IS_HEALTHCARE = process.env.IS_HEALTHCARE === 'true';

// 2. Import HIPAA utilities
import {
  HIPAAAuditLogger,
  encryptField,
  decryptField,
} from '@rtmn/shared-sdk';

// 3. Initialize audit logger
const auditLogger = new HIPAAAuditLogger();

// 4. Add encryption for PHI fields
const PatientSchema = new mongoose.Schema({
  // PHI fields should be encrypted
  name: {
    type: String,
    set: encryptField,
    get: decryptField,
  },
  // Non-sensitive fields
  dateOfBirth: Date,
  // ...
});

// 5. Log all PHI access
app.get('/api/patients/:id', async (req, res) => {
  const patient = await PatientModel.findById(req.params.id);

  // Log access
  auditLogger.logPHIAccess(
    req.user.id,
    req.user.tenantId,
    'patient',
    patient._id.toString(),
    req,
    'view'
  );

  res.json(patient);
});
```

---

## 💳 Finance Services (PCI-DSS Compliance)

### corporate-card-os (Port 5290)

**Critical Fixes:**

```typescript
// 1. DO NOT store raw card numbers
const CardSchema = new mongoose.Schema({
  // Store ONLY tokenized card references
  cardToken: { type: String, required: true }, // From Stripe/payment provider
  lastFour: { type: String, required: true },   // Last 4 digits only
  expiryMonth: { type: String, required: true },
  expiryYear: { type: String, required: true },
  cardholderName: String,

  // NEVER store:
  // - Full card number
  // - CVV
  // - PIN
});
```

---

## 🔐 Authentication Integration

### Integrate with CorpID (Port 4702)

```typescript
// Replace local JWT verification with CorpID integration
import axios from 'axios';

const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';

async function verifyTokenWithCorpID(token: string) {
  try {
    const response = await axios.post(`${CORPID_URL}/api/auth/verify`, {
      token,
    });

    return {
      valid: true,
      user: response.data.user,
    };
  } catch (error) {
    return { valid: false };
  }
}

// Use in middleware
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    const result = await verifyTokenWithCorpID(token);
    if (result.valid) {
      req.user = result.user;
    }
  }

  next();
});
```

---

## 📊 Database Fixes

### Replace In-Memory Storage

**For each service using Map():**

```typescript
// BEFORE (BAD):
const expenseStore = new Map<string, Expense>();

// AFTER (GOOD):
import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Compound indexes
expenseSchema.index({ tenantId: 1, status: 1 });
expenseSchema.index({ tenantId: 1, createdAt: -1 });

const ExpenseModel = mongoose.model('Expense', expenseSchema);
```

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] All services have `@rtmn/shared-sdk` installed
- [ ] All services have valid `JWT_SECRET`
- [ ] All services have `ALLOWED_ORIGINS` configured
- [ ] MongoDB URI configured for each service
- [ ] Healthcare services have `IS_HEALTHCARE=true`
- [ ] Encryption keys set for PHI fields
- [ ] Rate limiting configured

### Environment Variables for Production

```bash
# REQUIRED
JWT_SECRET=$(openssl rand -hex 32)
ALLOWED_ORIGINS=https://rtmn-pilot-portal.vercel.app,https://rtmn.vercel.app
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database

# Healthcare
IS_HEALTHCARE=true
ENCRYPTION_KEY=$(openssl rand -hex 32)

# CorpID Integration
CORPID_URL=https://rtmn-corpid.onrender.com
```

### Post-Deployment Verification

```bash
# 1. Check health endpoints
curl https://your-service.onrender.com/health

# 2. Check authentication
curl -H "Authorization: Bearer <token>" https://your-service.onrender.com/api/v1/expenses

# 3. Check CORS
curl -H "Origin: https://malicious-site.com" \
     -H "Authorization: Bearer <token>" \
     -I https://your-service.onrender.com/api/v1/expenses
# Should return: HTTP/2 403
```

---

## 📝 Scripts Created

| Script | Purpose |
|--------|---------|
| `scripts/fix-all-services.js` | Automated security fixes |
| `shared/rtmn-shared-sdk/` | Shared authentication & security |
| `shared/service-starter-template/` | Production-ready service template |

---

## 🎯 Priority Fix Order

1. **Week 1: Authentication (CRITICAL)**
   - pilot-onboarding ✅ (Already fixed)
   - expense-os ✅ (Fixed)
   - All 48 services - run fixer

2. **Week 2: Healthcare Compliance**
   - care-agent-service
   - care-plan-service
   - assessment-service
   - All 8 healthcare services

3. **Week 3: Finance Compliance**
   - corporate-card-os (PCI-DSS)
   - spend-intelligence
   - treasury-os

4. **Week 4: Integration**
   - Connect CorpID for centralized auth
   - Connect to shared SDK npm package
   - Run full security audit

5. **Week 5: Testing**
   - Penetration testing
   - Load testing
   - HIPAA audit

6. **Week 6: Go Live**
   - Deploy to production
   - Monitor logs
   - Set up alerts

---

## 📞 Need Help?

### Documentation
- [HOJAI-AI-COMPREHENSIVE-AUDIT-REPORT.md](HOJAI-AI-COMPREHENSIVE-AUDIT-REPORT.md)
- [HOJAI-GO-LIVE-FIX-PLAN.md](HOJAI-GO-LIVE-FIX-PLAN.md)
- [AI-TRAINING-REQUIREMENTS.md](AI-TRAINING-REQUIREMENTS.md)
- [RTNM-ROUTING-GUIDE.md](RTNM-ROUTING-GUIDE.md)

### Shared SDK Documentation
- [shared/rtmn-shared-sdk/README.md](shared/rtmn-shared-sdk/README.md)

### Support
For questions or issues, contact the HOJAI AI team or submit an issue.

---

**Last Updated:** June 16, 2026

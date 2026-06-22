# Configuration Audit Report

**Audit Date:** 2026-05-02
**Auditor:** Configuration Auditor
**Scope:** /Users/rejaulkarim/Documents/ReZ Full App, /Users/rejaulkarim/Documents/rez-intent-graph

---

## 1. TypeScript Configurations

### Found tsconfig.json Files:

| File Path | Status |
|-----------|--------|
| `/ReZ Full App/tsconfig.json` | Found |
| `/ReZ Full App/rez-auth-service/tsconfig.json` | Found |
| `/ReZ Full App/rez-merchant-service/tsconfig.json` | Found |
| `/ReZ Full App/Rendez/rendez-backend/tsconfig.json` | Found |
| `/ReZ Full App/nextabizz/apps/web/tsconfig.json` | Found |
| `/ReZ Full App/Hotel OTA/apps/api/tsconfig.json` | Found |
| `/ReZ Full App/Hotel OTA/apps/hotel-panel/tsconfig.json` | Found |
| `/ReZ Full App/rez-now/tsconfig.json` | Found |
| `/ReZ Full App/rez-travel-service/tsconfig.json` | Found |
| `/rez-intent-graph/tsconfig.json` | Found |

### Analysis:

| Service | Target | Module | Strict | ModuleResolution | Paths |
|---------|--------|--------|--------|-----------------|-------|
| Root (shared-types) | ES2020 | commonjs | true | node | none |
| rez-auth-service | ES2020 | commonjs | true | node | none |
| rez-merchant-service | ES2020 | commonjs | true | node | `@/*` -> `./src/*` |
| Rendez backend | ES2020 | commonjs | true | node | `@/*` -> `./src/*` |
| nextabizz/web | ES2022 | ESNext | true | bundler | `@/*` -> `./*` |
| Hotel OTA API | ES2022 | commonjs | **false** | node | none |
| Hotel Panel | ES2017 | esnext | true | bundler | `@/*` -> `./src/*` |
| rez-now | ES2017 | esnext | true | bundler | `@/*` -> `./*` |
| rez-travel-service | ES2020 | commonjs | true | node | none |
| rez-intent-graph | ES2022 | NodeNext | true | NodeNext | none |

### Issues Found:

1. **Inconsistent Strict Mode**: Hotel OTA API has `strict: false` and `noImplicitAny: false`
2. **Inconsistent Module Resolution**: Mix of `node`, `bundler`, and `NodeNext`
3. **Inconsistent Target Versions**: Range from ES2017 to ES2022
4. **Path Aliases Not Standardized**: Some services use `@/*` paths, others don't

---

## 2. Linting/Formatting Configurations

### Found Files:

| File | Status |
|------|--------|
| `/ReZ Full App/.prettierrc` | Not found |
| `/ReZ Full App/.eslintrc*` | Not found |
| `/ReZ Full App/eslint.config.mjs` | Not found |
| `/rez-intent-graph/.prettierrc` | Not found |
| `/rez-intent-graph/eslint.config.mjs` | Not found |

### Analysis:

- **No ESLint/Prettier configuration files found** at root level
- Individual services (rez-auth-service, rez-merchant-service) have ESLint/Prettier as devDependencies
- No shared/eslint config package (`@rez/eslint-config`) found

### Issues Found:

1. **Missing centralized linting configuration**
2. **Inconsistent formatting rules** likely across services
3. **No shared ESLint config package** for ecosystem consistency

---

## 3. Docker/Container Configurations

### Found Dockerfiles:

| Service | Path | Base Image | Multi-stage |
|---------|------|------------|-------------|
| rez-auth-service | `/rez-auth-service/Dockerfile` | node:20-alpine | Yes |
| rez-merchant-service | `/rez-merchant-service/Dockerfile` | node:20-alpine | Yes |
| Rendez backend | `/Rendez/rendez-backend/Dockerfile` | node:20-alpine | Yes |
| Hotel OTA API | `/Hotel OTA/apps/api/Dockerfile` | node:20-alpine | Yes |
| Hotel Panel | `/Hotel OTA/apps/hotel-panel/Dockerfile` | node:20-alpine | Yes |
| nextabizz/web | `/nextabizz/apps/web/Dockerfile` | node:20-alpine | Yes |
| rez-now | `/rez-now/Dockerfile` | node:20-alpine | Yes |
| rez-intent-graph | `/rez-intent-graph/Dockerfile` | node:20-alpine | Yes |
| rez-travel-service | Not found | - | - |

### docker-compose.yml:

**Location:** `/ReZ Full App/docker-compose.yml`

#### Port Mappings:
| Service | Container Port | Host Port |
|---------|---------------|-----------|
| MongoDB Primary | 27017 | 27017 |
| MongoDB Secondary 1 | 27017 | 27018 |
| MongoDB Secondary 2 | 27017 | 27019 |
| Redis | 6379 | 6379 |
| PostgreSQL | 5432 | 5432 |
| Auth API | 4002 | 4002 |
| Merchant API | 4005 | 4005 |
| Rendez | 4000 | 4000 |
| Hotel OTA API | 3000 | 3000 |
| nextabizz-web | 3000 | 3001 |
| Hotel Panel | 3000 | 3002 |
| rez-now | 3000 | 3003 |

### Issues Found:

1. **Port conflicts in docker-compose**: All Next.js apps expose 3000 but map to different host ports (3001, 3002, 3003)
2. **MongoDB hostname mismatch**: Services reference `mongodb://mongodb:27017` but container is named `mongodb-primary`
3. **Hardcoded dev secrets in docker-compose**: JWT secrets, encryption keys, and OAuth secrets are hardcoded
4. **Missing rez-travel-service Dockerfile**
5. **Inconsistent health check commands**: Some use `curl`, one uses `wget`

---

## 4. CI/CD Pipelines

### Found Files:

| File | Status |
|------|--------|
| `/ReZ Full App/.github/workflows/deploy.yml` | Found |
| `/ReZ Full App/render.yaml` | Not found |

### deploy.yml Analysis:

```yaml
Node Version: 20
Stages: deploy-staging, deploy-production
Trigger: push to main/develop
```

### Issues Found:

1. **Placeholder deployment commands**: No actual deployment logic implemented
2. **Missing render.yaml**: No Render deployment configuration
3. **No Dockerfile-based builds** in CI/CD workflow
4. **No environment-specific secrets setup**
5. **Missing test step** before deployment
6. **No caching strategy** for dependencies

---

## 5. Security Configurations

### CORS Configurations:

#### rez-auth-service:
```typescript
// Hardcoded fallback
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
allowedOrigins.split(',')
```

#### rez-intent-graph:
```typescript
// Dynamic with production validation
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? env.split(',')
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'];
// Rejects localhost in production
```

### Rate Limiting:

| Service | Endpoint Type | Limit | Window |
|---------|--------------|-------|--------|
| rez-intent-graph | standard | 100 req | 1 min |
| rez-intent-graph | strict | 20 req | 1 min |
| rez-intent-graph | auth | 10 req | 1 min |
| rez-intent-graph | nudge | 10 req | 1 min |
| rez-intent-graph | capture | 200 req | 1 min |

### Security Headers:

- **helmet**: Used in rez-auth-service, rez-merchant-service, rez-travel-service
- **express-mongo-sanitize**: Used in rez-auth-service, rez-merchant-service
- **Sentry**: Configured in most services with `SENTRY_DSN` env var

### Issues Found:

1. **Hardcoded CORS origins in docker-compose**: `http://localhost:3001`, `http://localhost:3002` etc.
2. **Inconsistent security middleware usage**: Some services missing helmet/express-mongo-sanitize
3. **No rate limiting on rez-auth-service** (only in rez-intent-graph)
4. **Dev OTP exposure flag** `EXPOSE_DEV_OTP=true` in docker-compose (security risk)
5. **Missing health check authentication** on detailed endpoint in some services

---

## 6. Application Configurations

### Found Config Files:

| File | Purpose |
|------|---------|
| `/rez-intent-graph/src/config/services.ts` | External service URLs |
| `/rez-intent-graph/src/config/redis.ts` | Redis connection |
| `/rez-intent-graph/src/config/features.ts` | Not found |
| `/rez-intent-graph/src/config/constants.ts` | Not found |
| `/ReZ Full App/rez-auth-service/src/config/index.ts` | Not found |

### Service URLs Configuration:

**Good Pattern** (rez-intent-graph):
```typescript
function requireServiceUrl(name: string, envVar: string): string {
  const url = process.env[envVar];
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[FATAL] ${envVar} is required in production`);
    }
    return portMap[envVar] || `http://localhost:${name}`;
  }
  return url;
}
```

### Issues Found:

1. **Hardcoded Render.com URLs** in `.env.example`:
   - `WALLET_SERVICE_URL=https://rez-wallet-service-36vo.onrender.com`
   - All other service URLs hardcoded to render.com endpoints

2. **Inconsistent port mappings** between services:
   - rez-intent-graph uses port 3001
   - Most services use ports 4000-4006
   - Frontends use ports 3000-3003

3. **Inconsistent environment variable naming**:
   - `REDIS_URL` vs `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`
   - `SERVICE_NAME` used in some, not all

---

## 7. Hardcoded Values Found

### Critical (Must Be Environment Variables):

| File | Hardcoded Value | Should Be |
|------|-----------------|-----------|
| docker-compose.yml | `JWT_SECRET: dev-jwt-secret-change-in-production-32chars` | `${JWT_SECRET}` |
| docker-compose.yml | `JWT_MERCHANT_SECRET: dev-merchant-secret-change-in-production!!` | env var |
| docker-compose.yml | `ENCRYPTION_KEY: dev-encryption-key-32-bytes-exactly!!` | env var |
| docker-compose.yml | `REZ_OAUTH_CLIENT_SECRET: dev-oauth-client-secret-generate-in-prod` | env var |
| docker-compose.yml | `EXPOSE_DEV_OTP: 'true'` | `false` or env var |
| .env.example | `INTERNAL_SERVICE_TOKEN=change-me-to-a-secure-random-string` | proper secret |
| services.ts | `portMap` localhost fallbacks | proper env var handling |

### Moderate (Should Be Reviewed):

| File | Value | Concern |
|------|-------|---------|
| src/health/index.ts | Memory thresholds: 80%, 95% | Magic numbers |
| src/config/redis.ts | Retry delays: `times * 50, 2000` | Magic numbers |
| docker-compose.yml | Health check intervals: 10s, 30s | Not standardized |

---

## 8. Environment Files Analysis

### .env.example Locations:

| Service | Status |
|---------|--------|
| `/ReZ Full App/.env.example` | Found |
| `/ReZ Full App/rez-auth-service/.env.example` | Found |
| `/ReZ Full App/rez-merchant-service/.env.example` | Found |
| `/rez-intent-graph/.env.example` | Found |

### .gitignore Analysis:

**Good patterns:**
- `.env` and variants are ignored
- Credentials files (.pem, .key, .crt) are ignored
- Build artifacts ignored

**Missing patterns:**
- `docker-compose.override.yml` is explicitly un-ignored (line 25-26)

---

## 9. Recommendations

### Critical (Must Fix Before Production):

1. **Remove hardcoded secrets from docker-compose.yml**
   - Move all JWT secrets, encryption keys, and OAuth secrets to environment variables
   - Set `EXPOSE_DEV_OTP=false` in production

2. **Fix MongoDB hostname mismatch**
   - Change `mongodb://mongodb:27017` to `mongodb://mongodb-primary:27017` in services

3. **Standardize strict mode**
   - Enable `strict: true` and `noImplicitAny: true` in Hotel OTA API

4. **Implement rate limiting on auth service**
   - Add rate limiting middleware similar to rez-intent-graph

### High Priority:

5. **Create shared ESLint/Prettier configuration**
   - Create `@rez/eslint-config` package
   - Create `@rez/prettier-config` package
   - Apply consistently across all services

6. **Implement proper CI/CD pipeline**
   - Add test step before deployment
   - Configure actual deployment commands
   - Add environment-specific secrets

7. **Remove hardcoded Render.com URLs**
   - Create production environment template
   - Document required environment variables

### Medium Priority:

8. **Standardize TypeScript configurations**
   - Use consistent target (recommend ES2022)
   - Use consistent module resolution (recommend NodeNext)
   - Standardize path aliases

9. **Create Dockerfile for rez-travel-service**

10. **Standardize health check implementations**
    - Use consistent intervals
    - Use consistent commands (recommend curl)

---

## 10. Summary

| Category | Status | Issues |
|----------|--------|--------|
| TypeScript Configs | Needs Improvement | Inconsistent strict mode, module resolution, targets |
| Linting/Formatting | Missing | No shared config, inconsistent rules |
| Docker/Containers | Needs Improvement | Hardcoded secrets, hostname mismatch |
| CI/CD | Incomplete | Placeholder commands, no tests |
| Security | Needs Improvement | Hardcoded origins, missing rate limits |
| Application Configs | Good | Proper env var handling in rez-intent-graph |

**Overall Risk Level:** HIGH

Multiple critical security issues (hardcoded secrets) and configuration inconsistencies require resolution before production deployment.

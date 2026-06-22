# @rez/docker - Docker Templates

> Standardized Docker templates for REZ services

## Features

- ✅ Multi-stage builds (smaller images)
- ✅ Non-root user (security)
- ✅ Health checks
- ✅ Resource limits
- ✅ Logging configuration

## Usage

Copy `Dockerfile.template` and `docker-compose.template.yml` to your service.

### Dockerfile

```dockerfile
# Set build args
ARG SERVICE_NAME=my-service
ARG SERVICE_DESCRIPTION=My service
ARG VERSION=1.0.0

# Copy template
COPY node_modules/@rez/docker/Dockerfile.template ./Dockerfile

# Build
docker build --build-arg SERVICE_NAME=my-service .
```

### docker-compose.yml

```yaml
services:
  app:
    build: .
    environment:
      - PORT=3000
```

## Security Features

1. **Non-root user**: Containers run as `nodeuser` (UID 1001)
2. **Minimal image**: Uses `node:20-alpine` (~150MB vs ~1GB)
3. **No secrets in config**: All secrets from env vars
4. **Resource limits**: Prevents DoS within container
5. **Health checks**: Kubernetes/deployment can verify health

## Health Check

The Dockerfile includes a health check that verifies the `/health` endpoint:

```bash
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/health', ...)"
```

## License

Proprietary - RTNM Digital
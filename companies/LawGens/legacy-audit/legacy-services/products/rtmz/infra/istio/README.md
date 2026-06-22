# RTMN Istio Service Mesh

Istio configuration for all 7 RTMN services.

## Services Covered

| Service | K8s Service |
|---------|-------------|
| GraphQL Gateway | graphql-federation.rtmz.svc.cluster.local |
| AutoML Pipeline | automl-pipeline.rtmz.svc.cluster.local |
| Invoice OCR | invoice-ocr.rtmz.svc.cluster.local |
| Contract Management | contract-management.rtmz.svc.cluster.local |
| Legal Document AI | legal-document-ai.rtmz.svc.cluster.local |
| Cosmic Twin | cosmic-twin.rtmz.svc.cluster.local |
| Ranking Service | ranking-service.rtmz.svc.cluster.local |

## Quick Start

```bash
# 1. Install Istio
istioctl install --set values.profile=default -y

# 2. Enable sidecar injection
kubectl label namespace rtmz istio-injection=enabled

# 3. Apply configs
kubectl apply -f istio-operator.yaml
kubectl apply -f mesh-config.yaml

# 4. Apply policies
kubectl apply -f authorization-policies/
kubectl apply -f destination-rules/
kubectl apply -f virtual-services/
kubectl apply -f peer-authentications/
kubectl apply -f telemetry/

# 5. Verify
istioctl analyze
```

## Features

### Traffic Management
- **Circuit Breakers**: Automatic retry, timeout handling
- **Retries**: 3 attempts with 2s timeout
- **Rate Limiting**: Per-service limits

### Security
- **mTLS**: Mutual TLS between all services
- **Authorization Policies**: Fine-grained access control
- **JWT Validation**: Token verification

### Observability
- **Metrics**: Prometheus scraping
- **Tracing**: Jaeger integration
- **Logging**: Access logging

### Load Balancing
- **Algorithms**: ROUND_ROBIN, LEAST_CONN, RANDOM
- **Health Checks**: Automatic outlier detection
- **Connection Pools**: Configurable pool sizes

## Directory Structure

```
istio/
├── istio-operator.yaml          # Istio installation
├── mesh-config.yaml             # Global mesh config
├── authorization-policies/      # Access control
├── destination-rules/           # Load balancing, circuit breakers
├── virtual-services/            # Routing, retries, timeouts
├── peer-authentications/        # mTLS settings
├── telemetry/                   # Metrics, logs, traces
└── grafana-dashboards/          # Pre-built dashboards
```

## Monitoring

```bash
# Kiali dashboard
istioctl dashboard kiali

# Prometheus
istioctl dashboard prometheus

# Grafana
istioctl dashboard grafana

# Jaeger tracing
istioctl dashboard jaeger
```

## License

MIT

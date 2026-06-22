# RTMN Kubernetes Configs

Kubernetes manifests for deploying all 7 new RTMN services.

## Services

| Service | Port | Replicas | Memory | CPU |
|---------|------|----------|--------|-----|
| graphql-federation | 5000 | 2 | 512Mi | 500m |
| automl-pipeline | 5001 | 2 | 2Gi | 2000m |
| invoice-ocr | 5002 | 2 | 1Gi | 1000m |
| contract-management | 5003 | 2 | 512Mi | 500m |
| legal-document-ai | 5004 | 2 | 1Gi | 1000m |
| cosmic-twin | 5005 | 2 | 512Mi | 500m |
| ranking-service | 5006 | 3 | 1Gi | 2000m |

## Quick Start

```bash
# Apply with kubectl
kubectl apply -f REZ-services.yaml

# Or use kustomize
kubectl apply -k .

# Check status
kubectl get pods -n rtmz

# View logs
kubectl logs -n rtmz -l app=graphql-federation
```

## Prerequisites

- Kubernetes 1.25+
- MongoDB 7.0
- Redis 7
- nginx-ingress-controller
- cert-manager (for TLS)

## Configuration

Edit `REZ-services.yaml` to configure:
- Image tags
- Resource limits
- Replica counts
- Environment variables

## Monitoring

Access the [REZ Monitoring Dashboard](https://github.com/imrejaul007/REZ-monitoring-dashboard) to monitor service health.

## Infrastructure

- **MongoDB** - StatefulSet with 10Gi persistent storage
- **Redis** - Deployment for caching
- **Ingress** - Routes /graphql, /automl, /invoice, /contracts, /legal, /twin, /rank

## License

MIT

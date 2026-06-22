# Cloud Deployment Configurations

This directory contains deployment configurations for various cloud platforms.

## Supported Platforms

| Platform | Status | Config Location |
|----------|--------|----------------|
| Google Cloud Run | ✅ Ready | `gcloud-run/` |
| AWS ECS/Fargate | ✅ Ready | `aws/` |
| Azure Container Apps | ✅ Ready | `azure/` |
| Kubernetes (GKE) | ✅ Ready | `k8s/` |

---

## Google Cloud Run

### Prerequisites
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

### Deploy
```bash
cd gcloud-run
./deploy.sh
```

### Files
- `deploy.sh` - Deployment script
- `service.yaml` - Cloud Run service definition
- `cloudbuild.yaml` - Cloud Build pipeline

---

## AWS ECS/Fargate

### Prerequisites
```bash
aws configure
ecs-cli configure --region us-east-1 --cluster hojai-skillnet
```

### Deploy
```bash
cd aws
./deploy.sh
```

### Files
- `deploy.sh` - Deployment script
- `ecs-task-definition.json` - Task definition
- `docker-compose.yml` - ECS Compose configuration

---

## Azure Container Apps

### Prerequisites
```bash
az login
az account set --subscription YOUR_SUBSCRIPTION
```

### Deploy
```bash
cd azure
./deploy.sh
```

### Files
- `deploy.sh` - Deployment script
- `containerapp.yaml` - Container App definition
- `bicep/` - Bicep templates

---

## Environment Variables

Set these in your cloud secret manager:

| Variable | Description |
|----------|-------------|
| MONGODB_URI | MongoDB connection string |
| JWT_SECRET | JWT signing secret (min 32 chars) |
| CORS_ORIGINS | Allowed CORS origins |

---

## Monitoring

### Google Cloud
- Cloud Monitoring: https://console.cloud.google.com/monitoring
- Cloud Logging: https://console.cloud.google.com/logs

### AWS
- CloudWatch: https://console.aws.amazon.com/cloudwatch
- X-Ray: https://console.aws.amazon.com/xray

### Azure
- Application Insights: https://portal.azure.com/#blade/HubsExtension/BrowseResources/resourceType/microsoft.insights%2Fcomponents

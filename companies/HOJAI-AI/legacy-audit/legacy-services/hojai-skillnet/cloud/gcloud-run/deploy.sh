#!/bin/bash
# Google Cloud Run Deployment Script

set -e

PROJECT_ID=${PROJECT_ID:-"your-project-id"}
SERVICE_NAME=${SERVICE_NAME:-"hojai-skillnet"}
REGION=${REGION:-"us-central1"}
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "=== HOJAI SkillNet - Google Cloud Run Deployment ==="
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"

# Build and push Docker image
echo "Building Docker image..."
docker build -t $SERVICE_NAME .

echo "Tagging image..."
docker tag $SERVICE_NAME $IMAGE_NAME

echo "Pushing to Google Container Registry..."
docker push $IMAGE_NAME

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 4530 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10 \
  --concurrency 80 \
  --timeout 60s \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "MONGODB_URI=mongodb-secret:latest,JWT_SECRET=jwt-secret:latest"

echo ""
echo "=== Deployment Complete ==="
echo "Service URL:"
gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)"

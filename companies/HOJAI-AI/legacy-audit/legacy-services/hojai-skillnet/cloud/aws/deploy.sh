#!/bin/bash
# AWS ECS/Fargate Deployment Script

set -e

CLUSTER_NAME=${CLUSTER_NAME:-"hojai-skillnet"}
SERVICE_NAME=${SERVICE_NAME:-"hojai-skillnet-service"}
TASK_FAMILY=${TASK_FAMILY:-"hojai-skillnet-task"}
REGION=${REGION:-"us-east-1"}
ECR_REPOSITORY=${ECR_REPOSITORY:-"hojai-skillnet"}

echo "=== HOJAI SkillNet - AWS ECS Deployment ==="
echo "Cluster: $CLUSTER_NAME"
echo "Region: $REGION"

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create ECR repository if not exists
echo "Creating ECR repository..."
aws ecr create-repository --repository-name $ECR_REPOSITORY --region $REGION || true

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build and tag
IMAGE_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPOSITORY:latest"
echo "Building and tagging image as $IMAGE_URI..."
docker build -t $ECR_REPOSITORY .
docker tag $ECR_REPOSITORY:latest $IMAGE_URI

# Push to ECR
echo "Pushing to ECR..."
docker push $IMAGE_URI

# Register task definition
echo "Registering task definition..."
aws ecs register-task-definition \
  --family $TASK_FAMILY \
  --container-definitions "[{\"name\":\"$SERVICE_NAME\",\"image\":\"$IMAGE_URI\",\"portMappings\":[{\"containerPort\":4530}],\"essential\":true,\"environment\":[{\"name\":\"NODE_ENV\",\"value\":\"production\"}],\"logConfiguration\":{\"logDriver\":\"awslogs\",\"options\":{\"awslogs-group\":\"/ecs/$SERVICE_NAME\",\"awslogs-region\":\"$REGION\",\"awslogs-stream-prefix\":\"ecs\"}}}]" \
  --region $REGION

# Create cluster if not exists
echo "Creating cluster..."
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $REGION || true

# Update service
echo "Updating service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition $TASK_FAMILY \
  --desired-count 2 \
  --region $REGION

echo ""
echo "=== Deployment Complete ==="
echo "Cluster: $CLUSTER_NAME"
echo "Service: $SERVICE_NAME"

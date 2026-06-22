#!/bin/bash
# Azure Container Apps Deployment Script

set -e

RESOURCE_GROUP=${RESOURCE_GROUP:-"hojai-rg"}
LOCATION=${LOCATION:-"eastus"}
CONTAINERAPPS_ENVIRONMENT=${CONTAINERAPPS_ENVIRONMENT:-"hojai-env"}
APP_NAME=${APP_NAME:-"hojai-skillnet"}

echo "=== HOJAI SkillNet - Azure Container Apps Deployment ==="
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"

# Login check
echo "Checking Azure login..."
az account show > /dev/null || az login

# Create resource group
echo "Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Container Apps environment
echo "Creating Container Apps environment..."
az containerapp env create \
  --name $CONTAINERAPPS_ENVIRONMENT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Get ACR credentials
ACR_NAME=${ACR_NAME:-"hojaiacr"}
echo "Logging into ACR..."
az acr login --name $ACR_NAME

# Tag and push image
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer --output tsv)
IMAGE_TAG="$ACR_LOGIN_SERVER/hojai-skillnet:latest"

echo "Building and tagging image..."
docker build -t hojai-skillnet .
docker tag hojai-skillnet:latest $IMAGE_TAG

echo "Pushing to ACR..."
docker push $IMAGE_TAG

# Deploy to Container Apps
echo "Deploying to Container Apps..."
az containerapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINERAPPS_ENVIRONMENT \
  --image $IMAGE_TAG \
  --target-port 4530 \
  --ingress external \
  --cpu 1 \
  --memory 2Gi \
  --min-replicas 1 \
  --max-replicas 10 \
  --env-vars "NODE_ENV=production"

echo ""
echo "=== Deployment Complete ==="
echo "App URL:"
az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" --output tsv

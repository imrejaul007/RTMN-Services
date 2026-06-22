# RTMZ Terraform README

Infrastructure as Code for RTMZ deployment on AWS.

## Prerequisites

- Terraform >= 1.0
- AWS CLI configured
- AWS account with sufficient permissions

## Quick Start

```bash
cd infra/terraform

# Initialize
terraform init

# Plan
terraform plan -var="environment=production"

# Apply
terraform apply -var="environment=production"
```

## What's Created

- VPC with public/private subnets
- Internet Gateway
- Security Groups (ports 80, 443, 4002, 5000, 3030)
- ECS Cluster with Container Insights
- Application Load Balancer
- RDS MongoDB (Atlas recommended instead)
- ElastiCache Redis

## Environment Variables

```bash
# Required
AWS_REGION=us-east-1

# Optional
TF_VAR_environment=production
TF_VAR_db_instance_class=db.t3.large
```

## Notes

- For production, use MongoDB Atlas instead of self-managed RDS
- Redis can use ElastiCache serverless
- Consider ECS Fargate for serverless containers

## Destroy

```bash
terraform destroy -var="environment=production"
```
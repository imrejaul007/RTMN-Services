# RTMZ Terraform - Main Configuration
# Deploy RTMZ on cloud infrastructure

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# Variables
variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# VPC
resource "aws_vpc" "rtmz" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "rtmz-${var.environment}"
    Environment = var.environment
  }
}

# Subnets
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.rtmz.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "rtmz-public"
  }
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.rtmz.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "${var.region}a"

  tags = {
    Name = "rtmz-private"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "rtmz" {
  vpc_id = aws_vpc.rtmz.id

  tags = {
    Name = "rtmz-igw"
  }
}

# Security Groups
resource "aws_security_group" "rtmz" {
  name        = "rtmz-sg"
  description = "Security group for RTMZ services"
  vpc_id      = aws_vpc.rtmz.id

  ingress = [
    {
      description = "HTTP"
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      description = "HTTPS"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      description = "REZ Auth"
      from_port   = 4002
      to_port     = 4002
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      description = "GraphQL"
      from_port   = 5000
      to_port     = 5000
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      description = "Monitoring"
      from_port   = 3030
      to_port     = 3030
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]

  egress = [
    {
      description = "All outbound"
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]

  tags = {
    Name = "rtmz-security-group"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "rtmz" {
  name = "rtmz-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "rtmz-cluster"
  }
}

# Outputs
output "vpc_id" {
  value = aws_vpc.rtmz.id
}

output "cluster_name" {
  value = aws_ecs_cluster.rtmz.name
}

output "security_group_id" {
  value = aws_security_group.rtmz.id
}
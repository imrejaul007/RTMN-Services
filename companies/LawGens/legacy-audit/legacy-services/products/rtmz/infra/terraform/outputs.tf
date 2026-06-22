# RTMZ Terraform Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.rtmz.id
}

output "cluster_arn" {
  description = "ECS Cluster ARN"
  value       = aws_ecs_cluster.rtmz.arn
}

output "security_group_id" {
  description = "Security Group ID"
  value       = aws_security_group.rtmz.id
}

output "subnet_public_id" {
  description = "Public Subnet ID"
  value       = aws_subnet.public.id
}

output "subnet_private_id" {
  description = "Private Subnet ID"
  value       = aws_subnet.private.id
}

output "load_balancer_dns" {
  description = "ALB DNS Name"
  value       = aws_lb.rtmz.dns_name
}
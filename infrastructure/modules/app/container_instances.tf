module "container_instances" {
  source = "../container_instances"

  identifier       = var.app_identifier
  vpc              = var.region.vpc
  instance_subnets = var.region.vpc.private_subnets
  cluster_name     = aws_ecs_cluster.this.name
  max_capacity     = 1
}

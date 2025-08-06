resource "aws_ecs_cluster" "this" {
  name = var.app_identifier

  setting {
    name  = "containerInsights"
    value = "disabled"
  }
}

resource "aws_ecs_task_definition" "this" {
  family                   = var.app_identifier
  network_mode             = "awsvpc"
  requires_compatibilities = ["EC2"]
  container_definitions = jsonencode([
    {
      name  = "app",
      image = "${var.app_image}:latest",
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group  = aws_cloudwatch_log_group.app.name,
          awslogs-region = var.region.aws_region,
        }
      },
      startTimeout = 120,
      healthCheck = {
        command  = ["CMD-SHELL", "wget --server-response --spider --quiet http://localhost:3210 2>&1 | grep '200 OK' > /dev/null"],
        interval = 10,
        retries  = 10,
        timeout  = 5
      },
      essential = true,
      portMappings = [
        {
          containerPort = 3210
        }
      ],
      secrets = [
        {
          name      = "DEVICE_KEY",
          valueFrom = aws_ssm_parameter.device_key.name
        },
        {
          name      = "SMPP_HOST",
          valueFrom = aws_ssm_parameter.smpp_host.name
        },
        {
          name      = "SMPP_USERNAME",
          valueFrom = aws_ssm_parameter.smpp_username.name
        },
        {
          name      = "SMPP_PASSWORD",
          valueFrom = aws_ssm_parameter.smpp_password.name
        },
      ],
      environment = [
        {
          name  = "SMPP_PORT",
          value = var.smpp_port
        }
      ],
      command = [
        "sh",
        "-c",
        "somleng-sms-gateway dummy -k $DEVICE_KEY"
      ]
    }
  ])

  task_role_arn      = aws_iam_role.ecs_task_role.arn
  execution_role_arn = aws_iam_role.task_execution_role.arn
  memory             = module.container_instances.ec2_instance_type.memory_size - 512
}

# Capacity Provider
resource "aws_ecs_capacity_provider" "this" {
  name = var.app_identifier

  auto_scaling_group_provider {
    auto_scaling_group_arn         = module.container_instances.autoscaling_group.arn
    managed_termination_protection = "ENABLED"
    managed_draining               = "ENABLED"

    managed_scaling {
      maximum_scaling_step_size = 1000
      minimum_scaling_step_size = 1
      status                    = "ENABLED"
      target_capacity           = 100
    }
  }
}

resource "aws_ecs_cluster_capacity_providers" "this" {
  cluster_name = aws_ecs_cluster.this.name

  capacity_providers = [
    aws_ecs_capacity_provider.this.name,
    "FARGATE"
  ]
}


resource "aws_ecs_service" "this" {
  name            = var.app_identifier
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.this.name
    weight            = 1
  }

  network_configuration {
    subnets = var.region.vpc.private_subnets
    security_groups = [
      aws_security_group.this.id,
    ]
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  placement_constraints {
    type = "distinctInstance"
  }

  depends_on = [
    aws_iam_role.task_execution_role
  ]

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }
}

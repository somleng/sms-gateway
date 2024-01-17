locals {
  codebuild_identifier = "sms-gateway"
}

data "aws_s3_bucket" "artifacts" {
  bucket = "ci-artifacts.somleng.org"
}

data "aws_iam_policy_document" "codebuild_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["codebuild.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "codebuild" {
  name               = "codebuild-${local.codebuild_identifier}"
  assume_role_policy = data.aws_iam_policy_document.codebuild_assume_role.json
}

data "aws_iam_policy_document" "codebuild" {
  statement {
    effect    = "Allow"

    resources = [
      "arn:aws:logs:*:*:log-group:/aws/codebuild/${local.codebuild_identifier}*",
      "arn:aws:logs:*:*:log-group:/aws/codebuild/${local.codebuild_identifier}*:*"
    ]

    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
  }
}

resource "aws_iam_role_policy" "codebuild" {
  role   = aws_iam_role.codebuild.name
  policy = data.aws_iam_policy_document.codebuild.json
}

resource "aws_iam_role_policy_attachment" "codebuild_ecr_public" {
  role       = aws_iam_role.codebuild.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonElasticContainerRegistryPublicPowerUser"
}

resource "aws_iam_role_policy_attachment" "codebuild_ecr" {
  role       = aws_iam_role.codebuild.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

resource "aws_codebuild_project" "linux_arm64" {
  name           = "${local.codebuild_identifier}-linux-arm64"

  service_role = aws_iam_role.codebuild.arn

  artifacts {
    type = "S3"
    location = data.aws_s3_bucket.artifacts.bucket
    packaging = "NONE"
    namespace_type = "BUILD_ID"
  }

  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    image = "aws/codebuild/amazonlinux2-aarch64-standard:3.0"
    type = "ARM_CONTAINER"
  }

  source {
    type = "GITHUB"
    location = "https://github.com/somleng/sms-gateway.git"
  }
}

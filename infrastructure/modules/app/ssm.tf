resource "aws_ssm_parameter" "device_key" {
  name  = "${var.app_identifier}.device_key"
  type  = "SecureString"
  value = "change-me"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "smpp_host" {
  name  = "${var.app_identifier}.smpp_host"
  type  = "SecureString"
  value = "change-me"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "smpp_username" {
  name  = "${var.app_identifier}.smpp_username"
  type  = "SecureString"
  value = "change-me"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "smpp_password" {
  name  = "${var.app_identifier}.smpp_password"
  type  = "SecureString"
  value = "change-me"

  lifecycle {
    ignore_changes = [value]
  }
}

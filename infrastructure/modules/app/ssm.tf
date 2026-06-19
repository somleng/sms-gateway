resource "aws_ssm_parameter" "gateway_config" {
  name = "${var.app_identifier}.gateway_config"
  type = "SecureString"
  value = jsonencode({
    dummy = {
      deviceKey = "change-me"
      mode      = "dummy"
    }
  })

  lifecycle {
    ignore_changes = [value]
  }
}

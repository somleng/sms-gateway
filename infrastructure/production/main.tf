module "app" {
  source = "../modules/app"

  app_identifier = "sms-gateway"
  app_image      = "somleng/sms-gateway"
  region         = data.terraform_remote_state.core_infrastructure.outputs.hydrogen_region
}

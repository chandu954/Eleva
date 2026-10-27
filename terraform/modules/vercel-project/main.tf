terraform {
  required_version = ">= 1.6.0"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 4.0"
    }
  }
}

resource "vercel_project" "this" {
  name             = var.name
  framework        = var.framework
  root_directory   = var.root_directory
  build_command    = var.build_command
  install_command  = var.install_command
  output_directory = var.output_directory

  git_repository = {
    type              = "github"
    repo              = var.git_repository
    production_branch = var.production_branch
  }
}

resource "vercel_project_environment_variable" "this" {
  for_each = var.environment_variables

  project_id = vercel_project.this.id
  key        = each.key
  value      = each.value.value
  target     = ["production"]
  sensitive  = each.value.sensitive
}

resource "vercel_project_domain" "this" {
  count = var.custom_domain == null ? 0 : 1

  project_id = vercel_project.this.id
  domain     = var.custom_domain
}

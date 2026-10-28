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
  # Only environment variable names become instance keys. The values remain
  # sensitive and are read from the original map below.
  for_each = toset(nonsensitive(keys(var.environment_variables)))

  project_id = vercel_project.this.id
  key        = each.key
  value      = var.environment_variables[each.key].value
  target     = ["production"]
  sensitive  = var.environment_variables[each.key].sensitive
}

resource "vercel_project_domain" "this" {
  count = var.custom_domain == null ? 0 : 1

  project_id = vercel_project.this.id
  domain     = var.custom_domain
}

mock_provider "vercel" {}

run "vercel_project_requires_framework_and_repo" {
  command = plan

  variables {
    name              = "eleva"
    framework         = "nextjs"
    git_repository    = "chandu954/Eleva"
    production_branch = "main"
  }

  assert {
    condition     = vercel_project.this.name == "eleva"
    error_message = "Vercel project name must match var.name."
  }

  assert {
    condition     = length(vercel_project_environment_variable.this) == 0
    error_message = "No environment variables by default."
  }
}

run "vercel_project_optional_custom_domain_is_null" {
  command = plan

  variables {
    name           = "eleva"
    framework      = "nextjs"
    git_repository = "chandu954/Eleva"
    custom_domain  = null
  }

  assert {
    condition     = vercel_project.this.name == "eleva"
    error_message = "Vercel project name must match var.name."
  }
}

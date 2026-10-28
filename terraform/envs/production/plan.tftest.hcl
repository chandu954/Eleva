mock_provider "vercel" {}

mock_provider "upstash" {
  mock_resource "upstash_redis_database" {
    defaults = {
      database_id = "db-test"
      endpoint    = "test.upstash.io"
      rest_token  = "rest-token-test"
    }
  }
}

run "production_configuration_plans_without_credentials" {
  command = plan

  variables {
    vercel_api_token = "test-token"
    upstash_email    = "terraform-test@example.invalid"
    upstash_api_key  = "test-api-key"
  }

  assert {
    condition     = output.vercel_project_name == "eleva"
    error_message = "The production Vercel project name must remain eleva."
  }

  assert {
    condition     = output.custom_domain == null
    error_message = "A production custom domain must remain optional when unset."
  }
}

mock_provider "vercel" {}

mock_provider "upstash" {
  mock_resource "upstash_redis_database" {
    defaults = {
      database_id = "db-staging-test"
      endpoint    = "test.upstash.io"
      rest_token  = "rest-token-test"
    }
  }
}

run "staging_configuration_plans_without_credentials" {
  command = plan

  variables {
    vercel_api_token = "test-token"
    upstash_email    = "terraform-test@example.invalid"
    upstash_api_key  = "test-api-key"
  }

  assert {
    condition     = output.vercel_project_name == "eleva-staging"
    error_message = "The staging Vercel project name must remain eleva-staging."
  }

  assert {
    condition     = output.custom_domain == null
    error_message = "A staging custom domain must remain optional when unset."
  }
}

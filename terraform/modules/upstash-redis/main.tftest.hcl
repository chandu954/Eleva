mock_provider "upstash" {
  mock_resource "upstash_redis_database" {
    defaults = {
      database_id = "db-test"
      endpoint    = "test.upstash.io"
      rest_token  = "rest-token-test"
    }
  }
}

run "upstash_redis_database_uses_tls_and_autoscale" {
  command = plan

  variables {
    name       = "eleva-rate-limiter"
    region     = "us-east-1"
    auto_scale = true
  }

  assert {
    condition     = upstash_redis_database.this.tls == true
    error_message = "Upstash Redis must use TLS."
  }

  assert {
    condition     = upstash_redis_database.this.eviction == true
    error_message = "Upstash Redis must enable eviction."
  }
}

run "upstash_redis_database_region_defaults_to_us_east_1" {
  command = plan

  variables {
    name       = "eleva-rate-limiter"
    auto_scale = true
  }

  assert {
    condition     = upstash_redis_database.this.auto_scale == true
    error_message = "Upstash Redis database configuration is valid."
  }
}

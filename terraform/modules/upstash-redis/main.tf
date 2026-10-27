terraform {
  required_version = ">= 1.6.0"

  required_providers {
    upstash = {
      source  = "upstash/upstash"
      version = "~> 1.5"
    }
  }
}

resource "upstash_redis_database" "this" {
  database_name = var.name
  region        = var.region
  tls           = true
  eviction      = true
  auto_scale    = var.auto_scale
}

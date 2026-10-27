output "database_id" {
  description = "Upstash database ID."
  value       = upstash_redis_database.this.database_id
}

output "endpoint" {
  description = "TLS endpoint for the Redis database."
  value       = upstash_redis_database.this.endpoint
}

output "rest_url" {
  description = "REST URL consumed by the Upstash Redis client."
  value       = "https://${upstash_redis_database.this.endpoint}"
}

output "rest_token" {
  description = "REST token for the Upstash Redis client."
  value       = upstash_redis_database.this.rest_token
  sensitive   = true
}

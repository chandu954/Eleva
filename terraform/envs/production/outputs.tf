output "vercel_project_id" {
  description = "Vercel project ID."
  value       = module.web.project_id
}

output "vercel_project_name" {
  description = "Vercel project name."
  value       = module.web.project_name
}

output "custom_domain" {
  description = "Attached custom domain, if any."
  value       = module.web.domain
}

output "redis_endpoint" {
  description = "Upstash Redis TLS endpoint."
  value       = module.redis.endpoint
}

output "redis_rest_url" {
  description = "Upstash Redis REST URL."
  value       = module.redis.rest_url
}

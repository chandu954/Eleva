output "project_id" {
  description = "Vercel project ID."
  value       = vercel_project.this.id
}

output "project_name" {
  description = "Vercel project name."
  value       = vercel_project.this.name
}

output "domain" {
  description = "Attached custom domain, if any."
  value       = try(vercel_project_domain.this[0].domain, null)
}

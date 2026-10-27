variable "vercel_api_token" {
  description = "Vercel API token with project/environment write access."
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Vercel team ID. Leave null for a personal account."
  type        = string
  default     = null
}

variable "project_name" {
  description = "Vercel project name."
  type        = string
  default     = "eleva"
}

variable "github_repository" {
  description = "GitHub repository linked to the Vercel project (owner/repo)."
  type        = string
  default     = "chandu954/Eleva"
}

variable "production_branch" {
  description = "Branch that Vercel treats as production."
  type        = string
  default     = "main"
}

variable "custom_domain" {
  description = "Optional custom domain to attach to the Vercel project."
  type        = string
  default     = null
}

variable "environment_variables" {
  description = "Production environment variables applied to the Vercel project."
  type = map(object({
    value     = string
    sensitive = optional(bool, true)
  }))
  default   = {}
  sensitive = true
}

variable "upstash_email" {
  description = "Upstash account email."
  type        = string
  sensitive   = true
}

variable "upstash_api_key" {
  description = "Upstash API key."
  type        = string
  sensitive   = true
}

variable "redis_name" {
  description = "Upstash Redis database name."
  type        = string
  default     = "eleva-rate-limiter"
}

variable "redis_region" {
  description = "Upstash region for the rate-limiter database."
  type        = string
  default     = "us-east-1"
}

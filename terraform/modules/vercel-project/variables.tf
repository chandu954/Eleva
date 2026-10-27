variable "name" {
  description = "Vercel project name."
  type        = string
}

variable "framework" {
  description = "Vercel framework preset."
  type        = string
  default     = "nextjs"
}

variable "git_repository" {
  description = "GitHub repository in owner/repo form."
  type        = string
}

variable "production_branch" {
  description = "Branch deployed to production."
  type        = string
  default     = "main"
}

variable "root_directory" {
  description = "Monorepo root directory; null for repository root."
  type        = string
  default     = null
}

variable "build_command" {
  description = "Custom build command."
  type        = string
  default     = null
}

variable "install_command" {
  description = "Custom install command."
  type        = string
  default     = null
}

variable "output_directory" {
  description = "Custom output directory."
  type        = string
  default     = null
}

variable "custom_domain" {
  description = "Optional custom domain."
  type        = string
  default     = null
}

variable "environment_variables" {
  description = "Environment variables applied to the production target."
  type = map(object({
    value     = string
    sensitive = optional(bool, true)
  }))
  default = {}
}

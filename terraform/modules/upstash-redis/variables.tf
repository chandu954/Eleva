variable "name" {
  description = "Upstash Redis database name."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.name))
    error_message = "Redis name must be lowercase alphanumeric with hyphens."
  }
}

variable "region" {
  description = "Upstash region."
  type        = string
  default     = "us-east-1"

  validation {
    condition     = contains(["us-east-1", "us-west-1", "eu-west-1", "ap-southeast-1"], var.region)
    error_message = "Region must be a supported Upstash region."
  }
}

variable "auto_scale" {
  description = "Enable Upstash automatic scaling."
  type        = bool
  default     = true
}

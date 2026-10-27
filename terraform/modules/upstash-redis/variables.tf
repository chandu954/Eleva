variable "name" {
  description = "Upstash Redis database name."
  type        = string
}

variable "region" {
  description = "Upstash region."
  type        = string
  default     = "us-east-1"
}

variable "auto_scale" {
  description = "Enable Upstash automatic scaling."
  type        = bool
  default     = true
}

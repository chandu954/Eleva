module "redis" {
  source = "../../modules/upstash-redis"

  name       = var.redis_name
  region     = var.redis_region
  auto_scale = true
}

module "web" {
  source = "../../modules/vercel-project"

  name              = var.project_name
  framework         = "nextjs"
  git_repository    = var.github_repository
  production_branch = var.production_branch
  custom_domain     = var.custom_domain

  environment_variables = merge(
    var.environment_variables,
    {
      UPSTASH_REDIS_REST_URL = {
        value     = module.redis.rest_url
        sensitive = false
      }
      UPSTASH_REDIS_REST_TOKEN = {
        value     = module.redis.rest_token
        sensitive = true
      }
    },
  )
}

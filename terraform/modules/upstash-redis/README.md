# upstash-redis module

Provisions a single Upstash Redis database for rate limiting.

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.6.0 |
| upstash | ~> 1.5 |

## Providers

| Name | Version |
|------|---------|
| upstash | ~> 1.5 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| upstash_redis_database.this | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| auto_scale | Enable Upstash automatic scaling. | `bool` | `true` | no |
| name | Upstash Redis database name. | `string` | n/a | yes |
| region | Upstash region. | `string` | `"us-east-1"` | no |

## Outputs

| Name | Description |
|------|-------------|
| database_id | Upstash database ID. |
| endpoint | TLS endpoint for the Redis database. |
| rest_url | REST URL consumed by the Upstash Redis client. |
| rest_token | REST token for the Upstash Redis client. |

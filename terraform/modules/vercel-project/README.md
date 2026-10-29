# vercel-project module

Provisions a Vercel project with environment variables and an optional custom domain.

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.6.0 |
| vercel | ~> 4.0 |

## Providers

| Name | Version |
|------|---------|
| vercel | ~> 4.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| vercel_project.this | resource |
| vercel_project_environment_variable.this | resource |
| vercel_project_domain.this | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| build_command | Custom build command. | `string` | `null` | no |
| custom_domain | Optional custom domain. | `string` | `null` | no |
| environment_variables | Environment variables applied to the production target. | `map(object({ value = string, sensitive = optional(bool, true) }))` | `{}` | no |
| framework | Vercel framework preset. | `string` | `"nextjs"` | no |
| git_repository | GitHub repository in owner/repo form. | `string` | n/a | yes |
| install_command | Custom install command. | `string` | `null` | no |
| name | Vercel project name. | `string` | n/a | yes |
| output_directory | Custom output directory. | `string` | `null` | no |
| production_branch | Branch deployed to production. | `string` | `"main"` | no |
| root_directory | Monorepo root directory; null for repository root. | `string` | `null` | no |

## Outputs

| Name | Description |
|------|-------------|
| domain | Attached custom domain, if any. |
| project_id | Vercel project ID. |
| project_name | Vercel project name. |

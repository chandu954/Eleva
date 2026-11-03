# Terraform module reuse

## Reused modules

| Local module | Staging | Production | Purpose |
| --- | --- | --- | --- |
| `modules/vercel-project` | `envs/staging/main.tf` | `envs/production/main.tf` | Vercel project, GitHub link, environment variables, optional custom domain |
| `modules/upstash-redis` | `envs/staging/main.tf` | `envs/production/main.tf` | Upstash Redis database and TLS endpoint |

Both environment roots compose the same two local modules. The root files
repeat provider configuration and environment-specific inputs so each
workspace keeps its own state and credentials. There are no Terraform Registry
or remote Git modules in this repository.

## Versioning policy

Terraform does not accept a `version` argument for a local `source` path.
Those modules therefore move with the repository revision. Provider ranges and
the Terraform CLI minimum are declared in each module and root; each
environment's committed `.terraform.lock.hcl` pins the exact provider builds.
When a module needs a change, update both environment compositions in the same
review and keep their test fixtures aligned.

## Current duplication

The staging and production `main.tf`, `variables.tf`, `outputs.tf`, and
`versions.tf` files intentionally repeat the same composition and provider
constraints. Their differences are limited to the backend state key and the
environment-specific variable files. This keeps state boundaries visible
without introducing another wrapper module that only forwards values.

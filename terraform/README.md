# Terraform layout

Infrastructure for the Eleva production deployment is managed as code. The
stack is intentionally small: it owns the Vercel project/environment and the
Upstash Redis database used by the rate limiter. Application data (Supabase)
lives in its own managed project and is referenced through environment
variables rather than provisioned here.

```
terraform/
├── modules/
│   ├── vercel-project/   # Vercel project, git link, env vars, custom domain
│   └── upstash-redis/    # Upstash Redis database + TLS endpoint
└── envs/
    └── production/       # Production composition + example variables
```

## Bootstrap

```bash
cd terraform/envs/production
cp terraform.tfvars.example terraform.tfvars   # fill in real values
export VERCEL_API_TOKEN=...
export UPSTASH_EMAIL=...
export UPSTASH_API_KEY=...
terraform init
terraform plan
terraform apply
```

The production stack uses local state by default. For team use, copy
`backend.tf.example` to `backend.tf`, fill in the S3/DynamoDB (or Terraform
Cloud) values, and re-run `terraform init -migrate-state`.

## CI

`.github/workflows/ci.yml` runs on every PR/push:

- `terraform fmt -check -recursive`
- `terraform init -backend=false`
- `terraform validate`
- `tflint` with the recommended ruleset
- Checkov policy scan (`framework: terraform`)

A read-only `terraform plan` runs when the `TERRAFORM_PLAN_ENABLED` repository
variable is `true` and the provider credentials are available as secrets. Plan
uses `-refresh=false`, so it never reads or mutates live resources during a
pull request.

## Modules

- `vercel-project` — creates a Vercel project, links the GitHub repository,
  applies environment variables (sensitive by default), and optionally attaches
  a custom domain.
- `upstash-redis` — creates a single-region Redis database over TLS and exposes
  the REST URL/token for the rate limiter.

Both modules are versionless on purpose (local path sources); the production
composition is the only caller and pins provider versions in `versions.tf`.

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
    └── production/       # Shared composition + isolated staging/prod state
```

## Remote state bootstrap

Create a private S3 bucket before initializing the stack. Turn on versioning,
default encryption and Block Public Access, and grant CI a role scoped to this
bucket's `eleva/*` state and lock files. Terraform 1.10+ uses the S3 native
lockfile (`use_lockfile = true`). The backend takes bucket and region at init
time so no account-specific values are committed:

```bash
cd terraform/envs/production
export TF_STATE_BUCKET=your-private-state-bucket
export TF_STATE_REGION=us-east-1
terraform init -backend-config="bucket=$TF_STATE_BUCKET" \
  -backend-config="region=$TF_STATE_REGION" \
  -backend-config="key=terraform.tfstate" \
  -backend-config="workspace_key_prefix=eleva" \
  -backend-config="encrypt=true" -backend-config="use_lockfile=true"
terraform workspace select production || terraform workspace new production
```

The `production` and `staging` workspaces store state at
`eleva/production/terraform.tfstate` and `eleva/staging/terraform.tfstate`.
Create ignored `staging.tfvars` from `staging.tfvars.example` and
`production.tfvars` from `terraform.tfvars.example`; add environment-specific
Vercel/Upstash values and unique project/Redis names. If production already has
local state, save `terraform state pull` to a temporary file before switching
backends, initialize with `-reconfigure`, select/create the `production`
workspace, and push the saved state with `terraform state push`. Review the
plan before any apply.

Protect the GitHub `production` Environment with required reviewers. Dispatch
`Terraform apply` and select the environment only after reviewing the plan.
The daily drift workflow plans both workspaces and opens an issue on drift; it
never applies changes. Do not use `-lock=false` for an apply.

## CI

`.github/workflows/ci.yml` runs on every PR/push:

- `terraform fmt -check -recursive`
- `terraform init -backend=false`
- `terraform validate`
- `tflint` with the recommended ruleset
- Checkov policy scan (`framework: terraform`)

The remote workflows use separate GitHub Environments named `staging`,
`production`, `staging-plan`, and `production-plan`. Configure the Terraform
variables and secrets listed in [the operations runbook](../docs/operations/runbook.md).

## Modules

- `vercel-project` — creates a Vercel project, links the GitHub repository,
  applies environment variables (sensitive by default), and optionally attaches
  a custom domain.
- `upstash-redis` — creates a single-region Redis database over TLS and exposes
  the REST URL/token for the rate limiter.

Both modules are versionless on purpose (local path sources); the production
composition is the only caller and pins provider versions in `versions.tf`.

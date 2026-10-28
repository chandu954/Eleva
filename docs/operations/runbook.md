# Operations runbook

## Configuration

Set these repository or GitHub Environment values before enabling operations workflows:

- Repository variable `APP_URL`: production origin, without a trailing slash.
- GitHub Environment variables `TF_STATE_BUCKET`, `TF_STATE_REGION`,
  `TF_PROJECT_NAME`, `TF_GITHUB_REPOSITORY`, `TF_PRODUCTION_BRANCH`,
  `TF_CUSTOM_DOMAIN`, `TF_VERCEL_TEAM_ID`, `TF_REDIS_NAME`, and
  `TF_REDIS_REGION` for `staging`, `production`, `staging-plan`, and
  `production-plan`. Use unique project and Redis names per environment.
- Environment secrets `VERCEL_API_TOKEN`, `UPSTASH_EMAIL`, `UPSTASH_API_KEY`,
  and `TF_ENVIRONMENT_VARIABLES_JSON` for the same environments. The JSON
  secret must be a Terraform-compatible map of Vercel environment values. Give
  the `*-plan` tokens read-only provider access where the provider supports it.
- Configure required reviewers and allowed branches on `staging` and
  `production`; leave `staging-plan` and `production-plan` unprotected so
  scheduled drift checks run without approval. The apply workflow shows a plan
  summary before its protected apply job asks for approval.
- For local operation, copy the `.tfvars.example` files to ignored
  environment-specific tfvars and replace every placeholder.

Bootstrap the state bucket outside this stack before its first initialization.
Enable bucket versioning, default encryption, public access blocking, and a
least-privilege IAM role limited to `eleva/*` plus S3 lockfile operations. Then
initialize each state by running `terraform init` with the same backend values
used by CI, select the matching workspace, and import any resources that are
already owned by the cloud accounts. If production already has local state,
migrate it by pulling state locally, reconfiguring the backend, creating the
production workspace, and pushing the saved state. Review a plan before
applying. Never commit state files or real tfvars.

## Sentry

Set `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` and `SENTRY_DSN` in the
deployment environment. Include `SENTRY_AUTH_TOKEN` in
`TF_ENVIRONMENT_VARIABLES_JSON` so Vercel builds can authenticate. The token
needs release creation and source map upload permissions for this project only.
`next.config.ts` uploads maps only when this token is present, then removes the
maps from the deployment. Runtime instrumentation captures errors and 10% of transactions.
The client replay integration samples 10% of sessions and all sampled errors.

Create these Sentry issue alerts for the production project and route them to
the on-call channel:

1. Any new issue with at least 5 events in 5 minutes, grouped by issue.
2. A regression or new issue with at least 1 event in 5 minutes.
3. A fatal/unhandled issue with at least 1 event in 1 minute.

Use a 5-minute recovery window and notify the team channel and on-call owner.
Create a metric alert for transaction p95 above 2.5 seconds for 10 minutes
when there are at least 20 transactions. Confirm release and environment tags
are present before turning the alerts on.

## Uptime and drift

`uptime.yml` checks `/api/health` every 10 minutes and creates or updates an
incident issue on failure. `terraform-drift.yml` plans staging and production
daily without applying changes; drift opens a GitHub issue and fails the run.
Investigate the plan before using the protected manual apply workflow.

## Rollback

### Application release

1. Check Sentry for the first affected release, route, and error rate. Pause a
   rollout if one is still running.
2. In Vercel, promote the last healthy deployment for the affected environment
   using the deployment rollback action. Confirm `/api/health` returns success.
3. Reproduce the issue against the bad release, then revert or fix the source
   change in Git and deploy through the normal review path.
4. If the incident involved a database migration, prefer a forward corrective
   migration. Do not roll back destructive schema changes without a verified
   backup and a tested restoration plan.

### Infrastructure change

1. Save the failed workflow run and inspect the Terraform plan and provider
   events. Do not delete or edit the remote state object to force a rollback.
2. Revert the responsible configuration commit, review its plan, and run the
   protected apply workflow for the affected workspace.
3. If state locking remains after a confirmed dead runner, verify no apply is
   active, then use `terraform force-unlock` only with the lock ID from the
   error and record the operator and reason in the incident.
4. Check Vercel, Upstash, Sentry, and `/api/health`; close the incident after
   the service is healthy and drift is resolved.

# Score Baseline — Eleva (as of 2026-11-01)

## Overall
- Score: 78.0 (frontend 76.9, infra 67.8)
- Volume: 58.6, Lines of code: 89,446
- Commit count: 197

## Commit History
- Total commits: 197
- Top authors:
  - Ashish Chandan <ashishchandan669@gmail.com>: 202
  - dependabot[bot]: 34
  - Ashish Chandan Lang <ashish.chandan@dypic.in>: 1

## Largest 15 Source Files (by LOC)
| File | LOC |
|------|-----|
| src/app/admin/components/users-table.test.tsx | 500 |
| src/app/eleva/cover-letters/page.test.tsx | 498 |
| src/app/eleva/api/studio/pipeline/route.ts | 497 |
| src/components/dashboard/resumes-section.test.tsx | 491 |
| src/app/eleva/prompt-studio/_components/prompt-editor.test.tsx | 484 |
| src/components/resume/management/dialogs/create-base-resume-form.tsx | 478 |
| src/lib/eleva-ai-provider.test.ts | 472 |
| src/lib/ai/provider/providers/providers.contracts.test.ts | 468 |
| src/app/eleva/studio/studio-client.pipeline.test.tsx | 464 |
| src/app/eleva/editor/page.tsx | 461 |
| src/lib/ai/provider/providers.providers.test.ts | 458 |
| src/components/resume/editor/forms/projects/project-card.tsx | 457 |
| src/components/resume/assistant/chatbot.tsx | 451 |
| src/components/resume/editor/forms/document-settings-form.tsx | 440 |

## Dependency Health
- Direct runtime deps: ~76
- Direct dev deps: ~34
- Transitive deps: ~1,392
- Audit: 17 vulnerabilities (2 low, 12 moderate, 1 high, 2 critical — 3 ignored)
- Outdated packages: 18+ minor/patch bumps available

## CI Workflows
- ci.yml — lint, typecheck, architecture, dead-code, duplication, unit tests, coverage, offline check
- codeql.yml — CodeQL security scanning
- dependency-freshness.yml — weekly dependency freshness
- docker-publish.yml — Docker image build
- helm-publish.yml — Helm chart publishing
- release.yml — GitHub release on tags
- scorecard.yml — OpenSSF Scorecard
- security.yml — Sentry + SBOM scans
- terraform-apply.yml — Terraform fmt/validate/test/TFLint/Checkov
- terraform-drift.yml — Terraform drift detection
- uptime.yml — Uptime monitoring

## Test Coverage
- Test spec files: 181
- Test:source ratio: 1:4
- Coverage thresholds: 75.2 statements / 85 branches / 82.5 functions / 75.2 lines

## Git Tags
- v1.0.0-beta, v1.1.0, v1.2.0, v1.3.0, v1.3.1

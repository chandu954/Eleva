## Upstream disclosure — Eleva listing

**Upstream project:** Eleva began as a derivative of [ResumeLM](https://github.com/olyaiy/resume-lm), an AGPL-3.0-licensed project.

**License:** Eleva is distributed under the GNU Affero General Public License v3 (AGPL-3.0). The full license text and upstream copyright notices are preserved in `LICENSE.md` at the repository root.

**What is inherited from ResumeLM:**
- Docker Compose service layout (`resumelm-*` containers and network)
- Supabase integration and resume data model
- Stripe checkout, portal, and webhook subscription handling
- Resume scoring and tailoring pipeline foundation
- Helm chart directory (`helm/resumelm`), keeping the historical `resumelm` name because CI workflows, Docker Compose service names, and Helm template references depend on it

**What Eleva adds independently:**
- Honest-AI constraints in the resume tailoring pipeline (refuses to fabricate unsupported experience; rewrites restructure only supported facts)
- LLM provider routing with fallback and rate-limit failover across multiple providers
- Offline-safe unit test suite with fetch guard, sandboxed CI re-run, and coverage ratchet (75.2/85/82.5/75.2 enforced in CI)
- Terraform for Vercel and Upstash infrastructure as code, with staged environments and tflint/Checkov validation
- Structured JSON logging, Sentry error tracking, `/api/health` endpoint, Zod API validation, and CSP security headers

**Attribution:** Upstream attribution is preserved in `README.md` (Acknowledgements section) and `LICENSE.md`. Inherited functionality is not described as entirely original.

**Important:** AGPL-3.0 is a strong copyleft network-use license. Derivative works must remain under AGPL-3.0, and source code must be made available to users interacting with the software over a network. This affects what rights a purchaser can receive. We recommend legal review of AGPL obligations for your specific distribution and hosting model before purchase.

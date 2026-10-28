# HTTP API reference

The source route handler is the contract for each endpoint. There is no
generated OpenAPI schema yet; this page indexes the route groups and their
authentication expectations without duplicating request/response schemas that
can drift from the implementation.

## Health and billing

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health probe used by uptime checks. |
| POST | `/api/webhooks/stripe` | Stripe-signed subscription events. |

## Resume and career workspace

| Method | Path | Purpose |
| --- | --- | --- |
| GET, POST, PATCH, DELETE | `/eleva/api/applications` | Read and manage application records. |
| POST | `/eleva/api/chat` | Resume assistant conversation. |
| POST | `/eleva/api/export/cover-letter` | Export a cover letter as PDF. |
| POST | `/eleva/api/export/cover-letter-docx` | Export a cover letter as DOCX. |
| POST | `/eleva/api/export/resume` | Export a resume as PDF. |
| POST | `/eleva/api/export/resume-docx` | Export a resume as DOCX. |
| POST | `/eleva/api/export/resume-preview` | Render a resume PDF preview. |
| GET, POST | `/eleva/api/prompts` | Read and create prompt records. |
| POST | `/eleva/api/prompts/run` | Run a saved prompt. |
| POST | `/eleva/api/resumes/import` | Import resume content. |
| GET | `/eleva/api/search` | Search workspace content. |
| POST | `/eleva/api/studio/pipeline` | Tailor a resume to a job description. |
| POST | `/eleva/api/templates/apply` | Apply a resume template. |
| POST | `/eleva/api/tool/ats/add-keyword` | Add a keyword suggestion. |
| POST | `/eleva/api/tool/draft` | Draft resume content. |
| POST | `/eleva/api/tool/rewrite` | Rewrite resume content. |
| POST | `/eleva/api/tool/score` | Score a resume against a job description. |

## Prompt Studio

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/eleva/prompt-studio/api` | Read Prompt Studio data. |
| POST | `/eleva/prompt-studio/api/optimize` | Optimize a prompt. |

The legacy `/api/chat` route is also present for chat requests. For exact
methods, validation, auth, and error responses, inspect the corresponding
`route.ts` file in `src/app/`. Authenticated routes use the server-side session
and enforce user access in the handler or underlying data layer. Never treat
client-supplied ownership identifiers as authorization.

## Error behavior

Handlers validate untrusted payloads before calling domain logic. They return
HTTP error statuses for validation, authentication, authorization, provider,
and server failures. Responses should contain actionable safe messages; raw
database/provider exception text belongs in server logs, not client responses.

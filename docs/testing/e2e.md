# End to end test setup

The Playwright suite runs against a local production build. With no E2E account
credentials, Playwright starts the in-memory Supabase service in
`scripts/e2e/mock-supabase.mjs` and uses an in-memory Redis stub. The mock
supports sign-in, the dashboard's
empty data state, and creation of a temporary blank resume for the editor
accessibility scan. The test deletes the resume afterward. No external account
or database is needed for `pnpm test:e2e` or `pnpm check:offline`.

To run the authenticated checks against a real disposable Supabase project,
configure all of these values in the local environment or as CI secrets:

- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_ANON_KEY`
- `E2E_SUPABASE_SERVICE_ROLE_KEY`
- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`

The optional studio tailoring, cover letter, and PDF export journey runs only
when those account settings are present and `E2E_AI_TESTS=true`. Keep that
account disposable and configure app AI access; tests create a resume and
delete it after the journey.

The landing screenshot reference is `src/e2e/__screenshots__/landing.png` and
is checked on every run. Update it intentionally with:

```bash
pnpm exec playwright test src/e2e/accessibility-visual.e2e.test.ts --update-snapshots
```

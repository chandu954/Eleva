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

The landing screenshot reference is platform-specific:
`src/e2e/__screenshots__/landing-<platform>.png` (currently `landing-darwin.png`
for macOS and `landing-linux.png` for CI). Chromium font antialiasing differs
between operating systems, so the suite selects the file with
`process.platform` instead of using a broad pixel tolerance. Update the
snapshot for your platform intentionally with:

```bash
pnpm exec playwright test src/e2e/accessibility-visual.e2e.test.ts --update-snapshots
```

When the page changes, regenerate both files: run the command above on macOS,
then download the Linux actual from the Playwright report artifact on a failing
CI run (or run the suite in the Linux container) and commit both snapshots
together.

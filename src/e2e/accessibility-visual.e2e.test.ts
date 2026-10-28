import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
import { readFileSync } from 'node:fs';

const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;
const hasTestSupabase = Boolean(
  process.env.E2E_SUPABASE_URL &&
  process.env.E2E_SUPABASE_ANON_KEY &&
  process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
);
const hasTestLogin = Boolean(email && password && hasTestSupabase);
const hasTestAI = process.env.E2E_AI_TESTS === 'true' && hasTestLogin;

type AxeResult = {
  violations: Array<{
    id: string;
    impact: string | null;
    description: string;
    nodes: Array<{ target: string[]; failureSummary?: string }>;
  }>;
};

async function expectNoSeriousA11yIssues(page: Page) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => {
    const axe = (window as Window & {
      axe?: { run: (context: Document) => Promise<AxeResult> };
    }).axe;
    if (!axe) throw new Error('axe-core did not load');
    return axe.run(document);
  });
  const serious = result.violations.filter((violation) =>
    violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

async function signIn(page: Page) {
  await page.goto('/eleva/auth/login');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/eleva\/dashboard/, { timeout: 20_000 });
}

async function importResumeFromText(page: Page, role: string) {
  await page.goto('/home');
  await page.getByRole('button', { name: 'Create Base Resume' }).click();
  await page.getByLabel(/Target Role/).fill(role);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('radio', { name: /Import Resume/ }).check();
  await page.getByPlaceholder('Or paste your resume text here...').fill(
    'Alex Morgan\nSoftware Engineer\nBuilt reliable TypeScript services and improved API response times by 35%.\nSkills: TypeScript, React, Node.js, PostgreSQL.',
  );
  await page.getByRole('button', { name: 'Create Resume' }).click();
  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]+/i, { timeout: 30_000 });
  return new URL(page.url()).pathname.split('/').at(-1)!;
}

async function withResumeFixture<T>(page: Page, request: APIRequestContext, run: (resumeId: string) => Promise<T>) {
  let resumeId: string | undefined;
  try {
    resumeId = await importResumeFromText(page, 'Playwright Snapshot Engineer');
    return await run(resumeId);
  } finally {
    if (resumeId && process.env.E2E_SUPABASE_URL && process.env.E2E_SUPABASE_SERVICE_ROLE_KEY) {
      await deleteResumeFixture(request, resumeId);
    }
  }
}

test.describe('accessibility and visual regression', () => {
  test('landing and auth pages have no serious axe violations; landing snapshot is stable', async ({ page }) => {
    await page.goto('/eleva');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot('landing.png');
    await expectNoSeriousA11yIssues(page);

    await page.goto('/eleva/auth/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expectNoSeriousA11yIssues(page);
  });

  test('dashboard has no serious axe violations for the authenticated test user', async ({ page }) => {
    test.skip(!hasTestLogin, 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD for authenticated page scans.');
    await signIn(page);
    await page.goto('/eleva/dashboard');
    await expect(page.getByRole('main')).toBeVisible();
    await expectNoSeriousA11yIssues(page);
  });

  test('editor has no serious axe violations and matches its visual snapshot', async ({ page, request }) => {
    test.skip(!hasTestLogin, 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD for authenticated editor scans.');
    await signIn(page);
    await withResumeFixture(page, request, async () => {
      await expect(page.getByPlaceholder('First Name')).toBeVisible();
      await expect(page).toHaveScreenshot('editor.png');
      await expectNoSeriousA11yIssues(page);
    });
  });
});

test('authenticated journey: login, import resume, tailor in studio, create cover letter, export PDF', async ({ page, request }) => {
  test.skip(!hasTestLogin || !hasTestAI, 'Set E2E_TEST_EMAIL, E2E_TEST_PASSWORD, and E2E_AI_TESTS=true to run the integration journey.');

  await signIn(page);
  await withResumeFixture(page, request, async () => {
    await page.goto('/eleva/studio');
    await page.getByPlaceholder('Paste the job description here…').fill(
      'We are hiring a Software Engineer with TypeScript, React, Node.js, PostgreSQL, API design, and clear communication skills.',
    );
    await page.getByRole('button', { name: /Analyze Job/ }).click();
    await expect(page.getByText('Application Ready')).toBeVisible({ timeout: 120_000 });

    await page.getByRole('tab', { name: 'Cover Letter' }).click();
    await expect(page.getByText(/Dear .*|Sincerely|Best regards/i).first()).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /PDF/ }).last().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });
});

async function deleteResumeFixture(request: APIRequestContext, resumeId: string) {
  const response = await request.delete(
    `${process.env.E2E_SUPABASE_URL}/rest/v1/resumes?id=eq.${encodeURIComponent(resumeId)}`,
    {
      headers: {
        apikey: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.E2E_SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal',
      },
    },
  );
  expect(response.ok(), `Could not clean up resume fixture ${resumeId}`).toBe(true);
}

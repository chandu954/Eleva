import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { e2eConfig } from './e2e-config';

const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

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
  await page.getByLabel('Email').fill(e2eConfig.email);
  await page.getByLabel('Password', { exact: true }).fill(e2eConfig.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/eleva\/dashboard/, { timeout: 20_000 });
}

async function createResumeForEditor(page: Page, role: string) {
  await page.goto('/home');
  await page.getByRole('button', { name: 'Create Base Resume' }).click();
  await page.getByLabel(/Target Role/).fill(role);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByText('Start Fresh', { exact: true }).click();
  await expect(page.getByRole('radio', { name: /Start Fresh/ })).toBeChecked();
  await page.getByRole('button', { name: 'Create Resume' }).click();
  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]+/i, { timeout: 30_000 });
  return new URL(page.url()).pathname.split('/').at(-1)!;
}

async function importResumeForJourney(page: Page, role: string) {
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

async function withResumeFixture<T>(
  page: Page,
  request: APIRequestContext,
  run: (resumeId: string) => Promise<T>,
  createFixture = createResumeForEditor,
) {
  let resumeId: string | undefined;
  try {
    resumeId = await createFixture(page, 'Playwright Snapshot Engineer');
    return await run(resumeId);
  } finally {
    if (resumeId) {
      await deleteResumeFixture(request, resumeId);
    }
  }
}

test.describe('accessibility and visual regression', () => {
  test('landing and auth pages have no serious axe violations; landing snapshot is stable', async ({ page }) => {
    await page.goto('/eleva');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot(`landing-${process.platform}.png`);
    await expectNoSeriousA11yIssues(page);

    await page.goto('/eleva/auth/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expectNoSeriousA11yIssues(page);
  });

  test('dashboard has no serious axe violations for the authenticated test user', async ({ page }) => {
    await signIn(page);
    await page.goto('/eleva/dashboard');
    await expect(page.getByRole('main').first()).toBeVisible();
    await expectNoSeriousA11yIssues(page);
  });

  test('editor has no serious axe violations for an authenticated resume', async ({ page, request }) => {
    await signIn(page);
    await withResumeFixture(page, request, async () => {
      await expect(page.getByPlaceholder('First Name')).toBeVisible();
      await expectNoSeriousA11yIssues(page);
    });
  });
});

test('authenticated journey: login, import resume, tailor in studio, create cover letter, export PDF', async ({ page, request }) => {
  test.skip(!e2eConfig.hasTestAI, 'Configure a disposable E2E Supabase account and set E2E_AI_TESTS=true to run the live integration journey.');

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
  }, importResumeForJourney);
});

async function deleteResumeFixture(request: APIRequestContext, resumeId: string) {
  const response = await request.delete(
    `${e2eConfig.supabaseUrl}/rest/v1/resumes?id=eq.${encodeURIComponent(resumeId)}`,
    {
      headers: {
        apikey: e2eConfig.supabaseServiceRoleKey,
        Authorization: `Bearer ${e2eConfig.supabaseServiceRoleKey}`,
        Prefer: 'return=minimal',
      },
    },
  );
  expect(response.ok(), `Could not clean up resume fixture ${resumeId}`).toBe(true);
}

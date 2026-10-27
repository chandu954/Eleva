import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const headerState = vi.hoisted(() => ({ values: {} as Record<string, string> }));
const cookieState = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock('next/headers', () => ({
  headers: async () => ({
    get: (key: string) => headerState.values[key] ?? null,
  }),
  cookies: async () => ({
    get: (name: string) =>
      cookieState.value ? { name, value: cookieState.value } : undefined,
  }),
}));

vi.mock('next/link', async () => {
  const React = await import('react');
  return {
    default: ({
      href,
      children,
      ...rest
    }: {
      href?: string;
      children?: React.ReactNode;
    } & Record<string, unknown>) => React.createElement('a', { href, ...rest }, children),
  };
});

const supabaseMock = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: supabaseMock.getUser },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: supabaseMock.maybeSingle }),
      }),
    }),
  }),
}));

vi.mock('sonner', async () => {
  const React = await import('react');
  return {
    Toaster: () => React.createElement('div', { 'data-testid': 'toaster' }),
  };
});

vi.mock('@/components/layout/footer', async () => {
  const React = await import('react');
  return { Footer: () => React.createElement('footer', { 'data-testid': 'footer' }) };
});

vi.mock('@/components/layout/app-header', async () => {
  const React = await import('react');
  return {
    AppHeader: (props: Record<string, unknown>) =>
      React.createElement('header', {
        'data-testid': 'app-header',
        'data-show-upgrade': String(props.showUpgradeButton),
        'data-pro': String(props.isProPlan),
        'data-variant': String(props.upgradeButtonVariant),
      }),
  };
});

vi.mock('@/components/analytics/posthog-provider', async () => {
  const React = await import('react');
  return {
    PostHogProvider: ({ user, children }: { user?: unknown; children?: React.ReactNode }) =>
      React.createElement(
        'div',
        { 'data-testid': 'posthog', 'data-user': JSON.stringify(user) },
        children,
      ),
  };
});

vi.mock('@/components/analytics/posthog-pageview', async () => {
  const React = await import('react');
  return {
    PostHogPageView: () => React.createElement('div', { 'data-testid': 'pageview' }),
  };
});

const impersonationMock = vi.hoisted(() => ({ state: null as unknown }));

vi.mock('@/lib/impersonation', () => ({
  IMPERSONATION_STATE_COOKIE_NAME: 'eleva-impersonation',
  parseImpersonationStateCookieValue: () => impersonationMock.state,
}));

const accessMock = vi.hoisted(() => ({
  state: {
    hasProAccess: false,
    needsTrial: false,
    effectivePlan: 'free',
  } as {
    hasProAccess: boolean;
    needsTrial: boolean;
    effectivePlan: string;
  },
}));

vi.mock('@/lib/subscription-access', () => ({
  getSubscriptionAccessState: () => accessMock.state,
}));

import RootLayout, { metadata, viewport } from './layout';

async function renderLayout(child = 'page content') {
  // RootLayout is an async server component, so await it before rendering.
  const ui = await RootLayout({ children: <div>{child}</div> });
  return renderToStaticMarkup(ui);
}

describe('RootLayout', () => {
  beforeEach(() => {
    headerState.values = {};
    cookieState.value = undefined;
    impersonationMock.state = null;
    accessMock.state = { hasProAccess: false, needsTrial: false, effectivePlan: 'free' };
    supabaseMock.getUser.mockReset();
    supabaseMock.maybeSingle.mockReset();
  });

  it('renders the document shell for signed-out visitors', async () => {
    headerState.values['x-pathname'] = '/home';
    supabaseMock.getUser.mockResolvedValue({ data: { user: null } });

    const html = await renderLayout();

    expect(html).toContain('<html lang="en">');
    expect(html).toContain('page content');
    expect(html).toContain('data-testid="posthog"');
    expect(html).toContain('data-user="null"');
    expect(html).toContain('data-testid="toaster"');
    expect(html).not.toContain('data-testid="app-header"');
    expect(html).not.toContain('data-testid="footer"');
    expect(html).not.toContain('Impersonating');
  });

  it('shows the app header, footer and impersonation banner for a pro user', async () => {
    headerState.values['x-pathname'] = '/home';
    supabaseMock.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'ada@example.com' } },
    });
    supabaseMock.maybeSingle.mockResolvedValue({
      data: {
        subscription_plan: 'pro',
        subscription_status: 'active',
        current_period_end: '2027-01-01',
        trial_end: null,
        stripe_subscription_id: 'sub_1',
      },
    });
    accessMock.state = { hasProAccess: true, needsTrial: false, effectivePlan: 'pro' };
    impersonationMock.state = { adminId: 'admin-1' };
    cookieState.value = 'opaque';

    const html = await renderLayout();

    expect(html).toContain('data-testid="app-header"');
    expect(html).toContain('data-show-upgrade="false"');
    expect(html).toContain('data-pro="true"');
    expect(html).toContain('data-variant="upgrade"');
    expect(html).toContain('data-testid="footer"');
    expect(html).toContain('Impersonating');
    expect(html).toContain('ada@example.com');
    expect(html).toContain('href="/stop-impersonation"');
    expect(html).toContain(
      'data-user="{&quot;id&quot;:&quot;user-1&quot;,&quot;subscriptionPlan&quot;:&quot;pro&quot;,&quot;subscriptionStatus&quot;:&quot;active&quot;,&quot;isPro&quot;:true}"',
    );
  });

  it('offers the trial upgrade variant and falls back to the user id without email', async () => {
    headerState.values['x-invoke-path'] = '/home';
    supabaseMock.getUser.mockResolvedValue({
      data: { user: { id: 'user-2', email: null } },
    });
    supabaseMock.maybeSingle.mockResolvedValue({
      data: {
        subscription_plan: 'free',
        subscription_status: 'trialing',
        current_period_end: null,
        trial_end: '2026-11-01',
        stripe_subscription_id: null,
      },
    });
    accessMock.state = { hasProAccess: false, needsTrial: true, effectivePlan: 'free' };
    impersonationMock.state = { adminId: 'admin-1' };

    const html = await renderLayout();

    expect(html).toContain('data-show-upgrade="true"');
    expect(html).toContain('data-pro="false"');
    expect(html).toContain('data-variant="trial"');
    expect(html).toContain('Impersonating');
    expect(html).toContain('user-2');
    expect(html).toContain(
      '&quot;subscriptionPlan&quot;:&quot;free&quot;,&quot;subscriptionStatus&quot;:&quot;trialing&quot;',
    );
  });

  it('hides the global chrome on Eleva workspace routes', async () => {
    headerState.values['next-url'] = '/eleva/dashboard';
    supabaseMock.getUser.mockResolvedValue({
      data: { user: { id: 'user-3', email: 'grace@example.com' } },
    });
    supabaseMock.maybeSingle.mockResolvedValue({ data: null });

    const html = await renderLayout();

    expect(html).toContain('data-testid="posthog"');
    expect(html).not.toContain('data-testid="app-header"');
    expect(html).not.toContain('data-testid="footer"');
  });

  it('defaults to the signed-out shell when no pathname header exists', async () => {
    supabaseMock.getUser.mockResolvedValue({
      data: { user: { id: 'user-4', email: 'linus@example.com' } },
    });
    supabaseMock.maybeSingle.mockResolvedValue({ data: null });
    // No headers at all; isEleva stays false, but the user is signed in.
    const html = await renderLayout();

    expect(html).toContain('data-testid="app-header"');
    expect(html).toContain('data-testid="footer"');
  });

  it('falls back to the free plan when the subscription lookup fails', async () => {
    headerState.values['x-pathname'] = '/home';
    supabaseMock.getUser.mockResolvedValue({
      data: { user: { id: 'user-5', email: 'error@example.com' } },
    });
    supabaseMock.maybeSingle.mockRejectedValue(new Error('database down'));

    const html = await renderLayout();

    expect(html).toContain('data-show-upgrade="true"');
    expect(html).toContain('data-pro="false"');
    expect(html).toContain('data-variant="upgrade"');
    expect(html).toContain(
      '&quot;subscriptionPlan&quot;:&quot;free&quot;,&quot;subscriptionStatus&quot;:null,&quot;isPro&quot;:false',
    );
  });

  it('exports the site metadata and viewport', () => {
    expect(viewport.themeColor).toBe('#6366F1');
    expect(metadata.metadataBase?.toString()).toBe('https://eleva.app/');
    expect(metadata.title).toMatchObject({ default: 'Eleva - AI-Powered Resume Builder' });
    expect(metadata.manifest).toBe('/site.webmanifest');
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });
});

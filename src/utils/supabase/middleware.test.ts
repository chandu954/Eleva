// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { stubTable, type PostgrestStub } from '@/test/postgrest-stub';

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }));

import { createServerClient } from '@supabase/ssr';
import { updateSession } from './middleware';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };
type CookieApi = {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: CookieToSet[]) => void;
};

let cookieApi: CookieApi | undefined;

const DAY = 24 * 60 * 60 * 1000;
const future = new Date(Date.now() + 5 * DAY).toISOString();
const past = new Date(Date.now() - 5 * DAY).toISOString();

function makeRequest(path: string, cookie?: string) {
  return new NextRequest(
    new URL(path, 'http://localhost'),
    cookie ? { headers: { cookie } } : undefined,
  );
}

function authenticate(id = 'user-1') {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}

function setSubscription(row: Record<string, unknown> | null): PostgrestStub {
  const table = stubTable({ data: row, error: null });
  mockFrom.mockReturnValue(table);
  return table;
}

beforeEach(() => {
  vi.clearAllMocks();
  cookieApi = undefined;
  mockGetUser.mockReset().mockResolvedValue({ data: { user: null } });
  mockFrom.mockReset();
  mockCreateServerClient.mockReset();
  mockCreateServerClient.mockImplementation((_url, _key, options) => {
    cookieApi = (options as unknown as { cookies: CookieApi }).cookies;
    return {
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as never;
  });
});

describe('unauthenticated requests', () => {
  it.each([
    '/',
    '/blog',
    '/blog/post-1',
    '/auth/login',
    '/eleva',
    '/eleva/',
    '/eleva/auth/login',
    '/eleva/auth/callback',
    '/eleva/terms',
    '/eleva/privacy',
  ])('allows public route %s and forwards the pathname', async (path) => {
    const response = await updateSession(makeRequest(path));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('x-middleware-request-x-pathname')).toBe(path);
    expect(response.headers.get('location')).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('redirects Eleva workspace routes to the Eleva login with a next param', async () => {
    const response = await updateSession(makeRequest('/eleva/dashboard?tab=profile&x=1'));

    expect(response.status).toBe(307);
    const location = new URL(String(response.headers.get('location')));
    expect(location.pathname).toBe('/eleva/auth/login');
    expect(location.searchParams.get('next')).toBe('/eleva/dashboard');
    // The original query string is cleared before `next` is added.
    expect(location.searchParams.has('tab')).toBe(false);
    expect(location.searchParams.has('x')).toBe(false);
  });

  it('redirects other non-public routes to the landing page', async () => {
    const response = await updateSession(makeRequest('/resumes/123'));

    expect(response.status).toBe(307);
    const location = new URL(String(response.headers.get('location')));
    expect(location.origin).toBe('http://localhost');
    expect(location.pathname).toBe('/');
    expect(location.searchParams.has('next')).toBe(false);
  });
});

describe('authenticated Eleva routes', () => {
  it('allows Eleva workspace routes without a subscription lookup', async () => {
    authenticate();

    const response = await updateSession(makeRequest('/eleva/studio/pipeline'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('x-middleware-request-x-pathname')).toBe(
      '/eleva/studio/pipeline',
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it.each([
    '/home',
    '/home/analytics',
    '/profile',
    '/resumes',
    '/settings',
    '/subscription',
    '/subscription/checkout-return',
    '/start-trial',
    '/api/search',
    '/auth/callback',
  ])('allows free-plan route %s without querying subscriptions', async (path) => {
    authenticate();

    const response = await updateSession(makeRequest(path));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-request-x-pathname')).toBe(path);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('subscription gating', () => {
  it.each([
    ['active pro', { subscription_plan: 'pro', subscription_status: 'active' }],
    [
      'trialing pro',
      {
        subscription_plan: 'pro',
        subscription_status: 'trialing',
        trial_end: future,
      },
    ],
    [
      'canceled pro within the paid period',
      {
        subscription_plan: 'pro',
        subscription_status: 'canceled',
        current_period_end: future,
      },
    ],
  ])('allows protected routes for %s', async (_label, row) => {
    authenticate();
    const subscriptions = setSubscription(row);

    const response = await updateSession(makeRequest('/dashboard'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(subscriptions.calls.select[0]).toEqual([
      'subscription_plan, stripe_subscription_id, subscription_status, current_period_end, trial_end',
    ]);
    expect(subscriptions.calls.eq[0]).toEqual(['user_id', 'user-1']);
    expect(subscriptions.calls.maybeSingle).toHaveLength(1);
  });

  it.each([
    ['no subscription record', null],
    [
      'a free plan',
      { subscription_plan: 'free', subscription_status: 'active' },
    ],
    [
      'a canceled pro plan past its period',
      {
        subscription_plan: 'pro',
        subscription_status: 'canceled',
        current_period_end: past,
      },
    ],
    [
      'a pro plan whose trial has ended',
      {
        subscription_plan: 'pro',
        subscription_status: 'trialing',
        trial_end: past,
      },
    ],
  ])('redirects to /home for %s', async (_label, row) => {
    authenticate();
    setSubscription(row);

    const response = await updateSession(makeRequest('/dashboard'));

    expect(response.status).toBe(307);
    const location = new URL(String(response.headers.get('location')));
    expect(location.origin).toBe('http://localhost');
    expect(location.pathname).toBe('/home');
  });
});

describe('cookie handling', () => {
  it('exposes incoming request cookies to the Supabase client', async () => {
    authenticate();

    await updateSession(makeRequest('/eleva/dashboard', 'sb-session=abc'));

    expect(cookieApi?.getAll()).toEqual(
      expect.arrayContaining([{ name: 'sb-session', value: 'abc' }]),
    );
  });

  it('writes cookies refreshed during getUser back into the request cookie jar', async () => {
    mockGetUser.mockImplementation(async () => {
      cookieApi?.setAll([
        { name: 'sb-refreshed', value: 'new-token', options: { path: '/' } },
      ]);
      return { data: { user: { id: 'user-1' } } };
    });

    const request = makeRequest('/eleva/dashboard');
    const response = await updateSession(request);

    expect(request.cookies.get('sb-refreshed')?.value).toBe('new-token');
    expect(cookieApi?.getAll()).toEqual(
      expect.arrayContaining([{ name: 'sb-refreshed', value: 'new-token' }]),
    );
    // Refreshed cookies must also reach the browser, not just the request jar.
    expect(response.cookies.get('sb-refreshed')?.value).toBe('new-token');
    // The enriched pathname header still reaches the page render.
    expect(response.headers.get('x-middleware-request-x-pathname')).toBe(
      '/eleva/dashboard',
    );
  });

  it('does not emit Set-Cookie on an ordinary navigation (bfcache-friendly)', async () => {
    authenticate();

    const response = await updateSession(makeRequest('/eleva/dashboard'));

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});

// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { pushMock, createPortalSessionMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  createPortalSessionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/app/(dashboard)/subscription/stripe-session', () => ({
  createPortalSession: createPortalSessionMock,
}));

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!cache.has(tag)) {
          cache.set(tag, (props: Record<string, unknown>) => {
            const {
              initial,
              animate,
              exit,
              transition,
              whileHover,
              whileTap,
              variants,
              layout,
              layoutId,
              ...rest
            } = props;
            void initial;
            void animate;
            void exit;
            void transition;
            void whileHover;
            void whileTap;
            void variants;
            void layout;
            void layoutId;
            return React.createElement(tag, rest);
          });
        }
        return cache.get(tag);
      },
    },
  );

  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

import { OptimizedSubscriptionPage } from './optimized-subscription-page';

const DAY = 24 * 60 * 60 * 1000;

function futureIso(days: number) {
  return new Date(Date.now() + days * DAY).toISOString();
}

function pastIso(days: number) {
  return new Date(Date.now() - days * DAY).toISOString();
}

function dateLabel(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function profile(overrides: Record<string, string | null>) {
  return {
    subscription_plan: null,
    subscription_status: null,
    current_period_end: null,
    trial_end: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    ...overrides,
  };
}

const activePro = profile({
  subscription_plan: 'pro',
  subscription_status: 'active',
  current_period_end: futureIso(30),
  stripe_subscription_id: 'sub_active',
});

const cancelingPro = profile({
  subscription_plan: 'pro',
  subscription_status: 'canceled',
  current_period_end: futureIso(10.5),
  stripe_subscription_id: 'sub_canceling',
});

const expiredPro = profile({
  subscription_plan: 'pro',
  subscription_status: 'canceled',
  current_period_end: pastIso(5),
  stripe_subscription_id: 'sub_expired',
});

let originalLocation: Location;

beforeAll(() => {
  originalLocation = window.location;
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('AUTO_PRO_SUBSCRIPTION', 'false');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_PRO_PRICE_ID', '');
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: '' },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
});

describe('OptimizedSubscriptionPage', () => {
  it('renders the free-plan marketing state with benefits, testimonials, and CTA', () => {
    render(<OptimizedSubscriptionPage initialProfile={null} />);

    expect(screen.getByText('Ready to land your dream job?')).toBeInTheDocument();
    expect(screen.getByText('3x Higher Interview Rate')).toBeInTheDocument();
    expect(screen.getByText('What you get with Pro')).toBeInTheDocument();
    expect(screen.getByText('3x faster job applications')).toBeInTheDocument();
    expect(screen.getByText('Higher response rates')).toBeInTheDocument();
    expect(screen.getByText('Unlimited everything')).toBeInTheDocument();
    expect(screen.getByText('Trusted by 12,000+ professionals')).toBeInTheDocument();
    expect(screen.getByText('4.9/5 rating')).toBeInTheDocument();
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
    expect(screen.getByText('30-day money-back guarantee')).toBeInTheDocument();
    expect(screen.getByText('Custom branding options')).toBeInTheDocument();
    expect(screen.getByText(/Sarah Chen/)).toBeInTheDocument();
    expect(screen.getByText(/Marcus Johnson/)).toBeInTheDocument();
    expect(screen.queryByText(/Emily Rodriguez/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Start Landing More Interviews/ }),
    ).toBeEnabled();
  });

  it('sends free users to checkout when the pro price id is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRO_PRICE_ID', 'price_page_monthly');
    const user = userEvent.setup();
    render(<OptimizedSubscriptionPage initialProfile={null} />);

    await user.click(
      screen.getByRole('button', { name: /Start Landing More Interviews/ }),
    );

    expect(pushMock).toHaveBeenCalledWith(
      '/subscription/checkout?price_id=price_page_monthly',
    );
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });

  it('does nothing for free users when no pro price id is configured', async () => {
    const user = userEvent.setup();
    render(<OptimizedSubscriptionPage initialProfile={null} />);

    await user.click(
      screen.getByRole('button', { name: /Start Landing More Interviews/ }),
    );

    expect(pushMock).not.toHaveBeenCalled();
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });

  it('renders the active pro state without upgrade-only marketing', () => {
    render(<OptimizedSubscriptionPage initialProfile={activePro} />);

    expect(
      screen.getByText("You're maximizing your career potential"),
    ).toBeInTheDocument();
    expect(screen.getByText('Pro Member')).toBeInTheDocument();
    expect(screen.getByText('Your Pro Benefits')).toBeInTheDocument();
    expect(screen.queryByText('Most Popular')).not.toBeInTheDocument();
    expect(screen.queryByText('30-day money-back guarantee')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage Subscription' })).toBeEnabled();
  });

  it('treats a trialing profile as pro access', () => {
    render(
      <OptimizedSubscriptionPage
        initialProfile={profile({
          subscription_plan: 'pro',
          subscription_status: 'trialing',
          trial_end: futureIso(5),
          current_period_end: futureIso(12),
          stripe_subscription_id: 'sub_trial',
        })}
      />,
    );

    expect(
      screen.getByText("You're maximizing your career potential"),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage Subscription' })).toBeEnabled();
  });

  it('shows a processing state while the billing portal opens and redirects on success', async () => {
    let resolvePortal!: (value: { url: string }) => void;
    createPortalSessionMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePortal = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<OptimizedSubscriptionPage initialProfile={activePro} />);

    await user.click(screen.getByRole('button', { name: 'Manage Subscription' }));

    const loadingButton = screen.getByRole('button', { name: /Processing/ });
    expect(loadingButton).toBeDisabled();

    await act(async () => {
      resolvePortal({ url: 'https://billing.stripe.test/page-session' });
    });

    await waitFor(() =>
      expect(window.location.href).toBe('https://billing.stripe.test/page-session'),
    );
    expect(
      screen.getByRole('button', { name: 'Manage Subscription' }),
    ).toBeEnabled();
  });

  it('recovers from a billing portal error without navigating', async () => {
    createPortalSessionMock.mockRejectedValue(new Error('stripe unavailable'));
    const user = userEvent.setup();
    render(<OptimizedSubscriptionPage initialProfile={activePro} />);

    await user.click(screen.getByRole('button', { name: 'Manage Subscription' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Manage Subscription' })).toBeEnabled(),
    );
    expect(window.location.href).toBe('');
  });

  it('renders the canceling state with the retention offer and reactivation CTA', async () => {
    const user = userEvent.setup();
    render(<OptimizedSubscriptionPage initialProfile={cancelingPro} />);

    expect(screen.getByText("Don't lose your competitive edge")).toBeInTheDocument();
    expect(screen.getByText(/\d+ days remaining/)).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(
          `Your Pro access ends on ${dateLabel(cancelingPro.current_period_end)}`,
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Limited Time Offer')).toBeInTheDocument();
    expect(
      screen.getByText('Reactivate now and get 2 months for the price of 1'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Manage Subscription' }),
    ).toBeEnabled();

    createPortalSessionMock.mockResolvedValue({ url: 'https://billing.stripe.test/reactivate' });
    await user.click(
      screen.getByRole('button', { name: 'Reactivate & Save 50%' }),
    );

    expect(createPortalSessionMock).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(window.location.href).toBe('https://billing.stripe.test/reactivate'),
    );
  });

  it('renders the expired state and routes users back to checkout', async () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRO_PRICE_ID', 'price_page_restart');
    const user = userEvent.setup();
    render(<OptimizedSubscriptionPage initialProfile={expiredPro} />);

    expect(screen.getByText('Your Pro access has expired')).toBeInTheDocument();
    expect(screen.getByText('Access expired')).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(
          `Your previous Pro access ended on ${dateLabel(expiredPro.current_period_end)}`,
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Limited Time Offer')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /Start Landing More Interviews/ }),
    );

    expect(pushMock).toHaveBeenCalledWith(
      '/subscription/checkout?price_id=price_page_restart',
    );
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });

  it('auto-grants pro access when AUTO_PRO_SUBSCRIPTION is enabled', () => {
    vi.stubEnv('AUTO_PRO_SUBSCRIPTION', 'true');
    render(<OptimizedSubscriptionPage initialProfile={null} />);

    expect(
      screen.getByText("You're maximizing your career potential"),
    ).toBeInTheDocument();
    expect(screen.queryByText('Most Popular')).not.toBeInTheDocument();
  });
});

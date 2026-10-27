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

import { SubscriptionSection } from './subscription-section';

const DAY = 24 * 60 * 60 * 1000;

function futureIso(days: number) {
  return new Date(Date.now() + days * DAY).toISOString();
}

function pastIso(days: number) {
  return new Date(Date.now() - days * DAY).toISOString();
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const activePro = {
  subscription_plan: 'pro',
  subscription_status: 'active',
  current_period_end: futureIso(30),
  stripe_subscription_id: 'sub_active',
};

const trialingPro = {
  subscription_plan: 'pro',
  subscription_status: 'trialing',
  trial_end: futureIso(5),
  current_period_end: futureIso(12),
  stripe_subscription_id: 'sub_trial',
};

const cancelingPro = {
  subscription_plan: 'pro',
  subscription_status: 'canceled',
  current_period_end: futureIso(10.5),
  stripe_subscription_id: 'sub_canceling',
};

const expiredPro = {
  subscription_plan: 'pro',
  subscription_status: 'canceled',
  current_period_end: pastIso(5),
  stripe_subscription_id: 'sub_expired',
};

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

describe('SubscriptionSection', () => {
  it('renders the free-plan upgrade state with pricing, benefits, and guarantees', () => {
    render(<SubscriptionSection initialProfile={null} />);

    expect(screen.getByText('Upgrade to Eleva Pro')).toBeInTheDocument();
    expect(screen.getByText('3x Higher Interview Rate')).toBeInTheDocument();
    expect(screen.getByText('What you get with Pro')).toBeInTheDocument();
    expect(screen.getByText('Eleva Pro')).toBeInTheDocument();
    expect(screen.getByText('$20')).toBeInTheDocument();
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
    expect(screen.getByText('30-day money-back guarantee')).toBeInTheDocument();
    expect(screen.getByText('Cancel anytime • No hidden fees')).toBeInTheDocument();
    expect(screen.getByText('Trusted by 12,000+ professionals')).toBeInTheDocument();
    expect(screen.getByText('3x faster applications')).toBeInTheDocument();
    expect(screen.getByText('Higher response rates')).toBeInTheDocument();
    expect(screen.getByText('Unlimited everything')).toBeInTheDocument();
    expect(screen.getByText('Premium templates')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upgrade to Pro/ })).toBeEnabled();
  });

  it('sends free users to checkout when the pro price id is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRO_PRICE_ID', 'price_pro_monthly');
    const user = userEvent.setup();
    render(<SubscriptionSection initialProfile={null} />);

    await user.click(screen.getByRole('button', { name: /Upgrade to Pro/ }));

    expect(pushMock).toHaveBeenCalledWith(
      '/subscription/checkout?price_id=price_pro_monthly',
    );
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });

  it('does nothing for free users when no pro price id is configured', async () => {
    const user = userEvent.setup();
    render(<SubscriptionSection initialProfile={null} />);

    await user.click(screen.getByRole('button', { name: /Upgrade to Pro/ }));

    expect(pushMock).not.toHaveBeenCalled();
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });

  it('renders the active pro state without upgrade-only content', () => {
    render(<SubscriptionSection initialProfile={activePro} />);

    expect(screen.getByText("You're on the Pro plan")).toBeInTheDocument();
    expect(screen.getByText('Pro Member')).toBeInTheDocument();
    expect(screen.getByText('Your Pro Benefits')).toBeInTheDocument();
    expect(screen.queryByText('Most Popular')).not.toBeInTheDocument();
    expect(screen.queryByText('30-day money-back guarantee')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage Subscription' })).toBeEnabled();
  });

  it('renders the trialing state with trial messaging and billing management', () => {
    render(<SubscriptionSection initialProfile={trialingPro} />);

    expect(screen.getByText('Free trial active — Pro unlocked')).toBeInTheDocument();
    expect(screen.getByText(/\d+ days left in trial/)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`After ${dateLabel(trialingPro.trial_end)}`)),
    ).toBeInTheDocument();
    expect(screen.getByText('Your Pro Benefits')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Manage trial / billing' }),
    ).toBeEnabled();
  });

  it('renders the canceling state with the remaining days and end date', () => {
    render(<SubscriptionSection initialProfile={cancelingPro} />);

    expect(screen.getByText('Pro access ending soon')).toBeInTheDocument();
    expect(screen.getByText(/\d+ days remaining/)).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(
          `Your Pro access ends on ${dateLabel(cancelingPro.current_period_end)}`,
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage Subscription' })).toBeEnabled();
  });

  it('renders the expired state and routes users back to checkout', async () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRO_PRICE_ID', 'price_restart');
    const user = userEvent.setup();
    render(<SubscriptionSection initialProfile={expiredPro} />);

    expect(screen.getByText('Your Pro access has expired')).toBeInTheDocument();
    expect(screen.getByText('Access expired')).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(
          `Your previous Pro access ended on ${dateLabel(expiredPro.current_period_end)}`,
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Most Popular')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Upgrade to Pro/ }));

    expect(pushMock).toHaveBeenCalledWith(
      '/subscription/checkout?price_id=price_restart',
    );
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });

  it('shows a loading state while the billing portal opens and redirects on success', async () => {
    let resolvePortal!: (value: { url: string }) => void;
    createPortalSessionMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePortal = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<SubscriptionSection initialProfile={activePro} />);

    await user.click(screen.getByRole('button', { name: 'Manage Subscription' }));

    const loadingButton = screen.getByRole('button', { name: /Loading/ });
    expect(loadingButton).toBeDisabled();

    await act(async () => {
      resolvePortal({ url: 'https://billing.stripe.test/session' });
    });

    await waitFor(() =>
      expect(window.location.href).toBe('https://billing.stripe.test/session'),
    );
    expect(
      screen.getByRole('button', { name: 'Manage Subscription' }),
    ).toBeEnabled();
  });

  it('recovers from a billing portal error without navigating', async () => {
    createPortalSessionMock.mockRejectedValue(new Error('stripe unavailable'));
    const user = userEvent.setup();
    render(<SubscriptionSection initialProfile={activePro} />);

    await user.click(screen.getByRole('button', { name: 'Manage Subscription' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Manage Subscription' })).toBeEnabled(),
    );
    expect(window.location.href).toBe('');
  });

  it('stays on the page when the portal result has no url', async () => {
    createPortalSessionMock.mockResolvedValue({});
    const user = userEvent.setup();
    render(<SubscriptionSection initialProfile={activePro} />);

    await user.click(screen.getByRole('button', { name: 'Manage Subscription' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Manage Subscription' })).toBeEnabled(),
    );
    expect(window.location.href).toBe('');
  });

  it('auto-grants pro access when AUTO_PRO_SUBSCRIPTION is enabled', () => {
    vi.stubEnv('AUTO_PRO_SUBSCRIPTION', 'true');
    render(<SubscriptionSection initialProfile={null} />);

    expect(screen.getByText("You're on the Pro plan")).toBeInTheDocument();
    expect(screen.queryByText('Most Popular')).not.toBeInTheDocument();
  });
});

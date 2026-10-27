import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeState = vi.hoisted(() => ({ stripe: {} as Record<string, unknown> }));
const supabaseState = vi.hoisted(() => ({
  service: [] as unknown[],
  user: [] as unknown[],
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripeClient: () => stripeState.stripe,
}));

vi.mock('@/utils/supabase/server', () => ({
  createServiceClient: vi.fn(async () => supabaseState.service.shift()),
  createClient: vi.fn(async () => supabaseState.user.shift()),
}));

import { stubSupabase, stubTable } from '@/test/postgrest-stub';
import {
  checkSubscriptionPlan,
  createOrRetrieveCustomer,
  deleteCustomerAndData,
  getSubscriptionPlan,
  getSubscriptionStatus,
  hasActiveSubscriptionOrTrial,
  manageSubscriptionStatusChange,
} from './actions';

const stripeSubscription = {
  id: 'sub_123',
  status: 'active',
  trial_end: null,
  cancel_at_period_end: false,
  items: {
    data: [{
      current_period_end: 1893456000,
      price: { id: 'price_pro' },
    }],
  },
};

function setupStripe() {
  stripeState.stripe = {
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_new' }),
      retrieve: vi.fn().mockResolvedValue({ id: 'cus_123', metadata: { supabaseUUID: 'user-1' } }),
      del: vi.fn().mockResolvedValue({ id: 'cus_123', deleted: true }),
    },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue(stripeSubscription),
    },
  };
}

describe('stripe actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRO_PRICE_ID', 'price_pro');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    supabaseState.service = [];
    supabaseState.user = [];
    setupStripe();
  });

  it('returns an existing customer id', async () => {
    supabaseState.service = [stubSupabase(null, {
      subscriptions: stubTable({ data: { stripe_customer_id: 'cus_existing' }, error: null }),
    })];

    await expect(createOrRetrieveCustomer({ uuid: 'user-1', email: 'a@example.com' }))
      .resolves.toBe('cus_existing');
  });

  it('creates a customer when none exists', async () => {
    const upsert = stubTable({ data: null, error: null });
    supabaseState.service = [
      stubSupabase(null, { subscriptions: stubTable({ data: null, error: null }) }),
      stubSupabase(null, { subscriptions: upsert }),
    ];

    await expect(createOrRetrieveCustomer({ uuid: 'user-1', email: 'a@example.com' }))
      .resolves.toBe('cus_new');
    const stripe = stripeState.stripe as { customers: { create: ReturnType<typeof vi.fn> } };
    expect(stripe.customers.create).toHaveBeenCalledWith({
      email: 'a@example.com',
      metadata: { supabaseUUID: 'user-1' },
    });
    expect(upsert.calls.upsert[0][0]).toMatchObject({ user_id: 'user-1', stripe_customer_id: 'cus_new' });
  });

  it('throws when the customer record cannot be saved', async () => {
    supabaseState.service = [
      stubSupabase(null, { subscriptions: stubTable({ data: null, error: null }) }),
      stubSupabase(null, { subscriptions: stubTable({ data: null, error: { message: 'write failed' } }) }),
    ];

    await expect(createOrRetrieveCustomer({ uuid: 'user-1', email: 'a@example.com' }))
      .rejects.toEqual({ message: 'write failed' });
  });

  it('syncs a subscription using the customer metadata', async () => {
    const current = stubTable({ data: null, error: null });
    const upsert = stubTable({ data: null, error: null });
    supabaseState.service = [stubSupabase(null, { subscriptions: [current, upsert] })];

    const result = await manageSubscriptionStatusChange('sub_123', 'cus_123');

    expect(result).toMatchObject({ user_id: 'user-1', subscription_plan: 'pro', subscription_status: 'active' });
    expect(upsert.calls.upsert[0][0]).toMatchObject({ stripe_subscription_id: 'sub_123' });
  });

  it('falls back to subscription and customer lookups when Stripe customer is deleted', async () => {
    const stripe = stripeState.stripe as { customers: { retrieve: ReturnType<typeof vi.fn> } };
    stripe.customers.retrieve.mockResolvedValueOnce({ id: 'cus_123', deleted: true });
    supabaseState.service = [stubSupabase(null, {
      subscriptions: [
        stubTable({ data: null, error: null }),
        stubTable({ data: { user_id: 'user-2' }, error: null }),
        stubTable({ data: null, error: null }),
        stubTable({ data: null, error: null }),
      ],
    })];

    const result = await manageSubscriptionStatusChange('sub_123', 'cus_123');
    expect(result).toMatchObject({ user_id: 'user-2', subscription_plan: 'pro' });
  });

  it('returns a neutral subscription when no user mapping exists', async () => {
    const stripe = stripeState.stripe as { customers: { retrieve: ReturnType<typeof vi.fn> } };
    stripe.customers.retrieve.mockResolvedValueOnce({ id: 'cus_123', metadata: {} });
    supabaseState.service = [stubSupabase(null, {
      subscriptions: [
        stubTable({ data: null, error: null }),
        stubTable({ data: null, error: null }),
        stubTable({ data: null, error: null }),
      ],
    })];

    const result = await manageSubscriptionStatusChange('sub_123', 'cus_123');
    expect(result).toMatchObject({ subscription_plan: 'free', subscription_status: 'canceled' });
  });

  it('skips stale inactive updates for an active current subscription', async () => {
    const stripe = stripeState.stripe as { subscriptions: { retrieve: ReturnType<typeof vi.fn> } };
    stripe.subscriptions.retrieve.mockResolvedValueOnce({ ...stripeSubscription, status: 'canceled' });
    const current = stubTable({
      data: {
        user_id: 'user-1',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_current',
        subscription_plan: 'pro',
        subscription_status: 'active',
        current_period_end: '2027-01-01',
        trial_end: null,
        updated_at: '2026-01-01',
      },
      error: null,
    });
    supabaseState.service = [stubSupabase(null, { subscriptions: current })];

    const result = await manageSubscriptionStatusChange('sub_123', 'cus_123');
    expect(result).toMatchObject({ subscription_plan: 'pro', subscription_status: 'active' });
    expect(current.calls.upsert).toHaveLength(0);
  });

  it('surfaces lookup, read and write errors', async () => {
    const stripe = stripeState.stripe as { subscriptions: { retrieve: ReturnType<typeof vi.fn> } };
    stripe.subscriptions.retrieve.mockResolvedValueOnce({ ...stripeSubscription, items: { data: [] } });
    await expect(manageSubscriptionStatusChange('sub_123', 'cus_123')).rejects.toThrow('has no subscription items');

    stripe.subscriptions.retrieve.mockResolvedValue(stripeSubscription);
    supabaseState.service = [stubSupabase(null, {
      subscriptions: stubTable({ data: null, error: { message: 'read failed' } }),
    })];
    await expect(manageSubscriptionStatusChange('sub_123', 'cus_123')).rejects.toEqual({ message: 'read failed' });

    supabaseState.service = [stubSupabase(null, {
      subscriptions: [stubTable({ data: null, error: null }), stubTable({ data: null, error: { message: 'write failed' } })],
    })];
    await expect(manageSubscriptionStatusChange('sub_123', 'cus_123')).rejects.toEqual({ message: 'write failed' });
  });

  it('rejects when the pro price is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRO_PRICE_ID', '');
    await expect(manageSubscriptionStatusChange('sub_123', 'cus_123'))
      .rejects.toThrow('NEXT_PUBLIC_STRIPE_PRO_PRICE_ID is not configured');
  });

  it('deletes customers and ignores missing Stripe resources', async () => {
    supabaseState.service = [
      stubSupabase(null, { subscriptions: stubTable({ data: { stripe_customer_id: 'cus_123' }, error: null }) }),
      stubSupabase(null, { subscriptions: stubTable({ data: null, error: null }) }),
    ];
    await deleteCustomerAndData('user-1');
    const stripe = stripeState.stripe as { customers: { del: ReturnType<typeof vi.fn> } };
    expect(stripe.customers.del).toHaveBeenCalledWith('cus_123');

    stripe.customers.del.mockRejectedValueOnce({ code: 'resource_missing' });
    supabaseState.service = [
      stubSupabase(null, { subscriptions: stubTable({ data: { stripe_customer_id: 'cus_123' }, error: null }) }),
      stubSupabase(null, { subscriptions: stubTable({ data: null, error: null }) }),
    ];
    await expect(deleteCustomerAndData('user-1')).resolves.toBeUndefined();

    stripe.customers.del.mockRejectedValueOnce({ code: 'api_error' });
    supabaseState.service = [stubSupabase(null, { subscriptions: stubTable({ data: { stripe_customer_id: 'cus_123' }, error: null }) })];
    await expect(deleteCustomerAndData('user-1')).rejects.toEqual({ code: 'api_error' });
  });

  it('handles subscription status responses', async () => {
    supabaseState.user = [stubSupabase(null, {})];
    await expect(getSubscriptionStatus()).rejects.toThrow('User not authenticated');

    supabaseState.user = [stubSupabase({ id: 'user-1' }, { subscriptions: stubTable({ data: null, error: { code: 'PGRST116' } }) })];
    await expect(getSubscriptionStatus()).resolves.toMatchObject({ subscription_plan: 'Free' });

    supabaseState.user = [stubSupabase({ id: 'user-1' }, { subscriptions: stubTable({ data: null, error: { code: 'other' } }) })];
    await expect(getSubscriptionStatus()).rejects.toThrow('Failed to fetch subscription status');

    const subscription = { subscription_plan: 'pro', subscription_status: 'active' };
    supabaseState.user = [stubSupabase({ id: 'user-1' }, { subscriptions: stubTable({ data: subscription, error: null }) })];
    await expect(getSubscriptionStatus()).resolves.toEqual(subscription);
  });

  it('checks plans for signed-in and anonymous users', async () => {
    supabaseState.user = [stubSupabase(null, {})];
    await expect(checkSubscriptionPlan()).resolves.toMatchObject({ plan: '', hasProAccess: false });

    supabaseState.user = [stubSupabase({ id: 'user-1' }, { subscriptions: stubTable({ data: null, error: null }) })];
    await expect(checkSubscriptionPlan()).resolves.toMatchObject({ plan: '', hasProAccess: false });

    supabaseState.user = [stubSupabase({ id: 'user-1' }, {
      subscriptions: stubTable({ data: { subscription_plan: 'pro', subscription_status: 'active' }, error: null }),
    })];
    await expect(checkSubscriptionPlan()).resolves.toMatchObject({ plan: 'pro', status: 'active', hasProAccess: true });
  });

  it('detects prior subscriptions', async () => {
    supabaseState.service = [stubSupabase(null, { subscriptions: stubTable({ data: null, error: { message: 'x' } }) })];
    await expect(hasActiveSubscriptionOrTrial('user-1')).resolves.toBe(false);

    supabaseState.service = [stubSupabase(null, { subscriptions: stubTable({ data: { stripe_subscription_id: null }, error: null }) })];
    await expect(hasActiveSubscriptionOrTrial('user-1')).resolves.toBe(false);

    supabaseState.service = [stubSupabase(null, { subscriptions: stubTable({ data: { stripe_subscription_id: 'sub_123' }, error: null }) })];
    await expect(hasActiveSubscriptionOrTrial('user-1')).resolves.toBe(true);
  });

  it('returns subscription plans with optional user ids', async () => {
    supabaseState.user = [stubSupabase(null, {}), stubSupabase(null, {})];
    await expect(getSubscriptionPlan()).resolves.toBe('');
    await expect(getSubscriptionPlan(true)).resolves.toEqual({ plan: '', id: '' });

    supabaseState.user = [stubSupabase({ id: 'user-1' }, { subscriptions: stubTable({ data: null, error: null }) })];
    await expect(getSubscriptionPlan()).resolves.toBe('');

    supabaseState.user = [stubSupabase({ id: 'user-1' }, {
      subscriptions: stubTable({ data: { subscription_plan: 'pro', subscription_status: 'active' }, error: null }),
    })];
    await expect(getSubscriptionPlan(true)).resolves.toEqual({ plan: 'pro', id: 'user-1' });

    supabaseState.user = [stubSupabase({ id: 'user-1' }, {
      subscriptions: stubTable({ data: { subscription_plan: 'free', subscription_status: 'active' }, error: null }),
    })];
    await expect(getSubscriptionPlan()).resolves.toBe('free');
  });
});

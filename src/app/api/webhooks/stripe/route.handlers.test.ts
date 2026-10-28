// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { getWebhookTestUtils, resetWebhookMocks } from '@/test/stripe-webhook-test-utils';

const {
  mocks, mockManageSubscription, mockCapture, mockLogger,
  tableStub, installServiceClient, makeEvent, canceledSubscription,
  eventsTable, callWebhook,
} = getWebhookTestUtils();

beforeEach(resetWebhookMocks);

describe('stripe webhook handled events and handler errors', () => {
  describe('handled event types', () => {
    it('handles checkout.session.completed for a subscription and emits lifecycle analytics', async () => {
      const events = eventsTable();
      installServiceClient({ stripe_webhook_events: events });
      mocks.constructEvent.mockReturnValue(
        makeEvent('checkout.session.completed', {
          mode: 'subscription',
          customer: 'cus_1',
          subscription: 'sub_1',
        }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ received: true });
      expect(mockManageSubscription).toHaveBeenCalledWith('sub_1', 'cus_1');
      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'user-1',
          event: 'checkout_completed',
          properties: expect.objectContaining({
            stripe_subscription_id: 'sub_1',
            subscription_plan: 'pro',
            subscription_status: 'active',
            event_type: 'checkout.session.completed',
          }),
        }),
      );
      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'user-1',
          event: 'subscription_activated',
        }),
      );
      expect(events.calls.update).toHaveLength(1);
    });

    it('ignores one-time checkout sessions and checkouts without a subscription', async () => {
      const events = eventsTable();
      installServiceClient({ stripe_webhook_events: events });
      mocks.constructEvent.mockReturnValue(
        makeEvent('checkout.session.completed', {
          mode: 'payment',
          customer: 'cus_1',
          subscription: null,
        }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      expect(mockManageSubscription).not.toHaveBeenCalled();
      expect(mockCapture).not.toHaveBeenCalled();
      expect(events.calls.update).toHaveLength(1);
    });

    it('resolves a checkout session customer object to its id', async () => {
      installServiceClient({ stripe_webhook_events: eventsTable() });
      mocks.constructEvent.mockReturnValue(
        makeEvent('checkout.session.completed', {
          mode: 'subscription',
          customer: { id: 'cus_object' },
          subscription: { id: 'sub_object' },
        }),
      );

      await callWebhook();

      expect(mockManageSubscription).toHaveBeenCalledWith('sub_object', 'cus_object');
    });

    it('handles invoice.paid with a subscription id', async () => {
      const events = eventsTable();
      installServiceClient({ stripe_webhook_events: events });
      mocks.constructEvent.mockReturnValue(
        makeEvent('invoice.paid', { customer: 'cus_1', subscription: 'sub_1' }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      expect(mockManageSubscription).toHaveBeenCalledWith('sub_1', 'cus_1');
      expect(mockCapture).not.toHaveBeenCalled();
      expect(events.calls.update).toHaveLength(1);
    });

    it('handles invoice.paid without a subscription without a lookup', async () => {
      const events = eventsTable();
      installServiceClient({ stripe_webhook_events: events });
      mocks.constructEvent.mockReturnValue(
        makeEvent('invoice.paid', { customer: 'cus_1', subscription: null }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      expect(mockManageSubscription).not.toHaveBeenCalled();
      expect(events.calls.update).toHaveLength(1);
    });

    it('emits subscription_canceled analytics for a canceled invoice subscription', async () => {
      installServiceClient({ stripe_webhook_events: eventsTable() });
      mockManageSubscription.mockResolvedValue(canceledSubscription as never);
      mocks.constructEvent.mockReturnValue(
        makeEvent('invoice.paid', { customer: 'cus_1', subscription: 'sub_1' }),
      );

      await callWebhook();

      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'user-1',
          event: 'subscription_canceled',
          properties: expect.objectContaining({
            subscription_status: 'canceled',
            event_type: 'invoice.paid',
          }),
        }),
      );
    });

    it.each(['customer.subscription.created', 'customer.subscription.updated'])(
      'handles %s',
      async (type) => {
        const events = eventsTable();
        installServiceClient({ stripe_webhook_events: events });
        mocks.constructEvent.mockReturnValue(
          makeEvent(type, { id: 'sub_1', customer: 'cus_1' }),
        );

        const res = await callWebhook();

        expect(res.status).toBe(200);
        expect(mockManageSubscription).toHaveBeenCalledWith('sub_1', 'cus_1');
        expect(events.calls.update).toHaveLength(1);
      },
    );

    it('emits subscription_activated for customer.subscription.created on an active pro plan', async () => {
      installServiceClient({ stripe_webhook_events: eventsTable() });
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.subscription.created', { id: 'sub_1', customer: 'cus_1' }),
      );

      await callWebhook();

      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'user-1',
          event: 'subscription_activated',
          properties: expect.objectContaining({
            event_type: 'customer.subscription.created',
          }),
        }),
      );
    });

    it('handles customer.subscription.deleted and emits canceled analytics', async () => {
      installServiceClient({ stripe_webhook_events: eventsTable() });
      mockManageSubscription.mockResolvedValue(canceledSubscription as never);
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.subscription.deleted', { id: 'sub_1', customer: 'cus_1' }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      expect(mockManageSubscription).toHaveBeenCalledWith('sub_1', 'cus_1');
      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'user-1',
          event: 'subscription_canceled',
          properties: expect.objectContaining({
            event_type: 'customer.subscription.deleted',
          }),
        }),
      );
    });

    it('deletes local data for customer.deleted and emits canceled analytics', async () => {
      const subscriptions = tableStub({ delete: { data: null, error: null } });
      installServiceClient({
        stripe_webhook_events: eventsTable(),
        subscriptions,
      });
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.deleted', {
          id: 'cus_1',
          metadata: { supabaseUUID: 'user-1' },
        }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      expect(subscriptions.calls.delete).toHaveLength(1);
      expect(subscriptions.calls.eq).toEqual([['stripe_customer_id', 'cus_1']]);
      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'user-1',
          event: 'subscription_canceled',
          properties: expect.objectContaining({
            subscription_status: 'canceled',
            event_type: 'customer.deleted',
          }),
        }),
      );
    });

    it('returns 500 and logs when deleting customer data fails', async () => {
      const subscriptions = tableStub({
        delete: { data: null, error: { message: 'delete failed' } },
      });
      installServiceClient({
        stripe_webhook_events: eventsTable(),
        subscriptions,
      });
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.deleted', {
          id: 'cus_1',
          metadata: { supabaseUUID: 'user-1' },
        }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'stripe.webhook.customer_cleanup_failed',
        expect.objectContaining({ error: { message: 'delete failed' } }),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'stripe.webhook.failed',
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });
  });

  describe('handler errors', () => {
    it('returns 500 and does not mark the event processed when the subscription sync fails', async () => {
      const events = eventsTable();
      installServiceClient({ stripe_webhook_events: events });
      mockManageSubscription.mockRejectedValue(new Error('stripe down'));
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.subscription.updated', { id: 'sub_1', customer: 'cus_1' }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(500);
      await expect(res.json()).resolves.toEqual({ error: 'Webhook handler failed' });
      expect(events.calls.update).toHaveLength(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'stripe.subscription_update_failed',
        expect.objectContaining({
          customerId: 'cus_1',
          subscriptionId: 'sub_1',
        }),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'stripe.webhook.failed',
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });

    it('returns 500 when the event object has no customer id', async () => {
      installServiceClient({ stripe_webhook_events: eventsTable() });
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.subscription.updated', { id: 'sub_1', customer: null }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(500);
      expect(mockManageSubscription).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'stripe.webhook.failed',
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });
  });
});

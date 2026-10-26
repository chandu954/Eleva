// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { Stripe } from "stripe";

import {
  buildCheckoutSessionMetadata,
  isMatchingOpenCheckoutSession,
} from "./checkout-guard";
import {
  getStripeClient,
  isStripeStubMode,
  resetStripeStubForTests,
} from "./client";

describe("isStripeStubMode", () => {
  it("is stubbed only when the key is missing AND outside production", () => {
    expect(isStripeStubMode({ NODE_ENV: "test" })).toBe(true);
    expect(isStripeStubMode({ NODE_ENV: "development" })).toBe(true);
    expect(isStripeStubMode({ NODE_ENV: undefined })).toBe(true);
  });

  it("is never stubbed with a configured key, regardless of environment", () => {
    expect(isStripeStubMode({ NODE_ENV: "test", STRIPE_SECRET_KEY: "sk_test_configured" })).toBe(false);
    expect(isStripeStubMode({ NODE_ENV: "production", STRIPE_SECRET_KEY: "sk_live_x" })).toBe(false);
  });

  it("is never stubbed in a production NODE_ENV — the guard the checkout flows must not bypass", () => {
    expect(isStripeStubMode({ NODE_ENV: "production" })).toBe(false);
  });
});

describe("getStripeClient", () => {
  const envSource = process.env as unknown as Record<string, string | undefined>;

  function snapshot(keys: string[]) {
    return Object.fromEntries(keys.map((k) => [k, envSource[k]]));
  }

  function restore(prev: Record<string, string | undefined>) {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete envSource[k];
      else envSource[k] = v;
    }
  }

  it("returns a real Stripe client when the secret key is set", () => {
    const prev = snapshot(["STRIPE_SECRET_KEY"]);
    try {
      envSource.STRIPE_SECRET_KEY = "sk_test_configured_client";
      const client = getStripeClient();
      expect(client).toBeInstanceOf(Stripe);
    } finally {
      restore(prev);
    }
  });

  it("throws in production with no secret key instead of serving a stub", async () => {
    const prev = snapshot(["STRIPE_SECRET_KEY", "NODE_ENV"]);
    try {
      delete envSource.STRIPE_SECRET_KEY;
      envSource.NODE_ENV = "production";
      expect(() => getStripeClient()).toThrow(/STRIPE_SECRET_KEY is not configured/);
    } finally {
      restore(prev);
    }
  });

  it("returns a deterministic stub outside production with no key", async () => {
    const prev = snapshot(["STRIPE_SECRET_KEY", "NODE_ENV"]);
    try {
      delete envSource.STRIPE_SECRET_KEY;
      envSource.NODE_ENV = "test";
      const client = getStripeClient();
      expect(client.customers.create).toBeTypeOf("function");
      // Same memoized stub instance across calls.
      expect(getStripeClient()).toBe(client);
    } finally {
      restore(prev);
    }
  });
});

describe("stripe stub surfaces", () => {
  beforeEach(() => {
    resetStripeStubForTests();
  });

  const stub = getStripeClient(); // no STRIPE_SECRET_KEY in the test env -> stub

  it("creates an open subscription checkout session with a client secret", async () => {
    const session = await stub.checkout.sessions.create({
      customer: "cus_1",
      mode: "subscription",
      line_items: [{ price: "price_pro", quantity: 1 }],
      metadata: buildCheckoutSessionMetadata({ userId: "u1", priceId: "price_pro", includeTrial: false }),
    });
    expect(session.id).toMatch(/^cs_test_stub_/);
    expect(session.client_secret).toBe(`${session.id}_secret`);
    expect(session.status).toBe("open");
    expect(session.mode).toBe("subscription");
  });

  it("replays the same session for the same idempotency key, as Stripe does", async () => {
    const key = { idempotencyKey: "checkout:u2:price_pro:paid" };
    const first = await stub.checkout.sessions.create(
      { customer: "cus_2", mode: "subscription", metadata: { source: "eleva_checkout" } },
      key,
    );
    const replay = await stub.checkout.sessions.create(
      { customer: "cus_2", mode: "subscription", metadata: { source: "eleva_checkout" } },
      key,
    );
    expect(replay.id).toBe(first.id);
    // A different key produces a distinct session.
    const next = await stub.checkout.sessions.create({ customer: "cus_2", mode: "subscription" }, {
      idempotencyKey: "checkout:u2:price_pro:trial",
    });
    expect(next.id).not.toBe(first.id);
  });

  it("lists only open sessions of the requested customer so checkout-guard dedupe works", async () => {
    const metadata = buildCheckoutSessionMetadata({ userId: "u3", priceId: "price_pro", includeTrial: false });
    const created = await stub.checkout.sessions.create({ customer: "cus_3", mode: "subscription", metadata });

    const mine = await stub.checkout.sessions.list({ customer: "cus_3", status: "open" });
    expect(mine.data).toHaveLength(1);
    expect(mine.object).toBe("list");
    expect(mine.has_more).toBe(false);
    expect(mine.data[0]?.id).toBe(created.id);

    // The guard the session flow actually calls must accept the stub session.
    expect(isMatchingOpenCheckoutSession(created, metadata)).toBe(true);

    const otherCustomer = await stub.checkout.sessions.list({ customer: "cus_other", status: "open" });
    expect(otherCustomer.data).toHaveLength(0);
  });

  it("retrieves stored sessions and refuses unknown ids like a 404", async () => {
    const created = await stub.checkout.sessions.create({ customer: "cus_4", mode: "subscription" });
    const loaded = await stub.checkout.sessions.retrieve(created.id);
    expect(loaded.id).toBe(created.id);
    await expect(stub.checkout.sessions.retrieve("cs_does_not_exist")).rejects.toThrow(/no such checkout session/);
  });

  it("reports no subscriptions (there are none without a live account)", async () => {
    const list = await stub.subscriptions.list({ status: "all" });
    expect(list.data).toHaveLength(0);
    await expect(stub.subscriptions.retrieve("sub_anything")).rejects.toThrow(/no subscriptions exist/);
  });

  it("serves the billing portal as a deterministic deep link", async () => {
    const portal = await stub.billingPortal.sessions.create({ customer: "cus_5" });
    expect(portal.id).toMatch(/^bps_test_stub_/);
    expect(portal.customer).toBe("cus_5");
  });

  it("tracks customers: create, retrieve, delete", async () => {
    const customer = await stub.customers.create({
      email: "dev@eleva.test",
      metadata: { supabaseUUID: "u6" },
    });
    expect(customer.id).toMatch(/^cus_test_stub_/);
    expect(customer.metadata.supabaseUUID).toBe("u6");

    const retrieved = await stub.customers.retrieve(customer.id);
    expect(("email" in retrieved) && retrieved.email).toBe("dev@eleva.test");

    await stub.customers.del(customer.id);
    const afterDelete = await stub.customers.retrieve(customer.id);
    expect("deleted" in afterDelete).toBe(true); // call sites branch on this

    await expect(stub.customers.retrieve("cus_unknown")).rejects.toThrow(/no such customer/);
  });

  it("refuses to verify webhook signatures — that must never be stubbed", () => {
    expect(() => stub.webhooks.constructEvent("body", "sig", "secret")).toThrow(/never be verified/);
  });
});

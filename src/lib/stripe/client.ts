import { Stripe } from "stripe";

/**
 * Shared Stripe client accessor.
 *
 * With STRIPE_SECRET_KEY configured this returns a real Stripe client. With
 * no key AND outside production, it returns a deterministic in-memory stub so
 * a fresh clone can run tests and dev flows without a Stripe account and
 * without network calls. In a production NODE_ENV a missing key throws at
 * startup — silently running a checkout flow with no billing provider would
 * be worse than failing loudly.
 *
 * IMPORTANT: the stub deliberately does NOT cover webhook signature
 * verification (webhooks/stripe keeps constructing a real client for
 * constructEvent). A stubbed signature check would let any caller forge
 * subscription events; there is no safe stub for that.
 */

export const STRIPE_API_VERSION = "2025-04-30.basil" as const;

/** Pure decision, exported so the production guard is testable. */
export function isStripeStubMode(env: Record<string, string | undefined> = process.env): boolean {
  return !env.STRIPE_SECRET_KEY && env.NODE_ENV !== "production";
}

export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (key) return new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  if (isStripeStubMode()) return createStubStripeOnce();
  throw new Error("STRIPE_SECRET_KEY is not configured. Stripe features are disabled.");
}

// ─── Dev/test stub ───────────────────────────────────────────────

let stubClientCache: Stripe | null = null;

function createStubStripeOnce(): Stripe {
  if (!stubClientCache) stubClientCache = createStubStripe();
  return stubClientCache;
}

interface StubRecord {
  customer: Map<string, { id: string; email: string | null; metadata: Record<string, string>; deleted?: boolean }>;
  checkoutSessions: Map<string, StubCheckoutSession>;
  idempotencyKeys: Map<string, StubCheckoutSession>;
}

interface StubCheckoutSession {
  id: string;
  object: "checkout.session";
  client_secret: string;
  status: "open";
  mode: "subscription";
  customer: string | null;
  metadata: Record<string, string>;
}

const stubState: StubRecord = {
  customer: new Map(),
  checkoutSessions: new Map(),
  idempotencyKeys: new Map(),
};

/** Test helper: clears every stub store. */
export function resetStripeStubForTests(): void {
  stubState.customer.clear();
  stubState.checkoutSessions.clear();
  stubState.idempotencyKeys.clear();
}

let stubSequence = 0;

function stubId(prefix: string): string {
  stubSequence += 1;
  return `${prefix}_test_stub_${stubSequence.toString().padStart(4, "0")}`;
}

/**
 * Stripe's MetadataParam admits number|null entries and Emptyable<> can even
 * be '' — the API only persists string metadata. Normalize here so
 * stub-internal stores hold exactly what the real client would hand back.
 */
function toStringMetadata(metadata: unknown): Record<string, string> {
  if (!metadata || typeof metadata !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== null && value !== undefined) out[key] = String(value);
  }
  return out;
}

function stubList<T>(data: T[]): Stripe.ApiList<T> {
  return { object: "list", data, has_more: false, url: "" } as unknown as Stripe.ApiList<T>;
}

/**
 * A hand-rolled subset of the Stripe API surface this repo uses, typed as the
 * real client so every call site keeps full SDK param types. Behavior is
 * deterministic and process-local: no network, same inputs -> same outputs,
 * idempotency keys replay the originally created session (as Stripe does).
 */
function createStubStripe(): Stripe {
  const billingPortal = {
    sessions: {
      // NOTE the function must be async because call sites await it.
      async create(params: { customer: string; return_url?: string }) {
        return {
          id: stubId("bps"),
          object: "billing_portal.session" as const,
          customer: params.customer,
          return_url: params.return_url,
          url: "/stub-stripe/billing-portal",
        };
      },
    },
  };

  const checkout = {
    sessions: {
      async list(params: { customer?: string; status?: string }) {
        const data = [...stubState.checkoutSessions.values()].filter(
          (session) =>
            session.status === (params.status ?? "open")
            && (params.customer === undefined || session.customer === params.customer),
        );
        return stubList(data);
      },
      async create(params: Stripe.Checkout.SessionCreateParams, options?: { idempotencyKey?: string }) {
        const idempotencyKey = options?.idempotencyKey;
        if (idempotencyKey && stubState.idempotencyKeys.has(idempotencyKey)) {
          // Stripe replays the session created under this key.
          return stubState.idempotencyKeys.get(idempotencyKey) as unknown as Stripe.Checkout.Session;
        }
        const id = stubId("cs");
        const session: StubCheckoutSession = {
          id,
          object: "checkout.session",
          client_secret: `${id}_secret`,
          status: "open",
          mode: "subscription",
          customer: typeof params.customer === "string" ? params.customer : null,
          metadata: toStringMetadata(params.metadata),
        };
        stubState.checkoutSessions.set(id, session);
        if (idempotencyKey) stubState.idempotencyKeys.set(idempotencyKey, session);
        return session as unknown as Stripe.Checkout.Session;
      },
      async retrieve(id: string) {
        const session = stubState.checkoutSessions.get(id);
        if (!session) throw new Error(`stripe stub: no such checkout session '${id}'`);
        return session as unknown as Stripe.Checkout.Session;
      },
    },
  };

  const subscriptions = {
    list(_params: Stripe.SubscriptionListParams) {
      void _params;
      return stubList([]);
    },
    async retrieve(_id: string, _options?: { expand?: string[] }) {
      void _id;
      void _options;
      throw new Error("stripe stub: no subscriptions exist without a configured Stripe account");
    },
  };

  const customers = {
    async create(params: Stripe.CustomerCreateParams) {
      const id = stubId("cus");
      const customer = {
        id,
        email: params.email ?? null,
        metadata: toStringMetadata(params.metadata),
      };
      stubState.customer.set(id, customer);
      return customer as unknown as Stripe.Customer;
    },
    async retrieve(id: string) {
      const customer = stubState.customer.get(id);
      if (!customer) throw new Error(`stripe stub: no such customer '${id}'`);
      return customer as unknown as Stripe.Customer;
    },
    async del(id: string) {
      const customer = stubState.customer.get(id);
      if (!customer) throw new Error(`stripe stub: no such customer '${id}'`);
      customer.deleted = true;
      return { id, deleted: true } as unknown as Stripe.DeletedCustomer;
    },
  };

  return {
    billingPortal,
    checkout,
    subscriptions,
    customers,
    webhooks: {
      get constructEvent(): Stripe.Event {
        throw new Error(
          "webhook signatures can never be verified by the stripe stub; configure STRIPE_WEBHOOK_SECRET (and STRIPE_SECRET_KEY) for webhook handling",
        );
      },
    },
  } as unknown as Stripe;
}

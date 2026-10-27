/**
 * Security response headers.
 *
 * Kept in a plain module (rather than inline in next.config.ts) so the CSP
 * contract is unit-tested and the allowlisted third parties stay reviewable.
 *
 * The policy is deliberately strict where the app has no dependency, and
 * allowlists only the origins the product actually uses:
 * - Supabase (REST + realtime websockets)
 * - Stripe (embedded checkout, fraud frames)
 * - PostHog (analytics + session replay assets)
 * - Sentry (error/replay ingest; the browser SDK tunnels via /monitoring)
 * - Buy Me a Coffee (optional landing-page widget)
 * - PDF.js workers (blob:)
 */

export interface SecurityHeaderOptions {
  /** Defaults to NODE_ENV === "production". */
  isProduction?: boolean;
}

const HSTS_VALUE = "max-age=63072000; includeSubDomains; preload";

const PERMISSIONS_POLICY = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  'payment=(self "https://js.stripe.com")',
  "usb=()",
  "browsing-topics=()",
].join(", ");

const SUPABASE_ORIGIN = "https://*.supabase.co";
const SUPABASE_SOCKET = "wss://*.supabase.co";
const STRIPE_ORIGINS = ["https://*.stripe.com", "https://*.stripe.network"];
const POSTHOG_ORIGINS = ["https://*.posthog.com", "https://*.i.posthog.com"];
const SENTRY_ORIGINS = ["https://*.sentry.io", "https://*.ingest.sentry.io"];
const BUY_ME_A_COFFEE_ORIGINS = ["https://*.buymeacoffee.com", "https://cdnjs.buymeacoffee.com"];

export function buildContentSecurityPolicy(
  { isProduction = process.env.NODE_ENV === "production" }: SecurityHeaderOptions = {},
): string {
  const scriptSrc = [
    "'self'",
    // Next.js injects inline bootstrap/flight data; no nonce pipeline yet.
    "'unsafe-inline'",
    "https://js.stripe.com",
    ...POSTHOG_ORIGINS,
    ...BUY_ME_A_COFFEE_ORIGINS,
  ];

  const connectSrc = [
    "'self'",
    SUPABASE_ORIGIN,
    SUPABASE_SOCKET,
    ...STRIPE_ORIGINS,
    ...POSTHOG_ORIGINS,
    ...SENTRY_ORIGINS,
    ...BUY_ME_A_COFFEE_ORIGINS,
  ];

  if (!isProduction) {
    // next dev/Turbopack evaluates modules at runtime and uses HMR sockets.
    scriptSrc.push("'unsafe-eval'");
    connectSrc.push("ws:", "wss:");
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://*.stripe.com",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://cdnjs.buymeacoffee.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://cdnjs.buymeacoffee.com",
    `connect-src ${connectSrc.join(" ")}`,
    `frame-src 'self' ${[...STRIPE_ORIGINS, ...BUY_ME_A_COFFEE_ORIGINS].join(" ")}`,
    "worker-src 'self' blob:",
    `media-src 'self' blob: ${SUPABASE_ORIGIN}`,
    "manifest-src 'self'",
  ];

  if (isProduction) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function buildSecurityHeaders(
  options: SecurityHeaderOptions = {},
): Array<{ key: string; value: string }> {
  const isProduction = options.isProduction ?? process.env.NODE_ENV === "production";

  const headers = [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy({ isProduction }),
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-XSS-Protection", value: "0" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  ];

  if (isProduction) {
    headers.push({ key: "Strict-Transport-Security", value: HSTS_VALUE });
  }

  return headers;
}

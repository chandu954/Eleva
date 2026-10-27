import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy, buildSecurityHeaders } from "./security-headers";

function directive(csp: string, name: string): string {
  const found = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `));
  return found ?? "";
}

describe("buildContentSecurityPolicy", () => {
  it("locks down the document by default and denies framing/plugins", () => {
    const csp = buildContentSecurityPolicy({ isProduction: true });

    expect(directive(csp, "default-src")).toBe("default-src 'self'");
    expect(directive(csp, "base-uri")).toBe("base-uri 'self'");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
  });

  it("allowlists the services the app actually calls", () => {
    const csp = buildContentSecurityPolicy({ isProduction: true });
    const script = directive(csp, "script-src");
    const connect = directive(csp, "connect-src");
    const frame = directive(csp, "frame-src");

    expect(script).toContain("https://js.stripe.com");
    expect(script).toContain("https://*.posthog.com");
    expect(connect).toContain("https://*.supabase.co");
    expect(connect).toContain("wss://*.supabase.co");
    expect(connect).toContain("https://*.stripe.com");
    expect(connect).toContain("https://*.sentry.io");
    expect(connect).toContain("https://*.posthog.com");
    expect(frame).toContain("https://*.stripe.com");
    expect(frame).toContain("https://*.buymeacoffee.com");
    expect(directive(csp, "worker-src")).toBe("worker-src 'self' blob:");
  });

  it("adds production-only protections and omits development escape hatches", () => {
    const csp = buildContentSecurityPolicy({ isProduction: true });

    expect(csp).toContain("upgrade-insecure-requests");
    expect(directive(csp, "script-src")).not.toContain("'unsafe-eval'");
    const connectTokens = directive(csp, "connect-src").split(" ");
    expect(connectTokens).not.toContain("ws:");
    expect(connectTokens).not.toContain("wss:");
  });

  it("keeps local development usable (eval + HMR sockets)", () => {
    const csp = buildContentSecurityPolicy({ isProduction: false });

    const connectTokens = directive(csp, "connect-src").split(" ");
    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(connectTokens).toContain("ws:");
    expect(connectTokens).toContain("wss:");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});

describe("buildSecurityHeaders", () => {
  it("emits HSTS and the baseline hardening headers in production", () => {
    const headers = Object.fromEntries(
      buildSecurityHeaders({ isProduction: true }).map(({ key, value }) => [key, value]),
    );

    expect(headers["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-XSS-Protection"]).toBe("0");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("geolocation=()");
    expect(headers["Permissions-Policy"]).toContain('payment=(self "https://js.stripe.com")');
  });

  it("does not pin HSTS for local development", () => {
    const headers = Object.fromEntries(
      buildSecurityHeaders({ isProduction: false }).map(({ key, value }) => [key, value]),
    );

    expect(headers["Strict-Transport-Security"]).toBeUndefined();
    expect(headers["Content-Security-Policy"]).toContain("'unsafe-eval'");
  });
});

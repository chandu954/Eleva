import * as Sentry from "@sentry/nextjs";
import { reportEnvValidation, validateEnv } from "./lib/env";

function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === "production",
  });
}

export async function register() {
  initSentry();

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    reportEnvValidation(validateEnv());
    await import('./instrumentation.node');
  }
}

export const onRequestError = Sentry.captureRequestError;

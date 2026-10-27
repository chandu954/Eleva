import * as Sentry from "@sentry/nextjs";
import { reportEnvValidation, validateEnv } from "./lib/env";
import { logger } from "./lib/logger";

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

  logger.info("app.instrumentation.registered", {
    runtime: process.env.NEXT_RUNTIME,
    sentryEnabled: process.env.NODE_ENV === "production",
  });

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    reportEnvValidation(validateEnv());
    await import('./instrumentation.node');
  }
}

export const onRequestError = Sentry.captureRequestError;

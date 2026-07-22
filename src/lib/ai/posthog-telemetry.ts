import type { TelemetrySettings } from "ai";

import type { ResolvedAIRequest } from "./access-control";

export function getPostHogProjectApiKey() {
  return (
    process.env.POSTHOG_PROJECT_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ||
    ""
  );
}

export function getPostHogHost() {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
}

export function isPostHogLLMAnalyticsDisabled() {
  const value = process.env.POSTHOG_LLM_ANALYTICS_DISABLED?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function getDisabledTelemetry(): TelemetrySettings {
  return {
    isEnabled: false,
    recordInputs: false,
    recordOutputs: false,
  };
}

export function buildPostHogAITelemetry(input: {
  route: string;
  userId: string;
  usageEventId: string;
  isPro: boolean;
  resolved: ResolvedAIRequest;
  environment?: string;
}): TelemetrySettings {
  if (!getPostHogProjectApiKey() || isPostHogLLMAnalyticsDisabled()) {
    return getDisabledTelemetry();
  }

  return {
    isEnabled: true,
    recordInputs: true,
    recordOutputs: true,
    functionId: input.route,
    metadata: {
      posthog_distinct_id: input.userId,
      eleva_usage_event_id: input.usageEventId,
      eleva_route: input.route,
      eleva_provider: input.resolved.providerId,
      eleva_model: input.resolved.modelId,
      eleva_is_pro: input.isPro,
      eleva_used_server_key: input.resolved.usedServerKey,
      eleva_requires_rate_limit: input.resolved.requiresRateLimit,
      eleva_environment: input.environment ?? process.env.NODE_ENV ?? "development",
    },
  };
}

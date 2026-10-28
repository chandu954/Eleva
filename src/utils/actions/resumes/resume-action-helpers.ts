import { createClient } from '@/utils/supabase/server';
import type { AIConfig } from '@/utils/ai-tools';
import type { LanguageModelUsage, LanguageModelV1, TelemetrySettings } from 'ai';
import { getSubscriptionAccessState } from '@/lib/subscription-access';
import { finishAIUsageRequest, startAIUsageRequest } from '@/lib/ai/usage-ledger';
import { FREE_PLAN_RESUME_LIMITS, getResumeLimitExceededMessage, type ResumeLimitType } from '@/lib/resume-limits';

export async function assertResumeQuota(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  type: ResumeLimitType
) {
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('subscription_plan, subscription_status, current_period_end, trial_end, stripe_subscription_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (subscriptionError) {
    throw new Error('Failed to validate subscription access');
  }

  const accessState = getSubscriptionAccessState(subscription);
  if (accessState.hasProAccess) {
    return;
  }

  const isBaseResume = type === 'base';
  const { count, error: countError } = await supabase
    .from('resumes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_base_resume', isBaseResume);

  if (countError) {
    throw new Error('Failed to validate resume limits');
  }

  const limit = FREE_PLAN_RESUME_LIMITS[type];
  if ((count ?? 0) >= limit) {
    throw new Error(getResumeLimitExceededMessage(type));
  }
}

export async function runTrackedAIRequest<T extends { usage?: LanguageModelUsage }>(
  input: {
    route: string;
    userId: string;
    isPro: boolean;
    config?: AIConfig;
  },
  task: (model: LanguageModelV1, telemetry: TelemetrySettings) => Promise<T>
) {
  const { model, usageEventId, telemetry } = await startAIUsageRequest(input);

  try {
    const result = await task(model, telemetry);
    await finishAIUsageRequest({
      usageEventId,
      status: 'succeeded',
      usage: result.usage,
    });
    return result;
  } catch (error) {
    await finishAIUsageRequest({
      usageEventId,
      status: 'failed',
      errorCode: error instanceof Error ? error.message : 'ai_request_failed',
    });
    throw error;
  }
}

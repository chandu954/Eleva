import { createClient } from '@/utils/supabase/server';
import { getSubscriptionAccessState } from '@/lib/subscription-access';
import { runTrackedAIRequest } from '@/lib/ai/run-tracked-ai-request';
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

export { runTrackedAIRequest };

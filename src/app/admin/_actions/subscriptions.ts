'use server';

import { createServiceClient } from "@/utils/supabase/server";
import { revalidatePath } from 'next/cache';
import { checkAdminStatus } from './users';

export async function updateUserSubscriptionPlan(
  userId: string,
  plan: 'free' | 'pro'
): Promise<{ success: boolean; message: string }> {
  try {
    // Ensure the current user is an admin
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
      return {
        success: false,
        message: 'Unauthorized: Only administrators can update subscription plans.',
      };
    }

    if (!userId) {
      return {
        success: false,
        message: 'User ID is required.',
      };
    }

    if (plan !== 'free' && plan !== 'pro') {
      return {
        success: false,
        message: 'Invalid plan type. Plan must be "free" or "pro".',
      };
    }

    const supabase = await createServiceClient();

    // Determine subscription status based on plan
    const subscription_status = plan === 'pro' ? 'active' : null;

    // Check if the user already has a subscription record
    const { data: existingSubscription, error: checkError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error(`Error checking subscription for user ${userId}:`, checkError);
      return {
        success: false,
        message: `Database error: ${checkError.message}`,
      };
    }

    let updateError;

    if (existingSubscription) {
      // Update existing subscription
      const { error } = await supabase
        .from('subscriptions')
        .update({
          subscription_plan: plan,
          subscription_status: subscription_status,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      updateError = error;
    } else {
      // Create new subscription record
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          subscription_plan: plan,
          subscription_status: subscription_status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      updateError = error;
    }

    if (updateError) {
      console.error(`Error updating subscription for user ${userId}:`, updateError);
      return {
        success: false,
        message: `Failed to update subscription: ${updateError.message}`,
      };
    }

    // Revalidate the user detail page and admin pages to reflect the changes
    revalidatePath(`/admin/${userId}`);
    revalidatePath('/admin');

    return {
      success: true,
      message: `Subscription plan successfully updated to "${plan}".`,
    };
  } catch (error) {
    console.error('Unexpected error updating subscription plan:', error);
    return {
      success: false,
      message: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

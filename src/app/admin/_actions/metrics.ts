'use server';

import { createServiceClient } from "@/utils/supabase/server";

export async function getTotalUserCount(): Promise<number> {
  const supabase = await createServiceClient();
  let totalCount = 0;
  let page = 1;
  const perPage = 1000; // Max allowed by Supabase

  try {
    while (true) {
      // Fetch only the minimal data needed for counting, if possible (though listUsers might fetch more)
      // Using { data: { users }, error } structure based on listUsers documentation/typings
      const { data, error } = await supabase.auth.admin.listUsers({
        page: page,
        perPage: perPage,
        // We don't actually need the user objects, but listUsers fetches them.
      });

      if (error) {
        // Handle specific errors like rate limits if necessary
        console.error(`Error fetching users for count (page ${page}):`, error);
        throw new Error(`Failed to fetch users for count on page ${page}`);
      }

      const users = data?.users;

      if (users && users.length > 0) {
        totalCount += users.length;
        // If the number of users fetched is less than perPage, we've reached the last page
        if (users.length < perPage) {
          break;
        }
      } else {
        // No more users or an unexpected response
        break;
      }

      page++;
      // Add a safety break for extremely large user bases, though unlikely needed
      if (page > 1000) { // e.g., limit to 1 million users
          console.warn("getTotalUserCount reached maximum page limit (1000). Count might be incomplete.");
          break;
      }
    }
  } catch (error) {
    console.error('Error in getTotalUserCount pagination loop:', error);
    // Depending on requirements, you might return partial count or 0, or re-throw
    return 0; // Return 0 on error for now
    // throw error;
  }

  return totalCount;
}

// Action to get the total count of resumes using RPC
export async function getTotalResumeCount(): Promise<number> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase.rpc('count_total_resumes');

  if (error) {
    console.error('Error fetching total resume count:', error);
    // Decide how to handle error, returning 0 for now or throwing
    return 0;
    // throw new Error('Failed to fetch total resume count');
  }

  // Assuming the RPC returns the count directly
  return typeof data === 'number' ? data : 0;
}

// Action to get the total count of subscriptions
export async function getTotalSubscriptionCount(): Promise<number> {
  const supabase = await createServiceClient();
  const { count, error } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    // Add filtering if needed, e.g., filter by active status if there's a 'status' column
    // .eq('status', 'active');

  if (error) {
    console.error('Error fetching total subscription count:', error);
    return 0; // Return 0 on error
  }

  return count ?? 0;
}

// Action to get the total count of base resumes
export async function getBaseResumeCount(): Promise<number> {
  const supabase = await createServiceClient();
  const { count, error } = await supabase
    .from('resumes')
    .select('*', { count: 'exact', head: true })
    .eq('is_base_resume', true);

  if (error) {
    console.error('Error fetching base resume count:', error);
    return 0; // Return 0 on error
  }

  return count ?? 0;
}

// Action to get the total count of active subscriptions (Pro Users)
export async function getProUserCount(): Promise<number> {
  const supabase = await createServiceClient();
  const { count, error } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    // Check for 'pro' plan and 'active' status
    .eq('subscription_plan', 'pro')
    .eq('subscription_status', 'active');

  if (error) {
    console.error('Error fetching pro user count:', error);
    return 0; // Return 0 on error
  }

  return count ?? 0;
}

// Action to get the total count of tailored resumes
export async function getTailoredResumeCount(): Promise<number> {
  const supabase = await createServiceClient();
  const { count, error } = await supabase
    .from('resumes')
    .select('*', { count: 'exact', head: true })
    .eq('is_base_resume', false);

  if (error) {
    console.error('Error fetching tailored resume count:', error);
    return 0; // Return 0 on error
  }

  return count ?? 0;
}

/**
 * Updates a user's subscription plan as an admin.
 * @param userId - The ID of the user whose subscription plan should be updated.
 * @param plan - The new subscription plan ('free' or 'pro').
 * @returns {Promise<{ success: boolean, message: string }>} - Result of the operation.
 */

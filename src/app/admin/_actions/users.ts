'use server';

import { createClient, createServiceClient } from "@/utils/supabase/server"; // Import createClient as well
import { redirect } from 'next/navigation'; // Import redirect

export async function getAllUsers() {
  const supabase = await createServiceClient();
  const allUsers = [];
  let page = 1;
  const perPage = 1000; // Max allowed by Supabase

  try {
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page: page,
        perPage: perPage,
      });

      if (error) {
        console.error(`Error fetching users (page ${page}):`, error);
        throw new Error(`Failed to fetch users on page ${page}`);
      }

      if (data && data.users) {
        allUsers.push(...data.users);
        // If the number of users fetched is less than perPage, we've reached the last page
        if (data.users.length < perPage) {
          break;
        }
      } else {
        // Should not happen if there's no error, but good to handle
        break;
      }

      page++;
    }
  } catch (error) {
    console.error('Error in getAllUsers pagination loop:', error);
    // Re-throw the error after logging
    throw error;
  }

  return allUsers;
}

/**
 * Checks if the currently authenticated user is an admin.
 * Fetches the user ID using the server client and checks the 'admins' table.
 * @returns {Promise<boolean>} True if the user is an admin, false otherwise.
 */
export async function checkAdminStatus(): Promise<boolean> {
  // Use the regular client that can read user session cookies
  const supabase = await createClient();

  // Get the current user session
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Admin check failed to resolve user', authError);
    return false; // Not authenticated, definitely not admin
  }

  // Primary source of truth: profiles.is_admin
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profileError) {
    return profileData?.is_admin === true;
  }

  // Backward compatibility for older databases still using public.admins
  const { data: adminData, error: adminError } = await supabase
    .from('admins')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminError) {
    console.error('Admin check failed for profiles/admins lookup', {
      userId: user.id,
      profileError: profileError.message,
      adminError: adminError.message,
    });
    return false;
  }

  return adminData?.is_admin === true;
}

/**
 * Ensures the current user is an admin, otherwise redirects.
 * Calls checkAdminStatus and redirects to '/' if the user is not an admin.
 */
export async function ensureAdmin() {
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
        redirect('/');
    }
    // If isAdmin is true, execution continues normally.
}

// Define interfaces for RPC return types to help with typing
interface Profile {
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  location?: string;
  website?: string;
  linkedin_url?: string;
  github_url?: string;
  work_experience?: Array<{
    company?: string;
    title?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
    location?: string;
    [key: string]: unknown;
  }>;
  education?: Array<{
    institution?: string;
    degree?: string;
    field_of_study?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
    [key: string]: unknown;
  }>;
  skills?: Array<{
    category?: string;
    items?: string[];
    [key: string]: unknown;
  }>;
  projects?: Array<{
    [key: string]: unknown;
  }>;
  certifications?: Array<{
    [key: string]: unknown;
  }>;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface Subscription {
  user_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_plan?: string;
  subscription_status?: string;
  current_period_end?: string;
  trial_end?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface User {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
  [key: string]: unknown;
}

interface UserWithDetails {
  user: User;
  profile: Profile | null;
  subscription: Subscription | null;
  resume_count: number;
}

export async function getUsersWithProfilesAndSubscriptions(): Promise<UserWithDetails[]> {
  const supabase = await createServiceClient();
  const users = await getAllUsers();
  if (!users || users.length === 0) {
    return [];
  }
  const userIds = users.map(user => user.id);

  const BATCH_SIZE = 1000;
  // Utility to split array into chunks
  function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  // Helper to fetch RPC in batches and concatenate results
  async function fetchRpcInBatches<T>(rpcName: string, paramsKey: string, ids: string[]): Promise<T[]> {
    const chunks = chunkArray(ids, BATCH_SIZE);
    const results: T[] = [];
    for (const chunk of chunks) {
      const { data, error } = await supabase.rpc(rpcName, { [paramsKey]: chunk });
      if (error) {
        throw new Error(`${rpcName} failed: ${error.message}`);
      }
      results.push(...(data as T[]));
    }
    return results;
  }

  // 1. Fetch profiles using RPC (batched)
  const profilesData = await fetchRpcInBatches<Profile>('get_profiles_for_users', 'user_ids_array', userIds);
  const profilesMap = new Map(profilesData.map(p => [p.user_id, p]));

  // 2. Fetch subscriptions using RPC (batched)
  const subscriptionsData = await fetchRpcInBatches<Subscription>('get_subscriptions_for_users', 'user_ids_array', userIds);

  const subscriptionsMap = new Map(subscriptionsData.map(s => [s.user_id, s]));

  // 3. Fetch resume counts using RPC (batched)
  const resumeCountsData = await fetchRpcInBatches<{ user_id: string; resume_count: number }>('get_resume_counts_for_users', 'user_ids_array', userIds);

  const resumeCountsMap = new Map(resumeCountsData.map(item => [item.user_id, Number(item.resume_count) || 0]));

  // Added debug log for missing subscription cases
  const mergedData = users.map(user => {
    const profile = profilesMap.get(user.id) || null;
    const subscription = subscriptionsMap.get(user.id) || null;
    if (!subscription) {
      console.warn(`DEBUG | No subscription found for user ${user.id} (${user.email})`);
    }
    const resume_count = resumeCountsMap.get(user.id) || 0;

    return {
      user,
      profile,
      subscription,
      resume_count
    } as unknown as UserWithDetails;
  });
  //--------------------------------------------
  return mergedData;
}

export async function getUserDetailsById(userId: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const supabase = await createServiceClient();

  // 1. Fetch User Auth Info
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError) {
    console.error(`Error fetching user auth info for ${userId}:`, userError);
    // Handle specific errors like user not found gracefully if needed
    if (userError.message.includes('User not found')) {
       return null; // Or throw a specific "NotFound" error
    }
    throw new Error(`Failed to fetch user auth info for ${userId}`);
  }
  const user = userData.user;

  // 2. Fetch Profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle(); // Use maybeSingle as profile might not exist

  if (profileError) {
    console.error(`Error fetching profile for ${userId}:`, profileError);
    // Decide if this is critical. Maybe return partial data?
    throw new Error(`Failed to fetch profile for ${userId}`);
  }

  // 3. Fetch Subscription
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle(); // Use maybeSingle as subscription might not exist

  if (subscriptionError) {
    console.error(`Error fetching subscription for ${userId}:`, subscriptionError);
    // Decide if this is critical. Maybe return partial data?
    throw new Error(`Failed to fetch subscription for ${userId}`);
  }

  // 4. Combine and return
  // Ensure user is not null before proceeding
  if (!user) {
      console.warn(`User data was unexpectedly null after fetch for ID: ${userId}`);
      return null; // Or handle as appropriate
  }

  return {
    user,
    profile,
    subscription,
  };
}

export async function getResumeCountForUser(userId: string): Promise<number> {
  if (!userId) {
    console.error('Attempted to get resume count without user ID.');
    return 0; // Or throw an error if preferred
  }

  const supabase = await createServiceClient();

  const { count, error } = await supabase
    .from('resumes')
    .select('*', { count: 'exact', head: true }) // Use head: true for count only
    .eq('user_id', userId);

  if (error) {
    console.error(`Error fetching resume count for user ${userId}:`, error);
    // Decide how to handle error, returning 0 for now
    return 0;
  }

  return count ?? 0;
}

export async function getResumesForUser(userId: string) {
   if (!userId) {
    console.error('Attempted to get resumes without user ID.');
    return []; // Return empty array or throw error
  }

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('resumes')
    .select('id, name, created_at, is_base_resume') // Select only needed fields
    .eq('user_id', userId)
    .order('created_at', { ascending: false }); // Order by creation date

  if (error) {
    console.error(`Error fetching resumes for user ${userId}:`, error);
    // Decide how to handle error, returning empty array for now
    return [];
  }

  // Ensure data is not null before returning
  return data ?? [];
}

// Action to get the total count of users using the admin API (respects permissions)

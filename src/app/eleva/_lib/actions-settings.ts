'use server';

import { createClient, createServiceClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { deleteCustomerAndData } from '@/utils/actions/stripe/actions';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return { error: 'unauthenticated' };

  const patch: Record<string, unknown> = {};
  const fields = ['first_name', 'last_name', 'headline', 'bio', 'location', 'timezone', 'website', 'linkedin_url', 'github_url', 'portfolio_url', 'phone_number'];
  for (const f of fields) {
    const v = formData.get(f);
    if (typeof v === 'string') patch[f] = v.trim() || null;
  }
  patch.updated_at = new Date().toISOString();

  const { error } = await supabase.from('profiles').update(patch).eq('user_id', uid);
  if (error) return { error: error.message };

  revalidatePath('/eleva/settings');
  return { ok: true };
}

export async function updatePreferences(prefs: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return { error: 'unauthenticated' };

  const { error } = await supabase.from('user_preferences').upsert({ user_id: uid, ...prefs, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return { error: error.message };
  revalidatePath('/eleva/settings');
  return { ok: true };
}

export async function deleteAccount() {
  const { supabase, user } = await (async () => {
    const supabase = await createClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) throw new Error('unauthenticated');
    return { supabase, user: userRes.user };
  })();

  try {
    // Delete Stripe customer + subscription record (safe no-op if no Stripe key configured)
    await deleteCustomerAndData(user.id);

    // Remove profile and resume rows explicitly before removing the auth user
    const serviceClient = await createServiceClient();
    await serviceClient.from('profiles').delete().eq('user_id', user.id);
    await serviceClient.from('resumes').delete().eq('user_id', user.id);

    // Removing the auth user cascades to all remaining user-owned rows
    // (applications, cover letters, ATS reports, jobs, preferences, provider keys, usage, activity)
    const { error: authError } = await serviceClient.auth.admin.deleteUser(user.id);
    if (authError) throw new Error(authError.message);

    await supabase.auth.signOut();
    return { ok: true };
  } catch (error) {
    console.error('Account deletion failed:', error);
    return { error: error instanceof Error ? error.message : 'Account deletion failed' };
  }
}

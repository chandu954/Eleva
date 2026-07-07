'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

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
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return { error: 'unauthenticated' };
  await supabase.from('resumes').delete().eq('user_id', uid);
  await supabase.from('ats_scores').delete().eq('user_id', uid);
  await supabase.from('activity_log').delete().eq('user_id', uid);
  await supabase.from('cover_letters').delete().eq('user_id', uid);
  await supabase.auth.signOut();
  return { ok: true };
}

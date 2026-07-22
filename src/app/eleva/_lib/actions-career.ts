'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

async function getUid(): Promise<string> {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user?.id) throw new Error('unauthenticated');
  return u.user.id;
}

// ─── Personal Info ────────────────────────────────────────────────────

const personalSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  headline: z.string().optional(),
  email: z.string().optional(),
  phone_number: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  linkedin_url: z.string().optional(),
  github_url: z.string().optional(),
  portfolio_url: z.string().optional(),
  leetcode_url: z.string().optional(),
  hackerrank_url: z.string().optional(),
  twitter_url: z.string().optional(),
});

export async function savePersonal(data: z.infer<typeof personalSchema>) {
  const userId = await getUid();
  const supabase = await createClient();
  const parsed = personalSchema.parse(data);
  const { error } = await supabase.from('profiles').update({ ...parsed, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) return { error: error.message };
  revalidatePath('/eleva/career');
  return { ok: true };
}

// ─── Professional Summary ─────────────────────────────────────────────

export async function saveSummary(summary: string) {
  const userId = await getUid();
  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ professional_summary: summary || null, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) return { error: error.message };
  revalidatePath('/eleva/career');
  return { ok: true };
}

// ─── Experience ───────────────────────────────────────────────────────

const experienceItemSchema = z.object({
  company: z.string().min(1),
  position: z.string().min(1),
  location: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  current: z.boolean().optional(),
  description: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
});

export async function saveExperience(items: z.infer<typeof experienceItemSchema>[]) {
  const userId = await getUid();
  const supabase = await createClient();
  const parsed = z.array(experienceItemSchema).parse(items);
  const { error } = await supabase.from('profiles').update({ work_experience: parsed, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) return { error: error.message };
  revalidatePath('/eleva/career');
  return { ok: true };
}

// ─── Projects ─────────────────────────────────────────────────────────

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  url: z.string().optional().nullable(),
  github_url: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
});

export async function saveProjects(items: z.infer<typeof projectSchema>[]) {
  const userId = await getUid();
  const supabase = await createClient();
  const parsed = z.array(projectSchema).parse(items);
  const { error } = await supabase.from('profiles').update({ projects: parsed, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) return { error: error.message };
  revalidatePath('/eleva/career');
  return { ok: true };
}

// ─── Skills ───────────────────────────────────────────────────────────

const skillCategorySchema = z.object({
  category: z.string().min(1),
  items: z.array(z.string()).default([]),
});

export async function saveSkills(items: z.infer<typeof skillCategorySchema>[]) {
  const userId = await getUid();
  const supabase = await createClient();
  const parsed = z.array(skillCategorySchema).parse(items);
  const { error } = await supabase.from('profiles').update({ skills: parsed, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) return { error: error.message };
  revalidatePath('/eleva/career');
  return { ok: true };
}

// ─── Education ────────────────────────────────────────────────────────

const educationSchema = z.object({
  school: z.string().min(1),
  degree: z.string().optional().nullable(),
  field: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  gpa: z.string().optional().nullable(),
  achievements: z.array(z.string()).default([]),
});

export async function saveEducation(items: z.infer<typeof educationSchema>[]) {
  const userId = await getUid();
  const supabase = await createClient();
  const parsed = z.array(educationSchema).parse(items);
  const { error } = await supabase.from('profiles').update({ education: parsed, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) return { error: error.message };
  revalidatePath('/eleva/career');
  return { ok: true };
}

// ─── Certifications ───────────────────────────────────────────────────

const certificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
});

export async function saveCertifications(items: z.infer<typeof certificationSchema>[]) {
  const userId = await getUid();
  const supabase = await createClient();
  const parsed = z.array(certificationSchema).parse(items);
  const { error } = await supabase.from('profiles').update({ certifications: parsed, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) return { error: error.message };
  revalidatePath('/eleva/career');
  return { ok: true };
}

// ─── Achievements ─────────────────────────────────────────────────────

const achievementSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  type: z.string().optional().default('achievement'),
});

export async function saveAchievements(items: z.infer<typeof achievementSchema>[]) {
  const userId = await getUid();
  const supabase = await createClient();
  const parsed = z.array(achievementSchema).parse(items);
  const { error } = await supabase.from('profiles').update({ achievements: parsed, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) return { error: error.message };
  revalidatePath('/eleva/career');
  return { ok: true };
}

// ─── Languages ────────────────────────────────────────────────────────

const languageSchema = z.object({
  language: z.string().min(1),
  proficiency: z.string().optional().default('native'),
});

export async function saveLanguages(items: z.infer<typeof languageSchema>[]) {
  const userId = await getUid();
  const supabase = await createClient();
  const parsed = z.array(languageSchema).parse(items);
  const { error } = await supabase.from('profiles').update({ languages: parsed, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) return { error: error.message };
  revalidatePath('/eleva/career');
  return { ok: true };
}

// ─── Preferences ──────────────────────────────────────────────────────

const preferencesSchema = z.object({
  preferred_role: z.string().optional(),
  preferred_location: z.string().optional(),
  work_preference: z.string().optional(),
  salary_expectation: z.string().optional(),
  visa_required: z.boolean().optional(),
  open_to_relocation: z.boolean().optional(),
  employment_types: z.array(z.string()).optional(),
  target_industries: z.array(z.string()).optional(),
});

export async function savePreferences(data: z.infer<typeof preferencesSchema>) {
  const userId = await getUid();
  const supabase = await createClient();
  const parsed = preferencesSchema.parse(data);

  const { data: existing } = await supabase.from('profiles').select('preferences').eq('user_id', userId).maybeSingle();
  const merged = { ...(existing?.preferences as object ?? {}), ...parsed };

  const { error } = await supabase.from('profiles').update({ preferences: merged, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) return { error: error.message };
  revalidatePath('/eleva/career');
  return { ok: true };
}

// ─── Profile Completion ───────────────────────────────────────────────

export async function recalculateCompletion() {
  const userId = await getUid();
  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (!profile) return { error: 'no profile' };

  let score = 0;
  const total = 10;

  if (profile.first_name || profile.last_name) score++;
  if (profile.headline) score++;
  if (profile.professional_summary) score++;
  if (profile.work_experience?.length > 0) score++;
  if (profile.education?.length > 0) score++;
  if (profile.skills?.length > 0) score++;
  if (profile.projects?.length > 0) score++;
  if (profile.certifications?.length > 0) score++;
  if (profile.achievements?.length > 0) score++;
  if (profile.phone_number || profile.email || profile.linkedin_url) score++;

  const pct = Math.round((score / total) * 100);
  await supabase.from('profiles').update({ profile_completion: pct }).eq('user_id', userId);
  revalidatePath('/eleva/career');
  return { completion: pct };
}

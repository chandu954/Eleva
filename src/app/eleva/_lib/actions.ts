'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/eleva/login');
  return { supabase, user };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function logActivity(
  kind: string,
  title: string,
  subtitle?: string,
  meta?: Record<string, unknown>,
) {
  const { supabase, user } = await getCurrentUser();
  if (!user) return;
  await supabase.from('activity_log').insert({
    user_id: user.id,
    kind, title,
    subtitle: subtitle ?? null,
    meta: meta ?? null,
  });
}

export interface DashboardData {
  profile: { first_name?: string; last_name?: string; email?: string } | null;
  resumesCount: number;
  applicationsCount: number;
  coverLettersCount: number;
  averageAts: number | null;
  atsSeries: number[]; // last 7 days
  recentActivity: Array<{ id: string; kind: string; title: string; subtitle: string | null; created_at: string }>;
  weeklyBars: number[]; // last 7 days of activity counts
  latestScore: { overall: number; keyword: number; missing: string[] } | null;
  resumesRecent: Array<{ id: string; name: string; target_role: string | null; updated_at: string; latest_ats: number | null }>;
}

export async function getDashboardData(): Promise<DashboardData> {
  const { supabase, user } = await requireUser();

  const [
    { data: profile },
    { count: resumesCount },
    { count: applicationsCount },
    { count: coverLettersCount },
    { data: activity },
    { data: scoresRaw },
    { data: recent },
  ] = await Promise.all([
    supabase.from('profiles').select('first_name,last_name,email').eq('user_id', user.id).maybeSingle(),
    supabase.from('resumes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('cover_letters').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('activity_log').select('id,kind,title,subtitle,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
    supabase.from('ats_scores').select('overall,keyword,missing,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('resumes').select('id,name,target_role,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(6),
  ]);

  const scores = scoresRaw ?? [];
  const averageAts = scores.length ? Math.round(scores.reduce((a, s) => a + s.overall, 0) / scores.length) : null;
  const atsSeries: number[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now); day.setDate(now.getDate() - i);
    const dayScores = scores.filter((s) => new Date(s.created_at).toDateString() === day.toDateString());
    atsSeries.push(dayScores.length ? Math.round(dayScores.reduce((a, s) => a + s.overall, 0) / dayScores.length) : 0);
  }

  // Weekly activity bars
  const weeklyBars: number[] = [];
  const acts = activity ?? [];
  // Fetch broader activity for the bar chart
  const { data: acts30 } = await supabase.from('activity_log').select('created_at').eq('user_id', user.id).gte('created_at', new Date(now.getTime() - 7 * 86400000).toISOString());
  const buckets = new Array(7).fill(0);
  (acts30 ?? []).forEach((a) => {
    const d = new Date(a.created_at);
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff >= 0 && diff < 7) buckets[6 - diff]++;
  });
  weeklyBars.push(...buckets);

  // Latest ATS score
  const latestScore = scores[0] ? {
    overall: scores[0].overall,
    keyword: scores[0].keyword,
    missing: (scores[0].missing as string[]) ?? [],
  } : null;

  // Attach latest ATS per resume
  const resumeIds = (recent ?? []).map((r) => r.id);
  const { data: perResume } = resumeIds.length
    ? await supabase.from('ats_scores').select('resume_id,overall,created_at').in('resume_id', resumeIds).order('created_at', { ascending: false })
    : { data: [] as Array<{ resume_id: string; overall: number; created_at: string }> };
  const bestByResume: Record<string, number> = {};
  (perResume ?? []).forEach((s) => {
    if (bestByResume[s.resume_id] === undefined) bestByResume[s.resume_id] = s.overall;
  });

  return {
    profile: profile ?? { email: user.email ?? '' },
    resumesCount: resumesCount ?? 0,
    applicationsCount: applicationsCount ?? 0,
    coverLettersCount: coverLettersCount ?? 0,
    averageAts,
    atsSeries,
    recentActivity: acts,
    weeklyBars,
    latestScore,
    resumesRecent: (recent ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      target_role: r.target_role,
      updated_at: r.updated_at,
      latest_ats: bestByResume[r.id] ?? null,
    })),
  };
}

export async function listResumes() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from('resumes')
    .select('id,name,target_role,is_base_resume,updated_at,created_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
  if (!data) return [];
  // Attach latest ATS per resume
  const ids = data.map((r) => r.id);
  if (!ids.length) return data.map((r) => ({ ...r, latest_ats: null as number | null }));
  const { data: scores } = await supabase.from('ats_scores').select('resume_id,overall,created_at').in('resume_id', ids).order('created_at', { ascending: false });
  const bestByResume: Record<string, number> = {};
  (scores ?? []).forEach((s) => { if (bestByResume[s.resume_id] === undefined) bestByResume[s.resume_id] = s.overall; });
  return data.map((r) => ({ ...r, latest_ats: bestByResume[r.id] ?? null }));
}

export async function getResume(id: string) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('resumes').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
  return data;
}

export async function createBlankResume(name = 'Untitled resume'): Promise<{ id: string }> {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  const { data, error } = await supabase.from('resumes').insert({
    user_id: user.id,
    name,
    is_base_resume: true,
    first_name: profile?.first_name ?? null,
    last_name: profile?.last_name ?? null,
    email: profile?.email ?? user.email,
    phone_number: profile?.phone_number ?? null,
    location: profile?.location ?? null,
    linkedin_url: profile?.linkedin_url ?? null,
    github_url: profile?.github_url ?? null,
    website: profile?.website ?? null,
    work_experience: profile?.work_experience ?? [],
    education: profile?.education ?? [],
    skills: profile?.skills ?? [],
    projects: profile?.projects ?? [],
    certifications: profile?.certifications ?? [],
  }).select('id').single();
  if (error || !data) throw new Error(error?.message || 'insert failed');
  await logActivity('resume_created', `Created ${name}`, 'Blank resume');
  revalidatePath('/eleva/resumes');
  revalidatePath('/eleva/dashboard');
  return { id: data.id };
}

export async function deleteResume(id: string) {
  const { supabase, user } = await requireUser();
  await supabase.from('resumes').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/eleva/resumes');
  revalidatePath('/eleva/dashboard');
}

export async function duplicateResume(id: string) {
  const { supabase, user } = await requireUser();
  const { data: src } = await supabase.from('resumes').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!src) throw new Error('not found');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at, updated_at, ...rest } = src;
  const { data, error } = await supabase.from('resumes').insert({ ...rest, name: `${src.name} (copy)` }).select('id').single();
  if (error || !data) throw new Error(error?.message || 'copy failed');
  await logActivity('resume_created', `Duplicated ${src.name}`, `New copy: ${src.name} (copy)`);
  revalidatePath('/eleva/resumes');
  return { id: data.id };
}

export async function updateResumeFields(id: string, patch: Record<string, unknown>) {
  const { supabase, user } = await requireUser();
  await supabase.from('resumes').update(patch).eq('id', id).eq('user_id', user.id);
  revalidatePath(`/eleva/editor?id=${id}`);
}

export async function saveResumeVersion(id: string, label: string, atsScore?: number) {
  const { supabase, user } = await requireUser();
  const { data: src } = await supabase.from('resumes').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!src) return;
  await supabase.from('resume_versions').insert({
    user_id: user.id, resume_id: id, version_label: label,
    snapshot: src, ats_score: atsScore ?? null,
  });
}

export async function listActivity(limit = 40) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('activity_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit);
  return data ?? [];
}

export async function listCoverLetters() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('cover_letters').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  return data ?? [];
}

export async function saveCoverLetter(row: { company: string; role: string; tone?: string; length?: string; body: string; resume_id?: string }) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('cover_letters').insert({ ...row, user_id: user.id }).select('id').single();
  await logActivity('cover_generated', `Cover letter · ${row.role}`, row.company);
  return data;
}

export async function listJobsForUser() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('jobs').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  return data ?? [];
}

export async function createJob(row: { company_name: string; position_title: string; description?: string; job_url?: string; location?: string }) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('jobs').insert({ ...row, user_id: user.id }).select('id').single();
  await logActivity('application_added', `Added ${row.position_title}`, row.company_name);
  revalidatePath('/eleva/applications');
  return data;
}

export async function listScores(resumeId?: string) {
  const { supabase, user } = await requireUser();
  const q = supabase.from('ats_scores').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200);
  if (resumeId) q.eq('resume_id', resumeId);
  const { data } = await q;
  return data ?? [];
}

export async function listVersions(resumeId: string) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('resume_versions').select('*').eq('user_id', user.id).eq('resume_id', resumeId).order('created_at', { ascending: false });
  return data ?? [];
}

export async function getSubscription() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();
  return data;
}

export async function updateProfile(patch: Record<string, unknown>) {
  const { supabase, user } = await requireUser();
  await supabase.from('profiles').upsert({ user_id: user.id, ...patch });
  revalidatePath('/eleva/settings');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/eleva/login');
}

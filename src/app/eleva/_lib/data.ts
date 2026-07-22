import { createClient } from '@/utils/supabase/server';

export type DashboardMetrics = {
  resumes: number;
  applications: number;
  avgAts: number;
  coverLetters: number;
  interviews: number;
  atsTrend: number[];
  applicationsTrend: number[];
  resumeGrowth: number[];
  weeklyProductivity: number[];
  atsDelta: number;
  applicationsByStatus: Record<string, number>;
};

export type ActivityItem = {
  id: string;
  kind: string;
  title: string;
  subtitle: string | null;
  created_at: string;
};

export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

function last7Days() {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export async function getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const supabase = await createClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);
  const sinceIso = since.toISOString();

  const [resumesRes, atsRes, coverRes, activityRes] = await Promise.all([
    supabase.from('resumes').select('id, created_at', { count: 'exact' }).eq('user_id', userId),
    supabase.from('ats_scores').select('overall, created_at').eq('user_id', userId).gte('created_at', sinceIso).order('created_at', { ascending: true }),
    supabase.from('cover_letters').select('id, created_at', { count: 'exact' }).eq('user_id', userId),
    supabase.from('activity_log').select('kind, created_at').eq('user_id', userId).gte('created_at', sinceIso),
  ]);

  let applicationsRes: { data: any[] | null; count: number | null; error: any } = { data: [], count: 0, error: null };
  try {
    const r = await supabase.from('applications').select('id, status, created_at', { count: 'exact' }).eq('user_id', userId);
    applicationsRes = { data: r.data, count: r.count, error: r.error };
  } catch {
    // Table may not exist yet — graceful fallback
  }

  const applicationsByStatus: Record<string, number> = {};
  ((applicationsRes as any).data ?? []).forEach((a: any) => {
    const s = a.status || 'applied';
    applicationsByStatus[s] = (applicationsByStatus[s] || 0) + 1;
  });

  const days = last7Days();

  const atsByDay: Record<string, number[]> = {};
  (atsRes.data ?? []).forEach((r: any) => {
    const d = r.created_at.slice(0, 10);
    (atsByDay[d] ||= []).push(r.overall);
  });
  const atsTrend = days.map(d => {
    const arr = atsByDay[d];
    return arr && arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  });
  // Fill zeros with previous non-zero
  for (let i = 0; i < atsTrend.length; i++) if (!atsTrend[i]) atsTrend[i] = i > 0 ? atsTrend[i - 1] : 0;

  const appsByDay: Record<string, number> = {};
  ((applicationsRes as any).data ?? []).forEach((a: any) => {
    const d = a.created_at?.slice(0, 10);
    if (!d) return;
    appsByDay[d] = (appsByDay[d] || 0) + 1;
  });
  let cum = 0;
  const applicationsTrend = days.map(d => (cum += appsByDay[d] || 0));

  const resByDay: Record<string, number> = {};
  (resumesRes.data ?? []).forEach((r: any) => {
    const d = r.created_at?.slice(0, 10);
    if (!d) return;
    resByDay[d] = (resByDay[d] || 0) + 1;
  });
  let cumR = 0;
  const resumeGrowth = days.map(d => (cumR += resByDay[d] || 0));

  const prodByDay: Record<string, number> = {};
  (activityRes.data ?? []).forEach((a: any) => {
    const d = a.created_at?.slice(0, 10);
    if (!d) return;
    prodByDay[d] = (prodByDay[d] || 0) + 1;
  });
  const weeklyProductivity = days.map(d => prodByDay[d] || 0);

  const atsVals = (atsRes.data ?? []).map((r: any) => r.overall);
  const avgAts = atsVals.length ? Math.round(atsVals.reduce((a: number, b: number) => a + b, 0) / atsVals.length) : 0;
  const atsDelta = atsVals.length > 1 ? (atsVals[atsVals.length - 1] - atsVals[0]) : 0;

  const interviews = ((applicationsRes as any).data ?? []).filter((a: any) => a.status === 'interview').length;

  return {
    resumes: resumesRes.count ?? 0,
    applications: (applicationsRes as any).count ?? 0,
    avgAts,
    coverLetters: coverRes.count ?? 0,
    interviews,
    atsTrend,
    applicationsTrend,
    resumeGrowth,
    weeklyProductivity,
    atsDelta,
    applicationsByStatus,
  };
}

export async function getRecentActivity(userId: string, limit = 8): Promise<ActivityItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('activity_log').select('id, kind, title, subtitle, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  return (data ?? []) as ActivityItem[];
}

export async function getRecentResumes(userId: string, limit = 5) {
  const supabase = await createClient();
  const { data } = await supabase.from('resumes').select('id, name, target_role, updated_at, created_at, is_base_resume').eq('user_id', userId).order('updated_at', { ascending: false }).limit(limit);
  return data ?? [];
}

export async function getRecentAtsReports(userId: string, limit = 5) {
  const supabase = await createClient();
  const { data } = await supabase.from('ats_scores').select('id, overall, keyword, formatting, resume_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  return data ?? [];
}

export async function getApplications(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('applications').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  return data;
}

export async function getUserPreferences(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle();
  return data;
}

export async function getSubscription(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
  return data;
}

export async function getAiUsage(userId: string, days = 30) {
  const supabase = await createClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const { data } = await supabase.from('ai_usage_events').select('created_at, input_tokens, output_tokens, model, route').eq('user_id', userId).gte('created_at', since.toISOString()).order('created_at', { ascending: true });
  return data ?? [];
}

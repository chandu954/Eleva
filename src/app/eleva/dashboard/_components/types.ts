import type { DashboardMetrics } from '../../_lib/data';

export type AtsReport = {
  id: string;
  overall: number;
  keyword: number;
  formatting: number;
  matched?: string[] | null;
  missing?: string[] | null;
  resume_id: string;
  created_at: string;
};

export type ResumeSummary = {
  id: string;
  name: string;
  target_role: string | null;
  updated_at: string;
  is_base_resume: boolean;
};

export type ProfileSummary = {
  first_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  skills?: unknown;
  work_experience?: unknown;
  education?: unknown;
};

export function flattenSkills(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      out.push(item);
    } else if (item && typeof item === 'object' && 'skills' in item && Array.isArray((item as { skills: unknown }).skills)) {
      out.push(...((item as { skills: unknown[] }).skills.filter((s): s is string => typeof s === 'string')));
    }
  }
  return Array.from(new Set(out));
}

export function computeProfileCompletion(profile: ProfileSummary | null | undefined): { pct: number; missing: string[] } {
  const sections: { label: string; done: boolean }[] = [
    { label: 'Headline', done: !!profile?.headline },
    { label: 'Bio', done: !!profile?.bio },
    { label: 'Work experience', done: Array.isArray(profile?.work_experience) && profile!.work_experience!.length > 0 },
    { label: 'Education', done: Array.isArray(profile?.education) && profile!.education!.length > 0 },
    { label: 'Skills', done: flattenSkills(profile?.skills).length > 0 },
  ];
  const done = sections.filter((s) => s.done).length;
  return {
    pct: Math.round((done / sections.length) * 100),
    missing: sections.filter((s) => !s.done).map((s) => s.label),
  };
}

export function getOffers(metrics: DashboardMetrics): number {
  return Object.entries(metrics.applicationsByStatus)
    .filter(([k]) => k === 'offer' || k === 'accepted')
    .reduce((sum, [, v]) => sum + v, 0);
}

export function getResponseRate(metrics: DashboardMetrics): number {
  if (!metrics.applications) return 0;
  return Math.min(100, Math.round((metrics.interviews / metrics.applications) * 100));
}

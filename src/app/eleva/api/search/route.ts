import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { TEMPLATES } from '@/app/eleva/_lib/templates-catalog';

export const runtime = 'nodejs';

// GET /eleva/api/search?q=vercel
// Returns grouped results: resumes, applications, templates, ats_scores, cover_letters
export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
  if (!q || q.length < 1) return Response.json({ results: { resumes: [], applications: [], cover_letters: [], ats_scores: [], templates: [] } });

  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return Response.json({ results: { resumes: [], applications: [], cover_letters: [], ats_scores: [], templates: [] } });
  const uid = userRes.user.id;
  const like = `%${q}%`;

  const [resumesRes, applicationsRes, coverRes, atsRes] = await Promise.all([
    supabase.from('resumes').select('id, name, target_role, updated_at').eq('user_id', uid).or(`name.ilike.${like},target_role.ilike.${like}`).limit(6),
    supabase.from('applications').select('id, company, role, status, updated_at').eq('user_id', uid).or(`company.ilike.${like},role.ilike.${like}`).limit(6),
    supabase.from('cover_letters').select('id, company, role, created_at').eq('user_id', uid).or(`company.ilike.${like},role.ilike.${like}`).limit(6),
    supabase.from('ats_scores').select('id, overall, resume_id, created_at').eq('user_id', uid).ilike('raw->>summary', like).limit(6),
  ]);

  const ql = q.toLowerCase();
  const templates = TEMPLATES.filter((t) => t.name.toLowerCase().includes(ql) || t.category.includes(ql) || t.description.toLowerCase().includes(ql)).slice(0, 6);

  return Response.json({
    results: {
      resumes: resumesRes.data ?? [],
      applications: applicationsRes.data ?? [],
      cover_letters: coverRes.data ?? [],
      ats_scores: atsRes.data ?? [],
      templates,
    },
  });
}

import { WorkspaceShell } from '../_components/workspace-shell';
import { getUser } from '../_lib/data';
import { createClient } from '@/utils/supabase/server';
import { AtsClient } from './ats-client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AtsPage() {
  const user = await getUser();
  if (!user) redirect('/eleva/auth/login?next=/eleva/ats');

  const supabase = await createClient();
  const [reportsRes, resumesRes] = await Promise.all([
    supabase.from('ats_scores').select('id, resume_id, job_id, overall, keyword, formatting, readability, impact, recruiter, matched, missing, suggestions, raw, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(40),
    supabase.from('resumes').select('id, name, target_role, is_base_resume').eq('user_id', user.id).order('updated_at', { ascending: false }),
  ]);

  return (
    <WorkspaceShell>
      <AtsClient reports={(reportsRes.data ?? []) as any} resumes={(resumesRes.data ?? []) as any} />
    </WorkspaceShell>
  );
}

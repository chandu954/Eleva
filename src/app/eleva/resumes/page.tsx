import { WorkspaceShell } from '../_components/workspace-shell';
import { getUser } from '../_lib/data';
import { createClient } from '@/utils/supabase/server';
import { ResumesClient } from './resumes-client';
import type { Resume } from './types';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ResumesPage() {
  const user = await getUser();
  if (!user) redirect('/eleva/auth/login?next=/eleva/resumes');

  const supabase = await createClient();
  const { data: resumes } = await supabase
    .from('resumes')
    .select('id, user_id, name, target_role, updated_at, is_base_resume, document_settings, professional_summary')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  return (
    <WorkspaceShell>
      <ResumesClient initial={(resumes ?? []) as Resume[]} />
    </WorkspaceShell>
  );
}

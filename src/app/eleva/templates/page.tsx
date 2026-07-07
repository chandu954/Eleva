import { WorkspaceShell } from '../_components/workspace-shell';
import { TemplatesClient } from './templates-client';
import { getUser } from '../_lib/data';
import { createClient } from '@/utils/supabase/server';
import { TEMPLATES } from '../_lib/templates-catalog';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const user = await getUser();
  if (!user) redirect('/eleva');
  const supabase = await createClient();
  const { data: resumes } = await supabase.from('resumes').select('id, name, target_role, is_base_resume, document_settings, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false });
  return (
    <WorkspaceShell>
      <TemplatesClient templates={TEMPLATES} resumes={resumes ?? []} />
    </WorkspaceShell>
  );
}

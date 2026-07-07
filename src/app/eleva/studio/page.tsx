import { WorkspaceShell } from '../_components/workspace-shell';
import { StudioClient } from './studio-client';
import { getUser } from '../_lib/data';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const user = await getUser();
  if (!user) redirect('/eleva');
  const supabase = await createClient();
  const { data: resumes } = await supabase.from('resumes').select('id, name, target_role, is_base_resume').eq('user_id', user.id).order('updated_at', { ascending: false });
  return (
    <WorkspaceShell>
      <StudioClient resumes={resumes ?? []} />
    </WorkspaceShell>
  );
}

import { WorkspaceShell } from '../_components/workspace-shell';
import { getUser, getProfile } from '../_lib/data';
import { CareerClient } from './career-client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CareerPage() {
  const user = await getUser();
  if (!user) redirect('/eleva/auth/login?next=/eleva/career');

  const profile = await getProfile(user.id);

  return (
    <WorkspaceShell>
      <CareerClient profile={profile} _userId={user.id} />
    </WorkspaceShell>
  );
}

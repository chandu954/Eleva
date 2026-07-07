import { WorkspaceShell } from '../_components/workspace-shell';
import { getUser, getApplications } from '../_lib/data';
import { ApplicationsClient } from './applications-client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ApplicationsPage() {
  const user = await getUser();
  if (!user) redirect('/eleva/auth/login?next=/eleva/applications');
  const applications = await getApplications(user.id);
  return (
    <WorkspaceShell>
      <ApplicationsClient initial={applications as any} />
    </WorkspaceShell>
  );
}

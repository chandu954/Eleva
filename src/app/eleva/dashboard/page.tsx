import { WorkspaceShell } from '../_components/workspace-shell';
import { getUser, getDashboardMetrics, getRecentActivity, getRecentResumes, getRecentAtsReports, getProfile } from '../_lib/data';
import { DashboardClient } from './dashboard-client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const user = await getUser();
  if (!user) redirect('/eleva/auth/login?next=/eleva/dashboard');

  const [metrics, activity, recentResumes, recentAts, profile] = await Promise.all([
    getDashboardMetrics(user.id),
    getRecentActivity(user.id, 8),
    getRecentResumes(user.id, 5),
    getRecentAtsReports(user.id, 5),
    getProfile(user.id),
  ]);

  const name = profile?.first_name || (user.email?.split('@')[0] ?? 'there');

  return (
    <WorkspaceShell>
      <DashboardClient
        name={name}
        metrics={metrics}
        activity={activity}
        recentResumes={recentResumes}
        recentAts={recentAts}
      />
    </WorkspaceShell>
  );
}

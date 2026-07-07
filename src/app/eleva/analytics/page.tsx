import { WorkspaceShell } from '../_components/workspace-shell';
import { getUser, getDashboardMetrics, getAiUsage, getRecentAtsReports } from '../_lib/data';
import { AnalyticsClient } from './analytics-client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const user = await getUser();
  if (!user) redirect('/eleva');
  const [metrics, usage, atsReports] = await Promise.all([
    getDashboardMetrics(user.id),
    getAiUsage(user.id, 30),
    getRecentAtsReports(user.id, 20),
  ]);
  return (
    <WorkspaceShell>
      <AnalyticsClient metrics={metrics} usage={usage} atsReports={atsReports} />
    </WorkspaceShell>
  );
}

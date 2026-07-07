import { WorkspaceShell } from '../_components/workspace-shell';
import { getUser, getProfile, getSubscription, getUserPreferences, getAiUsage } from '../_lib/data';
import { SettingsClient } from './settings-client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect('/eleva');
  const [profile, subscription, prefs, usage] = await Promise.all([
    getProfile(user.id),
    getSubscription(user.id),
    getUserPreferences(user.id),
    getAiUsage(user.id, 30),
  ]);
  return (
    <WorkspaceShell>
      <SettingsClient
        email={user.email ?? ''}
        userId={user.id}
        profile={profile}
        subscription={subscription}
        prefs={prefs}
        usageCount={usage.length}
        tokensUsed={usage.reduce((s, u: { input_tokens?: number; output_tokens?: number }) => s + (u.input_tokens ?? 0) + (u.output_tokens ?? 0), 0)}
      />
    </WorkspaceShell>
  );
}

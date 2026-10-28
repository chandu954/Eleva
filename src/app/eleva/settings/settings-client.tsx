'use client';

import { useEffect, useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { User2, Sparkles, Shield, Palette, Bell, Trash2, ExternalLink, Network, Wifi } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { updateProfile, updatePreferences, deleteAccount } from '../_lib/actions-settings';
import { ProvidersTab } from './provider-settings-tab';
import type { ProfileRow, PrefsRow, Sub, ProviderKeyEntry } from './settings-types';
import { createClient } from '@/utils/supabase/client';
import { getAiStatus, subscribeAiStatus } from '../_lib/ai-status';

const NAV_GROUPS: { label: string; items: { id: string; label: string; icon: LucideIcon }[] }[] = [
  {
    label: 'General',
    items: [
      { id: 'status',        label: 'System Status',     icon: Wifi },
      { id: 'profile',       label: 'Profile',          icon: User2 },
      { id: 'appearance',    label: 'Appearance',       icon: Palette },
      { id: 'notifications', label: 'Notifications',    icon: Bell },
    ],
  },
  {
    label: 'AI',
    items: [
      { id: 'ai',            label: 'AI Preferences',   icon: Sparkles },
      { id: 'ai-providers',  label: 'Providers',        icon: Network },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'account',       label: 'Account & Security', icon: Shield },
      { id: 'danger',        label: 'Danger Zone',      icon: Trash2 },
    ],
  },
];


function detectTimezone() {
  if (typeof window === 'undefined') return '';
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}

export function SettingsClient({ email, userId, profile, subscription, prefs, usageCount, tokensUsed, providerKeys }: { email: string; userId: string; profile: ProfileRow | null; subscription: Sub; prefs: PrefsRow; usageCount: number; tokensUsed: number; providerKeys: ProviderKeyEntry[] }) {
  const [tab, setTab] = useState('status');
  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Workspace · Settings</div>
        <h1 className="font-display text-4xl font-semibold tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>Settings</h1>
      </motion.div>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2 text-[10px] uppercase tracking-[0.18em] font-mono mb-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)} className="w-full text-left px-3 py-2 rounded-lg text-[13px] flex items-center gap-2.5 transition-colors" style={{ background: tab === t.id ? 'rgb(var(--eleva-muted))' : 'transparent', color: tab === t.id ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))', fontWeight: tab === t.id ? 500 : 400 }}>
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <div className="eleva-card p-6">
          {tab === 'status' && <StatusTab email={email} providerKeys={providerKeys} prefs={prefs} />}
          {tab === 'profile' && <ProfileTab profile={profile} />}
          {tab === 'appearance' && <AppearanceTab prefs={prefs} />}
          {tab === 'notifications' && <NotificationsTab prefs={prefs} />}
          {tab === 'ai' && <AiPrefsTab prefs={prefs} usageCount={usageCount} tokensUsed={tokensUsed} />}
          {tab === 'ai-providers' && <ProvidersTab providerKeys={providerKeys} />}
          {tab === 'account' && <AccountSecurityTab email={email} userId={userId} subscription={subscription} />}
          {tab === 'danger' && <DangerTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ profile }: { profile: ProfileRow | null }) {
  const [isPending, startTransition] = useTransition();
  const [detected, setDetected] = useState('');
  useEffect(() => {
    setDetected(detectTimezone());
  }, []);
  const [timezone, setTimezone] = useState(profile?.timezone ?? '');
  return (
    <form action={(fd) => { startTransition(async () => { const r = await updateProfile(fd); if (r?.error) toast.error('Save failed', { description: r.error }); else toast.success('Profile updated'); }); }}>
      <SectionHead title="Profile" desc="How you appear on generated resumes and cover letters." />
      <div className="grid md:grid-cols-2 gap-4">
        <Field name="first_name" label="First name" defaultValue={profile?.first_name ?? ''} />
        <Field name="last_name" label="Last name" defaultValue={profile?.last_name ?? ''} />
        <Field name="headline" label="Headline" defaultValue={profile?.headline ?? ''} placeholder="Staff Backend Engineer" full />
        <Field name="bio" label="Bio" defaultValue={profile?.bio ?? ''} textarea full />
        <Field name="location" label="Location" defaultValue={profile?.location ?? ''} placeholder="Pune, India" />
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Timezone</label>
          <input name="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder={detected || 'Detect automatically'} className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} />
          {!profile?.timezone && detected && (
            <p className="text-[11px] mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Detected from your browser. You can override it.</p>
          )}
        </div>
        <Field name="phone_number" label="Phone" defaultValue={profile?.phone_number ?? ''} />
        <Field name="website" label="Website" defaultValue={profile?.website ?? ''} />
        <Field name="linkedin_url" label="LinkedIn" defaultValue={profile?.linkedin_url ?? ''} />
        <Field name="github_url" label="GitHub" defaultValue={profile?.github_url ?? ''} />
        <Field name="portfolio_url" label="Portfolio" defaultValue={profile?.portfolio_url ?? ''} full />
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button type="submit" disabled={isPending} className="eleva-btn-primary">{isPending ? 'Saving…' : 'Save changes'}</button>
      </div>
    </form>
  );
}

function AppearanceTab({ prefs }: { prefs: PrefsRow }) {
  const [theme, setTheme] = useState(prefs?.theme || 'system');
  const [isPending, startTransition] = useTransition();
  return (
    <div>
      <SectionHead title="Appearance" desc="Theme and layout preferences." />
      <div className="grid grid-cols-3 gap-3 mb-4">
        {(['light', 'dark', 'system'] as const).map((t) => (
          <button key={t} onClick={() => setTheme(t)} className="p-4 rounded-lg text-center capitalize text-[13px]" style={{ background: theme === t ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted))', color: theme === t ? 'rgb(var(--eleva-bg))' : 'rgb(var(--eleva-fg))' }}>
            {t}
          </button>
        ))}
      </div>
      <button className="eleva-btn-primary" disabled={isPending} onClick={() => { startTransition(async () => { const r = await updatePreferences({ theme }); if (r?.error) toast.error(r.error); else { toast.success('Theme saved'); if (typeof window !== 'undefined') { document.documentElement.dataset.theme = theme; localStorage.setItem('eleva.theme', theme); } } }); }}>{isPending ? 'Saving…' : 'Save appearance'}</button>
    </div>
  );
}

function NotificationsTab({ prefs }: { prefs: PrefsRow }) {
  const [state, setState] = useState({
    email_digest: prefs?.email_digest ?? true,
    realtime_notifications: prefs?.realtime_notifications ?? true,
    product_updates: prefs?.product_updates ?? false,
  });
  const [isPending, startTransition] = useTransition();
  return (
    <div>
      <SectionHead title="Notifications" desc="Choose what pings you." />
      <div className="space-y-3 mb-6">
        <Toggle label="Weekly email digest" desc="Summary of ATS trends and application activity." checked={state.email_digest} onChange={(v) => setState({ ...state, email_digest: v })} />
        <Toggle label="Realtime in-app" desc="Live updates when AI jobs complete." checked={state.realtime_notifications} onChange={(v) => setState({ ...state, realtime_notifications: v })} />
        <Toggle label="Product updates" desc="New templates and features." checked={state.product_updates} onChange={(v) => setState({ ...state, product_updates: v })} />
      </div>
      <button className="eleva-btn-primary" disabled={isPending} onClick={() => { startTransition(async () => { const r = await updatePreferences(state); if (r?.error) toast.error(r.error); else toast.success('Notifications saved'); }); }}>{isPending ? 'Saving…' : 'Save preferences'}</button>
    </div>
  );
}

function AiPrefsTab({ prefs, usageCount, tokensUsed }: { prefs: PrefsRow; usageCount: number; tokensUsed: number }) {
  const [model, setModel] = useState(prefs?.default_model || 'openrouter/free');
  const [isPending, startTransition] = useTransition();
  const models = [
    { id: 'openrouter/free', label: 'OpenRouter Free (auto)', desc: 'Best available free model, auto-routed' },
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super 120B', desc: '1M context, strong reasoning' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', desc: 'Meta open source' },
    { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B', desc: 'Google latest open model' },
  ];
  return (
    <div>
      <SectionHead title="AI Preferences" desc="Pick the model your Studio uses by default." />
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        {models.map((m) => (
          <button key={m.id} onClick={() => setModel(m.id)} className="p-4 rounded-lg text-left" style={{ background: model === m.id ? 'rgb(var(--eleva-muted))' : 'transparent', border: `1px solid ${model === m.id ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-border))'}` }}>
            <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{m.label}</div>
            <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{m.desc}</div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-4 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="text-[11px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>AI calls</div>
          <div className="font-display text-3xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{usageCount}</div>
          <div className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Last 30 days</div>
        </div>
        <div className="p-4 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="text-[11px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Tokens used</div>
          <div className="font-display text-3xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{tokensUsed.toLocaleString()}</div>
          <div className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Last 30 days</div>
        </div>
      </div>
      <button className="eleva-btn-primary" disabled={isPending} onClick={() => { startTransition(async () => { const r = await updatePreferences({ default_model: model }); if (r?.error) toast.error(r.error); else toast.success('AI default saved'); }); }}>{isPending ? 'Saving…' : 'Save AI defaults'}</button>
    </div>
  );
}

/* Provider controls are implemented in provider-settings-tab.tsx. */
function AccountSecurityTab({ email, userId, subscription }: { email: string; userId: string; subscription: Sub }) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const plan = subscription?.subscription_plan ?? 'free';
  const isPro = plan === 'pro';
  async function resetPw() {
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success('Password reset sent to ' + email);
  }
  async function signOutOthers() {
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    setBusy(false);
    if (error) toast.error(error.message); else toast.success('All other sessions signed out');
  }
  return (
    <div>
      <SectionHead title="Account & Security" desc="Your account, subscription, and session security." />
      <div className="p-4 rounded-lg mb-5" style={{ background: 'rgb(var(--eleva-muted))', border: '1px solid rgb(var(--eleva-border))' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono uppercase mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Subscription</div>
            <div className="text-[14px] font-medium capitalize" style={{ color: 'rgb(var(--eleva-fg))' }}>{plan} · {subscription?.subscription_status ?? 'no active subscription'}</div>
            {subscription?.current_period_end && (
              <div className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Renews {new Date(subscription.current_period_end).toLocaleDateString('en-US')}</div>
            )}
          </div>
          <a href="/subscription" className="eleva-btn-primary text-[12px] inline-flex items-center gap-1.5 shrink-0">
            {isPro ? 'Manage subscription' : 'Upgrade to Pro'} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="mt-3 pt-3 border-t space-y-3" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
          <ReadRow k="Email" v={email} />
          <ReadRow k="User ID" v={userId} />
        </div>
      </div>
      <div className="space-y-3">
        <ActionRow title="Reset password" desc="We’ll email a reset link to your account." cta={busy ? '…' : 'Send email'} onClick={resetPw} />
        <ActionRow title="Sign out other sessions" desc="Keeps this browser logged in. Signs out everyone else." cta={busy ? '…' : 'Sign out'} onClick={signOutOthers} />
        <div className="flex items-center justify-between p-4 rounded-lg gap-4" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Two-factor authentication</div>
            <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Add an extra layer of security to your account.</div>
          </div>
          <span className="text-[10px] font-mono px-2 py-1 rounded-full shrink-0" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>COMING SOON</span>
        </div>
      </div>
    </div>
  );
}

function DangerTab() {
  const [confirm, setConfirm] = useState('');
  const [isPending, startTransition] = useTransition();
  return (
    <div>
      <SectionHead title="Danger zone" desc="Irreversible actions." />
      <div className="p-5 rounded-lg" style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.4)' }}>
        <div className="font-display text-lg font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Delete account</div>
        <p className="text-[13px] mt-1 mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
          This permanently deletes all of your data — resumes, cover letters, applications, ATS reports, AI history, and your account itself. Type{' '}
          <span className="font-mono text-[12px]" style={{ color: 'rgb(var(--eleva-fg))' }}>DELETE</span> to enable the button.
        </p>
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type DELETE" className="w-64 px-3 py-2 rounded-md text-[13px] font-mono outline-none mb-3" style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-fg))' }} />
        <div>
          <button disabled={confirm !== 'DELETE' || isPending} onClick={() => startTransition(async () => { const r = await deleteAccount(); if (r?.error) toast.error(r.error); else { toast.success('Account deleted'); window.location.href = '/eleva'; } })} className="text-[13px] font-medium px-4 py-2 rounded-md" style={{ background: 'rgb(220,38,38)', color: '#fff', opacity: confirm === 'DELETE' ? 1 : 0.4 }}>
            <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Delete my account
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-5">
      <div className="font-display text-xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{title}</div>
      <div className="text-[13px] mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{desc}</div>
    </div>
  );
}

function Field({ name, label, defaultValue, placeholder, full, textarea }: { name: string; label: string; defaultValue?: string; placeholder?: string; full?: boolean; textarea?: boolean }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{label}</label>
      {textarea ? (
        <textarea name={name} defaultValue={defaultValue ?? ''} rows={3} placeholder={placeholder} className="w-full px-3 py-2 rounded-md text-[13px] outline-none resize-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} />
      ) : (
        <input name={name} defaultValue={defaultValue ?? ''} placeholder={placeholder} className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} />
      )}
    </div>
  );
}

function ReadRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{k}</div>
      <div className="font-mono text-[12px] truncate" style={{ color: 'rgb(var(--eleva-fg))' }}>{v}</div>
    </div>
  );
}

type HealthResp = { status: string; database: string; env: Record<string, string>; timestamp: string };

function StatusTab({ email, providerKeys, prefs }: { email: string; providerKeys: ProviderKeyEntry[]; prefs: PrefsRow }) {
  const [health, setHealth] = useState<HealthResp | null>(null);
  const [healthErr, setHealthErr] = useState(false);
  const [ai, setAi] = useState(getAiStatus());

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setHealth(d))
      .catch(() => setHealthErr(true));
  }, []);

  useEffect(() => subscribeAiStatus(setAi), []);

  const rows: { label: string; value: string; ok?: boolean }[] = [];
  if (health) {
    rows.push({ label: 'Supabase database', value: health.database === 'connected' ? 'Connected' : 'Error', ok: health.database === 'connected' });
    rows.push({ label: 'Required env vars', value: health.env.NEXT_PUBLIC_SUPABASE_URL && health.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && health.env.SUPABASE_SERVICE_ROLE_KEY ? 'All set' : 'Missing', ok: !!(health.env.NEXT_PUBLIC_SUPABASE_URL && health.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && health.env.SUPABASE_SERVICE_ROLE_KEY) });
  } else {
    rows.push({ label: 'Health endpoint', value: healthErr ? 'Unreachable' : 'Checking…', ok: !healthErr });
  }
  rows.push({ label: 'Email', value: email, ok: true });
  rows.push({ label: 'AI provider keys', value: providerKeys.length > 0 ? `${providerKeys.filter((k) => k.hasKey).length} configured` : 'Not configured', ok: providerKeys.some((k) => k.hasKey) });
  rows.push({ label: 'Default model', value: prefs?.default_model || 'openrouter/free', ok: true });
  rows.push({ label: 'AI runtime', value: ai.state === 'error' ? 'Error' : ai.state === 'running' ? `Running: ${ai.label ?? ''}` : ai.state === 'done' ? 'Last run finished' : 'Idle', ok: ai.state !== 'error' });

  return (
    <div>
      <SectionHead title="System Status" desc="Live health of your workspace services." />
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        {rows.map((r) => (
          <div key={r.label} className="p-4 rounded-lg flex items-center justify-between" style={{ background: 'rgb(var(--eleva-muted))' }}>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{r.label}</div>
              <div className="text-[13px] font-medium mt-0.5" style={{ color: 'rgb(var(--eleva-fg))' }}>{r.value}</div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.ok === undefined ? 'rgb(var(--eleva-muted-fg))' : r.ok ? 'rgb(var(--eleva-success, 34 197 94))' : 'rgb(var(--eleva-danger, 239 68 68))' }} />
          </div>
        ))}
      </div>
      {health && (
        <ReadRow k="Server time (UTC)" v={new Date(health.timestamp).toLocaleString()} />
      )}
      {healthErr && (
        <p className="text-[12px] mt-2" style={{ color: 'rgb(var(--eleva-danger, 239 68 68))' }}>Could not reach the health endpoint. Check that the server is running.</p>
      )}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="w-full flex items-center justify-between p-3 rounded-lg text-left" style={{ background: 'rgb(var(--eleva-muted))' }}>
      <div className="flex-1">
        <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{label}</div>
        <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{desc}</div>
      </div>
      <div className="w-9 h-5 rounded-full relative transition-colors" style={{ background: checked ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-border))' }}>
        <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{ background: '#fff', left: checked ? '18px' : '2px' }} />
      </div>
    </button>
  );
}

function ActionRow({ title, desc, cta, onClick }: { title: string; desc: string; cta: string; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg gap-4" style={{ background: 'rgb(var(--eleva-muted))' }}>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{title}</div>
        <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{desc}</div>
      </div>
      <button onClick={onClick} className="eleva-btn-primary text-[12px] shrink-0">{cta}</button>
    </div>
  );
}

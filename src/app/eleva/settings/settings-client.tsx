'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { User2, Sparkles, Shield, Palette, Bell, Trash2, ExternalLink, Network, Cpu, Bot, Globe, Eye, EyeOff, Loader2, Wifi } from 'lucide-react';
import { updateProfile, updatePreferences, deleteAccount } from '../_lib/actions-settings';
import { createClient } from '@/utils/supabase/client';
import { saveProviderKey, deleteProviderKey, validateProviderKey } from '../_lib/actions-ai-providers';
import { PROVIDER_DEFINITIONS, type ProviderId } from '@/lib/ai/provider/registry';

const NAV_GROUPS: { label: string; items: { id: string; label: string; icon: React.ComponentType<any> }[] }[] = [
  {
    label: 'General',
    items: [
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

type ProfileRow = { first_name?: string | null; last_name?: string | null; headline?: string | null; bio?: string | null; location?: string | null; timezone?: string | null; website?: string | null; linkedin_url?: string | null; github_url?: string | null; portfolio_url?: string | null; phone_number?: string | null };
type PrefsRow = { theme?: string; default_model?: string; email_digest?: boolean; realtime_notifications?: boolean; product_updates?: boolean } | null;
type Sub = { subscription_plan?: string; subscription_status?: string; current_period_end?: string; stripe_customer_id?: string | null } | null;
type ProviderKeyEntry = { id: string; provider: ProviderId; hasKey: boolean; baseUrl?: string | null; defaultModel?: string | null; providerMode: string; status: string; lastValidatedAt?: string | null; createdAt: string };

function detectTimezone() {
  if (typeof window === 'undefined') return '';
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}

export function SettingsClient({ email, userId, profile, subscription, prefs, usageCount, tokensUsed, providerKeys }: { email: string; userId: string; profile: ProfileRow | null; subscription: Sub; prefs: PrefsRow; usageCount: number; tokensUsed: number; providerKeys: ProviderKeyEntry[] }) {
  const [tab, setTab] = useState('profile');
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
  const detected = detectTimezone();
  const [timezone, setTimezone] = useState(profile?.timezone ?? detected);
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

function ProvidersTab({ providerKeys }: { providerKeys: ProviderKeyEntry[] }) {
  return (
    <div>
      <SectionHead title="Providers" desc="Connect your own AI providers. Your keys are encrypted before storage (AES-256-GCM)." />
      <div className="grid gap-4">
        {PROVIDER_DEFINITIONS.map((def) => {
          const saved = providerKeys.find(k => k.provider === def.id);
          return <ProviderCard key={def.id} def={def} saved={saved ?? null} />;
        })}
      </div>
      <div className="mt-6 p-4 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
        <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
          <strong>Auto mode:</strong> Eleva automatically tries providers in order: NVIDIA → Gemini → OpenRouter → Anthropic → OpenAI → Ollama. Within each provider, models are tried sequentially (e.g., Qwen → DeepSeek → Llama on OpenRouter).
        </div>
      </div>
    </div>
  );
}

const PROVIDER_ICONS: Record<string, React.ComponentType<any>> = {
  openai: Sparkles,
  anthropic: Bot,
  gemini: Globe,
  openrouter: Network,
  nvidia: Cpu,
  ollama: Wifi,
};

function ProviderCard({ def, saved }: { def: typeof PROVIDER_DEFINITIONS[0]; saved: ProviderKeyEntry | null }) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(def.requiresBaseUrl ? (saved?.baseUrl ?? 'http://localhost:11434') : '');
  const [mode, setMode] = useState<'auto' | 'manual'>(saved?.providerMode as 'auto' | 'manual' ?? 'auto');
  const [status, setStatus] = useState(saved?.status ?? 'disconnected');
  const [validating, setValidating] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);
  const Icon = PROVIDER_ICONS[def.id] ?? Sparkles;

  const isConnected = status === 'connected' && saved?.hasKey;
  const freeCount = def.models.filter(m => m.free).length;

  async function handleSave() {
    setSaving(true);
    try {
      await saveProviderKey(def.id, apiKey, { baseUrl: def.requiresBaseUrl ? baseUrl : undefined, providerMode: mode });
      toast.success(`${def.name} saved`);
      setApiKey('');
    } catch (e: any) {
      toast.error(e.message ?? 'Save failed');
    }
    setSaving(false);
  }

  async function handleValidate() {
    setValidating(true);
    setStatus('testing');
    try {
      const { healthy, latency, status: s } = await validateProviderKey(def.id);
      setStatus(s);
      if (healthy) toast.success(`${def.name} — Connected (${latency}ms)`);
      else toast.error(`${def.name} — ${s}`);
    } catch {
      setStatus('disconnected');
      toast.error('Validation failed');
    }
    setValidating(false);
  }

  async function handleDelete() {
    try {
      await deleteProviderKey(def.id);
      setStatus('disconnected');
      toast.success(`${def.name} disconnected`);
    } catch (e: any) {
      toast.error(e.message ?? 'Delete failed');
    }
  }

  const statusBadge = isConnected
    ? { label: 'Connected', color: 'rgb(var(--eleva-success))' }
    : status === 'testing'
    ? { label: 'Testing…', color: 'rgb(var(--eleva-primary))' }
    : status === 'rate_limited'
    ? { label: 'Rate Limited', color: 'rgb(var(--eleva-warning))' }
    : status === 'invalid_key'
    ? { label: 'Invalid Key', color: 'rgb(var(--eleva-warning))' }
    : { label: 'Not Connected', color: 'rgb(var(--eleva-muted-fg))' };

  return (
    <div className="p-5 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))', border: isConnected ? '1px solid rgb(var(--eleva-success))' : '1px solid rgb(var(--eleva-border))' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgb(var(--eleva-card))' }}>
            <Icon className="w-4 h-4" style={{ color: 'rgb(var(--eleva-fg))' }} />
          </div>
          <div>
            <div className="text-[14px] font-medium flex items-center gap-2" style={{ color: 'rgb(var(--eleva-fg))' }}>
              {def.name}
              {isConnected && <Wifi className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} />}
            </div>
            <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{def.description}</div>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: statusBadge.color + '20', color: statusBadge.color }}>
          {statusBadge.label}
        </span>
      </div>

      {!isConnected && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type={reveal ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`${def.id.toUpperCase()} API key`}
              className="flex-1 px-3 py-2 rounded-md text-[13px] outline-none font-mono"
              style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-fg))' }}
            />
            <button onClick={() => setReveal(!reveal)} className="px-2 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {def.requiresBaseUrl && (
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none font-mono"
              style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-fg))' }}
            />
          )}
          <div className="flex items-center gap-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'auto' | 'manual')}
              className="px-3 py-2 rounded-md text-[12px] outline-none"
              style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-fg))' }}
            >
              <option value="auto">Auto (best model)</option>
              <option value="manual">Manual (first model)</option>
            </select>
            <button onClick={handleSave} disabled={saving || (!apiKey && !baseUrl)} className="eleva-btn-primary text-[12px] px-4">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {isConnected && (
        <div className="flex items-center gap-2">
          <button onClick={handleValidate} disabled={validating} className="eleva-btn-primary text-[12px] px-4">
            {validating ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
            Validate
          </button>
          <button onClick={handleDelete} className="text-[12px] px-3 py-2 rounded-md" style={{ color: 'rgb(var(--eleva-warning))' }}>
            Disconnect
          </button>
          <span className="text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            {freeCount} {freeCount === 1 ? 'free model' : 'free models'} available
          </span>
          {saved?.lastValidatedAt && (
            <span className="text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Last validated: {new Date(saved.lastValidatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {!isConnected && status !== 'disconnected' && status !== 'testing' && (
        <div className="flex items-center gap-2 mt-3">
          <button onClick={handleValidate} disabled={validating} className="text-[12px] px-3 py-1.5 rounded-md" style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-muted-fg))' }}>
            {validating ? 'Testing…' : 'Re-test'}
          </button>
          <button onClick={handleDelete} className="text-[12px]" style={{ color: 'rgb(var(--eleva-warning))' }}>
            Remove
          </button>
        </div>
      )}

      <div className="mt-3 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
        Model chain: {def.modelChain.map(m => {
          const md = def.models.find(x => x.id === m);
          return md?.displayName ?? m;
        }).join(' → ')}
      </div>
    </div>
  );
}

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

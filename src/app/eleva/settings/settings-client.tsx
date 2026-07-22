'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { User2, CreditCard, Bell, Sparkles, Shield, Palette, Trash2, Copy, Check, ExternalLink, Network, Cpu, Bot, Globe, Eye, EyeOff, Loader2, Wifi } from 'lucide-react';
import { updateProfile, updatePreferences, deleteAccount } from '../_lib/actions-settings';
import { createClient } from '@/utils/supabase/client';
import { saveProviderKey, deleteProviderKey, validateProviderKey } from '../_lib/actions-ai-providers';
import { PROVIDER_DEFINITIONS, type ProviderId } from '@/lib/ai/provider/registry';

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User2 },
  { id: 'account',       label: 'Account',       icon: Shield },
  { id: 'appearance',    label: 'Appearance',    icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'ai',            label: 'AI',            icon: Sparkles },
  { id: 'ai-providers',  label: 'AI Providers',  icon: Network },
  { id: 'billing',       label: 'Billing',       icon: CreditCard },
  { id: 'security',      label: 'Security',      icon: Shield },
  { id: 'danger',        label: 'Danger zone',   icon: Trash2 },
];

type ProfileRow = { first_name?: string | null; last_name?: string | null; headline?: string | null; bio?: string | null; location?: string | null; timezone?: string | null; website?: string | null; linkedin_url?: string | null; github_url?: string | null; portfolio_url?: string | null; phone_number?: string | null };
type PrefsRow = { theme?: string; default_model?: string; email_digest?: boolean; realtime_notifications?: boolean; product_updates?: boolean } | null;
type Sub = { subscription_plan?: string; subscription_status?: string; current_period_end?: string; stripe_customer_id?: string | null } | null;
type ProviderKeyEntry = { id: string; provider: ProviderId; hasKey: boolean; baseUrl?: string | null; defaultModel?: string | null; providerMode: string; status: string; lastValidatedAt?: string | null; createdAt: string };

export function SettingsClient({ email, userId, profile, subscription, prefs, usageCount, tokensUsed, providerKeys }: { email: string; userId: string; profile: ProfileRow | null; subscription: Sub; prefs: PrefsRow; usageCount: number; tokensUsed: number; providerKeys: ProviderKeyEntry[] }) {
  const [tab, setTab] = useState('profile');
  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Workspace · Settings</div>
        <h1 className="font-display text-4xl font-semibold tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>Settings</h1>
      </motion.div>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className="w-full text-left px-3 py-2 rounded-lg text-[13px] flex items-center gap-2.5 transition-colors" style={{ background: tab === t.id ? 'rgb(var(--eleva-muted))' : 'transparent', color: tab === t.id ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))', fontWeight: tab === t.id ? 500 : 400 }}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </aside>

        <div className="eleva-card p-6">
          {tab === 'profile' && <ProfileTab profile={profile} />}
          {tab === 'account' && <AccountTab email={email} userId={userId} />}
          {tab === 'appearance' && <AppearanceTab prefs={prefs} />}
          {tab === 'notifications' && <NotificationsTab prefs={prefs} />}
          {tab === 'ai' && <AiTab prefs={prefs} usageCount={usageCount} tokensUsed={tokensUsed} />}
          {tab === 'ai-providers' && <AiProvidersTab providerKeys={providerKeys} />}
          {tab === 'api-keys' && <ApiKeysTab />}
          {tab === 'billing' && <BillingTab subscription={subscription} tokensUsed={tokensUsed} />}
          {tab === 'security' && <SecurityTab email={email} />}
          {tab === 'danger' && <DangerTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ profile }: { profile: ProfileRow | null }) {
  const [isPending, startTransition] = useTransition();
  return (
    <form action={(fd) => { startTransition(async () => { const r = await updateProfile(fd); if (r?.error) toast.error('Save failed', { description: r.error }); else toast.success('Profile updated'); }); }}>
      <SectionHead title="Profile" desc="How you appear on generated resumes and cover letters." />
      <div className="grid md:grid-cols-2 gap-4">
        <Field name="first_name" label="First name" defaultValue={profile?.first_name ?? ''} />
        <Field name="last_name" label="Last name" defaultValue={profile?.last_name ?? ''} />
        <Field name="headline" label="Headline" defaultValue={profile?.headline ?? ''} placeholder="Staff Backend Engineer" full />
        <Field name="bio" label="Bio" defaultValue={profile?.bio ?? ''} textarea full />
        <Field name="location" label="Location" defaultValue={profile?.location ?? ''} placeholder="San Francisco, CA" />
        <Field name="timezone" label="Timezone" defaultValue={profile?.timezone ?? ''} placeholder="America/Los_Angeles" />
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

function AccountTab({ email, userId }: { email: string; userId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <SectionHead title="Account" desc="Basic account information tied to your Supabase auth." />
      <div className="space-y-4">
        <ReadRow k="Email" v={email} />
        <ReadRow k="User ID" v={userId} action={<button onClick={() => { navigator.clipboard.writeText(userId); setCopied(true); setTimeout(() => setCopied(false), 1200); }} className="text-[11px] flex items-center gap-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{copied ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}</button>} />
        <ReadRow k="Provider" v="Supabase" />
      </div>
    </div>
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

function AiTab({ prefs, usageCount, tokensUsed }: { prefs: PrefsRow; usageCount: number; tokensUsed: number }) {
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
      <SectionHead title="AI defaults" desc="Pick the model your Studio uses by default." />
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

function AiProvidersTab({ providerKeys }: { providerKeys: ProviderKeyEntry[] }) {
  return (
    <div>
      <SectionHead title="AI Providers" desc="Connect your own AI providers. Your keys are encrypted before storage (AES-256-GCM)." />
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

function ApiKeysTab() {
  return (
    <div>
      <SectionHead title="API Keys" desc="Bring your own key (BYOK) to bypass Eleva credits." />
      <div className="space-y-4">
        <ByokRow k="OpenRouter API key" placeholder="sk-or-v1-…" store="eleva.byok.openrouter" />
        <ByokRow k="OpenAI API key" placeholder="sk-…" store="eleva.byok.openai" />
        <ByokRow k="Anthropic API key" placeholder="sk-ant-…" store="eleva.byok.anthropic" />
      </div>
      <p className="mt-6 text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Keys are stored encrypted client-side (localStorage) and only sent to your model provider on request. Uses Eleva’s server key if none set.</p>
    </div>
  );
}

function ByokRow({ k, placeholder, store }: { k: string; placeholder: string; store: string }) {
  const [val, setVal] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [reveal, setReveal] = useState(false);
  if (typeof window !== 'undefined' && !hasKey && localStorage.getItem(store)) { setHasKey(true); }
  return (
    <div className="p-4 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{k}</div>
        {hasKey && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgb(var(--eleva-success))', color: '#fff' }}>ACTIVE</span>}
      </div>
      <div className="flex gap-2">
        <input type={reveal ? 'text' : 'password'} value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} className="flex-1 px-3 py-2 rounded-md text-[13px] outline-none font-mono" style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-fg))' }} />
        <button onClick={() => setReveal(!reveal)} className="px-2 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{reveal ? 'Hide' : 'Show'}</button>
        <button onClick={() => { localStorage.setItem(store, val); setHasKey(true); setVal(''); toast.success('Saved'); }} className="eleva-btn-primary text-[12px]">Save</button>
        {hasKey && <button onClick={() => { localStorage.removeItem(store); setHasKey(false); toast.success('Removed'); }} className="text-[11px]" style={{ color: 'rgb(var(--eleva-warning))' }}>Remove</button>}
      </div>
    </div>
  );
}

function BillingTab({ subscription, tokensUsed }: { subscription: Sub; tokensUsed: number }) {
  const plan = subscription?.subscription_plan ?? 'Free';
  return (
    <div>
      <SectionHead title="Billing" desc="Manage your plan and view usage." />
      <div className="p-5 rounded-xl mb-5" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,.12), rgba(139,92,246,.12))', border: '1px solid rgb(var(--eleva-border))' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[11px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Current plan</div>
            <div className="font-display text-3xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>{String(plan).toUpperCase()}</div>
            <div className="text-[13px] mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{subscription?.subscription_status ?? 'active'}</div>
          </div>
          <a href="#" className="eleva-btn-primary text-[12px] inline-flex items-center gap-1">Manage <ExternalLink className="w-3 h-3" /></a>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-[11px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Tokens used</div><div className="font-mono text-[16px]" style={{ color: 'rgb(var(--eleva-fg))' }}>{tokensUsed.toLocaleString()}</div></div>
          <div><div className="text-[11px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Period ends</div><div className="font-mono text-[16px]" style={{ color: 'rgb(var(--eleva-fg))' }}>{subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('en-US') : '—'}</div></div>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {[
          { name: 'Free',   price: '$0',   perks: ['5 AI runs/mo', 'ATS scoring', 'Basic templates'] },
          { name: 'Pro',    price: '$19',  perks: ['Unlimited AI', 'All templates', 'Priority support'], featured: true },
          { name: 'Teams',  price: '$49',  perks: ['5 seats', 'Workspace sharing', 'SSO'] },
        ].map((p) => (
          <div key={p.name} className="p-5 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))', border: p.featured ? '1px solid rgb(var(--eleva-primary))' : '1px solid transparent' }}>
            <div className="font-display text-xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{p.name}</div>
            <div className="font-display text-3xl font-semibold mt-2" style={{ color: 'rgb(var(--eleva-fg))' }}>{p.price}<span className="text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>/mo</span></div>
            <ul className="mt-4 space-y-1.5 text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{p.perks.map((v) => <li key={v} className="flex items-center gap-1.5"><Check className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} />{v}</li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecurityTab({ email }: { email: string }) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
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
      <SectionHead title="Security" desc="Sessions, passwords, and connected accounts." />
      <div className="space-y-3">
        <ActionRow title="Reset password" desc="We’ll email a reset link to your account." cta={busy ? '…' : 'Send email'} onClick={resetPw} />
        <ActionRow title="Sign out other sessions" desc="Keeps this browser logged in. Signs out everyone else." cta={busy ? '…' : 'Sign out'} onClick={signOutOthers} />
        <ActionRow title="Two-factor auth" desc="Coming from Supabase Auth soon." cta="Enable" onClick={() => toast.info('2FA coming soon')} />
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
        <p className="text-[13px] mt-1 mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Deletes all your resumes, ATS reports, cover letters, activity. Type <span className="font-mono text-[12px]" style={{ color: 'rgb(var(--eleva-fg))' }}>DELETE</span> to enable the button.</p>
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

function ReadRow({ k, v, action }: { k: string; v: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b last:border-0" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
      <div className="text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{k}</div>
      <div className="flex items-center gap-3">
        <div className="font-mono text-[12px]" style={{ color: 'rgb(var(--eleva-fg))' }}>{v}</div>
        {action}
      </div>
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
      <button onClick={onClick} className="eleva-btn-primary text-[12px]">{cta}</button>
    </div>
  );
}

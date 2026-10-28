'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Bot, Globe, Network, Cpu, Wifi, Eye, EyeOff, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { saveProviderKey, deleteProviderKey, validateProviderKey } from '../_lib/actions-ai-providers';
import { PROVIDER_DEFINITIONS } from '@/lib/ai/provider/registry';
import type { ProviderKeyEntry } from './settings-types';

export function ProvidersTab({ providerKeys }: { providerKeys: ProviderKeyEntry[] }) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Providers</h2>
        <p className="text-[12px] mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Connect your own AI providers. Your keys are encrypted before storage (AES-256-GCM).</p>
      </div>
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

const PROVIDER_ICONS: Record<string, LucideIcon> = {
  openai: Sparkles, anthropic: Bot, gemini: Globe, openrouter: Network, nvidia: Cpu, ollama: Wifi,
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
    } catch (e) {
      toast.error((e as { message?: string }).message ?? 'Save failed');
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
    } catch (e) {
      toast.error((e as { message?: string }).message ?? 'Delete failed');
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

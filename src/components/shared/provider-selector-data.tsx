import type { ElementType } from 'react';
import { Sparkles, Star, Bot, Globe, Network, Cpu, Wifi, Zap, Brain, FileText, Target } from 'lucide-react';
import type { ProviderId } from '@/lib/ai/provider/registry';

type AiMode = 'auto' | 'provider-auto' | 'manual'

export interface ProviderSelection {
  mode: AiMode
  provider: ProviderId | null  // null in global auto mode
  modelId: string | null        // null in auto/provider-auto mode
}

export const GLOBAL_AUTO_KEY = '__eleva_global_auto__'
export const PROVIDER_AUTO_PREFIX = '__provider_auto__'

export const PROVIDER_ICONS: Record<string, ElementType> = {
  openai: Sparkles,
  anthropic: Bot,
  gemini: Globe,
  openrouter: Network,
  nvidia: Cpu,
  ollama: Wifi,
}

export function getTaskForPath(pathname: string): { label: string; icon: ElementType } {
  if (pathname.includes('/eleva/editor') || pathname.includes('/eleva/resumes')) return { label: 'Resume Tailoring', icon: FileText }
  if (pathname.includes('/eleva/ats')) return { label: 'ATS Analysis', icon: Target }
  if (pathname.includes('/eleva/cover-letters')) return { label: 'Cover Letter Writing', icon: FileText }
  if (pathname.includes('/eleva/studio')) return { label: 'Studio Pipeline', icon: Zap }
  if (pathname.includes('/eleva/applications')) return { label: 'Applications', icon: Brain }
  return { label: 'General', icon: Sparkles }
}

export interface ProviderSelectorProps {
  value: string  // encoded selection: '__eleva_global_auto__' | 'openrouter:__provider_auto__' | 'nvidia:meta/llama-3.3-70b-instruct'
  onValueChange: (value: string) => void
  connectedProviders: ProviderId[]
  className?: string
}


export function decodeSelection(value: string): ProviderSelection {
  if (value === GLOBAL_AUTO_KEY || !value) return { mode: 'auto', provider: null, modelId: null }
  const colonIdx = value.indexOf(':')
  if (colonIdx < 0) return { mode: 'auto', provider: null, modelId: null }
  const provider = value.slice(0, colonIdx) as ProviderId
  const rest = value.slice(colonIdx + 1)
  if (rest === PROVIDER_AUTO_PREFIX) return { mode: 'provider-auto', provider, modelId: null }
  return { mode: 'manual', provider, modelId: rest }
}

export function StarRating({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} className={s <= value ? 'fill-current' : 'fill-none'}
          style={{ color: s <= value ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-border))' }} strokeWidth={0} />
      ))}
    </div>
  )
}

export const FREE_MODEL_QUALITY: Record<string, { quality: number; speed: number }> = {
  'qwen/qwen3-235b-a22b': { quality: 5, speed: 3 },
  'deepseek/deepseek-chat-v3': { quality: 4, speed: 4 },
  'meta-llama/llama-3.3-70b-instruct': { quality: 4, speed: 3 },
  'mistralai/mistral-large': { quality: 4, speed: 4 },
  'meta/llama-3.3-70b-instruct': { quality: 4, speed: 3 },
  'nvidia/llama-3.3-nemotron-super-49b-v1.5': { quality: 4, speed: 4 },
  'deepseek-v4-flash': { quality: 4, speed: 5 },
  'nvidia/llama-3.1-nemotron-nano-4b-v1.1': { quality: 3, speed: 5 },
  'gemini-2.5-flash': { quality: 4, speed: 5 },
  'gemini-2.5-pro': { quality: 5, speed: 3 },
  'claude-sonnet-4-20250514': { quality: 5, speed: 4 },
  'claude-3-5-sonnet-20241022': { quality: 5, speed: 3 },
  'claude-3-5-haiku-20241022': { quality: 4, speed: 5 },
  'gpt-4.1-2025-04-14': { quality: 5, speed: 4 },
  'gpt-4.1-mini-2025-04-14': { quality: 4, speed: 5 },
  'gpt-4o-mini-2024-07-18': { quality: 4, speed: 5 },
  'qwen3:8b': { quality: 3, speed: 4 },
  'gemma3:4b': { quality: 3, speed: 4 },
  'mistral:7b': { quality: 3, speed: 4 },
  'llama3.2:3b': { quality: 3, speed: 5 },
}

export const USE_CASES: Record<string, string[]> = {
  'qwen/qwen3-235b-a22b': ['ATS', 'Resume Writing', 'Cover Letter', 'JD Analysis'],
  'deepseek/deepseek-chat-v3': ['ATS', 'Resume Writing', 'Coding'],
  'meta-llama/llama-3.3-70b-instruct': ['Resume Writing', 'Cover Letter', 'JD Analysis'],
  'mistralai/mistral-large': ['Cover Letter', 'General'],
  'meta/llama-3.3-70b-instruct': ['ATS', 'Resume Writing'],
  'gemini-2.5-flash': ['ATS', 'JD Analysis', 'Cover Letter'],
  'claude-sonnet-4-20250514': ['Resume Writing', 'Cover Letter'],
  'gpt-4.1-2025-04-14': ['ATS', 'Resume Writing', 'Cover Letter', 'JD Analysis'],
}

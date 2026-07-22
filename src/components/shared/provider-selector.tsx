'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronDown, Search, Check, Network, Cpu, Globe, Bot, Wifi, Star, Zap, Brain, FileText, Target } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { PROVIDER_DEFINITIONS, AUTO_PROVIDER_ORDER, type ProviderId } from '@/lib/ai/provider/registry'

type AiMode = 'auto' | 'provider-auto' | 'manual'

export interface ProviderSelection {
  mode: AiMode
  provider: ProviderId | null  // null in global auto mode
  modelId: string | null        // null in auto/provider-auto mode
}

const GLOBAL_AUTO_KEY = '__eleva_global_auto__'
const PROVIDER_AUTO_PREFIX = '__provider_auto__'

const PROVIDER_ICONS: Record<string, React.ElementType> = {
  openai: Sparkles,
  anthropic: Bot,
  gemini: Globe,
  openrouter: Network,
  nvidia: Cpu,
  ollama: Wifi,
}

function getTaskForPath(pathname: string): { label: string; icon: React.ElementType } {
  if (pathname.includes('/eleva/editor') || pathname.includes('/eleva/resumes')) return { label: 'Resume Tailoring', icon: FileText }
  if (pathname.includes('/eleva/ats')) return { label: 'ATS Analysis', icon: Target }
  if (pathname.includes('/eleva/cover-letters')) return { label: 'Cover Letter Writing', icon: FileText }
  if (pathname.includes('/eleva/studio')) return { label: 'Studio Pipeline', icon: Zap }
  if (pathname.includes('/eleva/applications')) return { label: 'Applications', icon: Brain }
  return { label: 'General', icon: Sparkles }
}

interface ProviderSelectorProps {
  value: string  // encoded selection: '__eleva_global_auto__' | 'openrouter:__provider_auto__' | 'nvidia:meta/llama-3.3-70b-instruct'
  onValueChange: (value: string) => void
  connectedProviders: ProviderId[]
  className?: string
}


function decodeSelection(value: string): ProviderSelection {
  if (value === GLOBAL_AUTO_KEY || !value) return { mode: 'auto', provider: null, modelId: null }
  const colonIdx = value.indexOf(':')
  if (colonIdx < 0) return { mode: 'auto', provider: null, modelId: null }
  const provider = value.slice(0, colonIdx) as ProviderId
  const rest = value.slice(colonIdx + 1)
  if (rest === PROVIDER_AUTO_PREFIX) return { mode: 'provider-auto', provider, modelId: null }
  return { mode: 'manual', provider, modelId: rest }
}

function StarRating({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} className={s <= value ? 'fill-current' : 'fill-none'}
          style={{ color: s <= value ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-border))' }} strokeWidth={0} />
      ))}
    </div>
  )
}

const FREE_MODEL_QUALITY: Record<string, { quality: number; speed: number }> = {
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

const USE_CASES: Record<string, string[]> = {
  'qwen/qwen3-235b-a22b': ['ATS', 'Resume Writing', 'Cover Letter', 'JD Analysis'],
  'deepseek/deepseek-chat-v3': ['ATS', 'Resume Writing', 'Coding'],
  'meta-llama/llama-3.3-70b-instruct': ['Resume Writing', 'Cover Letter', 'JD Analysis'],
  'mistralai/mistral-large': ['Cover Letter', 'General'],
  'meta/llama-3.3-70b-instruct': ['ATS', 'Resume Writing'],
  'gemini-2.5-flash': ['ATS', 'JD Analysis', 'Cover Letter'],
  'claude-sonnet-4-20250514': ['Resume Writing', 'Cover Letter'],
  'gpt-4.1-2025-04-14': ['ATS', 'Resume Writing', 'Cover Letter', 'JD Analysis'],
}

export function ProviderSelector({ value, onValueChange, connectedProviders, className = '' }: ProviderSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'providers' | 'models'>('providers')
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const task = getTaskForPath(pathname)

  const selection = decodeSelection(value)

  // Reset view when opening
  useEffect(() => {
    if (open) {
      setSearch('')
      if (selection.mode === 'auto') {
        setView('providers')
        setSelectedProvider(null)
      } else if (selection.provider) {
        setView('models')
        setSelectedProvider(selection.provider)
      }
      setTimeout(() => searchRef.current?.focus(), 100)
    }
  }, [open, selection.mode, selection.provider])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const isConnected = useCallback((id: ProviderId) => connectedProviders.includes(id), [connectedProviders])

  const handleSelectProvider = useCallback((providerId: ProviderId | null) => {
    if (providerId === null) {
      // Global Auto
      onValueChange(GLOBAL_AUTO_KEY)
      setOpen(false)
      return
    }
    setSelectedProvider(providerId)
    setView('models')
    setSearch('')
  }, [onValueChange])

  const handleSelectModel = useCallback((modelId: string, isAuto: boolean) => {
    if (!selectedProvider) return
    if (isAuto) {
      onValueChange(`${selectedProvider}:${PROVIDER_AUTO_PREFIX}`)
    } else {
      onValueChange(`${selectedProvider}:${modelId}`)
    }
    setOpen(false)
    setSearch('')
  }, [selectedProvider, onValueChange])

  const handleBackToProviders = useCallback(() => {
    setView('providers')
    setSearch('')
  }, [])

  // Get provider for the current selection
  const triggerProvider = selection.mode === 'auto' ? null : selection.provider
  const triggerDef = triggerProvider ? PROVIDER_DEFINITIONS.find(p => p.id === triggerProvider) : null
  const triggerModel = selection.mode === 'manual' && selection.modelId
    ? triggerDef?.models.find(m => m.id === selection.modelId)
    : null

  // Filter providers/search
  const filteredProviders = useMemo(() => {
    if (!search) return PROVIDER_DEFINITIONS
    const q = search.toLowerCase()
    return PROVIDER_DEFINITIONS.filter(p =>
      p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    )
  }, [search])

  // Filter models for selected provider
  const filteredModels = useMemo(() => {
    if (!selectedProvider) return { free: [], paid: [] }
    const def = PROVIDER_DEFINITIONS.find(p => p.id === selectedProvider)
    if (!def) return { free: [], paid: [] }
    const models = def.models
    if (!search) return {
      free: models.filter(m => m.free),
      paid: models.filter(m => !m.free),
    }
    const q = search.toLowerCase()
    return {
      free: models.filter(m => m.free && (m.displayName.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))),
      paid: models.filter(m => !m.free && (m.displayName.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))),
    }
  }, [selectedProvider, search])

  // Search across all providers/models when searching without a provider selected
  const globalSearchResults = useMemo(() => {
    if (!search || selectedProvider) return []
    const q = search.toLowerCase()
    const results: { provider: typeof PROVIDER_DEFINITIONS[0]; model: typeof PROVIDER_DEFINITIONS[0]['models'][0] }[] = []
    for (const def of PROVIDER_DEFINITIONS) {
      for (const model of def.models) {
        if (model.displayName.toLowerCase().includes(q) || model.id.toLowerCase().includes(q)) {
          results.push({ provider: def, model })
        }
      }
    }
    return results
  }, [search, selectedProvider])

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center gap-2.5 px-3 h-10 rounded-xl border transition-all text-left"
        style={{
          background: 'rgba(var(--eleva-card), 0.8)',
          borderColor: open ? 'rgba(var(--eleva-primary), 0.4)' : 'rgb(var(--eleva-border))',
          color: 'rgb(var(--eleva-fg))',
        }}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: selection.mode === 'auto'
              ? 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))'
              : triggerDef
              ? 'rgb(var(--eleva-muted))'
              : 'rgb(var(--eleva-muted))'
          }}
        >
          {selection.mode === 'auto' ? (
            <Sparkles className="w-3 h-3 text-white" strokeWidth={2} />
          ) : triggerDef ? (
            (() => {
              const Icon = PROVIDER_ICONS[triggerDef.id] ?? Sparkles
              return <Icon className="w-3 h-3" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.75} />
            })()
          ) : (
            <Brain className="w-3 h-3" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.75} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold truncate">
              {selection.mode === 'auto' && 'Auto'}
              {selection.mode === 'provider-auto' && triggerDef && `${triggerDef.name} → Auto`}
              {selection.mode === 'manual' && triggerModel && `${triggerDef?.name ?? ''} → ${triggerModel.displayName}`}
              {selection.mode === 'manual' && !triggerModel && triggerDef && `${triggerDef.name} → Select model`}
            </span>
            {selection.mode === 'auto' && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md shrink-0" style={{ background: 'rgba(var(--eleva-primary), 0.12)', color: 'rgb(var(--eleva-primary))' }}>
                AI
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            {selection.mode === 'auto' ? (
              <>
                <task.icon className="w-3 h-3" strokeWidth={1.5} />
                <span className="truncate">Best provider for {task.label}</span>
              </>
            ) : selection.mode === 'provider-auto' && triggerDef ? (
              <>
                <Network className="w-3 h-3" strokeWidth={1.5} />
                <span className="truncate">Auto model within {triggerDef.name}</span>
              </>
            ) : triggerModel ? (
              <span className="truncate">{triggerModel.free ? 'Free' : 'Paid'} · {(FREE_MODEL_QUALITY[triggerModel.id]?.quality ?? 3)}★ quality</span>
            ) : (
              <span className="truncate">Select a model</span>
            )}
          </div>
        </div>
        <ChevronDown
          size={14}
          className="transition-transform shrink-0"
          style={{ color: 'rgb(var(--eleva-muted-fg))', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'rgb(var(--eleva-card))',
              border: '1px solid rgb(var(--eleva-border))',
              boxShadow: '0 24px 60px -12px rgba(2,6,23,0.3)',
            }}
          >
            {/* Search */}
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-center gap-2.5 px-3 h-9 rounded-xl" style={{ background: 'rgb(var(--eleva-muted))' }}>
                <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgb(var(--eleva-muted-fg))' }} strokeWidth={1.75} />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={view === 'models' ? 'Search models...' : 'Search providers...'}
                  className="flex-1 bg-transparent outline-none text-[13px]"
                  style={{ color: 'rgb(var(--eleva-fg))' }}
                />
                {view === 'models' && (
                  <button onClick={handleBackToProviders} className="text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                    Providers
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto px-2 pb-2 space-y-1">
              {/* Provider List View */}
              {view === 'providers' && (
                <>
                  {/* Global Auto */}
                  <button
                    onClick={() => handleSelectProvider(null)}
                    className="w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all hover:bg-[rgb(var(--eleva-muted))]"
                    style={{
                      background: selection.mode === 'auto' ? 'rgba(var(--eleva-primary), 0.06)' : 'transparent',
                      boxShadow: selection.mode === 'auto' ? '0 0 0 1px rgba(var(--eleva-primary), 0.25)' : 'none',
                    }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}>
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Auto</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(var(--eleva-primary), 0.12)', color: 'rgb(var(--eleva-primary))' }}>
                          Recommended
                        </span>
                      </div>
                      <p className="text-[12px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                        Eleva automatically picks the best provider and model for your task
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {AUTO_PROVIDER_ORDER.slice(0, 3).map(id => {
                          const def = PROVIDER_DEFINITIONS.find(p => p.id === id)
                          return def ? (
                            <span key={id} className="text-[9px] px-1.5 py-0.5 rounded-md flex items-center gap-1" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                              {(() => { const I = PROVIDER_ICONS[id] ?? Sparkles; return <I className="w-2.5 h-2.5" />; })()}
                              {def.name}
                            </span>
                          ) : null
                        })}
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                          +{AUTO_PROVIDER_ORDER.length - 3} more
                        </span>
                      </div>
                    </div>
                    {selection.mode === 'auto' && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgb(var(--eleva-primary))' }}>
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>

                  <div className="h-px mx-3" style={{ background: 'rgb(var(--eleva-border))' }} />

                  {/* Provider list */}
                  {filteredProviders.map(def => {
                    const Icon = PROVIDER_ICONS[def.id] ?? Sparkles
                    const conn = isConnected(def.id)
                    const isSelected = selection.mode !== 'auto' && selection.provider === def.id
                    return (
                      <button
                        key={def.id}
                        onClick={() => handleSelectProvider(def.id)}
                        className="w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all hover:bg-[rgb(var(--eleva-muted))]"
                        style={{
                          background: isSelected ? 'rgba(var(--eleva-primary), 0.06)' : 'transparent',
                          boxShadow: isSelected ? '0 0 0 1px rgba(var(--eleva-primary), 0.25)' : 'none',
                        }}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgb(var(--eleva-muted))' }}>
                          <Icon className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[14px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{def.name}</span>
                            {conn && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(var(--eleva-success), 0.12)', color: 'rgb(var(--eleva-success))' }}>
                                Connected
                              </span>
                            )}
                            {!conn && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                            {def.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                            <span>{def.models.length} models</span>
                            {def.models.filter(m => m.free).length > 0 && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(var(--eleva-success), 0.1)', color: 'rgb(var(--eleva-success))' }}>
                                {def.models.filter(m => m.free).length} free
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 -rotate-90 shrink-0" style={{ color: 'rgb(var(--eleva-muted-fg))' }} strokeWidth={1.5} />
                      </button>
                    )
                  })}
                </>
              )}

              {/* Model List View */}
              {view === 'models' && selectedProvider && (
                <>
                  {/* Back to providers */}
                  <button
                    onClick={handleBackToProviders}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all hover:bg-[rgb(var(--eleva-muted))] text-[12px]"
                    style={{ color: 'rgb(var(--eleva-muted-fg))' }}
                  >
                    <ChevronDown className="w-3 h-3 rotate-90" strokeWidth={1.5} />
                    All providers
                  </button>

                  {/* Auto within provider */}
                  <button
                    onClick={() => handleSelectModel('', true)}
                    className="w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all hover:bg-[rgb(var(--eleva-muted))]"
                    style={{
                      background: selection.mode === 'provider-auto' && selection.provider === selectedProvider ? 'rgba(var(--eleva-primary), 0.06)' : 'transparent',
                      boxShadow: selection.mode === 'provider-auto' && selection.provider === selectedProvider ? '0 0 0 1px rgba(var(--eleva-primary), 0.25)' : 'none',
                    }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgb(var(--eleva-muted))' }}>
                      {(() => { const I = PROVIDER_ICONS[selectedProvider] ?? Sparkles; return <I className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.75} />; })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Auto</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(var(--eleva-primary), 0.12)', color: 'rgb(var(--eleva-primary))' }}>
                          Provider Auto
                        </span>
                      </div>
                      <p className="text-[12px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                        Automatically tries models within {PROVIDER_DEFINITIONS.find(p => p.id === selectedProvider)?.name ?? selectedProvider}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5">
                        {PROVIDER_DEFINITIONS.find(p => p.id === selectedProvider)?.modelChain.map(mid => {
                          const def = PROVIDER_DEFINITIONS.find(p => p.id === selectedProvider)
                          const md = def?.models.find(m => m.id === mid)
                          return (
                            <span key={mid} className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                              {md?.displayName ?? mid}
                            </span>
                          )
                        })?.join(' → ').split(' → ').map((name, i, arr) => (
                          <span key={i} className="flex items-center gap-1">
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>{name}</span>
                            {i < arr.length - 1 && <span className="text-[9px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>→</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    {selection.mode === 'provider-auto' && selection.provider === selectedProvider && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgb(var(--eleva-primary))' }}>
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>

                  {/* Free models */}
                  {filteredModels.free.length > 0 && (
                    <>
                      <div className="h-px mx-3" style={{ background: 'rgb(var(--eleva-border))' }} />
                      <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                        Free
                      </div>
                      {filteredModels.free.map(model => {
                        const isSelected = selection.mode === 'manual' && selection.provider === selectedProvider && selection.modelId === model.id
                        const quality = FREE_MODEL_QUALITY[model.id]
                        const useCases = USE_CASES[model.id]
                        return (
                          <button
                            key={model.id}
                            onClick={() => handleSelectModel(model.id, false)}
                            className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-[rgb(var(--eleva-muted))]"
                            style={{
                              background: isSelected ? 'rgba(var(--eleva-primary), 0.06)' : 'transparent',
                              boxShadow: isSelected ? '0 0 0 1px rgba(var(--eleva-primary), 0.25)' : 'none',
                            }}
                          >
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[15px]" style={{ background: 'rgb(var(--eleva-muted))' }}>
                              <Brain className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.75} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[14px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{model.displayName}</span>
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(var(--eleva-success), 0.12)', color: 'rgb(var(--eleva-success))' }}>
                                  FREE
                                </span>
                              </div>
                              {quality && (
                                <div className="flex items-center gap-3 mt-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Quality</span>
                                    <StarRating value={quality.quality} size={10} />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Speed</span>
                                    <StarRating value={quality.speed} size={10} />
                                  </div>
                                  <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                                    {(model.maxContext / 1000).toFixed(0)}K ctx
                                  </span>
                                </div>
                              )}
                              {useCases && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {useCases.map(u => (
                                    <span key={u} className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                                      {u}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgb(var(--eleva-primary))' }}>
                                <Check className="w-3 h-3 text-white" strokeWidth={3} />
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </>
                  )}

                  {/* Paid models */}
                  {filteredModels.paid.length > 0 && (
                    <>
                      <div className="h-px mx-3" style={{ background: 'rgb(var(--eleva-border))' }} />
                      <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                        Paid
                      </div>
                      {filteredModels.paid.map(model => {
                        const isSelected = selection.mode === 'manual' && selection.provider === selectedProvider && selection.modelId === model.id
                        const quality = FREE_MODEL_QUALITY[model.id]
                        const useCases = USE_CASES[model.id]
                        return (
                          <button
                            key={model.id}
                            onClick={() => handleSelectModel(model.id, false)}
                            className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-[rgb(var(--eleva-muted))]"
                            style={{
                              background: isSelected ? 'rgba(var(--eleva-primary), 0.06)' : 'transparent',
                              boxShadow: isSelected ? '0 0 0 1px rgba(var(--eleva-primary), 0.25)' : 'none',
                            }}
                          >
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[15px]" style={{ background: 'rgb(var(--eleva-muted))' }}>
                              <Brain className="w-4 h-4" style={{ color: 'rgb(var(--eleva-secondary))' }} strokeWidth={1.75} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[14px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{model.displayName}</span>
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(var(--eleva-secondary), 0.12)', color: 'rgb(var(--eleva-secondary))' }}>
                                  $ Paid
                                </span>
                              </div>
                              {quality && (
                                <div className="flex items-center gap-3 mt-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Quality</span>
                                    <StarRating value={quality.quality} size={10} />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Speed</span>
                                    <StarRating value={quality.speed} size={10} />
                                  </div>
                                  <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                                    {(model.maxContext / 1000).toFixed(0)}K ctx
                                  </span>
                                </div>
                              )}
                              {useCases && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {useCases.map(u => (
                                    <span key={u} className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                                      {u}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgb(var(--eleva-primary))' }}>
                                <Check className="w-3 h-3 text-white" strokeWidth={3} />
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </>
                  )}

                  {/* Empty state */}
                  {filteredModels.free.length === 0 && filteredModels.paid.length === 0 && (
                    <div className="text-center py-8 text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      No models match &ldquo;{search}&rdquo;
                    </div>
                  )}
                </>
              )}

              {/* Global search results (across providers) */}
              {view === 'providers' && search && globalSearchResults.length > 0 && (
                <>
                  <div className="h-px mx-3" style={{ background: 'rgb(var(--eleva-border))' }} />
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                    Search Results
                  </div>
                  {globalSearchResults.map(({ provider: def, model }) => {
                    const Icon = PROVIDER_ICONS[def.id] ?? Sparkles
                    return (
                      <button
                        key={`${def.id}:${model.id}`}
                        onClick={() => {
                          setSelectedProvider(def.id)
                          onValueChange(`${def.id}:${model.id}`)
                          setOpen(false)
                        }}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-[rgb(var(--eleva-muted))]"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgb(var(--eleva-muted))' }}>
                          <Icon className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[14px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{model.displayName}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                              {def.name}
                            </span>
                            {model.free && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(var(--eleva-success), 0.12)', color: 'rgb(var(--eleva-success))' }}>
                                FREE
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{(model.maxContext / 1000).toFixed(0)}K ctx</span>
                            {def.models.indexOf(model) === 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(var(--eleva-primary), 0.1)', color: 'rgb(var(--eleva-primary))' }}>
                                Best
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t flex items-center justify-between text-[11px]" style={{ borderColor: 'rgb(var(--eleva-border))', color: 'rgb(var(--eleva-muted-fg))' }}>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" style={{ color: 'rgb(var(--eleva-primary))' }} />
                <span>
                  {selection.mode === 'auto' && 'Auto mode: NVIDIA → Gemini → OpenRouter → Claude → OpenAI → Ollama'}
                  {selection.mode === 'provider-auto' && triggerDef && `${triggerDef.name} Auto: ${triggerDef.modelChain.length} models in chain`}
                  {selection.mode === 'manual' && triggerModel && `Manual: exactly ${triggerModel.displayName}`}
                </span>
              </div>
              <span className="font-mono text-[10px]">
                {view === 'models' && selectedProvider
                  ? `${PROVIDER_DEFINITIONS.find(p => p.id === selectedProvider)?.models.length ?? 0} models`
                  : `${PROVIDER_DEFINITIONS.length} providers`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

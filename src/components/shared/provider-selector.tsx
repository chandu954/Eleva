'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronDown, Search, Check, Network, Brain } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { PROVIDER_DEFINITIONS, AUTO_PROVIDER_ORDER, type ProviderId } from '@/lib/ai/provider/registry'

import { ProviderModelList } from './provider-model-list';
import {
  decodeSelection,
  FREE_MODEL_QUALITY,
  getTaskForPath,
  GLOBAL_AUTO_KEY,
  PROVIDER_AUTO_PREFIX,
  PROVIDER_ICONS,
  type ProviderSelectorProps,
} from './provider-selector-data';

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

              <ProviderModelList
                view={view}
                selectedProvider={selectedProvider}
                selection={selection}
                filteredModels={filteredModels}
                search={search}
                onBack={handleBackToProviders}
                onSelectModel={handleSelectModel}
              />

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

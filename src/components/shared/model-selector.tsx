'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, ChevronDown, Crown, Search, Check, Star, Zap, Brain, FileText, Target } from "lucide-react"
import { usePathname } from "next/navigation"
import {
  getModelById,
  getModelsByCategory,
  type ApiKey,
} from '@/lib/ai-models'

interface ModelSelectorProps {
  value: string
  onValueChange: (value: string) => void
  isProPlan: boolean
  className?: string
  placeholder?: string
  showToast?: boolean
  apiKeys?: ApiKey[]
}

type ViewMode = 'auto' | 'manual'

const AUTO_KEY = '__eleva_auto__'

function getTaskForPath(pathname: string): { label: string; icon: React.ElementType } {
  if (pathname.includes('/eleva/editor') || pathname.includes('/eleva/resumes')) return { label: 'Resume Tailoring', icon: FileText }
  if (pathname.includes('/eleva/ats')) return { label: 'ATS Analysis', icon: Target }
  if (pathname.includes('/eleva/cover-letters')) return { label: 'Cover Letter Writing', icon: FileText }
  if (pathname.includes('/eleva/studio')) return { label: 'Studio Pipeline', icon: Zap }
  if (pathname.includes('/eleva/applications')) return { label: 'Applications', icon: Brain }
  return { label: 'General', icon: Sparkles }
}

function StarRating({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= value ? 'fill-current' : 'fill-none'}
          style={{ color: s <= value ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-border))' }}
          strokeWidth={0}
        />
      ))}
    </div>
  )
}

export function ModelSelector({
  value,
  onValueChange,
  isProPlan,
  className = '',
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>(value === AUTO_KEY ? 'auto' : 'manual')
  const searchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const task = getTaskForPath(pathname)

  const currentModel = value === AUTO_KEY ? null : getModelById(value)
  const isAuto = viewMode === 'auto' || value === AUTO_KEY

  const categoryGroups = useMemo(() => getModelsByCategory(isProPlan), [isProPlan])

  const filteredGroups = useMemo(() => {
    if (!search) return categoryGroups
    const q = search.toLowerCase()
    return categoryGroups
      .map(g => ({
        ...g,
        models: g.models.filter(m =>
          m.name.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.badgeLabel?.toLowerCase().includes(q)
        )
      }))
      .filter(g => g.models.length > 0)
  }, [categoryGroups, search])

  const handleSelect = useCallback((modelId: string, isPro: boolean) => {
    if (isPro && !isProPlan) return
    onValueChange(modelId)
    setViewMode('manual')
    setOpen(false)
    setSearch('')
  }, [onValueChange, isProPlan])

  const handleAutoSelect = useCallback(() => {
    onValueChange(AUTO_KEY)
    setViewMode('auto')
    setOpen(false)
    setSearch('')
  }, [onValueChange])

  useEffect(() => {
    if (!open) {
      setSearch('')
      return
    }
    const timer = setTimeout(() => searchRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const allModelsFlat = useMemo(
    () => categoryGroups.flatMap(g => g.models),
    [categoryGroups]
  )

  return (
    <div className={`relative ${className}`} ref={dropdownRef} data-testid="model-selector">
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
        data-testid="model-selector-trigger"
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: isAuto ? 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' : 'rgb(var(--eleva-muted))' }}>
          {isAuto ? (
            <Sparkles className="w-3 h-3 text-white" strokeWidth={2} />
          ) : (
            <Brain className="w-3 h-3" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.75} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold truncate">
              {isAuto ? 'Auto' : currentModel?.name || 'Select model'}
            </span>
            {isAuto && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md shrink-0" style={{ background: 'rgba(var(--eleva-primary), 0.12)', color: 'rgb(var(--eleva-primary))' }}>
                AI
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            {isAuto ? (
              <>
                <task.icon className="w-3 h-3" strokeWidth={1.5} />
                <span className="truncate">Optimized for {task.label}</span>
              </>
            ) : (
              <span className="truncate">{currentModel?.description || currentModel?.badgeLabel || 'AI Model'}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!isAuto && currentModel && (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-md shrink-0 font-medium"
              style={{
                background: currentModel.features.isPro ? 'rgba(var(--eleva-secondary), 0.12)' : 'rgba(var(--eleva-success), 0.12)',
                color: currentModel.features.isPro ? 'rgb(var(--eleva-secondary))' : 'rgb(var(--eleva-success))',
              }}
            >
              {currentModel.features.isPro ? 'PRO' : 'Included'}
            </span>
          )}
          <ChevronDown
            size={14}
            className="transition-transform shrink-0"
            style={{ color: 'rgb(var(--eleva-muted-fg))', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </div>
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
            data-testid="model-selector-dropdown"
          >
            {/* Search */}
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-center gap-2.5 px-3 h-9 rounded-xl" style={{ background: 'rgb(var(--eleva-muted))' }}>
                <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgb(var(--eleva-muted-fg))' }} strokeWidth={1.75} />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search AI models..."
                  className="flex-1 bg-transparent outline-none text-[13px]"
                  style={{ color: 'rgb(var(--eleva-fg))' }}
                  data-testid="model-search-input"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                    ESC
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto px-2 pb-2 space-y-1">
              {/* Auto Mode */}
              <button
                onClick={handleAutoSelect}
                className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all hover:bg-[rgb(var(--eleva-muted))]`}
                style={{
                  background: isAuto ? 'rgba(var(--eleva-primary), 0.06)' : 'transparent',
                  boxShadow: isAuto ? '0 0 0 1px rgba(var(--eleva-primary), 0.25)' : 'none',
                }}
                data-testid="model-auto-option"
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
                    Eleva <span className="font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>automatically selects</span> the best AI model based on your current task
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                    <task.icon className="w-3 h-3" strokeWidth={1.5} />
                    <span>Currently: <span style={{ color: 'rgb(var(--eleva-primary))' }}>{task.label}</span></span>
                  </div>
                </div>
                {isAuto && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgb(var(--eleva-primary))' }}>
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>

              {/* Separator */}
              <div className="h-px mx-3" style={{ background: 'rgb(var(--eleva-border))' }} />

              {/* Search empty state */}
              {search && filteredGroups.length === 0 && (
                <div className="text-center py-8 text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  No models match &ldquo;{search}&rdquo;
                </div>
              )}

              {/* Category Groups */}
              {filteredGroups.map((group) => (
                <div key={group.category}>
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                    {group.label}
                  </div>
                  {group.models.map((model) => {
                    const selectable = !model.availability.requiresPro || isProPlan
                    const selected = !isAuto && value === model.id
                    const isProModel = model.features.isPro
                    return (
                      <button
                        key={model.id}
                        onClick={() => selectable ? handleSelect(model.id, !!isProModel) : null}
                        className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                          !selectable ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[rgb(var(--eleva-muted))]'
                        }`}
                        style={{
                          background: selected ? 'rgba(var(--eleva-primary), 0.06)' : 'transparent',
                          boxShadow: selected ? '0 0 0 1px rgba(var(--eleva-primary), 0.25)' : 'none',
                        }}
                        data-testid={`model-option-${model.id.replace(/[/.]/g, '-')}`}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[15px]" style={{ background: 'rgb(var(--eleva-muted))' }}>
                          <Brain className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[14px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{model.name}</span>
                            {model.badgeLabel && (
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-medium ${
                                  model.badgeLabel === 'Best Overall' || model.badgeLabel === 'Recommended'
                                    ? 'text-[rgb(var(--eleva-primary))] bg-[rgba(var(--eleva-primary),0.1)]'
                                    : model.badgeLabel === 'Premium'
                                    ? 'text-[rgb(var(--eleva-secondary))] bg-[rgba(var(--eleva-secondary),0.1)]'
                                    : 'text-[rgb(var(--eleva-muted-fg))] bg-[rgb(var(--eleva-muted))]'
                                }`}
                              >
                                {model.badgeLabel}
                              </span>
                            )}
                          </div>
                          {model.description && (
                            <p className="text-[12px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                              {model.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5">
                            {model.quality && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Quality</span>
                                <StarRating value={model.quality} size={10} />
                              </div>
                            )}
                            {model.speed && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Speed</span>
                                <StarRating value={model.speed} size={10} />
                              </div>
                            )}
                            {model.features.maxTokens && (
                              <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                                {(model.features.maxTokens / 1000).toFixed(0)}K ctx
                              </span>
                            )}
                          </div>
                          {model.useCases && model.useCases.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {model.useCases.map((u) => (
                                <span
                                  key={u}
                                  className="text-[9px] px-1.5 py-0.5 rounded-md"
                                  style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}
                                >
                                  {u}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {!selectable && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium" style={{ background: 'rgba(var(--eleva-secondary), 0.12)', color: 'rgb(var(--eleva-secondary))' }}>
                              <Crown className="w-3 h-3" />
                              PRO
                            </div>
                          )}
                          {selectable && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md font-medium" style={{
                              background: isProModel ? 'rgba(var(--eleva-secondary), 0.12)' : 'rgba(var(--eleva-success), 0.12)',
                              color: isProModel ? 'rgb(var(--eleva-secondary))' : 'rgb(var(--eleva-success))',
                            }}>
                              {isProModel ? 'PRO' : 'Included'}
                            </span>
                          )}
                          {selected && (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgb(var(--eleva-primary))' }}>
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t flex items-center justify-between text-[11px]" style={{ borderColor: 'rgb(var(--eleva-border))', color: 'rgb(var(--eleva-muted-fg))' }}>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" style={{ color: 'rgb(var(--eleva-primary))' }} />
                <span>All models run via <span className="font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>OpenRouter</span></span>
              </div>
              <span className="font-mono text-[10px]">{allModelsFlat.length} models</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export type { AIModel, ApiKey } from '@/lib/ai-models'

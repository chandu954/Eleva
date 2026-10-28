import { Brain, Check, ChevronDown, Sparkles } from 'lucide-react';
import { PROVIDER_DEFINITIONS, type ProviderId, type ProviderModel } from '@/lib/ai/provider/registry';
import { FREE_MODEL_QUALITY, PROVIDER_ICONS, StarRating, USE_CASES, type ProviderSelection } from './provider-selector-data';

interface ProviderModelListProps {
  view: 'providers' | 'models';
  selectedProvider: ProviderId | null;
  selection: ProviderSelection;
  filteredModels: { free: ProviderModel[]; paid: ProviderModel[] };
  search: string;
  onBack: () => void;
  onSelectModel: (modelId: string, isAuto: boolean) => void;
}

export function ProviderModelList({ view, selectedProvider, selection, filteredModels, search, onBack, onSelectModel }: ProviderModelListProps) {
  const handleBackToProviders = onBack;
  const handleSelectModel = onSelectModel;
  return (
    <>
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

    </>
  );
}

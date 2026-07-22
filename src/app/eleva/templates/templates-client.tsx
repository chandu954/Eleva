'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, Star, X, Grid3x3, Rows3 } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORIES, type ResumeTemplate } from '../_lib/templates-catalog';

type Resume = { id: string; name: string; target_role: string | null; is_base_resume: boolean; document_settings?: { template?: string } | null; updated_at: string };

export function TemplatesClient({ templates, resumes }: { templates: ResumeTemplate[]; resumes: Resume[] }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [preview, setPreview] = useState<ResumeTemplate | null>(null);
  const [favs, setFavs] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { return new Set(JSON.parse(localStorage.getItem('eleva.templateFavs') || '[]')); } catch { return new Set(); }
  });
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (cat !== 'all' && t.category !== cat && !(cat === 'favorites' && favs.has(t.id))) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return t.name.toLowerCase().includes(s) || t.description.toLowerCase().includes(s);
    });
  }, [templates, q, cat, favs]);

  function toggleFav(id: string) {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (typeof window !== 'undefined') localStorage.setItem('eleva.templateFavs', JSON.stringify([...next]));
      return next;
    });
  }

  async function apply(templateId: string, resumeId: string) {
    setApplyingId(templateId);
    try {
      const res = await fetch('/eleva/api/templates/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId, resumeId }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'failed');
      toast.success('Template applied', { description: 'Open the editor to see the new layout.' });
      setPreview(null);
    } catch (e) {
      toast.error('Could not apply', { description: (e as Error).message });
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Template marketplace</div>
          <h1 className="font-display text-4xl font-semibold tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>Pick your look.</h1>
          <p className="mt-2 text-[14px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{templates.length} templates · ATS-safe options, premium editorial, technical layouts.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" className="pl-9 pr-3 py-2 rounded-lg text-[13px] w-64 outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} />
          </div>
          <div className="flex rounded-lg overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
            <button onClick={() => setLayout('grid')} className="px-2.5 py-2" style={{ color: layout === 'grid' ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))', background: layout === 'grid' ? 'rgb(var(--eleva-card))' : 'transparent' }}><Grid3x3 className="w-4 h-4" /></button>
            <button onClick={() => setLayout('list')} className="px-2.5 py-2" style={{ color: layout === 'list' ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))', background: layout === 'list' ? 'rgb(var(--eleva-card))' : 'transparent' }}><Rows3 className="w-4 h-4" /></button>
          </div>
        </div>
      </motion.div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all" style={{ background: cat === c.id ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted))', color: cat === c.id ? 'rgb(var(--eleva-bg))' : 'rgb(var(--eleva-muted-fg))' }}>{c.label}</button>
        ))}
        <button onClick={() => setCat('favorites')} className="px-3 py-1.5 rounded-full text-[12px] font-medium inline-flex items-center gap-1" style={{ background: cat === 'favorites' ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted))', color: cat === 'favorites' ? 'rgb(var(--eleva-bg))' : 'rgb(var(--eleva-muted-fg))' }}>
          <Star className="w-3 h-3" fill={cat === 'favorites' ? 'currentColor' : 'none'} /> Favorites ({favs.size})
        </button>
      </div>

      <div className={layout === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-3'}>
        {filtered.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} whileHover={{ y: -3 }} className="eleva-card overflow-hidden group cursor-pointer" onClick={() => setPreview(t)}>
            <TemplatePreview t={t} compact={layout === 'list'} />
            <div className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[14px] font-semibold truncate" style={{ color: 'rgb(var(--eleva-fg))' }}>{t.name}</div>
                  {t.tier === 'pro' && <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded" style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))', color: '#fff' }}>Pro</span>}
                </div>
                <div className="text-[12px] mt-0.5 line-clamp-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{t.description}</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); toggleFav(t.id); }} className="shrink-0 p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5" title="Favorite">
                <Star className="w-4 h-4" fill={favs.has(t.id) ? 'rgb(var(--eleva-warning))' : 'none'} style={{ color: favs.has(t.id) ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-muted-fg))' }} />
              </button>
            </div>
<div className="px-4 pb-4 flex items-center gap-3 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                <span className="font-mono">ATS {t.atsScore}%</span>
                <span>·</span>
                <span className="font-mono uppercase">{t.category}</span>
                <span>·</span>
                <span className="truncate">{t.layout}</span>
                <span>·</span>
                <span className={`font-mono text-[10px] ${t.atsScore >= 90 ? 'text-green-600' : t.atsScore >= 75 ? 'text-amber-600' : 'text-red-500'}`}>{t.atsScore >= 90 ? 'Recommended' : t.atsScore >= 75 ? 'Good' : 'Low ATS'}</span>
              </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setPreview(null)}>
            <motion.div initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-5xl rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))' }}>
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Live preview</div>
                  <div className="font-display text-xl font-semibold mt-0.5" style={{ color: 'rgb(var(--eleva-fg))' }}>{preview.name}</div>
                </div>
                <button onClick={() => setPreview(null)} className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5"><X className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} /></button>
              </div>
              <div className="grid md:grid-cols-[1.4fr_1fr]">
                <div className="p-6" style={{ background: 'rgb(var(--eleva-muted))' }}>
                  <div className="mx-auto max-w-[520px] aspect-[1/1.294] rounded-md shadow-2xl overflow-hidden" style={{ background: '#fff' }}>
                    <TemplatePreview t={preview} full />
                  </div>
                </div>
                <div className="p-6 flex flex-col">
                  <p className="text-[13px] mb-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{preview.description}</p>
                  <div className="space-y-2 text-[13px] mb-6">
                    <Row k="Category" v={preview.category} />
                    <Row k="Layout" v={preview.layout} />
                    <Row k="Font pair" v={preview.fontPair} />
                    <Row k="ATS score" v={`${preview.atsScore}%`} />
                    <Row k="Tier" v={preview.tier.toUpperCase()} />
                  </div>
                  <div className="text-[11px] font-mono uppercase mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Compare with others</div>
                  <div className="space-y-1.5 mb-5">
                    {templates.filter((t) => t.id !== preview.id && t.category === preview.category).slice(0, 3).map((t) => (
                      <div key={t.id} className="flex items-center justify-between px-2 py-1 rounded-md" style={{ background: 'rgb(var(--eleva-muted))' }}>
                        <span className="text-[12px]" style={{ color: 'rgb(var(--eleva-fg))' }}>{t.name}</span>
                        <span className="font-mono text-[11px]" style={{ color: t.atsScore >= 90 ? 'rgb(var(--eleva-success))' : t.atsScore >= 75 ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-warning))' }}>ATS {t.atsScore}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] font-mono uppercase mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Apply to resume</div>
                  {resumes.length === 0 ? (
                    <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Create a resume first to apply this template.</div>
                  ) : (
                    <div className="space-y-2 flex-1 overflow-auto max-h-72 pr-1">
                      {resumes.map((r) => {
                        const applied = r.document_settings?.template === preview.id;
                        return (
                          <div key={r.id} className="flex items-center gap-2 p-2 rounded-md" style={{ background: 'rgb(var(--eleva-muted))' }}>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] truncate" style={{ color: 'rgb(var(--eleva-fg))' }}>{r.name}</div>
                              <div className="text-[11px] truncate" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{r.target_role || 'No role'}</div>
                            </div>
                            <button disabled={applyingId === preview.id || applied} onClick={() => apply(preview.id, r.id)} className="text-[11px] font-medium px-2.5 py-1 rounded-md" style={{ background: applied ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-primary))', color: '#fff', opacity: applyingId === preview.id ? 0.6 : 1 }}>
                              {applied ? <><Check className="inline w-3 h-3 mr-1" />Applied</> : 'Apply'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button onClick={() => toggleFav(preview.id)} className="mt-5 inline-flex items-center gap-2 text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                    <Star className="w-3.5 h-3.5" fill={favs.has(preview.id) ? 'rgb(var(--eleva-warning))' : 'none'} style={{ color: favs.has(preview.id) ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-muted-fg))' }} />
                    {favs.has(preview.id) ? 'Remove favorite' : 'Add to favorites'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{k}</span>
      <span className="font-mono" style={{ color: 'rgb(var(--eleva-fg))' }}>{v}</span>
    </div>
  );
}

function TemplatePreview({ t, compact = false, full = false }: { t: ResumeTemplate; compact?: boolean; full?: boolean }) {
  const h = compact ? 'h-32' : full ? 'h-full' : 'h-56';
  return (
    <div className={`${h} w-full relative overflow-hidden`} style={{ background: '#fff' }}>
      <div className="absolute inset-0 flex flex-col p-3 md:p-5" style={{ fontFamily: t.fontPair.split(' · ')[0] }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-[13px] md:text-[15px] font-semibold" style={{ color: '#111' }}>Ashish Dhonde</div>
            <div className="text-[9px] md:text-[10px]" style={{ color: t.accent }}>{t.layout === 'timeline' ? 'Software Engineer' : 'Senior Backend Engineer'}</div>
          </div>
          <div className="text-[7px] md:text-[8px] text-right" style={{ color: '#666' }}>ashish@example.com · SF</div>
        </div>
        <div className="h-px w-full mb-2" style={{ background: t.category === 'minimal' ? '#eee' : t.accent, opacity: t.category === 'minimal' ? 1 : 0.35 }} />
        {t.layout === 'two-column' ? (
          <div className="grid grid-cols-[1fr_1.6fr] gap-3 flex-1">
            <div className="space-y-1">
              <div className="text-[7px] md:text-[8px] font-semibold" style={{ color: t.accent }}>SKILLS</div>
              {['Go', 'K8s', 'gRPC', 'Postgres'].map((s) => <div key={s} className="text-[6px] md:text-[7px]" style={{ color: '#333' }}>{s}</div>)}
            </div>
            <div className="space-y-1.5">
              <div className="text-[8px] md:text-[9px] font-semibold" style={{ color: '#111' }}>Experience</div>
              {[0,1,2].map((i) => (
                <div key={i}>
                  <div className="text-[7px] md:text-[8px] font-medium" style={{ color: '#222' }}>Staff Eng · Company {i+1}</div>
                  <div className="text-[6px] md:text-[7px] leading-tight" style={{ color: '#555' }}>Owned distributed systems. Shipped 3 platforms. Cut latency 45%.</div>
                </div>
              ))}
            </div>
          </div>
        ) : t.layout === 'sidebar' ? (
          <div className="grid grid-cols-[80px_1fr] gap-3 flex-1">
            <div className="rounded-md p-2" style={{ background: t.accent }}>
              <div className="text-[6px] md:text-[7px] font-semibold text-white mb-1">CONTACT</div>
              <div className="text-[5px] md:text-[6px] text-white/80 leading-tight">SF · ashish@ex.co · linkedin</div>
              <div className="text-[6px] md:text-[7px] font-semibold text-white mt-2 mb-1">SKILLS</div>
              <div className="text-[5px] md:text-[6px] text-white/80 leading-tight">Go, K8s, gRPC, PG, TS, React</div>
            </div>
            <div className="space-y-1.5">
              <div className="text-[8px] md:text-[9px] font-semibold" style={{ color: '#111' }}>Experience</div>
              {[0,1].map((i) => (
                <div key={i}>
                  <div className="text-[7px] md:text-[8px] font-medium" style={{ color: '#222' }}>Staff Engineer · Company {i+1}</div>
                  <div className="text-[6px] md:text-[7px] leading-tight" style={{ color: '#555' }}>Shipped platform \u2022 40% latency cut \u2022 mentored 6 engineers.</div>
                </div>
              ))}
            </div>
          </div>
        ) : t.layout === 'timeline' ? (
          <div className="space-y-2 flex-1 relative pl-4">
            <div className="absolute left-1.5 top-1 bottom-1 w-px" style={{ background: t.accent, opacity: 0.4 }} />
            {[0,1,2].map((i) => (
              <div key={i} className="relative">
                <div className="absolute -left-3 top-0.5 w-2 h-2 rounded-full" style={{ background: t.accent }} />
                <div className="text-[7px] md:text-[8px] font-medium" style={{ color: '#222' }}>2023 \u2014 Present \u00b7 Company {i+1}</div>
                <div className="text-[6px] md:text-[7px] leading-tight" style={{ color: '#555' }}>Staff engineer. Ownership across services. Cut cost 32%.</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5 flex-1">
            <div className="text-[8px] md:text-[9px] font-semibold" style={{ color: '#111' }}>Experience</div>
            {[0,1,2].map((i) => (
              <div key={i}>
                <div className="text-[7px] md:text-[8px] font-medium" style={{ color: '#222' }}>Senior Engineer \u00b7 Company {i+1}</div>
                <div className="text-[6px] md:text-[7px] leading-tight" style={{ color: '#555' }}>Owned end-to-end systems. Metric-driven. Improved SLOs and DX.</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="absolute bottom-2 right-2 text-[8px] font-mono uppercase px-1.5 py-0.5 rounded" style={{ background: t.accent, color: '#fff' }}>{t.name}</div>
    </div>
  );
}

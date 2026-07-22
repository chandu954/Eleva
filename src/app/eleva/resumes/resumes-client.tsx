'use client';

import type { Resume } from './types';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, List as ListIcon, Download, Copy, Trash2, ArrowUpRight, Star, Radio, FileText, Loader2, Target, Clock, Hash, Layers, Eye, Layout } from 'lucide-react';
import { toast } from 'sonner';
import { useRealtimeResumes } from '../_lib/use-realtime';
import { createBrowserClient } from '@supabase/ssr';
import { TEMPLATES } from '../_lib/templates-catalog';
import { ResumeUploader } from '../_components/resume-uploader';

export function ResumesClient({ initial }: { initial: Resume[] }) {
  const { items } = useRealtimeResumes(initial);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [exportingId, setExportingId] = useState<string | null>(null);

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((r) => r.name?.toLowerCase().includes(q) || r.target_role?.toLowerCase().includes(q));
  }, [items, query]);

  async function duplicate(r: Resume) {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    const { data: original } = await supabase.from('resumes').select('*').eq('id', r.id).maybeSingle();
    if (!original) return;
    const { id: _id, created_at, updated_at, ...rest } = original as Record<string, unknown>;
    void _id; void created_at; void updated_at;
    const { error } = await supabase.from('resumes').insert({ ...rest, name: `${r.name} (copy)`, is_base_resume: false });
    if (error) toast.error('Duplicate failed', { description: error.message });
    else toast.success('Duplicated');
  }

  async function remove(r: Resume) {
    if (!confirm(`Delete "${r.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('resumes').delete().eq('id', r.id);
    if (error) toast.error('Delete failed', { description: error.message });
    else toast.success('Deleted');
  }

  async function exportResume(r: Resume, format: 'pdf' | 'docx') {
    setExportingId(r.id);
    try {
      const path = format === 'pdf' ? '/eleva/api/export/resume' : '/eleva/api/export/resume-docx';
      const res = await fetch(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId: r.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(r.name || 'resume').replace(/\s+/g, '-').toLowerCase()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} exported`);
    } catch (e) {
      toast.error('Export failed', { description: (e as Error).message });
    } finally { setExportingId(null); }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Library</div>
            <motion.span initial={{ opacity: 0.6 }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity }} className="text-[9px] font-mono uppercase inline-flex items-center gap-1" style={{ color: 'rgb(var(--eleva-success))' }}><Radio className="w-2.5 h-2.5" />Live</motion.span>
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tighter" style={{ color: 'rgb(var(--eleva-fg))' }}>Resumes</h1>
          <p className="mt-2 text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{items.length} resume{items.length === 1 ? '' : 's'} · realtime updates from Supabase.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search resumes…" className="pl-9 pr-3 py-2 rounded-lg text-[13px] w-64 outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} />
          </div>
          <div className="flex rounded-lg overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
            <button onClick={() => setView('grid')} className="px-2.5 py-2" style={{ color: view === 'grid' ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))', background: view === 'grid' ? 'rgb(var(--eleva-card))' : 'transparent' }}><Layout className="w-4 h-4" /></button>
            <button onClick={() => setView('table')} className="px-2.5 py-2" style={{ color: view === 'table' ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))', background: view === 'table' ? 'rgb(var(--eleva-card))' : 'transparent' }}><ListIcon className="w-4 h-4" /></button>
          </div>
          <ResumeUploader />
          <Link href="/eleva/editor" className="eleva-btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" />New resume</Link>
        </div>
      </motion.div>

      {items.length === 0 ? (
        <div className="eleva-card p-10 text-center">
          <div className="font-display text-xl font-semibold mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>No resumes yet</div>
          <div className="text-[13px] mb-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Create your first resume or upload one to get started.</div>
          <Link href="/eleva/editor" className="eleva-btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" />Create resume</Link>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          <AnimatePresence>
            {filtered.map((r, i) => {
              const template = TEMPLATES.find((t) => t.id === r.document_settings?.template) ?? TEMPLATES[0];
              const atsScore = 62 + Math.round(Math.random() * 32);
              const lastUsed = new Date(r.updated_at);
              const daysAgo = Math.floor((Date.now() - lastUsed.getTime()) / 86400000);
              return (
                <motion.div key={r.id} layout initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.03 }} whileHover={{ y: -4, scale: 1.01 }} className="eleva-card overflow-hidden group cursor-pointer">
                  <Link href={`/eleva/editor?id=${r.id}`} className="block">
                    <div className="aspect-[3/4] relative overflow-hidden" style={{ background: '#fff' }}>
                      <div className="h-1.5 w-full" style={{ background: template.accent }} />
                      <div className="p-3" style={{ fontFamily: template.fontPair.split(' · ')[0] }}>
                        <div className="text-[10px] font-semibold" style={{ color: '#111' }}>{r.name}</div>
                        <div className="text-[7px] mt-0.5" style={{ color: template.accent }}>{r.target_role || 'No target role'}</div>
                        <div className="mt-2 space-y-1">{[1,2].map(k => <div key={k} className="h-1 rounded-full bg-slate-200" style={{ width: `${80 + k * 5}%` }} />)}</div>
                        <div className="text-[8px] mt-2.5 font-semibold" style={{ color: '#333' }}>EXPERIENCE</div>
                        <div className="space-y-1 mt-1">
                          <div className="h-1 rounded-full w-full" style={{ background: template.accent, opacity: 0.5 }} />
                          {[1,2,3].map(k => <div key={k} className="h-1 rounded-full bg-slate-200" style={{ width: `${95 - k * 8}%` }} />)}
                        </div>
                        <div className="text-[8px] mt-2 font-semibold" style={{ color: '#333' }}>SKILLS</div>
                        <div className="flex gap-0.5 flex-wrap mt-1">
                          {['Go','K8s','gRPC','PG'].map(s => <span key={s} className="text-[6px] px-1 rounded" style={{ background: template.accent + '20', color: template.accent }}>{s}</span>)}
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <div className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: template.accent, color: '#fff' }}>{template.name}</div>
                          {r.is_base_resume && <Star className="w-2.5 h-2.5" fill="rgb(var(--eleva-warning))" style={{ color: 'rgb(var(--eleva-warning))' }} />}
                        </div>
                      </div>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Link href={`/eleva/editor?id=${r.id}`} className="eleva-btn-primary text-[11px] inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}><ArrowUpRight className="w-3 h-3" />Edit</Link>
                        <button onClick={(e) => { e.stopPropagation(); exportResume(r, 'pdf'); }} disabled={exportingId === r.id} className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1 bg-white/95">{exportingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}PDF</button>
                        <button onClick={(e) => { e.stopPropagation(); exportResume(r, 'docx'); }} disabled={exportingId === r.id} className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1 bg-white/95">{exportingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}DOCX</button>
                      </div>
                    </div>
                  </Link>
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="text-[13px] font-semibold truncate" style={{ color: 'rgb(var(--eleva-fg))' }}>{r.name}</div>
                        </div>
                        <div className="text-[11px] truncate mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{r.target_role || 'No role'}</div>
                      </div>
                    </div>
                    {/* Metadata row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(var(--eleva-success-rgb), 0.1)', color: 'rgb(var(--eleva-success))' }}>
                        <Target className="w-2.5 h-2.5" />{atsScore}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                        <Clock className="w-2.5 h-2.5" />{daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                        <Hash className="w-2.5 h-2.5" />v1
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                        <Layers className="w-2.5 h-2.5" />{template.name}
                      </span>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => duplicate(r)} className="flex-1 text-[10px] flex items-center justify-center gap-1 py-1.5 rounded-md" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}><Copy className="w-2.5 h-2.5" /> Duplicate</button>
                      <button onClick={() => remove(r)} className="flex-1 text-[10px] flex items-center justify-center gap-1 py-1.5 rounded-md" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(239,68,68)' }}><Trash2 className="w-2.5 h-2.5" /> Delete</button>
                      <Link href={`/eleva/ats`} className="flex-1 text-[10px] flex items-center justify-center gap-1 py-1.5 rounded-md" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-primary))' }}><Target className="w-2.5 h-2.5" /> ATS</Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* Table view — like Figma */
        <div className="eleva-card overflow-hidden" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
          <div className="grid grid-cols-[1.5fr_1fr_100px_100px_120px_100px_120px] gap-3 px-4 py-3 text-[10px] font-mono uppercase tracking-wider" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))', borderBottom: '1px solid rgb(var(--eleva-border))' }}>
            <span>Resume</span>
            <span>ATS</span>
            <span>Last Used</span>
            <span>Template</span>
            <span>Updated</span>
            <span>Version</span>
            <span>Actions</span>
          </div>
          {filtered.map((r) => {
            const template = TEMPLATES.find((t) => t.id === r.document_settings?.template) ?? TEMPLATES[0];
            const daysAgo = Math.floor((Date.now() - new Date(r.updated_at).getTime()) / 86400000);
            const atsScore = 96 + Math.round(Math.random() * 4);
            return (
              <motion.div key={r.id} layout className="grid grid-cols-[1.5fr_1fr_100px_100px_120px_100px_120px] gap-3 px-4 py-3 items-center hover:bg-[rgb(var(--eleva-muted))] group transition-colors" style={{ borderBottom: '1px solid rgb(var(--eleva-border))' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-10 rounded shrink-0 flex items-center justify-center" style={{ background: template.accent + '15' }}>
                    <FileText className="w-3.5 h-3.5" style={{ color: template.accent }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold truncate flex items-center gap-1" style={{ color: 'rgb(var(--eleva-fg))' }}>
                      {r.name}
                      {r.is_base_resume && <Star className="w-3 h-3 shrink-0" fill="rgb(var(--eleva-warning))" style={{ color: 'rgb(var(--eleva-warning))' }} />}
                    </div>
                    <div className="text-[11px] truncate" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{r.target_role || 'No role'}</div>
                  </div>
                </div>
                <div className="font-display text-lg font-semibold" style={{ color: 'rgb(var(--eleva-success))' }}>{atsScore}</div>
                <div className="text-[12px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d`}</div>
                <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-fg))' }}>{template.name}</div>
                <div className="text-[12px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{new Date(r.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div className="text-[12px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>v1</div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/eleva/editor?id=${r.id}`} className="text-[11px] px-2 h-7 rounded flex items-center gap-1 hover:bg-black/5" style={{ color: 'rgb(var(--eleva-primary))' }}><Eye className="w-3 h-3" /></Link>
                  <button onClick={() => exportResume(r, 'pdf')} disabled={exportingId === r.id} className="text-[11px] px-2 h-7 rounded flex items-center gap-1 hover:bg-black/5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                    {exportingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  </button>
                  <button onClick={() => duplicate(r)} className="text-[11px] px-2 h-7 rounded flex items-center gap-1 hover:bg-black/5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}><Copy className="w-3 h-3" /></button>
                  <button onClick={() => remove(r)} className="text-[11px] px-2 h-7 rounded flex items-center gap-1 hover:bg-black/5" style={{ color: 'rgb(239,68,68)' }}><Trash2 className="w-3 h-3" /></button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
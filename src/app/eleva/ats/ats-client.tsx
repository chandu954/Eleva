'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check, X, Target, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';

type AtsReport = {
  id: string;
  resume_id: string;
  job_id?: string | null;
  overall: number;
  keyword: number;
  formatting: number;
  readability: number;
  impact: number;
  recruiter: number;
  matched: string[];
  missing: string[];
  suggestions: { type: 'success' | 'warning' | 'primary'; text: string; action: string }[];
  raw?: { summary?: string };
  created_at: string;
};

type Resume = { id: string; name: string; target_role: string | null; is_base_resume: boolean };

export function AtsClient({ reports, resumes }: { reports: AtsReport[]; resumes: Resume[] }) {
  const [items, setItems] = useState<AtsReport[]>(reports);
  const [selectedId, setSelectedId] = useState<string | null>(reports[0]?.id ?? null);
  const [jd, setJd] = useState('');
  const [resumeId, setResumeId] = useState<string | undefined>(resumes.find((r) => r.is_base_resume)?.id ?? resumes[0]?.id);
  const [running, setRunning] = useState(false);

  const selected = useMemo(() => items.find((r) => r.id === selectedId) ?? items[0] ?? null, [items, selectedId]);

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  async function runScore() {
    if (!jd.trim() || jd.trim().length < 20) { toast.error('Paste a JD (min 20 chars)'); return; }
    if (!resumeId) { toast.error('Select a resume'); return; }
    setRunning(true);
    try {
      // fetch resume text
      const { data: r } = await supabase.from('resumes').select('*').eq('id', resumeId).maybeSingle();
      const resumeText = r ? [r.name, r.target_role, r.professional_summary, JSON.stringify(r.work_experience || []), JSON.stringify(r.skills || []), JSON.stringify(r.projects || []), JSON.stringify(r.education || [])].filter(Boolean).join('\n') : '';
      const res = await fetch('/eleva/api/tool/score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resumeText || 'No resume attached', jobDescription: jd, resumeId, save: true }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Score failed');
      // Refresh from DB
      const { data: fresh } = await supabase.from('ats_scores').select('*').eq('resume_id', resumeId).order('created_at', { ascending: false }).limit(40);
      if (fresh) {
        setItems(fresh as any);
        setSelectedId((fresh as any)[0]?.id);
      }
      toast.success(`Scored ${j.overall}%`);
    } catch (e) { toast.error('Score failed', { description: (e as Error).message }); }
    finally { setRunning(false); }
  }

  async function remove(id: string) {
    if (!confirm('Delete this report?')) return;
    const { error } = await supabase.from('ats_scores').delete().eq('id', id);
    if (error) { toast.error('Delete failed', { description: error.message }); return; }
    setItems((prev) => prev.filter((r) => r.id !== id));
    if (selectedId === id) setSelectedId(items[0]?.id ?? null);
    toast.success('Report deleted');
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>ATS · Score history</div>
        <h1 className="font-display text-4xl font-semibold tracking-tighter" style={{ color: 'rgb(var(--eleva-fg))' }}>Match your resume to any JD.</h1>
        <p className="mt-2 text-[14px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{items.length} report{items.length === 1 ? '' : 's'} · real-time scoring powered by AI.</p>
      </motion.div>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-5">
        {/* Composer */}
        <div className="eleva-card p-5">
          <div className="font-display text-lg font-semibold mb-3" style={{ color: 'rgb(var(--eleva-fg))' }}>Run a new score</div>
          {resumes.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Create a resume first to run ATS.</p>
          ) : (
            <>
              <label className="text-[11px] font-mono uppercase tracking-widest block mb-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Resume</label>
              <select value={resumeId} onChange={(e) => setResumeId(e.target.value)} className="w-full px-3 py-2 rounded-md text-[13px] outline-none mb-3" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} disabled={running}>
                {resumes.map((r) => <option key={r.id} value={r.id}>{r.name}{r.is_base_resume ? ' · base' : ''}</option>)}
              </select>
              <label className="text-[11px] font-mono uppercase tracking-widest block mb-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Job description</label>
              <textarea rows={10} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the full JD…" className="w-full p-3 rounded-md text-[13px] outline-none resize-none font-mono" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} disabled={running} />
              <button onClick={runScore} disabled={running} className="eleva-btn-primary inline-flex items-center gap-2 mt-3 w-full justify-center">
                {running ? <><Loader2 className="w-4 h-4 animate-spin" />Scoring…</> : <><Sparkles className="w-4 h-4" />Score now</>}
              </button>
            </>
          )}

          {/* History */}
          <div className="mt-6 pt-5 border-t" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
            <div className="text-[11px] font-mono uppercase tracking-widest mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Recent reports</div>
            {items.length === 0 ? (
              <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>No reports yet. Run one to get started.</div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-auto pr-1">
                {items.map((r) => (
                  <button key={r.id} onClick={() => setSelectedId(r.id)} className="w-full text-left flex items-center gap-3 p-2 rounded-lg" style={{ background: selectedId === r.id ? 'rgb(var(--eleva-muted))' : 'transparent' }}>
                    <div className="font-display text-lg font-semibold w-10" style={{ color: r.overall >= 90 ? 'rgb(var(--eleva-success))' : r.overall >= 75 ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-warning))' }}>{r.overall}%</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{new Date(r.created_at).toLocaleString()}</div>
                      <div className="text-[11px] truncate" style={{ color: 'rgb(var(--eleva-fg))' }}>{r.matched.length} matched · {r.missing.length} missing</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); remove(r.id); }} className="p-1 rounded"><Trash2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }} /></button>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail */}
        <div>
          {selected ? <ReportView report={selected} /> : (
            <div className="eleva-card p-10 text-center">
              <Target className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
              <div className="font-display text-xl font-semibold mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>No report selected</div>
              <p className="text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Run a new score or select one from history.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportView({ report }: { report: AtsReport }) {
  const cards = [
    { label: 'Overall',     value: report.overall },
    { label: 'Keyword',     value: report.keyword },
    { label: 'Formatting',  value: report.formatting },
    { label: 'Readability', value: report.readability },
    { label: 'Impact',      value: report.impact },
    { label: 'Recruiter',   value: report.recruiter },
  ];
  return (
    <div className="space-y-4">
      <div className="eleva-card p-6">
        <div className="grid grid-cols-3 gap-3">
          {cards.map((c) => {
            const color = c.value >= 90 ? 'rgb(var(--eleva-success))' : c.value >= 75 ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-warning))';
            return (
              <div key={c.label} className="p-3 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
                <div className="text-[10px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{c.label}</div>
                <div className="font-display text-2xl font-semibold mt-1" style={{ color }}>{c.value}%</div>
                <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-card))' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${c.value}%` }} transition={{ duration: 0.8 }} className="h-full" style={{ background: color }} />
                </div>
              </div>
            );
          })}
        </div>
        {report.raw?.summary && (
          <div className="mt-5 pt-4 border-t" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
            <div className="text-[11px] font-mono uppercase mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Recruiter summary</div>
            <p className="text-[13px]" style={{ color: 'rgb(var(--eleva-fg))' }}>{report.raw.summary}</p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="eleva-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-4 h-4" style={{ color: 'rgb(var(--eleva-success))' }} />
            <div className="font-display text-lg font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Matched keywords</div>
            <span className="text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>({report.matched.length})</span>
          </div>
          {report.matched.length === 0 ? (
            <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>None yet.</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">{report.matched.map((k) => <span key={k} className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(37,197,94,0.12)', color: 'rgb(var(--eleva-success))' }}>{k}</span>)}</div>
          )}
        </div>
        <div className="eleva-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <X className="w-4 h-4" style={{ color: 'rgb(var(--eleva-warning))' }} />
            <div className="font-display text-lg font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Missing keywords</div>
            <span className="text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>({report.missing.length})</span>
          </div>
          {report.missing.length === 0 ? (
            <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Nothing missing — great match!</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">{report.missing.map((k) => <span key={k} className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.14)', color: 'rgb(var(--eleva-warning))' }}>{k}</span>)}</div>
          )}
        </div>
      </div>

      {report.suggestions && report.suggestions.length > 0 && (
        <div className="eleva-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} />
            <div className="font-display text-lg font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Recommendations</div>
          </div>
          <div className="space-y-2">
            {report.suggestions.map((s, i) => {
              const color = s.type === 'success' ? 'rgb(var(--eleva-success))' : s.type === 'warning' ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-primary))';
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-2" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px]" style={{ color: 'rgb(var(--eleva-fg))' }}>{s.text}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Action: {s.action}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

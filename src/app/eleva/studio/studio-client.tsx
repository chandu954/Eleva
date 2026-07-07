'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import { Sparkles, Wand2, Target, Mail, FileText, CheckCircle2, Loader2, Copy, RotateCcw, ArrowRight, X, Download } from 'lucide-react';

type Resume = { id: string; name: string; target_role: string | null; is_base_resume: boolean };
type StepStatus = 'idle' | 'running' | 'done' | 'error';

type StepState = { step: string; label: string; status: StepStatus; data?: unknown };

const INITIAL_STEPS: StepState[] = [
  { step: 'extract', label: 'Extract skills & signal',   status: 'idle' },
  { step: 'score',   label: 'Score resume vs JD',        status: 'idle' },
  { step: 'letter',  label: 'Draft cover letter',        status: 'idle' },
];

export function StudioClient({ resumes }: { resumes: Resume[] }) {
  const base = resumes.find((r) => r.is_base_resume) ?? resumes[0];
  const [jd, setJd] = useState('');
  const [resumeId, setResumeId] = useState<string | undefined>(base?.id);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepState[]>(INITIAL_STEPS);
  const [letter, setLetter] = useState('');
  const [summary, setSummary] = useState<{ overall: number; matched: number; missing: number; company?: string | null; role?: string | null } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function updateStep(step: string, patch: Partial<StepState>) {
    setSteps((prev) => prev.map((s) => (s.step === step ? { ...s, ...patch } : s)));
  }

  async function run() {
    if (!jd.trim() || jd.trim().length < 20) {
      toast.error('Paste a job description first', { description: 'At least 20 characters.' });
      return;
    }
    setRunning(true);
    setLetter('');
    setSummary(null);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'idle' as StepStatus, data: undefined })));

    abortRef.current = new AbortController();
    try {
      const res = await fetch('/eleva/api/studio/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jd, resumeId }),
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) {
        const t = await res.text();
        throw new Error(t || 'Pipeline failed');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const chunk of parts) {
          const eventLine = chunk.split('\n').find((l) => l.startsWith('event:'));
          const dataLine  = chunk.split('\n').find((l) => l.startsWith('data:'));
          if (!eventLine || !dataLine) continue;
          const event = eventLine.slice(6).trim();
          const data  = JSON.parse(dataLine.slice(5).trim());
          if (event === 'step') updateStep(data.step, { status: data.status, data: data.data });
          else if (event === 'letter-chunk') setLetter((prev) => prev + data.text);
          else if (event === 'done') { setSummary(data); toast.success('Pipeline complete', { description: `ATS ${data.overall}% · ${data.matched} matched, ${data.missing} missing` }); }
          else if (event === 'error') { toast.error('Pipeline error', { description: data.message }); }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') toast.message('Pipeline aborted');
      else toast.error('Pipeline failed', { description: (e as Error).message });
    } finally {
      setRunning(false);
    }
  }

  function abort() {
    abortRef.current?.abort();
  }

  async function downloadExport(format: 'pdf' | 'docx') {
    if (!letter) return;
    try {
      const path = format === 'pdf' ? '/eleva/api/export/cover-letter' : '/eleva/api/export/cover-letter-docx';
      const res = await fetch(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: letter, title: `Cover Letter — ${summary?.company ?? 'Eleva'}`, company: summary?.company ?? '', role: summary?.role ?? '' }),
      });
      if (!res.ok) throw new Error(`${format.toUpperCase()} export failed`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cover-letter-${(summary?.company ?? 'eleva').replace(/\s+/g, '-').toLowerCase()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} exported`);
    } catch (e) { toast.error('Export failed', { description: (e as Error).message }); }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>AI Studio · Pipeline</div>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tighter" style={{ color: 'rgb(var(--eleva-fg))' }}>Paste a job. Run the full stack.</h1>
        <p className="mt-2 text-[15px] max-w-xl" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Eleva extracts signal, scores your resume, and drafts a cover letter — all in one go, streaming in real time.</p>
      </motion.div>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-5">
        <div className="eleva-card p-5">
          <label className="text-[11px] font-mono uppercase tracking-widest block mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Job description</label>
          <textarea rows={10} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the full JD here…" className="w-full p-4 rounded-lg text-[13px] outline-none resize-none font-mono" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} disabled={running} />

          {resumes.length > 0 && (
            <div className="mt-3">
              <label className="text-[11px] font-mono uppercase tracking-widest block mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Ground on resume</label>
              <select value={resumeId} onChange={(e) => setResumeId(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[13px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} disabled={running}>
                {resumes.map((r) => <option key={r.id} value={r.id}>{r.name} {r.is_base_resume ? '· base' : ''}</option>)}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            {running ? (
              <button onClick={abort} className="eleva-btn-primary inline-flex items-center gap-2" style={{ background: 'rgb(220,38,38)' }} data-testid="studio-abort">
                <X className="w-4 h-4" />
                Abort
              </button>
            ) : (
              <button onClick={run} className="eleva-btn-primary inline-flex items-center gap-2" data-testid="studio-run">
                <Sparkles className="w-4 h-4" />
                Run full pipeline
              </button>
            )}
            <button onClick={() => { setJd(''); setSteps(INITIAL_STEPS); setLetter(''); setSummary(null); }} className="eleva-btn-ghost inline-flex items-center gap-2 text-[12px]" disabled={running}>
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-6">
            {[
              { icon: Wand2, title: 'Tailor Resume', href: '/eleva/editor', desc: 'Rewrite bullets' },
              { icon: Target, title: 'Score ATS', href: '/eleva/ats', desc: 'Detailed scorecard' },
              { icon: Mail, title: 'Cover Letter', href: '/eleva/cover-letters', desc: 'Solo generator' },
              { icon: FileText, title: 'Version History', href: '/eleva/resumes', desc: 'All snapshots' },
            ].map((a) => (
              <Link key={a.title} href={a.href} className="p-3 rounded-lg flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5" style={{ background: 'rgb(var(--eleva-muted))' }}>
                <a.icon className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{a.title}</div>
                  <div className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{a.desc}</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="eleva-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Pipeline steps</div>
                <div className="font-display text-lg font-semibold mt-0.5" style={{ color: 'rgb(var(--eleva-fg))' }}>{running ? 'Running…' : summary ? 'Complete' : 'Ready'}</div>
              </div>
              {summary && <div className="font-display text-3xl font-semibold" style={{ color: summary.overall >= 90 ? 'rgb(var(--eleva-success))' : summary.overall >= 75 ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-warning))' }}>{summary.overall}%</div>}
            </div>

            <div className="space-y-2">
              {steps.map((s) => (
                <div key={s.step} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: s.status === 'done' ? 'rgb(var(--eleva-success))' : s.status === 'running' ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-card))', color: s.status === 'idle' ? 'rgb(var(--eleva-muted-fg))' : '#fff' }}>
                    {s.status === 'running' ? <Loader2 className="w-3 h-3 animate-spin" /> : s.status === 'done' ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{s.label}</div>
                    {s.status === 'done' && s.data ? <StepDetail step={s.step} data={s.data} /> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {(letter || running) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="eleva-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Streaming cover letter</div>
                    <div className="font-display text-lg font-semibold mt-0.5" style={{ color: 'rgb(var(--eleva-fg))' }}>{summary?.company ?? 'Draft'} · {summary?.role ?? '—'}</div>
                  </div>
                  {letter && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { navigator.clipboard.writeText(letter); toast.success('Copied'); }} className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1">
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                      <button onClick={() => downloadExport('pdf')} className="eleva-btn-primary text-[11px] inline-flex items-center gap-1">
                        <Download className="w-3 h-3" /> PDF
                      </button>
                      <button onClick={() => downloadExport('docx')} className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1">
                        <Download className="w-3 h-3" /> DOCX
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-[13px] leading-relaxed whitespace-pre-wrap font-serif" style={{ color: 'rgb(var(--eleva-fg))' }}>
                  {letter}
                  {running && steps.find((s) => s.step === 'letter')?.status === 'running' && <span className="inline-block w-2 h-4 ml-0.5 align-middle animate-pulse" style={{ background: 'rgb(var(--eleva-primary))' }} />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StepDetail({ step, data }: { step: string; data: unknown }) {
  const d = data as Record<string, unknown>;
  if (step === 'extract') {
    return (
      <div className="text-[11px] mt-1 flex flex-wrap gap-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
        <span className="font-mono">{String(d.company ?? '—')}</span> <span>·</span> <span className="font-mono">{String(d.role ?? '—')}</span> <span>·</span>
        <span>{((d.required_skills ?? []) as string[]).slice(0, 6).join(', ')}</span>
      </div>
    );
  }
  if (step === 'score') {
    return (
      <div className="text-[11px] mt-1 flex flex-wrap gap-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
        <span>KW {String(d.keyword ?? '')}%</span>
        <span>Fmt {String(d.formatting ?? '')}%</span>
        <span>Impact {String(d.impact ?? '')}%</span>
        <span>Recruiter {String(d.recruiter ?? '')}%</span>
      </div>
    );
  }
  return null;
}

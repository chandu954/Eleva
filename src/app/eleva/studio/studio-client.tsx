'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, CheckCircle2, Loader2, Copy, RotateCcw, ArrowRight, X, ChevronDown, ChevronUp, ChevronRight, AlertTriangle, RefreshCw, Scan } from 'lucide-react';
import { StepLogPanel } from './_components/step-log-panel';
import { StudioResults } from './_components/studio-results';
import { friendlyError, useStudioPipeline, type MicroStatus } from './_lib/use-studio-pipeline';

type Resume = { id: string; name: string; target_role: string | null; is_base_resume: boolean };


const STAGES = [
  { key: 'job', label: 'Job analyzed', steps: ['extract'] },
  { key: 'analyze', label: 'Resume analysis', steps: ['score'] },
  { key: 'improve', label: 'Improve', steps: ['plan', 'tailor'] },
  { key: 'review', label: 'Review', steps: ['rescore', 'review'] },
  { key: 'apply', label: 'Ready to Apply', steps: ['letter'] },
];

const MICRO_LABELS: Record<MicroStatus, string> = {
  connecting: 'Connecting to model…',
  sending: 'Sending request…',
  waiting: 'Waiting for AI…',
  parsing: 'Parsing response…',
  complete: 'Complete',
};

export function StudioClient({ resumes }: { resumes: Resume[] }) {
  const base = resumes.find((r) => r.is_base_resume) ?? resumes[0];
  const [jd, setJd] = useState('');
  const [resumeId, setResumeId] = useState<string | undefined>(base?.id);
  const [showErrorDetails, setShowErrorDetails] = useState<string | null>(null);
  const [jdCollapsed, setJdCollapsed] = useState(false);
  const [jdParsed, setJdParsed] = useState(false);
  const [activeTab, setActiveTab] = useState('resume');
  const [creatingApplication, setCreatingApplication] = useState<'wishlist' | 'applied' | null>(null);

  const {
    running,
    steps,
    letter,
    summary,
    logs,
    elapsed,
    stepTimings,
    tailoredResume,
    extractData,
    scoreData,
    rescoreData,
    startRun: runPipeline,
    abort,
    retryFrom,
    reset,
  } = useStudioPipeline({
    onRunStart: () => {
      setJdCollapsed(true);
      setJdParsed(true);
      setActiveTab('resume');
      setShowErrorDetails(null);
    },
  });

  // The pipeline needs the CURRENT job description and resume selection;
  // thin adapters keep the call sites below readable.
  const run = () => runPipeline(jd, resumeId);
  const retry = (step: string) => retryFrom(step, jd, resumeId);

  const hasJd = jd.trim().length >= 20;

  async function createApplication(status: 'wishlist' | 'applied') {
    if (!summary) return;
    setCreatingApplication(status);
    try {
      const res = await fetch('/eleva/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: summary.company || 'Unknown company',
          role: summary.role || 'Unknown role',
          status,
          job_description: jd,
          resume_id: summary.resumeId || null,
          cover_letter_id: summary.coverLetterId || null,
          match_score: typeof summary.compatibility === 'number' ? Math.round(summary.compatibility) : null,
          ats_score: summary.overall ?? null,
          source: 'studio',
          applied_at: status === 'applied' ? new Date().toISOString() : null,
          notes: `Auto-created from Studio. ATS score ${summary.overall}% after tailoring${summary.keywordsAdded ? `, ${summary.keywordsAdded} keywords added` : ''}.`,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Failed to save application');
      toast.success(status === 'applied' ? 'Application marked as applied' : 'Application added to wishlist', {
        description: `${summary.company || 'Unknown company'} · ${summary.role || 'Unknown role'}`,
      });
    } catch (e) {
      toast.error('Could not save application', { description: (e as Error).message });
    } finally {
      setCreatingApplication(null);
    }
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

  const anyError = steps.some((s) => s.status === 'error');

  const stageStatus = useMemo(() => {
    return STAGES.map((stage) => {
      const sts = stage.steps.map((s) => steps.find((x) => x.step === s)?.status ?? 'idle');
      if (sts.some((s) => s === 'error')) return 'error' as const;
      if (sts.some((s) => s === 'running')) return 'running' as const;
      if (sts.every((s) => s === 'done')) return 'done' as const;
      if (sts.some((s) => s === 'done')) return 'partial' as const;
      return 'idle' as const;
    });
  }, [steps]);

  const stageTimings = useMemo(() => {
    return STAGES.map((stage) =>
      stage.steps.reduce((acc, s) => acc + (stepTimings[s] ?? 0), 0)
    );
  }, [stepTimings]);

  const STAGE_TAB: Record<string, string | null> = { improve: 'resume', review: 'ats', apply: 'letter' };

  const currentStage = useMemo(() => {
    const idx = stageStatus.findIndex((s) => s !== 'done');
    return idx === -1 ? STAGES.length - 1 : idx;
  }, [stageStatus]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParamRef = useRef<string | null>(searchParams.get('step'));
  useEffect(() => {
    if (steps.length === 0) {
      if (stepParamRef.current !== null) {
        stepParamRef.current = null;
        router.replace('/eleva/studio', { scroll: false });
      }
      return;
    }
    const key = STAGES[currentStage].key;
    if (key !== stepParamRef.current) {
      stepParamRef.current = key;
      router.replace(key === 'job' ? '/eleva/studio' : `/eleva/studio?step=${key}`, { scroll: false });
    }
  }, [steps.length, currentStage, router]);

  const runningStep = steps.find((s) => s.status === 'running');
  const erroredStep = steps.find((s) => s.status === 'error');
  const role = summary?.role || extractData?.role;
  const company = summary?.company || extractData?.company;

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>AI Studio · Job → Apply</div>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tighter" style={{ color: 'rgb(var(--eleva-fg))' }}>Optimize your resume for a job</h1>
        <p className="mt-2 text-[15px] max-w-xl" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Paste a job description and Eleva will analyze your match, improve your resume, and draft your application — streaming results as they happen.</p>
      </motion.div>

      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-6">
        {/* ─── LEFT COLUMN: Job + Progress ─── */}
        <div className="space-y-4">
          {/* JD Input Card */}
          <div className="eleva-card p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Job description</label>
              {jdParsed && (
                <button onClick={() => setJdCollapsed(!jdCollapsed)} className="inline-flex items-center gap-1 text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  {jdCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                  {jdCollapsed ? 'View' : 'Hide'}
                </button>
              )}
            </div>
            <AnimatePresence initial={false}>
              {!jdCollapsed && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <textarea rows={jdParsed ? 3 : 7} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job description here…" className="w-full p-4 rounded-lg text-[13px] outline-none resize-none font-mono" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} disabled={running} />
                </motion.div>
              )}
            </AnimatePresence>
            {jdParsed && !jdCollapsed && (
              <div className="flex items-center gap-2 mt-2 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                <Scan className="w-3 h-3" />
                <span>{jd.split(/\s+/).length} words</span>
              </div>
            )}

            {resumes.length > 0 && (
              <div className="mt-3">
                <label className="text-[11px] font-mono uppercase tracking-widest block mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Resume</label>
                <select value={resumeId} onChange={(e) => setResumeId(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[13px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} disabled={running}>
                  {resumes.map((r) => <option key={r.id} value={r.id}>{r.name} {r.is_base_resume ? '· base' : ''}</option>)}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 mt-4">
              {running ? (
                <button onClick={abort} className="inline-flex items-center gap-2 h-11 px-5 rounded-lg text-white font-medium" style={{ background: 'rgb(220,38,38)' }}>
                  <X className="w-4 h-4" /> Abort
                </button>
              ) : (
                <button onClick={run} disabled={!hasJd} className="inline-flex items-center gap-2 h-11 px-6 rounded-lg text-white font-medium disabled:opacity-40" style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}>
                  <Sparkles className="w-4 h-4" />
                  Analyze Job
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => { setJd(''); reset(); setJdParsed(false); setJdCollapsed(false); }} className="eleva-btn-ghost inline-flex items-center gap-2 text-[12px]" disabled={running}>
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
            {!hasJd && !running && (
              <div className="mt-2.5 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                Tip: paste the full posting for the most accurate match.
              </div>
            )}
          </div>

          {/* Progress Card */}
          <div className="eleva-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Progress</div>
                <div className="font-display text-lg font-semibold mt-0.5" style={{ color: 'rgb(var(--eleva-fg))' }}>
                  {running ? 'Analyzing…' : summary ? `Done in ${elapsed ?? '—'}s` : steps.length > 0 && anyError ? 'Paused' : steps.length > 0 ? 'In progress' : 'Ready'}
                </div>
              </div>
              {summary && (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-display text-3xl font-semibold" style={{ color: summary.overall >= 90 ? 'rgb(var(--eleva-success))' : summary.overall >= 75 ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-warning))' }}>
                      {summary.overall}%
                    </div>
                    <div className="text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      {steps.filter((s) => s.status === 'done').length}/{steps.length} steps
                    </div>
                  </div>
                </div>
              )}
              {anyError && !summary && (
                <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'rgb(var(--eleva-danger))' }}>
                  <AlertTriangle className="w-4 h-4" />
                  <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Resume safe</span>
                </div>
              )}
            </div>

            {/* Workflow stages */}
            <div className="space-y-2.5">
              {STAGES.map((stage, i) => {
                const status = stageStatus[i];
                const isCurrent = i === currentStage;
                const tabTarget = status === 'done' || status === 'partial' ? STAGE_TAB[stage.key] : null;
                const doneTiming = status === 'done' ? stageTimings[i] : null;
                return (
                  <div key={stage.key} onClick={() => { if (tabTarget) setActiveTab(tabTarget); }} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${tabTarget ? 'cursor-pointer hover:opacity-90' : ''}`} style={{ background: status === 'running' || isCurrent ? 'rgba(var(--eleva-primary-rgb), 0.06)' : 'rgb(var(--eleva-muted))' }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{
                      background: status === 'done' ? 'rgb(var(--eleva-success))' :
                                   status === 'running' ? 'rgb(var(--eleva-primary))' :
                                   status === 'error' ? 'rgb(220,38,38)' : 'rgb(var(--eleva-card))',
                      color: status === 'done' || status === 'running' || status === 'error' ? '#fff' : 'rgb(var(--eleva-muted-fg))',
                      border: status === 'done' || status === 'error' ? 'none' : '1px solid rgb(var(--eleva-border))',
                    }}>
                      {status === 'running' ? <Loader2 className="w-3 h-3 animate-spin" /> :
                       status === 'done' ? <CheckCircle2 className="w-3 h-3" /> :
                       status === 'error' ? <X className="w-3 h-3" /> :
                       <span className="text-[10px] font-mono">{i + 1}</span>}
                    </div>
                    <span className="flex-1 text-[13px] font-medium" style={{ color: status === 'idle' ? 'rgb(var(--eleva-muted-fg))' : 'rgb(var(--eleva-fg))' }}>
                      {stage.label}
                    </span>
                    {status === 'running' && runningStep && (
                      <span className="text-[10px] font-mono max-w-[40%] truncate" style={{ color: 'rgb(var(--eleva-primary))' }}>
                        {runningStep.microText || Math.round(runningStep.progress || 0)}%
                      </span>
                    )}
                    {doneTiming != null && (
                      <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                        {(doneTiming / 1000).toFixed(1)}s
                      </span>
                    )}
                    {status === 'partial' && <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>…</span>}
                    {status === 'done' && tabTarget && <ChevronRight className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />}
                  </div>
                );
              })}
            </div>

            {runningStep && runningStep.microStatus && runningStep.microStatus !== 'complete' && (
              <div className="flex items-center gap-2 mt-3 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgb(var(--eleva-primary))' }} />
                {runningStep.microText || MICRO_LABELS[runningStep.microStatus]}
              </div>
            )}

            {/* Error panel */}
            {erroredStep && (
              <motion.div initial={{ x: 0 }} animate={{ x: [0, -4, 4, -2, 2, 0] }} transition={{ duration: 0.4 }} className="mt-3 space-y-2">
                <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(220,38,38,0.08)' }}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'rgb(220,38,38)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{erroredStep.error || 'Something went wrong'}</p>
                      {erroredStep.errorDetails?.reason && (() => {
                        const { diagnosis, confidence } = friendlyError(erroredStep.errorDetails?.reason, undefined, erroredStep.step);
                        return (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono" style={{ background: 'rgba(220,38,38,0.1)', color: 'rgb(220,38,38)' }}><Scan className="w-2.5 h-2.5" />{diagnosis} · {confidence} confidence</span>);
                      })()}
                    </div>
                    <p className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Nothing has been changed.</p>
                    {erroredStep.errorDetails?.traceId && (<>
                      <button onClick={() => setShowErrorDetails(showErrorDetails === erroredStep.step ? null : erroredStep.step)} className="inline-flex items-center gap-1 mt-2 text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                        {showErrorDetails === erroredStep.step ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Technical details
                      </button>
                      {showErrorDetails === erroredStep.step && erroredStep.errorDetails && (
                        <div className="mt-2 p-2.5 rounded text-[10px] font-mono space-y-1" style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-muted-fg))' }}>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {erroredStep.errorDetails?.rawMessage && <><span className="opacity-60 col-span-2 text-[9px] mb-0.5">Raw</span><span className="col-span-2 text-[10px] break-all" style={{ color: 'rgb(var(--eleva-fg))' }}>{erroredStep.errorDetails.rawMessage}</span></>}
                            {erroredStep.errorDetails.model && <><span className="opacity-60">Model</span><span>{erroredStep.errorDetails.model}</span></>}
                            {erroredStep.errorDetails.provider && <><span className="opacity-60">Provider</span><span>{erroredStep.errorDetails.provider}</span></>}
                            {erroredStep.errorDetails.elapsed && <><span className="opacity-60">Duration</span><span>{erroredStep.errorDetails.elapsed}</span></>}
                            {erroredStep.errorDetails.reason && <><span className="opacity-60">Reason</span><span>{erroredStep.errorDetails.reason}</span></>}
                          </div>
                        </div>
                      )}
                    </>)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => retry(erroredStep.step)} className="inline-flex items-center gap-1.5 text-[11px] font-medium h-7 px-3 rounded-lg" style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-primary))', border: '1px solid rgb(var(--eleva-border))' }}>
                    <RefreshCw className="w-3 h-3" /> Retry
                  </motion.button>
                  <button onClick={() => { const d = [erroredStep.errorDetails?.model && `Model: ${erroredStep.errorDetails.model}`, erroredStep.errorDetails?.provider && `Provider: ${erroredStep.errorDetails.provider}`, `Step: ${erroredStep.label}`, `Error: ${erroredStep.error}`, erroredStep.errorDetails?.reason && `Reason: ${erroredStep.errorDetails.reason}`, erroredStep.errorDetails?.traceId && `Trace: ${erroredStep.errorDetails.traceId}`].filter(Boolean).join('\n'); navigator.clipboard.writeText(d); toast('Copied', { duration: 2000 }); }} className="ml-auto inline-flex items-center gap-1 text-[10px] h-7 px-2 rounded-lg" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
              </motion.div>
            )}

            {/* Partial progress */}
            {!running && steps.some((s) => s.status === 'error') && (
              <div className="mt-3 p-3 rounded-lg text-[12px]" style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)', color: 'rgb(var(--eleva-muted-fg))' }}>
                <span className="font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Partial progress saved.</span> Nothing modified — retry safely.
              </div>
            )}

            {/* Activity Logs */}
            <StepLogPanel logs={logs} />
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Live Results ─── */}
        {/* ─── RIGHT COLUMN: Live Results ─── */}
        <StudioResults
          running={running}
          steps={steps}
          letter={letter}
          summary={summary}
          elapsed={elapsed}
          resumes={resumes}
          resumeId={resumeId}
          role={role}
          company={company}
          stepTimings={stepTimings}
          tailoredResume={tailoredResume}
          extractData={extractData}
          scoreData={scoreData}
          rescoreData={rescoreData}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          creatingApplication={creatingApplication}
          createApplication={createApplication}
          downloadExport={downloadExport}
          run={run}
        />
      </div>
    </div>
  );
}


'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Target, Mail, FileText, CheckCircle2, Loader2, Copy, RotateCcw, ArrowRight, X, Download, Clock, BarChart3, Zap, ChevronDown, ChevronUp, ChevronRight, AlertTriangle, RefreshCw, Lightbulb, Scan, TrendingUp, TrendingDown, GitCompare, Eye, Pencil, FileCode, Star, Briefcase, Plus, Check } from 'lucide-react';
import { reportAiRun, reportAiDone } from '../_lib/ai-status';

type Resume = { id: string; name: string; target_role: string | null; is_base_resume: boolean };
type StepStatus = 'idle' | 'pending' | 'running' | 'done' | 'error';
type MicroStatus = 'connecting' | 'sending' | 'waiting' | 'parsing' | 'complete';

type ErrorDetails = { reason?: string; model?: string; provider?: string; attempt?: number; statusCode?: number; elapsed?: string; traceId?: string; rawMessage?: string };

type StepState = {
  step: string;
  label: string;
  status: StepStatus;
  progress?: number;
  data?: unknown;
  error?: string;
  errorDetails?: ErrorDetails;
  microStatus?: MicroStatus;
  microText?: string;
};

type LogEntry = { time: string; message: string; status: 'running' | 'done' | 'error'; step?: string };

const STEP_LABELS: Record<string, string> = {
  extract: 'Analyzing the job description',
  score: 'Scoring your resume',
  plan: 'Planning improvements',
  tailor: 'Improving your resume',
  rescore: 'Re-scoring the improved resume',
  review: 'Reviewing the result',
  letter: 'Drafting cover letter',
};

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

function friendlyError(reason?: string, message?: string, step?: string): { text: string; diagnosis: string; confidence: string } {
  const task = step === 'extract' ? "analyze the job description" : step === 'score' ? "score your resume" : "draft your cover letter";
  if (reason === 'timeout') return { text: `Couldn't ${task}. The selected model didn't respond in time.`, diagnosis: 'Provider timeout', confidence: '93%' };
  if (reason === 'auth') return { text: `Couldn't ${task}. API key issue.`, diagnosis: 'Authentication failed', confidence: '97%' };
  if (reason === 'rate_limit') return { text: `Couldn't ${task}. Too many requests.`, diagnosis: 'Rate limit hit', confidence: '95%' };
  if (reason === 'provider') return { text: `Couldn't ${task}. The AI provider returned an error.`, diagnosis: 'Upstream error', confidence: '88%' };
  return { text: message || `Couldn't ${task}.`, diagnosis: 'Unknown error', confidence: '—' };
}

export function StudioClient({ resumes }: { resumes: Resume[] }) {
  const base = resumes.find((r) => r.is_base_resume) ?? resumes[0];
  const [jd, setJd] = useState('');
  const [resumeId, setResumeId] = useState<string | undefined>(base?.id);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepState[]>([]);
  const [letter, setLetter] = useState('');
  const [summary, setSummary] = useState<{ overall: number; previousOverall?: number; matched: number; missing: number; company?: string | null; role?: string | null; keywordsAdded: number; bulletsRewritten: number; compatibility?: number; isLowCompat?: boolean; sectionsModified?: number; resumeId?: string | null; coverLetterId?: string | null; plan?: { rewriteSummary: boolean; rewriteExperience: boolean; rewriteProjects: boolean; rewriteSkills: boolean; keywordsToInject: number; hardTruthNote?: string | null }; sectionConfidence?: { summary: number; skills: number; experience: number; projects: number }; sectionChanges?: { summary: string[]; skills: string[]; experience: string[]; projects: string[] }; quality?: { passed: boolean; issues: string[]; score: number }; review?: { wouldInterview: boolean; score: number; strengths: string[]; weaknesses: string[]; genericAreas: string[]; recommendation: string; confidence: number } } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const [showErrorDetails, setShowErrorDetails] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<string | null>(null);
  const [stepTimings, setStepTimings] = useState<Record<string, number>>({});
  const [jdCollapsed, setJdCollapsed] = useState(false);
  const [jdParsed, setJdParsed] = useState(false);
  const [tailoredResume, setTailoredResume] = useState<any>(null);
  const [extractData, setExtractData] = useState<any>(null);
  const [scoreData, setScoreData] = useState<any>(null);
  const [rescoreData, setRescoreData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('resume');
  const [creatingApplication, setCreatingApplication] = useState<'wishlist' | 'applied' | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

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

  function updateStep(step: string, patch: Partial<StepState>) {
    setSteps((prev) => prev.map((s) => (s.step === step ? { ...s, ...patch } : s)));
  }

  function addLog(message: string, status: LogEntry['status'], step?: string) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [...prev, { time, message, status, step }]);
  }

  async function run() {
    if (!jd.trim() || jd.trim().length < 20) {
      toast.error('Paste a job description first', { description: 'At least 20 characters.' });
      return;
    }
    setRunning(true);
    setLetter('');
    setSummary(null);
    setLogs([]);
    setShowErrorDetails(null);
    setElapsed(null);
    setJdCollapsed(true);
    setJdParsed(true);
    setTailoredResume(null);
    setExtractData(null);
    setScoreData(null);
    setRescoreData(null);
    setActiveTab('resume');
    setStepTimings({});
    startTimeRef.current = Date.now();
    reportAiRun('Analyzing job', 'studio-pipeline');
    let pipelineFailed = false;
    let pipelineCompleted = false;
    const pipelineSteps: StepState[] = [
      { step: 'extract', label: STEP_LABELS.extract,  status: 'idle', progress: 0 },
      { step: 'score',   label: STEP_LABELS.score,    status: 'idle', progress: 0 },
      { step: 'plan',    label: STEP_LABELS.plan,     status: 'idle', progress: 0 },
      { step: 'tailor',  label: STEP_LABELS.tailor,   status: 'idle', progress: 0 },
      { step: 'rescore', label: STEP_LABELS.rescore,  status: 'idle', progress: 0 },
      { step: 'review',  label: STEP_LABELS.review,   status: 'idle', progress: 0 },
      { step: 'letter',  label: STEP_LABELS.letter,   status: 'idle', progress: 0 },
    ];
    setSteps(pipelineSteps);

    const intervalId = setInterval(() => {
      setSteps((prev) => prev.map((s) => s.status === 'running' ? { ...s, progress: Math.min((s.progress ?? 0) + Math.random() * 25, 90) } : s));
    }, 400);

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

          if (event === 'step') {
            const micro: MicroStatus = data.micro ? 'waiting' : data.status === 'running' ? 'waiting' : data.status === 'done' ? 'complete' : 'connecting';
            const stepName = STEP_LABELS[data.step] || data.step;
            addLog(`${stepName} ${data.status === 'done' ? '✓' : data.status === 'running' ? '⟳' : '✓'}`, data.status === 'done' ? 'done' : data.status === 'running' ? 'running' : 'done', data.step);
            const patch: Partial<StepState> = { status: data.status, data: data.data, progress: data.status === 'done' ? 100 : typeof data.progress === 'number' ? data.progress : 50, microStatus: micro };
            if (data.micro) patch.microText = data.micro;
            updateStep(data.step, patch);
            if (data.status === 'done') setStepTimings(prev => ({ ...prev, [data.step]: Date.now() - startTimeRef.current }));
            if (data.status === 'done' && data.data) {
              if (data.step === 'tailor') setTailoredResume(data.data);
              if (data.step === 'extract') setExtractData(data.data);
              if (data.step === 'score') setScoreData(data.data);
              if (data.step === 'rescore') setRescoreData(data.data);
            }
          } else if (event === 'letter-chunk') {
            setLetter((prev) => prev + data.text);
          } else if (event === 'done') {
            pipelineCompleted = true;
            setSummary({ overall: data.overall, previousOverall: data.previousOverall, matched: data.matched, missing: data.missing, company: data.company, role: data.role, keywordsAdded: data.keywordsAdded ?? 0, bulletsRewritten: data.bulletsRewritten ?? 0, compatibility: data.compatibility, isLowCompat: data.isLowCompat, sectionsModified: data.sectionsModified, plan: data.plan, review: data.review, sectionConfidence: data.sectionConfidence, sectionChanges: data.sectionChanges, quality: data.quality, resumeId: data.resumeId ?? null, coverLetterId: data.coverLetterId ?? null });
            if (data.letterBody && !letter) setLetter(data.letterBody);
            const el = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
            setElapsed(el);
            addLog(`Tailored resume ready in ${el}s · ATS ${data.overall}% · ${data.matched} keywords matched, ${data.missing} still missing`, 'done');
            toast.success('Resume ready to apply', { description: data.previousOverall !== undefined ? `ATS ${data.previousOverall} → ${data.overall}` : `ATS ${data.overall}% — resume tailored and cover letter drafted.` });
          } else if (event === 'error') {
            pipelineFailed = true;
            const failedStep = data.step || 'letter';
            const elapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
            const errDetails: ErrorDetails = { reason: data.reason, traceId: data.traceId, elapsed: `${elapsed}s`, rawMessage: data.rawMessage || data.message, provider: data.provider, statusCode: data.statusCode };
            const { text } = friendlyError(data.reason, data.message, failedStep);
            addLog(`Failed: ${data.message || 'Unknown error'}`, 'error', failedStep);
            updateStep(failedStep, { status: 'error', error: text, errorDetails: errDetails, progress: 0 });
            setSteps((prev) => prev.map((s) => s.status === 'idle' ? { ...s, status: 'pending', progress: 0 } : s));
            toast('Analysis paused', {
              description: `${failedStep === 'extract' ? 'Reading the job' : failedStep === 'score' ? 'Scoring' : 'Cover letter'} failed. Nothing was modified.`,
              duration: 4000,
            });
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        addLog('Analysis aborted by user', 'error');
        toast('Analysis aborted', { description: 'Nothing was modified.', duration: 3000 });
      } else {
        const errMsg = (e as Error).message || 'Unknown error';
        addLog(`Connection error: ${errMsg}`, 'error');
        toast.error("We couldn't complete this request", { description: errMsg.includes('fetch') ? 'Check your network.' : 'Progress has been saved. Retry the analysis.' });
      }
    } finally {
      clearInterval(intervalId);
      setSteps((prev) => prev.map((s) => s.status === 'running' ? { ...s, status: 'error', progress: 0, error: 'Pipeline stopped before completing this step.' } : s.status === 'idle' ? { ...s, status: 'pending', progress: 0 } : s));
      setRunning(false);
      reportAiDone(pipelineCompleted ? 'Resume optimized' : 'Analysis', Date.now() - startTimeRef.current, 'studio-pipeline', pipelineFailed);
    }
  }

  function abort() { abortRef.current?.abort(); }

  function retryFrom(step: string) {
    const idx = steps.findIndex((s) => s.step === step);
    if (idx === -1) return;
    setSteps((prev) => prev.map((s, i) => i < idx ? s : { ...s, status: 'idle', progress: 0, error: undefined, errorDetails: undefined, microStatus: undefined }));
    run();
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
              <button onClick={() => { setJd(''); setSteps([]); setLetter(''); setSummary(null); setLogs([]); setExtractData(null); setScoreData(null); setRescoreData(null); setTailoredResume(null); setJdParsed(false); setJdCollapsed(false); }} className="eleva-btn-ghost inline-flex items-center gap-2 text-[12px]" disabled={running}>
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
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => retryFrom(erroredStep.step)} className="inline-flex items-center gap-1.5 text-[11px] font-medium h-7 px-3 rounded-lg" style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-primary))', border: '1px solid rgb(var(--eleva-border))' }}>
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
            {logs.length > 0 && (
              <div className="mt-4">
                <button onClick={() => setShowLogs(!showLogs)} className="flex items-center gap-1.5 text-[11px] font-medium h-8 w-full justify-center rounded-lg" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                  {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Activity Log {logs.length > 0 && `(${logs.length})`}
                </button>
                <AnimatePresence>
                  {showLogs && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mt-2 p-3 rounded-lg space-y-1 max-h-36 overflow-y-auto" style={{ background: 'rgb(var(--eleva-muted))' }}>
                        {logs.map((log, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px]">
                            <span className="shrink-0 font-mono text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{log.time}</span>
                            <span className="shrink-0 font-mono" style={{ color: log.status === 'done' ? 'rgb(var(--eleva-success))' : log.status === 'error' ? 'rgb(220,38,38)' : 'rgb(var(--eleva-primary))' }}>
                              {log.status === 'done' ? '✓' : log.status === 'error' ? '✕' : '⟳'}
                            </span>
                            <span style={{ color: 'rgb(var(--eleva-fg))' }}>{log.message.replace('✓', '').trim()}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Live Results ─── */}
        <div className="space-y-4">
          {/* AI Analysis — live results panel */}
          <div className="eleva-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.75} />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-primary))' }}>AI Analysis</span>
              </div>
              {(role || company) && (
                <div className="text-right leading-tight">
                  {role && <div className="text-[13px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{role}</div>}
                  {company && <div className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{company}</div>}
                </div>
              )}
            </div>

            {!running && steps.length === 0 && !summary && (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.08)' }}>
                  <Target className="w-6 h-6" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.5} />
                </div>
                <div className="text-[14px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Your match analysis will appear here</div>
                <p className="text-[12px] mt-1 max-w-xs mx-auto" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  Paste a job description and press Analyze Job to see how your resume compares.
                </p>
              </div>
            )}

            {(running || steps.length > 0 || summary) && (() => {
              const live = rescoreData || scoreData || null;
              const atsVal = live ? Number(live.overall ?? 0) : summary ? summary.overall : 0;
              const matchVal = live ? Number(live.keyword ?? 0) : summary ? summary.matched : 0;
              const fmtVal = live ? Number(live.formatting ?? 0) : 0;
              const matchedSkills: string[] = live?.matched ?? [];
              const missingSkills: string[] = live?.missing ?? [];
              return (
              <div className="space-y-4">
                {/* Score tiles */}
                {(scoreData || summary) && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Match', value: matchVal, suffix: '%', color: 'rgb(var(--eleva-secondary))' },
                      { label: 'ATS', value: atsVal, suffix: '/100', color: 'rgb(var(--eleva-primary))' },
                      { label: 'Formatting', value: fmtVal, suffix: '%', color: 'rgb(var(--eleva-accent))' },
                    ].map((t) => (
                      <div key={t.label} className="p-3 rounded-xl text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)', border: '1px solid rgb(var(--eleva-border))' }}>
                        <div className="text-[9px] font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{t.label}</div>
                        <div className="font-display text-2xl md:text-3xl font-bold mt-1" style={{ color: t.color }}>{t.value}{t.suffix}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Matched skills */}
                {matchedSkills.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--eleva-success))' }}>Matched Skills</div>
                    <div className="flex flex-wrap gap-1.5">
                      {matchedSkills.slice(0, 10).map((k) => (
                        <span key={k} className="px-2 py-1 rounded-lg text-[11px] font-mono" style={{ background: 'rgba(var(--eleva-success-rgb), 0.1)', color: 'rgb(var(--eleva-success))' }}>{k}</span>
                      ))}
                      {matchedSkills.length > 10 && (
                        <span className="px-2 py-1 rounded-lg text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>+{matchedSkills.length - 10}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Missing skills */}
                {missingSkills.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--eleva-warning))' }}>Missing Skills</div>
                    <div className="flex flex-wrap gap-1.5">
                      {missingSkills.slice(0, 10).map((k) => (
                        <span key={k} className="px-2 py-1 rounded-lg text-[11px] font-mono" style={{ background: 'rgba(var(--eleva-warning-rgb), 0.1)', color: 'rgb(var(--eleva-warning))' }}>{k}</span>
                      ))}
                      {missingSkills.length > 10 && (
                        <span className="px-2 py-1 rounded-lg text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>+{missingSkills.length - 10}</span>
                      )}
                    </div>
                    <div className="text-[11px] mt-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      {missingSkills.length} skills could improve this resume
                    </div>
                  </div>
                )}

                {/* Recommended changes */}
                {(summary || steps.some((s) => s.step === 'tailor' && s.status === 'done')) && (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.06)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                      <span className="text-[10px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Recommended Changes</span>
                    </div>
                    <div className="space-y-1">
                      {summary?.sectionsModified ? (
                        <div className="flex items-center gap-2 text-[11px]"><CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /><span style={{ color: 'rgb(var(--eleva-fg))' }}>{summary.sectionsModified} sections rewritten</span></div>
                      ) : null}
                      {summary?.keywordsAdded ? (
                        <div className="flex items-center gap-2 text-[11px]"><CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /><span style={{ color: 'rgb(var(--eleva-fg))' }}>{summary.keywordsAdded} keywords added</span></div>
                      ) : null}
                      {summary?.bulletsRewritten ? (
                        <div className="flex items-center gap-2 text-[11px]"><CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /><span style={{ color: 'rgb(var(--eleva-fg))' }}>{summary.bulletsRewritten} bullets improved</span></div>
                      ) : null}
                      {!summary && <div className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Analyzing which changes would improve your match…</div>}
                    </div>
                  </div>
                )}

                {summary && !running && (
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      {summary.previousOverall !== undefined && summary.overall !== summary.previousOverall ? (
                        <><strong style={{ color: 'rgb(var(--eleva-success))' }}>{summary.previousOverall} → {summary.overall}</strong> ATS · improved by {summary.overall - summary.previousOverall}</>
                      ) : (
                        <strong style={{ color: 'rgb(var(--eleva-success))' }}>ATS {summary.overall}/100</strong>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href="/eleva/resumes" className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ border: '1px solid rgb(var(--eleva-border))' }}>
                        <FileText className="w-3 h-3" /> View Resume
                      </Link>
                      <Link href="/eleva/cover-letters" className="eleva-btn-primary text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg">
                        <Mail className="w-3 h-3" /> Cover Letter
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              );
            })()}
          </div>

          {!summary ? (
            <>
              {/* Cover letter streaming */}
              <AnimatePresence>
                {(letter || running) && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="eleva-card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(var(--eleva-success-rgb), 0.15)' }}>
                            <CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} />
                          </div>
                          <span className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Cover Letter</span>
                        </div>
                        {letter && <div className="font-display text-base font-semibold mt-0.5" style={{ color: 'rgb(var(--eleva-fg))' }}>{extractData?.company ?? 'Draft'} · {extractData?.role ?? '—'}</div>}
                      </div>
                      {letter && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { navigator.clipboard.writeText(letter); toast.success('Copied'); }} className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
                          <button onClick={() => downloadExport('pdf')} className="eleva-btn-primary text-[11px] inline-flex items-center gap-1"><Download className="w-3 h-3" /> PDF</button>
                          <button onClick={() => downloadExport('docx')} className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1"><Download className="w-3 h-3" /> DOCX</button>
                        </div>
                      )}
                    </div>
                    <div className="text-[13px] leading-relaxed whitespace-pre-wrap font-serif min-h-[120px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
                      {letter}
                      {running && steps.find((s) => s.step === 'letter')?.status === 'running' && <span className="inline-block w-2 h-4 ml-0.5 align-middle animate-pulse" style={{ background: 'rgb(var(--eleva-primary))' }} />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            /* ─── Application Ready + Tabbed Workspace ─── */
            <>
            {summary && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(var(--eleva-success-rgb), 0.08), rgba(var(--eleva-primary-rgb), 0.06))', border: '1px solid rgba(var(--eleva-success-rgb), 0.15)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                    <div>
                      <div className="font-display text-lg font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Application Ready</div>
                      {role && <div className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{role}{company ? ` · ${company}` : ''}</div>}
                    </div>
                  </div>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }} className="px-3 py-1 rounded-full text-[10px] font-mono font-semibold" style={{ background: 'rgba(var(--eleva-success-rgb), 0.15)', color: 'rgb(var(--eleva-success))' }}>
                    ★★★★★
                  </motion.div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="flex items-center justify-center gap-1">
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-2xl font-bold" style={{ color: summary.overall >= (summary.previousOverall ?? 0) ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-danger))' }}>{summary.overall}%</motion.span>
                      {summary.previousOverall !== undefined && (
                        <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] font-mono" style={{ color: summary.overall >= summary.previousOverall ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-danger))' }}>
                          <TrendingUp className="w-3 h-3 inline mr-0.5" />+{summary.overall - summary.previousOverall}
                        </motion.span>
                      )}
                    </div>
                    <div className="text-[9px] font-mono mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>ATS Score</div>
                    {summary.previousOverall !== undefined && (
                      <div className="text-[9px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{summary.previousOverall}% → {summary.overall}%</div>
                    )}
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--eleva-primary))' }}>{summary.keywordsAdded}</div>
                    <div className="text-[9px] font-mono mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Keywords Added</div>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--eleva-secondary))' }}>{summary.bulletsRewritten}</div>
                    <div className="text-[9px] font-mono mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Bullets Rewritten</div>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--eleva-accent))' }}>{summary.matched}</div>
                    <div className="text-[9px] font-mono mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Keywords Matched</div>
                  </div>
                </div>

                {summary.isLowCompat && (
                  <div className="p-3 rounded-xl mb-3" style={{ background: 'rgba(var(--eleva-warning-rgb), 0.1)', border: '1px solid rgba(var(--eleva-warning-rgb), 0.2)' }}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                      <div>
                        <div className="text-[11px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Low Job Compatibility</div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                          This role ({summary.role || 'unknown'}) differs significantly from your resume. The AI optimized wording and transferable skills but could not fabricate missing experience ({summary.compatibility}% match).
                        </div>
                        <div className="text-[10px] mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                          Recommendation: Create or select a resume with software engineering experience for best results.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.06)' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                    <span className="text-[10px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>AI Improvements</span>
                  </div>
                  <div className="space-y-1">
                    {summary.sectionsModified ? (
                      <div className="flex items-center gap-2 text-[11px]"><CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /><span style={{ color: 'rgb(var(--eleva-fg))' }}>{summary.sectionsModified} sections rewritten</span></div>
                    ) : null}
                    {summary.keywordsAdded > 0 && <div className="flex items-center gap-2 text-[11px]"><CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /><span style={{ color: 'rgb(var(--eleva-fg))' }}>Added {summary.keywordsAdded} missing keywords</span></div>}
                    {summary.bulletsRewritten > 0 && <div className="flex items-center gap-2 text-[11px]"><CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /><span style={{ color: 'rgb(var(--eleva-fg))' }}>Rewrote {summary.bulletsRewritten} bullets</span></div>}
                    {summary.matched > 0 && <div className="flex items-center gap-2 text-[11px]"><CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /><span style={{ color: 'rgb(var(--eleva-fg))' }}>{summary.matched} keywords matched</span></div>}
                    {summary.missing > 0 && <div className="flex items-center gap-2 text-[11px]"><AlertTriangle className="w-3 h-3" style={{ color: 'rgb(var(--eleva-warning))' }} /><span style={{ color: 'rgb(var(--eleva-fg))' }}>{summary.missing} keywords still missing</span></div>}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 gap-2 flex-wrap">
                  <Link href="/eleva/resumes" className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ border: '1px solid rgb(var(--eleva-border))' }}>
                    <FileText className="w-3 h-3" /> View Resume
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link href={`/eleva/cover-letters?company=${encodeURIComponent(summary.company ?? '')}&role=${encodeURIComponent(summary.role ?? '')}`} className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ border: '1px solid rgb(var(--eleva-border))' }}>
                      <Mail className="w-3 h-3" /> Cover Letter
                    </Link>
                    <button
                      onClick={() => createApplication('wishlist')}
                      disabled={!!creatingApplication}
                      className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg disabled:opacity-50"
                      style={{ border: '1px solid rgb(var(--eleva-border))' }}
                    >
                      {creatingApplication === 'wishlist' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add to Applications
                    </button>
                    <button
                      onClick={() => createApplication('applied')}
                      disabled={!!creatingApplication}
                      className="eleva-btn-primary text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      {creatingApplication === 'applied' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Mark as Applied
                    </button>
                    <Link href="/eleva/ats" className="eleva-btn-primary text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg">
                      <Target className="w-3 h-3" /> Open ATS
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tabbed Workspace */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="eleva-card">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-5 pt-4 pb-0 border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
                  <TabsList className="w-full justify-start gap-0 h-auto bg-transparent p-0">
                    {[
                      { value: 'resume', icon: FileText, label: 'Tailored Resume' },
                      { value: 'letter', icon: Mail, label: 'Cover Letter' },
                      { value: 'ats', icon: BarChart3, label: 'ATS Report' },
                      { value: 'changes', icon: GitCompare, label: 'AI Changes' },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.value;
                      return (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="relative px-4 py-2.5 text-[12px] font-medium rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-current"
                          style={{ color: isActive ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))', borderBottomColor: isActive ? 'rgb(var(--eleva-primary))' : 'transparent' }}
                        >
                          <Icon className="w-3.5 h-3.5 inline mr-1.5" />
                          {tab.label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>

                {/* Tab: Tailored Resume */}
                <TabsContent value="resume" className="mt-0 px-5 py-4">
                  {tailoredResume ? (
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="max-w-[650px] mx-auto">
                        {/* A4-style resume preview */}
                        <div className="rounded-xl p-8 mb-4" style={{ background: '#fff', color: '#1a1a2e', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                          {/* Name & Role */}
                          <div className="text-center mb-6 pb-4" style={{ borderBottom: '2px solid #1a1a2e' }}>
                            <h2 className="text-2xl font-bold tracking-tight">
                              {(() => {
                                const rawName = resumes.find(r => r.id === resumeId)?.name;
                                if (rawName && rawName.length > 40) {
                                  return extractData?.role ? `${extractData.role}${extractData.company ? ` at ${extractData.company}` : ''}` : 'Resume';
                                }
                                return rawName || 'Resume';
                              })()}
                            </h2>
                            {extractData?.role && (
                              <p className="text-[13px] mt-1 opacity-70">
                                {extractData.role}{extractData.company ? ` · ${extractData.company}` : ''}
                              </p>
                            )}
                            <p className="text-[11px] mt-1 opacity-50">
                              {summary?.compatibility !== undefined ? `Compatibility: ${summary.compatibility}% · ` : ''}
                              Tailored for {summary?.role || extractData?.role || 'target role'}
                            </p>
                          </div>

                          {/* Summary */}
                          {tailoredResume.professional_summary && (
                            <div className="mb-5">
                              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60">Professional Summary</h3>
                              <p className="text-[13px] leading-relaxed">{tailoredResume.professional_summary}</p>
                            </div>
                          )}

                          {/* Skills */}
                          {tailoredResume.skills?.length > 0 && (
                            <div className="mb-5">
                              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60">Skills</h3>
                              <div className="space-y-1.5">
                                {tailoredResume.skills.map((s: any, i: number) => (
                                  <div key={i} className="flex items-start gap-2 text-[13px]">
                                    <span className="font-semibold shrink-0 min-w-[100px]">{s.category}:</span>
                                    <span>{Array.isArray(s.skills) ? s.skills.join(', ') : Array.isArray(s.items) ? s.items.join(', ') : ''}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Work Experience */}
                          {tailoredResume.work_experience?.length > 0 && (
                            <div className="mb-5">
                              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3 opacity-60">Experience</h3>
                              {tailoredResume.work_experience.map((w: any, i: number) => (
                                <div key={i} className="mb-4">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <span className="font-bold text-[14px]">{w.position || w.role}</span>
                                      <span className="text-[13px] ml-2" style={{ color: '#555' }}>at {w.company || w.employer}</span>
                                    </div>
                                    <span className="text-[11px] shrink-0 ml-2" style={{ color: '#777' }}>{w.start_date || ''}{w.start_date && w.end_date ? ' — ' : ''}{w.end_date || ''}</span>
                                  </div>
                                  {(w.responsibilities || []).map((r: string, j: number) => (
                                    <div key={j} className="flex items-start gap-2 mt-1 text-[13px]">
                                      <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: '#333' }} />
                                      <span>{r}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Projects */}
                          {tailoredResume.projects?.length > 0 && (
                            <div className="mb-5">
                              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3 opacity-60">Projects</h3>
                              {tailoredResume.projects.map((p: any, i: number) => (
                                <div key={i} className="mb-3">
                                  <div className="font-bold text-[14px]">{p.name}</div>
                                  {(Array.isArray(p.description) ? p.description : [p.description]).filter(Boolean).map((d: string, j: number) => (
                                    <div key={j} className="flex items-start gap-2 mt-1 text-[13px]">
                                      <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: '#333' }} />
                                      <span>{d}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Education */}
                          {tailoredResume.education?.length > 0 && (
                            <div>
                              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3 opacity-60">Education</h3>
                              {tailoredResume.education.map((e: any, i: number) => (
                                <div key={i} className="mb-2 text-[13px]">
                                  <span className="font-semibold">{e.school || e.institution}</span>
                                  {e.degree && <span> — {e.degree}</span>}
                                  {e.field && <span> in {e.field}</span>}
                                  {e.date && <span className="ml-2" style={{ color: '#777' }}>{e.date}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      <FileText className="w-10 h-10 mb-3 opacity-40" />
                      <p className="text-[13px]">No tailored resume available yet.</p>
                      <p className="text-[11px] mt-1">Run the pipeline to generate one.</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab: Cover Letter */}
                <TabsContent value="letter" className="mt-0 px-5 py-4">
                  {letter ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>
                          {summary?.company || 'Company'} · {summary?.role || 'Role'}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { navigator.clipboard.writeText(letter); toast.success('Copied'); }} className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg"><Copy className="w-3 h-3" /> Copy</button>
                          <button onClick={run} className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg"><RefreshCw className="w-3 h-3" /> Regenerate</button>
                          <button onClick={() => downloadExport('pdf')} className="eleva-btn-primary text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg"><Download className="w-3 h-3" /> PDF</button>
                          <button onClick={() => downloadExport('docx')} className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg"><Download className="w-3 h-3" /> DOCX</button>
                        </div>
                      </div>
                      <ScrollArea className="h-[500px] pr-4">
                        <div className="max-w-[650px] mx-auto rounded-xl p-8" style={{ background: '#fff', color: '#1a1a2e', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                          <div className="text-[14px] leading-[1.8] whitespace-pre-wrap font-serif">{letter}</div>
                        </div>
                      </ScrollArea>
                      {elapsed && (
                        <div className="p-3 rounded-lg flex items-center gap-3 text-[12px]" style={{ background: 'rgba(var(--eleva-success-rgb), 0.06)', border: '1px solid rgba(var(--eleva-success-rgb), 0.15)' }}>
                          <Clock className="w-4 h-4 shrink-0" style={{ color: 'rgb(var(--eleva-success))' }} />
                          <span style={{ color: 'rgb(var(--eleva-fg))' }}>Completed in <strong>{elapsed}s</strong> — saved <strong style={{ color: 'rgb(var(--eleva-success))' }}>~{Math.round(25 * 60 - parseFloat(elapsed) > 0 ? Math.round(25 * 60 - parseFloat(elapsed)) : 0)}s</strong></span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      <Mail className="w-10 h-10 mb-3 opacity-40" />
                      <p className="text-[13px]">No cover letter generated yet.</p>
                      <p className="text-[11px] mt-1">Run the pipeline to generate one.</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab: ATS Report */}
                <TabsContent value="ats" className="mt-0 px-5 py-4">
                  {scoreData && rescoreData ? (
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="max-w-[650px] mx-auto space-y-6">
                        {/* Before/After */}
                        <div className="grid grid-cols-2 gap-4">
                          {['overall', 'keyword', 'formatting', 'readability', 'impact', 'recruiter'].map((metric) => {
                            const before = Number(scoreData[metric] ?? 0);
                            const after = Number(rescoreData[metric] ?? 0);
                            const diff = after - before;
                            const pct = before > 0 ? Math.round((after - before) / before * 100) : after > 0 ? 100 : 0;
                            return (
                              <div key={metric} className="p-4 rounded-xl" style={{ background: 'rgba(var(--eleva-card), 0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgb(var(--eleva-border))' }}>
                                <div className="text-[10px] font-mono uppercase mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{metric.replace(/_/g, ' ')}</div>
                                <div className="flex items-baseline gap-2">
                                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{before}%</motion.span>
                                  <ArrowRight className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                                  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="font-display text-2xl font-bold" style={{ color: diff >= 0 ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-danger))' }}>{after}%</motion.span>
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  {diff >= 0 ? <TrendingUp className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /> : <TrendingDown className="w-3 h-3" style={{ color: 'rgb(var(--eleva-danger))' }} />}
                                  <span className="text-[11px] font-semibold" style={{ color: diff >= 0 ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-danger))' }}>
                                    {diff >= 0 ? '+' : ''}{diff} ({pct >= 0 ? '+' : ''}{pct}%)
                                  </span>
                                </div>
                                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, after)}%`, background: after >= 80 ? 'rgb(var(--eleva-success))' : after >= 60 ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-danger))', transition: 'width 0.8s ease-out' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Matched vs Missing */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl" style={{ background: 'rgba(var(--eleva-success-rgb), 0.06)', border: '1px solid rgba(var(--eleva-success-rgb), 0.15)' }}>
                            <h4 className="text-[10px] font-mono uppercase mb-2" style={{ color: 'rgb(var(--eleva-success))' }}>Matched Keywords</h4>
                            <div className="font-display text-2xl font-bold mb-2" style={{ color: 'rgb(var(--eleva-success))' }}>{(rescoreData.matched ?? []).length}</div>
                            <div className="flex flex-wrap gap-1">
                              {(rescoreData.matched ?? []).slice(0, 15).map((k: string) => (
                                <span key={k} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(var(--eleva-success-rgb), 0.1)', color: 'rgb(var(--eleva-success))' }}>{k}</span>
                              ))}
                            </div>
                          </div>
                          <div className="p-4 rounded-xl" style={{ background: 'rgba(var(--eleva-danger-rgb), 0.06)', border: '1px solid rgba(var(--eleva-danger-rgb), 0.15)' }}>
                            <h4 className="text-[10px] font-mono uppercase mb-2" style={{ color: 'rgb(var(--eleva-danger))' }}>Missing Keywords</h4>
                            <div className="font-display text-2xl font-bold mb-2" style={{ color: 'rgb(var(--eleva-danger))' }}>{(rescoreData.missing ?? []).length}</div>
                            <div className="flex flex-wrap gap-1">
                              {(rescoreData.missing ?? []).slice(0, 15).map((k: string) => (
                                <span key={k} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(var(--eleva-danger-rgb), 0.1)', color: 'rgb(var(--eleva-danger))' }}>{k}</span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Suggestions */}
                        {(rescoreData.suggestions ?? []).length > 0 && (
                          <div className="p-4 rounded-xl" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.04)', border: '1px solid rgb(var(--eleva-border))' }}>
                            <h4 className="text-[10px] font-mono uppercase mb-2" style={{ color: 'rgb(var(--eleva-primary))' }}>Recommendations</h4>
                            <div className="space-y-2">
                              {(rescoreData.suggestions as Array<{ type: string; text: string; action: string }>).map((sg, i) => (
                                <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                  <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: sg.type === 'success' ? 'rgb(var(--eleva-success))' : sg.type === 'warning' ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-primary))' }} />
                                  <div className="flex-1">
                                    <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-fg))' }}>{sg.text}</div>
                                    <div className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{sg.action}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      <BarChart3 className="w-10 h-10 mb-3 opacity-40" />
                      <p className="text-[13px]">No ATS score available.</p>
                      <p className="text-[11px] mt-1">Run the pipeline to score your resume.</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab: AI Changes */}
                <TabsContent value="changes" className="mt-0 px-5 py-4">
                  {tailoredResume ? (
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="max-w-[650px] mx-auto space-y-4">
                        {/* Hard Truth Mode */}
                        {summary?.isLowCompat && summary?.plan?.hardTruthNote && (
                          <div className="p-5 rounded-xl" style={{ background: 'rgba(var(--eleva-warning-rgb), 0.08)', border: '1px solid rgba(var(--eleva-warning-rgb), 0.2)' }}>
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle className="w-5 h-5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                              <h4 className="text-[13px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Hard Truth — Low Job Compatibility</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                <div className="text-[9px] font-mono uppercase mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Your Resume</div>
                                <div className="font-display text-lg font-bold" style={{ color: 'rgb(var(--eleva-fg))' }}>{extractData?.role || 'Current Role'}</div>
                              </div>
                              <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                <div className="text-[9px] font-mono uppercase mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>This Role</div>
                                <div className="font-display text-lg font-bold" style={{ color: 'rgb(var(--eleva-warning))' }}>{summary?.role || 'Target Role'}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="font-display text-3xl font-bold" style={{ color: 'rgb(var(--eleva-danger))' }}>{summary.compatibility}%</span>
                              <span className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Compatibility</span>
                            </div>
                            <div className="p-3 rounded-lg mb-3" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                              <p className="text-[12px] leading-relaxed" style={{ color: 'rgb(var(--eleva-fg))' }}>{summary.plan.hardTruthNote}</p>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <X className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-danger))' }} />
                              <span className="text-[11px] font-medium" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Did NOT add (would fabricate experience):</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(rescoreData?.missing ?? []).slice(0, 8).map((k: string) => (
                                <span key={k} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(var(--eleva-danger-rgb), 0.1)', color: 'rgb(var(--eleva-danger))' }}>{k}</span>
                              ))}
                            </div>
                            <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.06)' }}>
                              <span className="text-[11px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Recommendation: </span>
                              <span className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Create a {summary?.role || 'software engineering'} version of your resume for best results. This resume was optimized for wording and transferable skills only.</span>
                            </div>
                          </div>
                        )}

                        {/* AI Rewrites Applied */}
                        <div className="p-4 rounded-xl" style={{ background: 'rgba(var(--eleva-success-rgb), 0.04)', border: '1px solid rgba(var(--eleva-success-rgb), 0.15)' }}>
                          <h4 className="text-[10px] font-mono uppercase mb-3" style={{ color: 'rgb(var(--eleva-success))' }}>AI Rewrites Applied</h4>
                          <div className="space-y-2">
                            {summary?.bulletsRewritten ? (
                              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                <Pencil className="w-4 h-4 shrink-0" style={{ color: 'rgb(var(--eleva-primary))' }} />
                                <div className="text-[13px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
                                  <strong>{summary.bulletsRewritten} bullets rewritten</strong> across {summary.sectionsModified} sections.
                                </div>
                              </div>
                            ) : null}
                            {summary?.keywordsAdded ? (
                              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                <FileCode className="w-4 h-4 shrink-0" style={{ color: 'rgb(var(--eleva-secondary))' }} />
                                <div className="text-[13px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
                                  <strong>{summary.keywordsAdded} keywords added</strong> for better ATS ranking.
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Rewrite Confidence Per Section */}
                        {summary?.sectionConfidence && (
                          <div className="p-4 rounded-xl" style={{ border: '1px solid rgb(var(--eleva-border))' }}>
                            <h4 className="text-[10px] font-mono uppercase mb-3" style={{ color: 'rgb(var(--eleva-fg))' }}>Rewrite Confidence</h4>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { section: 'Summary', key: 'summary' as const, icon: FileText },
                                { section: 'Skills', key: 'skills' as const, icon: FileCode },
                                { section: 'Experience', key: 'experience' as const, icon: Briefcase },
                                { section: 'Projects', key: 'projects' as const, icon: GitCompare },
                              ].map(({ section, key, icon: Icon }) => {
                                const conf = summary.sectionConfidence![key] ?? 0;
                                const changes = summary.sectionChanges?.[key] ?? [];
                                return (
                                  <div key={key} className="p-3 rounded-xl" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-1.5">
                                        <Icon className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                                        <span className="text-[11px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{section}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: conf >= 70 ? 'rgb(var(--eleva-success))' : conf >= 40 ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-danger))' }} />
                                        <span className="text-[11px] font-mono font-semibold" style={{ color: conf >= 70 ? 'rgb(var(--eleva-success))' : conf >= 40 ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-danger))' }}>{conf}%</span>
                                      </div>
                                    </div>
                                    {changes.length > 0 && (
                                      <div className="space-y-0.5">
                                        {changes.map((c: string, i: number) => (
                                          <div key={i} className="flex items-start gap-1.5 text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                                            <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: 'rgb(var(--eleva-muted-fg))' }} />
                                            {c}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
                                      <div className="h-full rounded-full transition-all" style={{
                                        width: `${conf}%`,
                                        background: conf >= 70 ? 'rgb(var(--eleva-success))' : conf >= 40 ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-danger))',
                                      }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Quality Check */}
                        {summary?.quality && (
                          <div className="p-4 rounded-xl" style={{ border: '1px solid rgb(var(--eleva-border))', background: summary.quality.passed ? 'rgba(var(--eleva-success-rgb), 0.03)' : 'rgba(var(--eleva-warning-rgb), 0.05)' }}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {summary.quality.passed ? (
                                  <CheckCircle2 className="w-4 h-4" style={{ color: 'rgb(var(--eleva-success))' }} />
                                ) : (
                                  <AlertTriangle className="w-4 h-4" style={{ color: 'rgb(var(--eleva-warning))' }} />
                                )}
                                <span className="text-[11px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>
                                  Quality {summary.quality.passed ? 'Check Passed' : 'Issues Found'}
                                </span>
                              </div>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(var(--eleva-card), 0.7)', color: summary.quality.score >= 80 ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-warning))' }}>
                                Score: {summary.quality.score}/100
                              </span>
                            </div>
                            {summary.quality.issues.length > 0 && (
                              <div className="space-y-1">
                                {summary.quality.issues.map((issue: string, i: number) => (
                                  <div key={i} className="flex items-start gap-2 text-[11px]">
                                    <X className="w-3 h-3 shrink-0 mt-0.5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                                    <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{issue}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* AI Thinking Timeline */}
                        {summary && (
                          <div className="p-4 rounded-xl" style={{ border: '1px solid rgb(var(--eleva-border))', background: 'rgba(var(--eleva-primary-rgb), 0.02)' }}>
                            <div className="flex items-center gap-2 mb-3">
                              <Zap className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-primary))' }} />
                              <span className="text-[11px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>AI Thinking</span>
                            </div>
                            <div className="space-y-2">
                              {[
                                extractData?.role && { icon: Scan, label: 'Resume Parsed', detail: `Detected ${extractData.role} role at ${extractData.company || 'unknown'}, ${(extractData.required_skills ?? []).length} required skills` },
                                scoreData?.overall !== undefined && { icon: BarChart3, label: 'ATS Analysis', detail: `Scored at ${scoreData.overall}% — ${(scoreData.matched ?? []).length} keywords matched, ${(scoreData.missing ?? []).length} missing` },
                                summary?.plan && { icon: Lightbulb, label: 'Optimization Plan', detail: `${summary.plan.rewriteSummary ? 'Summary, ' : ''}${summary.plan.rewriteExperience ? 'Experience, ' : ''}${summary.plan.rewriteSkills ? 'Skills, ' : ''}${summary.plan.rewriteProjects ? 'Projects' : ''} — ${summary.plan.keywordsToInject} keywords targeted` },
                                summary?.sectionConfidence && { icon: Pencil, label: 'Section Rewrites', detail: `Summary (${summary.sectionConfidence.summary}%), Skills (${summary.sectionConfidence.skills}%), Experience (${summary.sectionConfidence.experience}%), Projects (${summary.sectionConfidence.projects}%)` },
                                rescoreData?.overall !== undefined && scoreData?.overall !== undefined && { icon: TrendingUp, label: 'ATS Recalculated', detail: `${scoreData.overall}% → ${rescoreData.overall}% (${rescoreData.overall >= scoreData.overall ? '+' : ''}${rescoreData.overall - scoreData.overall} pts)` },
                                summary?.review && { icon: Star, label: 'Recruiter Review', detail: `${summary.review.wouldInterview ? 'Would interview' : 'Would not interview'} — ${summary.review.strengths.length} strengths, ${summary.review.weaknesses.length} weaknesses (${summary.review.confidence}% confidence)` },
                                extractData?.role && { icon: Mail, label: 'Cover Letter', detail: `Generated for ${extractData.role} at ${extractData.company || 'company'}` },
                              ].filter(Boolean).map((item: any, i: number) => {
                                const Icon = item.icon;
                                const timing = stepTimings[['extract','score','plan','tailor','rescore','review','letter'][i]];
                                return (
                                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.1)' }}>
                                      <Icon className="w-3 h-3" style={{ color: 'rgb(var(--eleva-primary))' }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{item.label}</span>
                                        {timing !== undefined && (
                                          <span className="text-[9px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{(timing / 1000).toFixed(1)}s</span>
                                        )}
                                      </div>
                                      <p className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{item.detail}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Changes by section */}
                        <div className="space-y-3">
                          {/* Plan summary */}
                          {summary?.plan && (
                            <div className="p-4 rounded-xl" style={{ border: '1px solid rgb(var(--eleva-border))' }}>
                              <div className="flex items-center gap-2 mb-3">
                                <Zap className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                                <span className="text-[11px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Optimization Plan</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                  <div className="text-[9px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Summary</div>
                                  <div className="text-[11px] mt-0.5" style={{ color: summary.plan.rewriteSummary ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-muted-fg))' }}>{summary.plan.rewriteSummary ? 'Rewritten' : 'Kept'}</div>
                                </div>
                                <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                  <div className="text-[9px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Experience</div>
                                  <div className="text-[11px] mt-0.5" style={{ color: summary.plan.rewriteExperience ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-muted-fg))' }}>{summary.plan.rewriteExperience ? 'Rewritten' : 'Kept'}</div>
                                </div>
                                <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                  <div className="text-[9px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Projects</div>
                                  <div className="text-[11px] mt-0.5" style={{ color: summary.plan.rewriteProjects ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-muted-fg))' }}>{summary.plan.rewriteProjects ? 'Rewritten' : 'Kept'}</div>
                                </div>
                                <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                  <div className="text-[9px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Skills</div>
                                  <div className="text-[11px] mt-0.5" style={{ color: summary.plan.rewriteSkills ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-muted-fg))' }}>{summary.plan.rewriteSkills ? 'Rewritten' : 'Kept'}</div>
                                </div>
                              </div>
                              {summary.plan.keywordsToInject > 0 && (
                                <div className="p-2 rounded-lg text-[11px]" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.06)' }}>
                                  <span style={{ color: 'rgb(var(--eleva-primary))' }}>{summary.plan.keywordsToInject} keywords targeted for injection</span>
                                </div>
                              )}
                            </div>
                          )}

                          {extractData?.summary && (
                            <div className="p-4 rounded-xl" style={{ border: '1px solid rgb(var(--eleva-border))' }}>
                              <div className="flex items-center gap-2 mb-2">
                                <Eye className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-primary))' }} />
                                <span className="text-[11px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>JD Analysis</span>
                              </div>
                              <p className="text-[12px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{extractData.summary}</p>
                              <div className="flex items-center gap-2 mt-2">
                                {extractData.company && <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.08)', color: 'rgb(var(--eleva-primary))' }}>{extractData.company}</span>}
                                {extractData.role && <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: 'rgba(var(--eleva-secondary-rgb), 0.08)', color: 'rgb(var(--eleva-secondary))' }}>{extractData.role}</span>}
                              </div>
                            </div>
                          )}

                          {/* Evidence-based ATS breakdown */}
                          {scoreData && rescoreData && (
                            <div className="p-4 rounded-xl" style={{ border: '1px solid rgb(var(--eleva-border))' }}>
                              <div className="flex items-center gap-2 mb-3">
                                <BarChart3 className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-primary))' }} />
                                <span className="text-[11px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Score Improvement — Why It Changed</span>
                              </div>
                              <div className="space-y-2">
                                {[
                                  { metric: 'Keyword', key: 'keyword' as const, reason: scoreData.keyword < rescoreData.keyword ? `Injected missing keywords, improved density.` : scoreData.keyword > rescoreData.keyword ? `Some original keywords may have been de-emphasized.` : `Keyword score stayed stable.` },
                                  { metric: 'Formatting', key: 'formatting' as const, reason: scoreData.formatting !== rescoreData.formatting ? `Restructured sections for ATS parsing.` : `Formatting score unchanged.` },
                                  { metric: 'Readability', key: 'readability' as const, reason: scoreData.readability < rescoreData.readability ? `Rewrote verbose sentences, improved bullet structure.` : scoreData.readability > rescoreData.readability ? `Some sections may be denser now.` : `Readability score unchanged.` },
                                  { metric: 'Impact', key: 'impact' as const, reason: scoreData.impact < rescoreData.impact ? `Added strong action verbs and measurable outcomes.` : scoreData.impact > rescoreData.impact ? `Impact language may have been diluted.` : `Impact score unchanged.` },
                                  { metric: 'Recruiter', key: 'recruiter' as const, reason: scoreData.recruiter < rescoreData.recruiter ? `Better alignment with role requirements.` : scoreData.recruiter > rescoreData.recruiter ? `Some role-specific language may have shifted.` : `Recruiter score stable.` },
                                ].map(({metric, key, reason}) => {
                                  const before = Number(scoreData[key] ?? 0);
                                  const after = Number(rescoreData[key] ?? 0);
                                  const diff = after - before;
                                  if (before === after) return null;
                                  return (
                                    <div key={key} className="flex items-start gap-3 p-2.5 rounded-lg" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                      <div className="shrink-0 w-14 text-center">
                                        <div className="text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{metric}</div>
                                        <div className="flex items-center justify-center gap-1 text-[11px]">
                                          <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{before}%</span>
                                          <ArrowRight className="w-2.5 h-2.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                                          <span className="font-semibold" style={{ color: diff >= 0 ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-danger))' }}>{after}%</span>
                                        </div>
                                        <div className="text-[9px] font-mono" style={{ color: diff >= 0 ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-danger))' }}>
                                          {diff >= 0 ? '+' : ''}{diff}
                                        </div>
                                      </div>
                                      <div className="flex-1 text-[10px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{reason}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Recruiter Notes */}
                          {summary?.review && (
                            <div className="p-4 rounded-xl" style={{ border: '1px solid rgb(var(--eleva-border))', background: 'rgba(var(--eleva-primary-rgb), 0.03)' }}>
                              <h4 className="text-[10px] font-mono uppercase mb-3" style={{ color: 'rgb(var(--eleva-primary))' }}>Recruiter Notes</h4>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[11px] font-semibold" style={{ color: summary.review.wouldInterview ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-danger))' }}>
                                    {summary.review.wouldInterview ? '✔ Would Interview' : '✖ Would Not Interview'}
                                  </span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.1)', color: 'rgb(var(--eleva-primary))' }}>{summary.review.score}/100 · {summary.review.confidence}% confidence</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <div className="text-[9px] font-mono uppercase mb-1" style={{ color: 'rgb(var(--eleva-success))' }}>Strengths</div>
                                    {summary.review.strengths.map((s, i) => (
                                      <div key={i} className="flex items-start gap-1.5 py-0.5 text-[11px]">
                                        <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" style={{ color: 'rgb(var(--eleva-success))' }} />
                                        <span style={{ color: 'rgb(var(--eleva-fg))' }}>{s}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div>
                                    <div className="text-[9px] font-mono uppercase mb-1" style={{ color: 'rgb(var(--eleva-danger))' }}>Weaknesses</div>
                                    {summary.review.weaknesses.map((s, i) => (
                                      <div key={i} className="flex items-start gap-1.5 py-0.5 text-[11px]">
                                        <X className="w-3 h-3 shrink-0 mt-0.5" style={{ color: 'rgb(var(--eleva-danger))' }} />
                                        <span style={{ color: 'rgb(var(--eleva-fg))' }}>{s}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {summary.review.genericAreas.length > 0 && (
                                  <div className="p-2.5 rounded-lg" style={{ background: 'rgba(var(--eleva-warning-rgb), 0.06)' }}>
                                    <div className="text-[9px] font-mono uppercase mb-1" style={{ color: 'rgb(var(--eleva-warning))' }}>Generic / Templated</div>
                                    {summary.review.genericAreas.map((s, i) => (
                                      <div key={i} className="text-[11px] py-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>— {s}</div>
                                    ))}
                                  </div>
                                )}
                                <div className="p-2.5 rounded-lg text-[12px]" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                  <span className="text-[9px] font-mono uppercase block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Recommendation</span>
                                  <span style={{ color: 'rgb(var(--eleva-fg))' }}>{summary.review.recommendation}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Improvement Roadmap */}
                          {summary?.review?.weaknesses && summary.review.weaknesses.length > 0 && (
                            <div className="p-4 rounded-xl" style={{ border: '1px solid rgba(var(--eleva-secondary-rgb), 0.15)', background: 'rgba(var(--eleva-secondary-rgb), 0.03)' }}>
                              <div className="flex items-center gap-2 mb-3">
                                <Target className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-secondary))' }} />
                                <span className="text-[11px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Improvement Roadmap</span>
                              </div>
                              <div className="space-y-2">
                                <div className="text-[11px] font-medium mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>To reach 80%+ compatibility with this role:</div>
                                {summary.review.weaknesses.map((w, i) => (
                                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-mono" style={{ background: 'rgba(var(--eleva-secondary-rgb), 0.15)', color: 'rgb(var(--eleva-secondary))' }}>{i + 1}</div>
                                    <div>
                                      <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-fg))' }}>{w}</div>
                                      <div className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                                        {w.toLowerCase().includes('missing') ? 'Add relevant experience or projects in this area.' :
                                         w.toLowerCase().includes('generic') ? 'Replace generic phrasing with specific achievements.' :
                                         w.toLowerCase().includes('weak') ? 'Strengthen with measurable impact and outcomes.' :
                                         w.toLowerCase().includes('no') || w.toLowerCase().includes('lack') ? 'Consider upskilling or adding adjacent projects.' :
                                         'Review and revise this section.'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Missing keywords */}
                          {(rescoreData?.missing ?? []).length > 0 && !summary?.isLowCompat && (
                            <div className="p-4 rounded-xl" style={{ border: '1px solid rgba(var(--eleva-danger-rgb), 0.15)', background: 'rgba(var(--eleva-danger-rgb), 0.03)' }}>
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                                <span className="text-[11px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Missing Keywords After Optimization</span>
                              </div>
                              <p className="text-[11px] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Consider adding these to your resume for a stronger match:</p>
                              <div className="flex flex-wrap gap-1">
                                {(rescoreData.missing as string[]).slice(0, 8).map((k: string) => (
                                  <span key={k} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(var(--eleva-danger-rgb), 0.1)', color: 'rgb(var(--eleva-danger))' }}>{k}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      <GitCompare className="w-10 h-10 mb-3 opacity-40" />
                      <p className="text-[13px]">No changes to display.</p>
                      <p className="text-[11px] mt-1">Run the pipeline to see what AI changed.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


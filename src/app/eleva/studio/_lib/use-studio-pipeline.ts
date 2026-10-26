import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { reportAiRun, reportAiDone } from '../../_lib/ai-status';
import type { LogEntry } from '../_components/step-log-panel';
import type { ExtractedJobData, JobScore, TailoredResume } from './studio-types';

export type StepStatus = 'idle' | 'pending' | 'running' | 'done' | 'error';
export type MicroStatus = 'connecting' | 'sending' | 'waiting' | 'parsing' | 'complete';

export type ErrorDetails = { reason?: string; model?: string; provider?: string; attempt?: number; statusCode?: number; elapsed?: string; traceId?: string; rawMessage?: string };

export type StudioPipelineSummary = {
  overall: number;
  previousOverall?: number;
  matched: number;
  missing: number;
  company?: string | null;
  role?: string | null;
  keywordsAdded: number;
  bulletsRewritten: number;
  compatibility?: number;
  isLowCompat?: boolean;
  sectionsModified?: number;
  resumeId?: string | null;
  coverLetterId?: string | null;
  plan?: { rewriteSummary: boolean; rewriteExperience: boolean; rewriteProjects: boolean; rewriteSkills: boolean; keywordsToInject: number; hardTruthNote?: string | null };
  sectionConfidence?: { summary: number; skills: number; experience: number; projects: number };
  sectionChanges?: { summary: string[]; skills: string[]; experience: string[]; projects: string[] };
  quality?: { passed: boolean; issues: string[]; score: number };
  review?: { wouldInterview: boolean; score: number; strengths: string[]; weaknesses: string[]; genericAreas: string[]; recommendation: string; confidence: number };
};

export type StepState = {
  step: string;
  label: string;
  status: StepStatus;
  progress?: number;
  data?: unknown;
  microStatus?: MicroStatus;
  microText?: string;
  error?: string;
  errorDetails?: ErrorDetails;
};

export const STEP_LABELS: Record<string, string> = {
  extract: 'Analyzing the job description',
  score: 'Scoring your resume',
  plan: 'Planning improvements',
  tailor: 'Improving your resume',
  rescore: 'Re-scoring the improved resume',
  review: 'Reviewing the result',
  letter: 'Drafting cover letter',
};

export function friendlyError(reason?: string, message?: string, step?: string): { text: string; diagnosis: string; confidence: string } {
  const task = step === 'extract' ? "analyze the job description" : step === 'score' ? "score your resume" : "draft your cover letter";
  if (reason === 'timeout') return { text: `Couldn't ${task}. The selected model didn't respond in time.`, diagnosis: 'Provider timeout', confidence: '93%' };
  if (reason === 'auth') return { text: `Couldn't ${task}. API key issue.`, diagnosis: 'Authentication failed', confidence: '97%' };
  if (reason === 'rate_limit') return { text: `Couldn't ${task}. Too many requests.`, diagnosis: 'Rate limit hit', confidence: '95%' };
  if (reason === 'provider') return { text: `Couldn't ${task}. The AI provider returned an error.`, diagnosis: 'Upstream error', confidence: '88%' };
  return { text: message || `Couldn't ${task}.`, diagnosis: 'Unknown error', confidence: '—' };
}

export interface UseStudioPipelineOptions {
  /** Called as a new run starts, so view state (tabs, collapsed panels) resets. */
  onRunStart?: () => void;
}

/**
 * Owns the studio pipeline run: POSTs the job description to the pipeline
 * route, decodes the SSE stream, and folds every event into the step/summary
 * state the client renders. Passing view concerns (tabs, collapse flags) is
 * delegated to onRunStart.
 */
export function useStudioPipeline({ onRunStart }: UseStudioPipelineOptions = {}) {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepState[]>([]);
  const [letter, setLetter] = useState('');
  const [summary, setSummary] = useState<StudioPipelineSummary | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [elapsed, setElapsed] = useState<string | null>(null);
  const [stepTimings, setStepTimings] = useState<Record<string, number>>({});
  const [tailoredResume, setTailoredResume] = useState<TailoredResume | null>(null);
  const [extractData, setExtractData] = useState<ExtractedJobData | null>(null);
  const [scoreData, setScoreData] = useState<JobScore | null>(null);
  const [rescoreData, setRescoreData] = useState<JobScore | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  // Mirrors the letter text streamed during the CURRENT run, so the done
  // event can fall back to its letterBody only when nothing was streamed.
  const letterStreamedRef = useRef('');

  const updateStep = useCallback((step: string, patch: Partial<StepState>) => {
    setSteps((prev) => prev.map((s) => (s.step === step ? { ...s, ...patch } : s)));
  }, []);

  const addLog = useCallback((message: string, status: LogEntry['status'], step?: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [...prev, { time, message, status, step }]);
  }, []);

  const startRun = useCallback(async function startRun(jd: string, resumeId?: string) {
    if (!jd.trim() || jd.trim().length < 20) {
      toast.error('Paste a job description first', { description: 'At least 20 characters.' });
      return;
    }
    onRunStart?.();
    setRunning(true);
    setLetter('');
    setSummary(null);
    setLogs([]);
    setElapsed(null);
    setTailoredResume(null);
    setExtractData(null);
    setScoreData(null);
    setRescoreData(null);
    setStepTimings({});
    letterStreamedRef.current = '';
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
            letterStreamedRef.current += data.text;
            setLetter((prev) => prev + data.text);
          } else if (event === 'done') {
            pipelineCompleted = true;
            setSummary({ overall: data.overall, previousOverall: data.previousOverall, matched: data.matched, missing: data.missing, company: data.company, role: data.role, keywordsAdded: data.keywordsAdded ?? 0, bulletsRewritten: data.bulletsRewritten ?? 0, compatibility: data.compatibility, isLowCompat: data.isLowCompat, sectionsModified: data.sectionsModified, plan: data.plan, review: data.review, sectionConfidence: data.sectionConfidence, sectionChanges: data.sectionChanges, quality: data.quality, resumeId: data.resumeId ?? null, coverLetterId: data.coverLetterId ?? null });
            if (data.letterBody && !letterStreamedRef.current) setLetter(data.letterBody);
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
  }, [addLog, onRunStart, updateStep]);

  const abort = useCallback(() => { abortRef.current?.abort(); }, []);

  /** Clear a finished run (back to the empty pipeline view). Not for use mid-run. */
  const reset = useCallback(() => {
    if (abortRef.current && running) abortRef.current.abort();
    setRunning(false);
    setSteps([]);
    setLetter('');
    setSummary(null);
    setLogs([]);
    setElapsed(null);
    setStepTimings({});
    setTailoredResume(null);
    setExtractData(null);
    setScoreData(null);
    setRescoreData(null);
    letterStreamedRef.current = '';
  }, [running]);

  /** Reset every step AFTER `step` back to idle, then run the pipeline again. */
  const retryFrom = useCallback(async (step: string, jd: string, resumeId?: string) => {
    const idx = steps.findIndex((s) => s.step === step);
    if (idx === -1) return;
    setSteps((prev) => prev.map((s, i) => i < idx ? s : { ...s, status: 'idle', progress: 0, error: undefined, errorDetails: undefined, microStatus: undefined }));
    await startRun(jd, resumeId);
  }, [steps, startRun]);

  return {
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
    startRun,
    abort,
    retryFrom,
    reset,
  };
}

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Undo2, Redo2, Download, Sparkles, ChevronDown, Loader2,
  GripVertical, Plus, Bold, Italic, Underline as UnderlineIcon,
  AlignLeft, MoreHorizontal, ArrowLeft, Check, X, RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { WorkspaceShell } from '../_components/workspace-shell';
import { streamElevaText } from '../_lib/eleva-client';

const sections = [
  { id: 'summary', name: 'Summary', count: 1 },
  { id: 'experience', name: 'Experience', count: 4 },
  { id: 'projects', name: 'Projects', count: 3 },
  { id: 'skills', name: 'Skills', count: 12 },
  { id: 'education', name: 'Education', count: 2 },
  { id: 'certificates', name: 'Certificates', count: 4 },
];

const initialBullets = [
  'Led design & rollout of a low-latency pricing microservice in Go serving 4.2M req/day at p99 < 40ms — reduced infra cost by 34%.',
  'Owned SLO instrumentation across 12 services; automated PagerDuty routing, cutting mean incident time from 42m → 11m.',
  'Mentored 4 engineers; introduced weekly design reviews adopted org-wide across 30 engineers.',
];

interface BulletState {
  id: string;
  text: string;
  original: string;
  suggestion?: string;
  streaming?: boolean;
}

export default function EditorPage() {
  const [active, setActive] = useState('experience');
  const [bullets, setBullets] = useState<BulletState[]>(
    initialBullets.map((t, i) => ({ id: 'b' + i, text: t, original: t })),
  );
  const [optimizing, setOptimizing] = useState(false);
  const [rewriteToast, setRewriteToast] = useState<string | null>(null);

  const rewriteOne = async (id: string) => {
    const b = bullets.find((x) => x.id === id);
    if (!b) return;
    setBullets((all) => all.map((x) => (x.id === id ? { ...x, suggestion: '', streaming: true } : x)));
    let acc = '';
    try {
      for await (const chunk of streamElevaText('/eleva/api/tool/rewrite', { bullet: b.text, role: 'Senior Backend Engineer' })) {
        acc += chunk;
        setBullets((all) => all.map((x) => (x.id === id ? { ...x, suggestion: acc } : x)));
      }
    } finally {
      setBullets((all) => all.map((x) => (x.id === id ? { ...x, streaming: false } : x)));
    }
  };

  const acceptRewrite = (id: string) => {
    setBullets((all) => all.map((x) => (x.id === id ? { ...x, text: x.suggestion ?? x.text, suggestion: undefined, original: x.suggestion ?? x.original } : x)));
    setRewriteToast('Bullet updated ✨');
    setTimeout(() => setRewriteToast(null), 2000);
  };
  const rejectRewrite = (id: string) => {
    setBullets((all) => all.map((x) => (x.id === id ? { ...x, suggestion: undefined } : x)));
  };
  const revertToOriginal = (id: string) => {
    setBullets((all) => all.map((x) => (x.id === id ? { ...x, text: x.original, suggestion: undefined } : x)));
  };

  const optimizeAll = async () => {
    if (optimizing) return;
    setOptimizing(true);
    for (const b of bullets) {
      await rewriteOne(b.id);
    }
    setOptimizing(false);
    setRewriteToast('All bullets rewritten. Review and accept ✨');
    setTimeout(() => setRewriteToast(null), 3000);
  };

  return (
    <WorkspaceShell>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Toolbar */}
        <div className="h-14 border-b flex items-center gap-2 px-4 lg:px-6" style={{ borderColor: 'rgb(var(--eleva-border))', background: 'rgb(var(--eleva-card))' }}>
          <Link href="/eleva/resumes" className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[rgb(var(--eleva-muted))]" data-testid="editor-back">
            <ArrowLeft className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
          </Link>
          <div className="flex items-center gap-2 pr-3 border-r" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
            <input
              defaultValue="Google — Senior Backend Engineer"
              className="h-9 px-3 rounded-md text-sm font-medium outline-none hover:bg-[rgb(var(--eleva-muted))] focus:bg-[rgb(var(--eleva-muted))] w-[280px]"
              style={{ color: 'rgb(var(--eleva-fg))' }}
              data-testid="resume-name-input"
            />
            <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
          </div>

          <div className="flex items-center gap-1">
            {[Undo2, Redo2].map((I, i) => (
              <button key={i} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[rgb(var(--eleva-muted))]">
                <I className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-2 px-2.5 h-7 rounded-md" style={{ background: 'rgb(var(--eleva-muted))' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgb(var(--eleva-success))' }} />
            <span className="text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Saved · just now</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-md" style={{ background: 'rgb(var(--eleva-muted))' }}>
              <span className="text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>ATS</span>
              <span className="text-[13px] font-mono font-semibold" style={{ color: 'rgb(var(--eleva-success))' }}>96</span>
            </div>
            <button className="eleva-btn-ghost text-[13px] !py-1.5 !px-3 inline-flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Export
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={optimizeAll}
              disabled={optimizing}
              className="text-[13px] font-medium h-9 px-3.5 rounded-lg inline-flex items-center gap-1.5 text-white disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}
              data-testid="ai-optimize"
            >
              {optimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {optimizing ? 'Optimizing…' : 'Optimize with AI'}
            </button>
          </div>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {rewriteToast && (
            <motion.div
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-[13px] font-medium text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}
            >
              {rewriteToast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Split pane */}
        <div className="flex-1 grid grid-cols-[240px_1fr_1fr] min-h-0">
          {/* Left: sections */}
          <div className="border-r overflow-y-auto p-4" style={{ borderColor: 'rgb(var(--eleva-border))', background: 'rgb(var(--eleva-card))' }}>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] mb-2 px-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Sections</div>
            <div className="space-y-0.5">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className="w-full flex items-center gap-2 px-2 h-9 rounded-lg text-sm text-left transition-colors group"
                  style={{
                    background: active === s.id ? 'rgb(var(--eleva-muted))' : 'transparent',
                    color: active === s.id ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))',
                  }}
                  data-testid={`section-${s.id}`}
                >
                  <GripVertical className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
                  <span className="flex-1 font-medium">{s.name}</span>
                  <span className="text-[10px] font-mono opacity-60">{s.count}</span>
                </button>
              ))}
            </div>
            <button className="mt-3 w-full flex items-center gap-2 px-2 h-9 rounded-lg text-sm border border-dashed" style={{ borderColor: 'rgb(var(--eleva-border))', color: 'rgb(var(--eleva-muted-fg))' }}>
              <Plus className="w-3.5 h-3.5" /> Add section
            </button>

            <div className="mt-8 p-3 rounded-xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,.1), rgba(124,58,237,.1))' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-primary))' }} />
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-primary))' }}>Eleva Tip</span>
              </div>
              <p className="text-[12px] leading-relaxed" style={{ color: 'rgb(var(--eleva-fg))' }}>
                Click the sparkle on any bullet for an inline rewrite — or hit <strong>Optimize with AI</strong> to rewrite everything.
              </p>
            </div>
          </div>

          {/* Middle: editor */}
          <div className="overflow-y-auto p-6 lg:p-10">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Editing · Experience</div>
            <div className="eleva-card p-6 mb-4">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center font-display font-semibold" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}>
                  G
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    defaultValue="Senior Backend Engineer"
                    className="w-full text-lg font-semibold outline-none bg-transparent"
                    style={{ color: 'rgb(var(--eleva-fg))' }}
                  />
                  <div className="flex items-center gap-2 mt-1 text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                    <input defaultValue="Google" className="bg-transparent outline-none border-b border-transparent focus:border-current" />
                    <span>·</span>
                    <input defaultValue="Jan 2023 — Present" className="bg-transparent outline-none border-b border-transparent focus:border-current" />
                    <span>·</span>
                    <input defaultValue="Mountain View, CA" className="bg-transparent outline-none border-b border-transparent focus:border-current" />
                  </div>
                </div>
                <button className="w-8 h-8 rounded-md hover:bg-[rgb(var(--eleva-muted))] flex items-center justify-center">
                  <MoreHorizontal className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                </button>
              </div>

              {/* mini toolbar */}
              <div className="mt-4 flex items-center gap-1 h-9 px-2 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
                {[Bold, Italic, UnderlineIcon, AlignLeft].map((I, i) => (
                  <button key={i} className="w-7 h-7 rounded-md hover:bg-[rgb(var(--eleva-card))] flex items-center justify-center">
                    <I className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                  </button>
                ))}
                <div className="w-px h-4 mx-1" style={{ background: 'rgb(var(--eleva-border))' }} />
                <button
                  onClick={optimizeAll}
                  className="text-[11px] font-medium px-2 h-7 rounded-md hover:bg-[rgb(var(--eleva-card))] inline-flex items-center gap-1"
                  style={{ color: 'rgb(var(--eleva-primary))' }}
                  data-testid="rewrite-all"
                >
                  <Sparkles className="w-3 h-3" /> Rewrite all
                </button>
                <button className="text-[11px] font-medium px-2 h-7 rounded-md hover:bg-[rgb(var(--eleva-card))]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  Shorten
                </button>
                <button className="text-[11px] font-medium px-2 h-7 rounded-md hover:bg-[rgb(var(--eleva-card))]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  Add metric
                </button>
              </div>

              <div className="mt-4 space-y-2.5">
                {bullets.map((b) => (
                  <BulletRow
                    key={b.id}
                    b={b}
                    onRewrite={() => rewriteOne(b.id)}
                    onAccept={() => acceptRewrite(b.id)}
                    onReject={() => rejectRewrite(b.id)}
                    onRevert={() => revertToOriginal(b.id)}
                    onEdit={(text) => setBullets((all) => all.map((x) => (x.id === b.id ? { ...x, text } : x)))}
                  />
                ))}
                <button className="text-[13px] flex items-center gap-2 py-2 px-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  <Plus className="w-3.5 h-3.5" /> Add bullet
                </button>
              </div>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="overflow-y-auto p-6 lg:p-8" style={{ background: 'rgb(var(--eleva-muted))' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Live preview · A4</div>
              <div className="flex items-center gap-1 h-7 px-2 rounded-md" style={{ background: 'rgb(var(--eleva-card))' }}>
                <button className="text-[11px] font-mono px-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>—</button>
                <span className="text-[11px] font-mono">100%</span>
                <button className="text-[11px] font-mono px-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>+</button>
              </div>
            </div>
            <div
              className="rounded-lg mx-auto"
              style={{
                background: '#fff',
                aspectRatio: '1 / 1.414',
                maxWidth: 500,
                boxShadow: '0 20px 50px -12px rgba(2,6,23,.35)',
                padding: '32px 34px',
                color: '#0f172a',
              }}
            >
              <div className="text-[22px] font-bold tracking-tight">Ashish Sharma</div>
              <div className="text-[11px] mt-0.5 text-slate-600">Senior Backend Engineer · San Francisco, CA</div>
              <div className="text-[10px] mt-0.5 text-slate-500">ashish@eleva.app · linkedin.com/in/ashish · github.com/ashish</div>
              <div className="h-px my-3 bg-slate-200" />

              <div className="text-[10px] font-bold tracking-widest text-blue-700 uppercase mb-1.5">Summary</div>
              <p className="text-[10px] leading-relaxed text-slate-700">
                Senior backend engineer with 7 years designing distributed systems in Go and Rust. Built pricing & billing infrastructure powering $2B+ ARR across two YC unicorns.
              </p>

              <div className="text-[10px] font-bold tracking-widest text-blue-700 uppercase mt-4 mb-1.5">Experience</div>
              <div className="mb-2.5">
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold">Senior Backend Engineer · Google</span>
                  <span className="text-slate-500 font-mono text-[9px]">Jan 2023 — Present</span>
                </div>
                <ul className="mt-1 space-y-1 pl-3 list-disc text-[10px] leading-relaxed text-slate-700 marker:text-blue-600">
                  {bullets.map((b) => <li key={b.id}>{b.text}</li>)}
                </ul>
              </div>

              <div className="mb-2.5">
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold">Staff Engineer · Ramp</span>
                  <span className="text-slate-500 font-mono text-[9px]">2020 — 2023</span>
                </div>
                <ul className="mt-1 space-y-1 pl-3 list-disc text-[10px] leading-relaxed text-slate-700 marker:text-blue-600">
                  <li>Owned the ledger + reconciliation system processing $18B in transactions with 99.997% uptime.</li>
                  <li>Rewrote the notification pipeline to Kafka; cut alert latency 8s → 220ms.</li>
                </ul>
              </div>

              <div className="text-[10px] font-bold tracking-widest text-blue-700 uppercase mt-4 mb-1.5">Skills</div>
              <div className="flex flex-wrap gap-1">
                {['Go', 'Rust', 'Kubernetes', 'gRPC', 'PostgreSQL', 'Kafka', 'AWS', 'Terraform', 'System Design'].map(s => (
                  <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">{s}</span>
                ))}
              </div>

              <div className="text-[10px] font-bold tracking-widest text-blue-700 uppercase mt-4 mb-1.5">Education</div>
              <div className="flex justify-between text-[11px]">
                <span className="font-semibold">B.S. Computer Science · IIT Bombay</span>
                <span className="text-slate-500 font-mono text-[9px]">2018</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

interface BulletRowProps {
  b: BulletState;
  onRewrite: () => void;
  onAccept: () => void;
  onReject: () => void;
  onRevert: () => void;
  onEdit: (text: string) => void;
}
function BulletRow({ b, onRewrite, onAccept, onReject, onRevert, onEdit }: BulletRowProps) {
  const isEdited = b.text !== b.original;
  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="group rounded-lg hover:bg-[rgb(var(--eleva-muted))] p-3">
      <div className="flex gap-3">
        <GripVertical className="w-3.5 h-3.5 mt-1 opacity-0 group-hover:opacity-100 shrink-0" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
        <div className="w-1 h-1 rounded-full mt-2.5 shrink-0" style={{ background: 'rgb(var(--eleva-primary))' }} />
        <textarea
          value={b.text}
          onChange={(e) => onEdit(e.target.value)}
          rows={2}
          className="flex-1 text-[14px] leading-relaxed bg-transparent outline-none resize-none"
          style={{ color: 'rgb(var(--eleva-fg))' }}
          data-testid={`bullet-${b.id}`}
        />
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onRewrite}
            disabled={b.streaming}
            className="w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}
            title="Rewrite with AI"
            data-testid={`bullet-rewrite-${b.id}`}
          >
            {b.streaming ? <Loader2 className="w-3 h-3 animate-spin text-white" /> : <Sparkles className="w-3 h-3 text-white" />}
          </button>
          {isEdited && (
            <button
              onClick={onRevert}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[rgb(var(--eleva-card))]"
              title="Revert to original"
            >
              <RotateCcw className="w-3 h-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
            </button>
          )}
        </div>
      </div>

      {/* Suggestion diff */}
      <AnimatePresence>
        {b.suggestion !== undefined && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="ml-6 mt-2 rounded-lg overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(37,99,235,.08), rgba(124,58,237,.08))', border: '1px solid rgba(37,99,235,.25)' }}
          >
            <div className="px-3 py-2 flex items-center justify-between border-b" style={{ borderColor: 'rgba(37,99,235,.15)' }}>
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-primary))' }}>
                {b.streaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Eleva suggestion
              </div>
              {!b.streaming && (
                <div className="flex gap-1">
                  <button onClick={onAccept} className="text-[11px] font-medium px-2 h-6 rounded-md inline-flex items-center gap-1" style={{ background: 'rgb(var(--eleva-success))', color: '#fff' }} data-testid={`bullet-accept-${b.id}`}>
                    <Check className="w-3 h-3" /> Accept
                  </button>
                  <button onClick={onReject} className="text-[11px] font-medium px-2 h-6 rounded-md inline-flex items-center gap-1" style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-muted-fg))' }}>
                    <X className="w-3 h-3" /> Reject
                  </button>
                </div>
              )}
            </div>
            <div className="px-3 py-2.5 text-[13px] leading-relaxed" style={{ color: 'rgb(var(--eleva-fg))' }}>
              {b.suggestion || '…'}
              {b.streaming && <span className="inline-block w-1.5 h-3 -mb-0.5 ml-0.5 rounded-sm" style={{ background: 'rgb(var(--eleva-primary))', animation: 'eleva-blink 1s infinite' }} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

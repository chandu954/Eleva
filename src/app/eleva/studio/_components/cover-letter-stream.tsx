'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

interface CoverLetterStreamProps {
  letter: string;
  running: boolean;
  steps: { step: string; status: string }[];
  extractData: { company?: string | null; role?: string | null } | null;
  downloadExport: (format: 'pdf' | 'docx') => void;
}

export function CoverLetterStream({ letter, running, steps, extractData, downloadExport }: CoverLetterStreamProps) {
  return (
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
  );
}

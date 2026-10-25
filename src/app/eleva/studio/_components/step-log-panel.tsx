'use client';

/*
 * Collapsible activity log for a studio pipeline run. Extracted from
 * studio-client.tsx so the run log rendering is independently testable.
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

export type LogEntry = { time: string; message: string; status: 'running' | 'done' | 'error'; step?: string };

export function StepLogPanel({ logs, defaultOpen = true }: { logs: LogEntry[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  if (logs.length === 0) return null;

  return (
    <div className="mt-4">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-[11px] font-medium h-8 w-full justify-center rounded-lg" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Activity Log {logs.length > 0 && `(${logs.length})`}
      </button>
      <AnimatePresence>
        {open && (
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
  );
}

'use client';

import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle2, Loader2 } from 'lucide-react';

export function SectionCard({ id, label, icon, isOpen, onToggle, children }: { id: string; label: string; icon: ReactNode; isOpen: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="eleva-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[rgb(var(--eleva-muted))]"
      >
        <span style={{ color: 'rgb(var(--eleva-primary))' }}>{icon}</span>
        <span className="flex-1 font-display text-[15px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{label}</span>
        <ChevronDown
          className="w-4 h-4 transition-transform"
          style={{ color: 'rgb(var(--eleva-muted-fg))', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key={`content-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
              <div className="pt-4">{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Field({ label, value, onChange, placeholder, textarea, mono, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; mono?: boolean; type?: string }) {
  return (
    <div>
      <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
          style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))', fontFamily: mono ? 'Geist Mono, monospace' : undefined }}
        />
      ) : (
        <input
          type={type || 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
          style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))', fontFamily: mono ? 'Geist Mono, monospace' : undefined }}
        />
      )}
    </div>
  );
}

export function SaveButton({ pending, onClick, label }: { pending: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="eleva-btn-primary text-[12px] inline-flex items-center gap-1.5"
    >
      {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
      {pending ? 'Saving...' : (label || 'Save')}
    </button>
  );
}

// ─── Completion Bar ─────────────────────────────────────────────────────────────

export function CompletionBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'rgb(var(--eleva-success))' : pct >= 50 ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-danger))';
  return (
    <div className="eleva-card p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Profile Completion</div>
        <div className="font-display text-2xl font-bold" style={{ color }}>{pct}%</div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ background: `linear-gradient(90deg, ${color}, rgb(var(--eleva-primary)))` }}
        />
      </div>
      <div className="flex items-center gap-2 mt-2 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
        <CheckCircle2 className="w-3 h-3" />
        {pct < 50 ? 'Start filling in your sections below' : pct < 80 ? 'Good progress! Keep going.' : 'Looking great! Ready for tailoring.'}
      </div>
    </div>
  );
}

export function ResumeHealthCard({ completion }: { completion: number }) {
  const health = completion >= 80 ? 85 : completion >= 50 ? 65 : 40;
  return (
    <div className="eleva-card p-5" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,.08), rgba(124,58,237,.08))' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Resume Health</div>
        <div className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--eleva-primary))' }}>{health}</div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgb(var(--eleva-bg))' }}>
        <div className="h-full rounded-full" style={{ width: `${health}%`, background: 'linear-gradient(90deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }} />
      </div>
      <div className="text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
        {health >= 80 ? 'Strong profile — ready for ATS optimization' : health >= 50 ? 'Add more sections to improve' : 'Complete your profile first'}
      </div>
    </div>
  );
}

// ─── Section: Personal ──────────────────────────────────────────────────────────


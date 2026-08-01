'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check } from 'lucide-react';
import { AmbientGlow } from './ambient';

const sidebarItems = ['Dashboard', 'Studio', 'Resumes', 'ATS Match', 'Cover Letters', 'Analytics'];

const missingSkills = ['Distributed Systems', 'Kubernetes', 'System Design'];

export function ProductDemo() {
  const [optimized, setOptimized] = useState(false);

  const handleOptimize = useCallback(() => {
    setOptimized(true);
  }, []);

  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-10 md:pb-14">
      <AmbientGlow className="top-1/3 left-1/2 w-[720px] h-[520px] -translate-x-1/2 -translate-y-1/3" size={720} />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="rounded-[18px] overflow-hidden border relative"
        style={{
          borderColor: 'rgba(148,163,184,0.20)',
          background: 'rgb(var(--eleva-card))',
          boxShadow: '0 30px 80px rgba(15,23,42,0.10), 0 8px 30px rgba(37,99,235,0.06)',
        }}
      >
        <div className="h-10 border-b flex items-center gap-2 px-4" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#f87171' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#fbbf24' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#34d399' }} />
          </div>
          <div className="ml-4 text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            eleva.app/workspace
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_1fr]">
          <div className="hidden md:block border-r p-3 space-y-0.5" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
            <div className="mb-3 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Navigate
            </div>
            {sidebarItems.map((n, i) => (
              <div
                key={n}
                className="flex items-center gap-2 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors cursor-default"
                style={{
                  background: i === 3 ? 'rgb(var(--eleva-muted))' : 'transparent',
                  color: i === 3 ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))',
                }}
              >
                <span
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{ background: i === 3 ? 'rgb(var(--eleva-primary))' : 'transparent' }}
                />
                {n}
              </div>
            ))}
          </div>
          <AnimatePresence mode="wait">
            {!optimized ? (
              <motion.div
                key="before"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -10 }}
                className="p-6 md:border-r flex flex-col"
                style={{ borderColor: 'rgb(var(--eleva-border))' }}
              >
                <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  Senior Backend Engineer · Northwind Labs
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="font-display text-5xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>61</span>
                  <span className="text-sm font-medium" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>%</span>
                  <span className="ml-2 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: 'rgb(var(--eleva-danger))' }}>
                    Needs work
                  </span>
                </div>
                <div className="text-[11px] font-medium mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  Missing skills
                </div>
                <div className="space-y-2 mb-6">
                  {missingSkills.map((s) => (
                    <div key={s} className="flex items-center gap-2 text-[13px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
                      <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.1)', color: 'rgb(var(--eleva-danger))' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </div>
                      {s}
                    </div>
                  ))}
                </div>
                <div className="mt-auto">
                  <div className="flex gap-2 mb-2">
                    {['Go', 'Kubernetes', 'gRPC', 'PostgreSQL'].map((s) => (
                      <span key={s} className="text-[10px] px-2 py-1 rounded-md font-medium" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>{s}</span>
                    ))}
                  </div>
                  <div className="text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                    Keyword alignment <span className="font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>54%</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="after"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 md:border-r flex flex-col"
                style={{ borderColor: 'rgb(var(--eleva-border))' }}
              >
                <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  Senior Backend Engineer · Northwind Labs
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <motion.span
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="font-display text-5xl font-semibold"
                    style={{ color: 'rgb(var(--eleva-success))' }}
                  >
                    91
                  </motion.span>
                  <span className="text-sm font-medium" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>%</span>
                  <span className="ml-2 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: 'rgb(var(--eleva-success))' }}>
                    Strong match
                  </span>
                </div>
                <div className="space-y-2 mb-3">
                  {[
                    { label: 'Keyword alignment', v: 94 },
                    { label: 'Experience relevance', v: 89 },
                    { label: 'Formatting', v: 100 },
                    { label: 'Recruiter signals', v: 87 },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{m.label}</span>
                        <span className="font-mono font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{m.v}%</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${m.v}%` }}
                          transition={{ duration: 1, delay: 0.2 }}
                          className="h-full rounded-full"
                          style={{ background: 'rgb(var(--eleva-primary))' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-auto p-3 rounded-lg text-[11px] leading-relaxed" style={{ background: 'rgba(37,99,235,0.06)', color: 'rgb(var(--eleva-muted-fg))' }}>
                  <span className="font-medium" style={{ color: 'rgb(var(--eleva-primary))' }}>+20 point gain</span>
                  <br />
                  4 missing keywords added · 7 bullets strengthened · Skills reordered
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="p-6 flex flex-col">
            <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              {optimized ? 'Optimized Preview' : 'Resume Preview'}
            </div>
            <div className="rounded-xl p-4 flex-1 flex flex-col" style={{ background: '#fff', border: '1px solid rgb(var(--eleva-border))' }}>
              <div className="text-[13px] font-semibold text-slate-900">Alex Morgan</div>
              <div className="text-[10px] text-slate-500 mt-0.5 mb-3">Senior Backend Engineer · San Francisco</div>
              <div className="h-px" style={{ background: '#e2e8f0' }} />
              <div className="mt-3 text-[10px] font-semibold text-slate-700 mb-1.5">Experience</div>
              <div className="space-y-1.5 mb-3">
                <div className="flex gap-2">
                  <div className="h-2 rounded-full w-full" style={{ background: optimized ? '#dbeafe' : '#f1f5f9' }} />
                </div>
                <div className="h-2 rounded-full w-10/12" style={{ background: '#f1f5f9' }} />
                <div className="h-2 rounded-full w-8/12" style={{ background: '#f1f5f9' }} />
                <div className="h-2 rounded-full w-11/12" style={{ background: optimized ? '#dbeafe' : '#f1f5f9' }} />
              </div>
              <div className="text-[10px] font-semibold text-slate-700 mb-1.5">
                {optimized ? 'Optimized Skills' : 'Skills'}
              </div>
              <div className="flex gap-1 flex-wrap">
                {['Go', 'gRPC', 'PostgreSQL', ...(optimized ? ['Kubernetes', 'Distributed Systems', 'System Design'] : [])].map((s) => (
                  <span
                    key={s}
                    className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                    style={{
                      background: optimized && !['Go', 'gRPC', 'PostgreSQL'].includes(s) ? '#dbeafe' : '#f1f5f9',
                      color: optimized && !['Go', 'gRPC', 'PostgreSQL'].includes(s) ? '#1d4ed8' : '#475569',
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
              {optimized && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-auto pt-3 space-y-1"
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: 'rgb(var(--eleva-success))' }}>
                    <Check className="w-3 h-3" />
                    7 bullets improved
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: 'rgb(var(--eleva-success))' }}>
                    <Check className="w-3 h-3" />
                    12 keywords aligned
                  </div>
                </motion.div>
              )}
            </div>
            {!optimized && (
              <button
                onClick={handleOptimize}
                className="mt-4 w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-medium transition-all"
                style={{
                  background: 'linear-gradient(90deg, #2563EB, #4F46E5)',
                  color: '#fff',
                  boxShadow: '0 1px 0 rgba(255,255,255,.2) inset, 0 6px 18px -6px rgba(37,99,235,.5)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px -6px rgba(37,99,235,0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Optimize for this job
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
      <div className="mt-4 text-center">
        <p className="text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
          Scores based on real ATS parser analysis · click &ldquo;Optimize&rdquo; to see Eleva in action
        </p>
      </div>
    </section>
  );
}

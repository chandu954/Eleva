'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { AmbientGlow } from './ambient';

export function ATSAnalysis() {
  return (
    <section className="eleva-section relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
      <div className="grid md:grid-cols-[0.85fr_1.15fr] gap-[72px] items-center">
        <div>
          <h2 className="font-display font-semibold leading-[1.04]" style={{ fontSize: 'clamp(2.5rem, 4.2vw, 4rem)', letterSpacing: '-0.035em', color: 'rgb(var(--eleva-fg))' }}>
            Know your score<br />before you submit.
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed max-w-md" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Real ATS parser simulation — not a keyword blender. See exactly what recruiters and screening systems see.
          </p>
        </div>
        <div>
          <AmbientGlow className="top-10 -left-24 w-[420px] h-[360px] opacity-60" size={420} />
          <div
            className="rounded-[18px] p-6 md:p-8 relative max-w-[640px]"
            style={{
              background: 'rgba(255,255,255,0.96)',
              border: '1px solid rgba(148,163,184,0.20)',
              boxShadow: '0 20px 60px rgba(15,23,42,0.08)',
            }}
          >
            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3 mb-7">
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(254,242,242,0.85)',
                  border: '1px solid rgba(239,68,68,0.14)',
                }}
              >
                <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Original</div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  className="font-display text-5xl font-semibold"
                  style={{ color: 'rgb(var(--eleva-danger))' }}
                >
                  61
                </motion.div>
                <div className="text-[10px] font-medium mt-1" style={{ color: 'rgb(var(--eleva-danger))' }}>
                  Weak match
                </div>
              </div>
              <div className="flex flex-col items-center justify-center gap-1.5 px-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ color: 'rgb(var(--eleva-muted-fg))' }}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                <span className="text-[11px] font-semibold font-mono px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: 'rgb(var(--eleva-success))' }}>
                  +30 pts
                </span>
              </div>
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(240,253,244,0.85)',
                  border: '1px solid rgba(34,197,94,0.18)',
                }}
              >
                <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Optimized</div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 }}
                  className="font-display text-5xl font-semibold"
                  style={{ color: 'rgb(var(--eleva-success))' }}
                >
                  91
                </motion.div>
                <div className="text-[10px] font-medium mt-1" style={{ color: 'rgb(var(--eleva-success))' }}>
                  Strong match
                </div>
              </div>
            </div>
            <div className="space-y-2.5 mb-6">
              {[
                { label: 'Keyword alignment', before: 54, after: 94 },
                { label: 'Experience relevance', before: 62, after: 89 },
                { label: 'Formatting', before: 78, after: 100 },
                { label: 'Recruiter signals', before: 45, after: 87 },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{m.label}</span>
                    <span className="font-mono" style={{ color: 'rgb(var(--eleva-fg))' }}>
                      <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{m.before}%</span>
                      <span className="mx-1">→</span>
                      <span className="font-semibold" style={{ color: 'rgb(var(--eleva-success))' }}>{m.after}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${m.after}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #2563EB, #4F46E5)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div
              className="rounded-xl p-4"
              style={{
                background: 'rgba(37,99,235,0.04)',
                border: '1px solid rgba(37,99,235,0.12)',
              }}
            >
              <div className="text-[11px] font-semibold mb-2" style={{ color: 'rgb(var(--eleva-primary))' }}>
                What Eleva changed
              </div>
              <div className="space-y-1.5">
                {[
                  '4 missing keywords addressed',
                  '7 bullets strengthened with impact verbs',
                  'Skills reordered by relevance',
                  'No experience fabricated',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-[12px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
                    <Check className="w-3 h-3 shrink-0" style={{ color: 'rgb(var(--eleva-success))' }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-5 text-[12px] text-center" style={{ color: '#64748B' }}>
            Scores are analysis results based on simulation — not guaranteed hiring outcomes
          </p>
        </div>
      </div>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Search, Target, FilePen, BarChart3, Mail, Briefcase, LineChart } from 'lucide-react';

const flowSteps = [
  { icon: Search, label: 'Job Description', desc: 'Paste any JD or URL' },
  { icon: Target, label: 'Job Match', desc: 'Skills & alignment analysis' },
  { icon: FilePen, label: 'Resume Tailoring', desc: 'AI rewrites for the role' },
  { icon: BarChart3, label: 'ATS Match', desc: 'Score & keyword gaps' },
  { icon: Mail, label: 'Cover Letter', desc: 'One-click generation' },
  { icon: Briefcase, label: 'Application', desc: 'Track with Kanban' },
  { icon: LineChart, label: 'Analytics', desc: 'Performance metrics' },
];

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { delay: (i % 4) * 0.05 },
});

export function CareerOS() {
  return (
    <section id="features" className="eleva-section relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-medium mb-4" style={{ border: '1px solid rgb(var(--eleva-border))', background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
          Product system
        </div>
        <h2 className="font-display font-semibold leading-[1.04]" style={{ fontSize: 'clamp(2.5rem, 4.2vw, 4rem)', letterSpacing: '-0.035em', color: 'rgb(var(--eleva-fg))' }}>
          One workspace for your<br />entire job search.
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
          Seven connected capabilities that all work on the same context, the same resume, the same search.
        </p>
      </div>

      {/* Desktop: single connected row */}
      <div className="hidden lg:grid lg:grid-cols-7 items-start gap-1 relative">
        <div
          className="absolute left-[8%] right-[8%] h-px"
          aria-hidden
          style={{
            top: 28,
            background:
              'linear-gradient(90deg, rgba(37,99,235,0.05), rgba(37,99,235,0.14) 25%, rgba(79,70,229,0.20) 50%, rgba(37,99,235,0.14) 75%, rgba(37,99,235,0.05))',
          }}
        />
        {flowSteps.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.label}
              {...fadeUp(i)}
              className="group flex flex-col items-center text-center px-2 relative eleva-card-hover rounded-xl py-3"
            >
              <div
                className="eleva-feature-icon w-14 h-14 flex items-center justify-center mb-3"
              >
                <Icon className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <div className="text-[14px] font-semibold mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>{step.label}</div>
              <div className="text-[12px] leading-snug max-w-[130px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{step.desc}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Tablet: 4 × 2 grid */}
      <div className="hidden md:grid md:grid-cols-4 lg:hidden gap-3">
        {flowSteps.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.label}
              {...fadeUp(i)}
              className="group flex flex-col items-center text-center p-4 rounded-xl eleva-card-hover"
              style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))' }}
            >
              <div className="eleva-feature-icon w-11 h-11 flex items-center justify-center mb-2.5">
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="text-[13px] font-semibold mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>{step.label}</div>
              <div className="text-[11px] leading-snug" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{step.desc}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Mobile: 2 × 4 grid */}
      <div className="grid grid-cols-2 md:hidden gap-3">
        {flowSteps.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.label}
              {...fadeUp(i)}
              className="group flex flex-col items-center text-center p-4 rounded-xl eleva-card-hover"
              style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))' }}
            >
              <div className="eleva-feature-icon w-10 h-10 flex items-center justify-center mb-2.5">
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="text-[13px] font-semibold mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>{step.label}</div>
              <div className="text-[11px] leading-snug" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{step.desc}</div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

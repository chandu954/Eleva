'use client';

import { motion } from 'framer-motion';

const steps = [
  { n: '01', t: 'Add the job', d: 'Paste a job description or URL. Eleva parses it into weighted keywords, responsibilities, and inferred seniority.' },
  { n: '02', t: 'Understand the match', d: 'Eleva analyzes skills, keywords, seniority, and experience alignment. See exactly where you stand before tailoring.' },
  { n: '03', t: 'Tailor', d: 'Improve relevant resume content while preserving factual experience. Bullets rewrite, skills reorder, gaps highlight.' },
  { n: '04', t: 'Review', d: 'See exactly what changed and why. Every suggestion is grounded in your real experience — nothing fabricated.' },
  { n: '05', t: 'Apply & track', d: 'Save the application, attach the tailored resume version, and track progress from one Kanban board.' },
];

export function Workflow() {
  return (
    <section id="workflow" className="eleva-section relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
      <div className="grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 gap-10 items-start">
        <div className="lg:sticky lg:top-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-medium mb-4" style={{ border: '1px solid rgb(var(--eleva-border))', background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
            Workflow
          </div>
          <h2 className="font-display font-semibold leading-[1.04]" style={{ fontSize: 'clamp(2.5rem, 4.2vw, 4rem)', letterSpacing: '-0.035em', color: 'rgb(var(--eleva-fg))' }}>
            From job description<br />to organized search.
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed max-w-md" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Your workflow, from job post to application — five steps, no context switching.
          </p>
        </div>

        <div className="max-w-[620px] lg:ml-auto w-full">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.06, ease: 'easeOut' }}
            >
              <div className="flex items-stretch gap-5">
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold font-mono"
                    style={{ background: 'linear-gradient(135deg,#2563EB,#4F46E5)', color: '#fff', boxShadow: '0 0 0 4px rgba(37,99,235,0.08)' }}
                  >
                    {s.n}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className="w-px flex-1 my-1.5"
                      style={{ background: 'linear-gradient(180deg, rgba(37,99,235,0.35), rgba(124,58,237,0.15))' }}
                    />
                  )}
                </div>
                <div className="pb-3.5 flex-1">
                  <div
                    className="rounded-[14px] p-5 eleva-card-hover"
                    style={{
                      background: 'rgba(255,255,255,0.9)',
                      border: '1px solid rgba(148,163,184,0.22)',
                    }}
                  >
                    <h3 className="text-[15px] font-semibold mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>
                      {s.t}
                    </h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      {s.d}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

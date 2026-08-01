'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Command, Wand2, Target, Mail, Upload, Briefcase, Plus } from 'lucide-react';

const commands = [
  { icon: Wand2, label: 'Optimize resume for job', key: 'O' },
  { icon: Target, label: 'Run ATS check', key: 'A' },
  { icon: Mail, label: 'Generate cover letter', key: 'L' },
  { icon: Upload, label: 'Upload resume', key: 'U' },
  { icon: Plus, label: 'Create resume from scratch', key: 'N' },
  { icon: Briefcase, label: 'Open applications Kanban', key: null },
];

const CYCLE_MS = 3000;

function useModifier(): string {
  const [mod, setMod] = useState('\u2318');

  useEffect(() => {
    if (
      typeof navigator !== 'undefined' &&
      !/Mac|iPhone|iPad/i.test(navigator.platform ?? navigator.userAgent)
    ) {
      setMod('Ctrl');
    }
  }, []);

  return mod;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function CommandShowcase() {
  const mod = useModifier();
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState(0);
  const hovering = useRef(false);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      if (!hovering.current) {
        setSelected((prev) => (prev + 1) % commands.length);
      }
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <section id="command" className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-10 md:pt-24 pb-12 md:pb-[120px]">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-medium mb-5" style={{ border: '1px solid rgb(var(--eleva-border))', background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
          <Command className="w-3 h-3" />
          Command palette
        </div>
        <h2 className="font-display font-semibold leading-[1.04]" style={{ fontSize: 'clamp(2.5rem, 4.2vw, 4rem)', letterSpacing: '-0.035em', color: 'rgb(var(--eleva-fg))' }}>
          Your job search,<br />one command away.
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed max-w-lg mx-auto" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
          Press <span className="eleva-kbd text-[11px]">{mod}K</span> from anywhere to run any action. The fastest way to navigate your job search.
        </p>
      </div>
      <div
        className="relative max-w-[620px] mx-auto"
        onMouseEnter={() => { hovering.current = true; }}
        onMouseLeave={() => { hovering.current = false; }}
      >
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 w-[560px] h-[300px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.08), transparent 65%)' }}
        />
        <div
          className="relative rounded-[18px] overflow-hidden border"
          style={{
            borderColor: 'rgba(148,163,184,0.20)',
            background: 'rgb(var(--eleva-card))',
            boxShadow: '0 28px 80px rgba(15,23,42,0.13), 0 10px 30px rgba(37,99,235,0.06)',
          }}
        >
          <div className="flex items-center gap-3 px-4 h-11 border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
            <Command className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
            <span className="text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Type a command or search...
            </span>
            <span className="eleva-kbd ml-auto">
              ESC
            </span>
          </div>
          <div className="p-2 space-y-0.5">
            {commands.map((cmd, i) => {
              const Icon = cmd.icon;
              const isSelected = i === selected;
              return (
                <motion.div
                  key={cmd.label}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-default"
                  style={{
                    background: isSelected ? '#EFF6FF' : 'transparent',
                    transition: 'background .25s ease',
                    color: isSelected ? '#0F172A' : 'rgb(var(--eleva-fg))',
                  }}
                >
                  <div
                    className="w-7 h-7 flex items-center justify-center rounded-md shrink-0"
                    style={{
                      background: isSelected ? 'rgba(37,99,235,0.12)' : 'rgb(var(--eleva-muted))',
                      color: isSelected ? '#2563EB' : 'rgb(var(--eleva-primary))',
                      transition: 'background .25s ease, color .25s ease',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </div>
                  <span className="text-[13px] font-medium flex-1">{cmd.label}</span>
                  {cmd.key && (
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap"
                      style={{
                        background: 'rgb(var(--eleva-muted))',
                        color: 'rgb(var(--eleva-muted-fg))',
                      }}
                    >
                      {mod === 'Ctrl' ? `${mod} ${cmd.key}` : `${mod}${cmd.key}`}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

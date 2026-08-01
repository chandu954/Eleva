import Link from 'next/link';
import { ArrowUpRight, Command } from 'lucide-react';
import { OrbitDecoration, AmbientGlow } from './ambient';

export function Hero() {
  return (
    <section id="hero" className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-14 md:pt-32 md:pb-14">
      <OrbitDecoration className="-top-16 right-[-120px] w-[640px] h-[640px] opacity-50" />
      <AmbientGlow className="-top-24 left-[30%] w-[560px] h-[460px] opacity-60" color="indigo" />
      <div className="relative max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-medium mb-8" style={{ border: '1px solid rgba(37,99,235,0.18)', background: 'rgba(37,99,235,0.05)', color: 'rgb(var(--eleva-primary))' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgb(var(--eleva-success))' }} />
          AI Career Operating System
        </div>
        <h1
          className="font-display font-semibold leading-[0.96]"
          style={{ fontSize: 'clamp(3rem, 6vw, 5.875rem)', letterSpacing: '-0.05em', color: 'rgb(var(--eleva-fg))' }}
        >
          Your job search.<br />
          <span className="eleva-gradient-text">One intelligent workspace.</span>
        </h1>
        <p className="mt-6 text-[17px] md:text-[19px] leading-relaxed max-w-xl" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
          Tailor resumes, understand ATS scores, generate targeted cover letters, and track every application from one AI-powered workspace.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/eleva/dashboard"
            className="eleva-btn-gradient inline-flex items-center gap-2 h-12 px-6 text-[15px]"
          >
            Enter workspace
            <ArrowUpRight className="w-4 h-4" />
          </Link>
          <a
            href="#workflow"
            className="eleva-btn-ghost inline-flex items-center gap-2 h-12 px-6 text-[15px]"
          >
            <Command className="w-4 h-4" />
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}

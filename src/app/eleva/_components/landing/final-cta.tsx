import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { OrbitDecoration } from './ambient';

export function FinalCTA() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-[88px] md:py-[110px]">
      <OrbitDecoration compact className="-bottom-24 left-1/2 w-[520px] h-[520px] -translate-x-1/2 opacity-40" />
      <div className="relative max-w-2xl mx-auto text-center">
        <h2 className="font-display font-semibold leading-[1.04]" style={{ fontSize: 'clamp(2.5rem, 4.2vw, 4rem)', letterSpacing: '-0.035em', color: 'rgb(var(--eleva-fg))' }}>
          Your job search<br />deserves a system.
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed max-w-lg mx-auto" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
          Build, tailor, analyze, and track everything from one workspace.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
            Explore workflow
          </a>
        </div>
      </div>
    </section>
  );
}

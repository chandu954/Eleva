'use client';

import { WorkspaceShell } from '../_components/workspace-shell';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <WorkspaceShell>
      <div className="max-w-3xl mx-auto px-6 lg:px-10 py-32 text-center relative">
        <div className="eleva-orb" style={{ top: 20, left: '30%', width: 300, height: 300, background: 'rgb(var(--eleva-primary))' }} />
        <div className="relative">
          <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-6" style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}>
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Coming in v2.1</div>
          <h1 className="font-display text-5xl font-semibold tracking-tighter" style={{ color: 'rgb(var(--eleva-fg))' }}>{title}</h1>
          <p className="mt-4 text-[17px] leading-relaxed max-w-lg mx-auto" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{desc}</p>
          <Link href="/eleva/dashboard" className="mt-8 inline-flex eleva-btn-ghost">← Back to dashboard</Link>
        </div>
      </div>
    </WorkspaceShell>
  );
}

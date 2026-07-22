'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { ActivityItem } from '../../_lib/data';

function humanKind(kind: string): string {
  const map: Record<string, string> = {
    resume_created: 'Resume created',
    resume_updated: 'Resume updated',
    ats_scored: 'ATS report',
    cover_generated: 'Cover letter generated',
    resume_uploaded: 'Resume uploaded',
    resume_tailored: 'Resume tailored',
    application_added: 'Application added',
    pipeline_run: 'Pipeline run',
    template_applied: 'Template applied',
  };
  return map[kind] || kind;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const day = diff < 86400000 ? 'Today' : diff < 172800000 ? 'Yesterday' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

export function ActivityTimeline({ activity }: { activity: ActivityItem[] }) {
  const hasActivity = activity.length > 0;

  if (!hasActivity) {
    return (
      <div className="eleva-card p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>AI Activity</div>
            <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Recent events</div>
          </div>
        </div>
        <div className="text-center py-10 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgb(var(--eleva-card))' }}>
            <Sparkles className="w-6 h-6" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.5} />
          </div>
          <div className="text-lg font-display font-semibold mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>No activity yet</div>
          <p className="text-[12px] mb-4 max-w-xs mx-auto" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Start your career journey — create a resume or run an ATS check.
          </p>
          <Link href="/eleva/studio" className="eleva-btn-primary text-[12px] inline-flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />Start Career Session
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="eleva-card p-6 lg:col-span-2">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>AI Activity</div>
          <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Recent events</div>
        </div>
        <span className="eleva-pill" style={{ color: 'rgb(var(--eleva-success))' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgb(var(--eleva-success))' }} />
          Live
        </span>
      </div>

      <div className="relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-px" style={{ background: 'rgb(var(--eleva-border))' }} />
        {activity.slice(0, 6).map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex gap-4 mb-4 last:mb-0 relative"
          >
            <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center z-10" style={{ background: 'rgb(var(--eleva-card))', borderColor: 'rgb(var(--eleva-primary))', color: 'rgb(var(--eleva-primary))' }}>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between gap-4">
                <div className="text-[14px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{a.title || humanKind(a.kind)}</div>
                <div className="text-[10px] font-mono shrink-0 whitespace-nowrap" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{formatTime(a.created_at)}</div>
              </div>
              {a.subtitle && <div className="text-[13px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{a.subtitle}</div>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

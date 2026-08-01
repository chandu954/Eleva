'use client';

import { motion } from 'framer-motion';
import { Sparkles, FileText, Gauge, Mail, Send, Wand2, LayoutTemplate, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { ActivityItem } from '../../_lib/data';

const KIND_ICONS: Record<string, typeof FileText> = {
  resume_created: FileText,
  resume_updated: FileText,
  resume_uploaded: FileText,
  ats_scored: Gauge,
  cover_generated: Mail,
  resume_tailored: Wand2,
  pipeline_run: Wand2,
  application_added: Send,
  template_applied: LayoutTemplate,
};

function humanKind(kind: string): string {
  const map: Record<string, string> = {
    resume_created: 'Resume created',
    resume_updated: 'Resume updated',
    ats_scored: 'ATS analysis completed',
    cover_generated: 'Cover letter generated',
    resume_uploaded: 'Resume uploaded',
    resume_tailored: 'Resume tailored',
    application_added: 'Application added',
    pipeline_run: 'Resume tailored',
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

function parsePipeline(item: ActivityItem): { role: string; before: number | null; after: number | null; testing: boolean } {
  const meta = (item.meta ?? {}) as Record<string, unknown>;
  const after = typeof meta.atsOverall === 'number' ? meta.atsOverall : null;
  const before = typeof meta.previousOverall === 'number' ? meta.previousOverall : null;
  let role = typeof meta.role === 'string' ? meta.role : '';
  let testing = false;
  let beforeScore = before;
  let afterScore = after;

  const m = /^Pipeline:\s*(.+?)\s*·\s*(\d+)%\s*→\s*(\d+)%$/.exec(item.title ?? '');
  if (m) {
    const company = m[1].trim();
    testing = /^testing$/i.test(company) || /unknown/i.test(company);
    if (!role) role = company;
    if (beforeScore === null) beforeScore = Number(m[2]) || null;
    if (afterScore === null) afterScore = Number(m[3]) || null;
  }
  if (!role && item.subtitle) role = item.subtitle;

  return { role, before: beforeScore, after: afterScore, testing };
}

type Display = {
  icon: typeof FileText;
  title: string;
  sub?: string;
  detail?: string;
  time: string;
};

function toDisplay(a: ActivityItem): Display | null {
  const Icon = KIND_ICONS[a.kind] || FileText;

  if (a.kind === 'pipeline_run') {
    const { role, before, after, testing } = parsePipeline(a);
    if (testing) return null;
    const detail = before !== null && after !== null ? `ATS ${before} → ${after}` : after !== null ? `ATS ${after}/100` : undefined;
    return { icon: Icon, title: 'Resume tailored', sub: role || undefined, detail, time: formatTime(a.created_at) };
  }

  if (a.kind === 'ats_scored') {
    const m = /(\d+)/.exec(a.title ?? '');
    const overall = m ? Number(m[1]) : null;
    return {
      icon: Icon,
      title: 'ATS analysis completed',
      sub: a.resumeName || undefined,
      detail: overall !== null ? `Score ${overall}/100${a.subtitle ? ` · ${a.subtitle.replace(/\(|\)/g, '')}` : ''}` : a.subtitle || undefined,
      time: formatTime(a.created_at),
    };
  }

  if (a.kind === 'application_added') {
    return { icon: Icon, title: a.title || 'Application added', sub: a.subtitle || undefined, time: formatTime(a.created_at) };
  }

  if (a.kind === 'cover_generated') {
    return { icon: Icon, title: 'Cover letter generated', sub: a.subtitle || undefined, time: formatTime(a.created_at) };
  }

  return { icon: Icon, title: a.title || humanKind(a.kind), sub: a.subtitle || undefined, time: formatTime(a.created_at) };
}

export function ActivityTimeline({ activity }: { activity: ActivityItem[] }) {
  const items = activity.map(toDisplay).filter((x): x is Display => x !== null);
  const hasActivity = items.length > 0;

  if (!hasActivity) {
    return (
      <div className="eleva-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Recent Activity</div>
            <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Latest updates</div>
          </div>
        </div>
        <div className="text-center py-10 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgb(var(--eleva-card))' }}>
            <Sparkles className="w-6 h-6" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.5} />
          </div>
          <div className="text-lg font-display font-semibold mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>No activity yet</div>
          <p className="text-[12px] mb-4 max-w-xs mx-auto" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Create a resume or run an ATS check to get started.
          </p>
          <Link href="/eleva/studio" className="eleva-btn-primary text-[12px] inline-flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />Optimize for a Job
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="eleva-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Recent Activity</div>
          <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Latest updates</div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-px" style={{ background: 'rgb(var(--eleva-border))' }} />
        {items.slice(0, 6).map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex gap-4 mb-4 last:mb-0 relative"
            >
              <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center z-10" style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))', color: 'rgb(var(--eleva-primary))' }}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 pt-0.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-[14px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{a.title}</div>
                  <div className="text-[10px] font-mono shrink-0 whitespace-nowrap" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{a.time}</div>
                </div>
                {a.sub && <div className="text-[13px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{a.sub}</div>}
                {a.detail && (
                  <div className="inline-flex items-center gap-1.5 text-[11px] mt-1 px-2 py-0.5 rounded-full" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}>
                    <ArrowUpRight className="w-3 h-3" style={{ color: 'rgb(var(--eleva-primary))' }} />
                    {a.detail}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { CountUp } from '../_components/count-up';
import { TrendingUp, Target, Mail, Briefcase, FileText, Sparkles } from 'lucide-react';
import type { DashboardMetrics } from '../_lib/data';

type UsageRow = { created_at: string; input_tokens: number | null; output_tokens: number | null; model: string | null; route: string | null };
type AtsRow = { id: string; overall: number; keyword: number; formatting: number; resume_id: string; created_at: string };

export function AnalyticsClient({ metrics, usage, atsReports }: { metrics: DashboardMetrics; usage: UsageRow[]; atsReports: AtsRow[] }) {
  const totalTokens = usage.reduce((s, u) => s + (u.input_tokens ?? 0) + (u.output_tokens ?? 0), 0);
  const totalCalls = usage.length;

  const cards = [
    { label: 'Resumes',       value: metrics.resumes,       icon: FileText,   accent: 'rgb(var(--eleva-primary))',   trend: metrics.resumeGrowth,     suffix: '' },
    { label: 'Applications',  value: metrics.applications,  icon: Briefcase,  accent: 'rgb(var(--eleva-secondary))', trend: metrics.applicationsTrend, suffix: '' },
    { label: 'Avg ATS',       value: metrics.avgAts,        icon: Target,     accent: 'rgb(var(--eleva-success))',   trend: metrics.atsTrend,          suffix: '%' },
    { label: 'Cover letters', value: metrics.coverLetters,  icon: Mail,       accent: 'rgb(var(--eleva-accent))',    trend: [0,0,0,0,0,0, metrics.coverLetters], suffix: '' },
  ];

  const modelBreakdown: Record<string, number> = {};
  for (const u of usage) {
    const k = u.model || 'unknown';
    modelBreakdown[k] = (modelBreakdown[k] || 0) + 1;
  }

  const routeBreakdown: Record<string, number> = {};
  for (const u of usage) {
    const k = u.route || 'unknown';
    routeBreakdown[k] = (routeBreakdown[k] || 0) + 1;
  }

  const maxRoute = Math.max(1, ...Object.values(routeBreakdown));

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Analytics · Last 30 days</div>
        <h1 className="font-display text-4xl font-semibold tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>Your career, quantified.</h1>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="eleva-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-mono uppercase tracking-[0.16em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{c.label}</div>
              <c.icon className="w-4 h-4" style={{ color: c.accent }} />
            </div>
            <div className="font-display text-4xl font-semibold tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>
              <CountUp to={c.value} />{c.suffix}
            </div>
            <div className="mt-3 h-8 flex items-end gap-0.5">
              {c.trend.slice(-14).map((v, j) => {
                const max = Math.max(1, ...c.trend);
                return <div key={j} className="flex-1 rounded-sm" style={{ height: `${(v / max) * 100}%`, background: c.accent, opacity: 0.4 + (j / 14) * 0.6 }} />;
              })}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 eleva-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>ATS score trend</div>
              <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Last 7 days</div>
            </div>
            <span className="eleva-pill" style={{ color: metrics.atsDelta >= 0 ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-warning))' }}>
              <TrendingUp className="w-3 h-3" /> {metrics.atsDelta >= 0 ? '+' : ''}{metrics.atsDelta}%
            </span>
          </div>
          <svg viewBox="0 0 700 220" className="w-full h-56">
            {[0, 25, 50, 75, 100].map((y) => (
              <line key={y} x1="0" x2="700" y1={220 - (y / 100) * 200 - 10} y2={220 - (y / 100) * 200 - 10} stroke="rgb(var(--eleva-border))" strokeDasharray="3 4" />
            ))}
            {metrics.atsTrend.length > 1 && (() => {
              const pts = metrics.atsTrend.map((v, i) => {
                const x = (i / (metrics.atsTrend.length - 1)) * 680 + 10;
                const y = 220 - (v / 100) * 200 - 10;
                return `${i === 0 ? 'M' : 'L'}${x},${y}`;
              }).join(' ');
              return (
                <>
                  <motion.path d={`${pts} L690,210 L10,210 Z`} fill="url(#g1)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
                  <motion.path d={pts} fill="none" stroke="rgb(var(--eleva-primary))" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }} />
                </>
              );
            })()}
            <defs><linearGradient id="g1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="rgb(var(--eleva-primary))" stopOpacity="0.28" /><stop offset="1" stopColor="rgb(var(--eleva-primary))" stopOpacity="0" /></linearGradient></defs>
          </svg>
        </div>

        <div className="eleva-card p-6">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>AI usage</div>
          <div className="font-display text-xl font-semibold mb-5" style={{ color: 'rgb(var(--eleva-fg))' }}>Tokens & calls</div>
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Total tokens</div>
              <div className="font-display text-3xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}><CountUp to={totalTokens} /></div>
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Total AI calls</div>
              <div className="font-display text-3xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}><CountUp to={totalCalls} /></div>
            </div>
            <div className="pt-3 border-t" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
              <div className="text-[11px] font-mono uppercase mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>By route</div>
              {Object.entries(routeBreakdown).slice(0, 5).map(([r, n]) => (
                <div key={r} className="flex items-center gap-2 mb-1.5">
                  <div className="text-[11px] font-mono flex-1 truncate" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{r}</div>
                  <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
                    <div className="h-full" style={{ width: `${(n / maxRoute) * 100}%`, background: 'rgb(var(--eleva-primary))' }} />
                  </div>
                  <div className="text-[11px] font-mono w-6 text-right" style={{ color: 'rgb(var(--eleva-fg))' }}>{n}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="eleva-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Recent ATS reports</div>
            <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Last {atsReports.length} scores</div>
          </div>
          <Sparkles className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} />
        </div>
        {atsReports.length === 0 ? (
          <div className="text-center py-10" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            <p className="text-[14px]">No ATS reports yet. Run a Studio pipeline to generate your first score.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {atsReports.map((r) => (
              <div key={r.id} className="p-4 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-display text-2xl font-semibold" style={{ color: r.overall >= 90 ? 'rgb(var(--eleva-success))' : r.overall >= 75 ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-warning))' }}>{r.overall}%</div>
                  <div className="text-[10px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{new Date(r.created_at).toLocaleDateString('en-US')}</div>
                </div>
                <div className="flex gap-3 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  <span>KW {r.keyword}</span>
                  <span>Fmt {r.formatting}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

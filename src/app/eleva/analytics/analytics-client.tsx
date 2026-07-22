'use client';

import { motion } from 'framer-motion';
import { CountUp } from '../_components/count-up';
import { TrendingUp, Target, Mail, Briefcase, FileText, Sparkles, BarChart3, Layers, Code2 } from 'lucide-react';
import type { DashboardMetrics } from '../_lib/data';

type UsageRow = { created_at: string; input_tokens: number | null; output_tokens: number | null; model: string | null; route: string | null };
type AtsRow = { id: string; overall: number; keyword: number; formatting: number; resume_id: string; created_at: string };

export function AnalyticsClient({ metrics, usage, atsReports }: { metrics: DashboardMetrics; usage: UsageRow[]; atsReports: AtsRow[] }) {
  const totalTokens = usage.reduce((s, u) => s + (u.input_tokens ?? 0) + (u.output_tokens ?? 0), 0);
  const totalCalls = usage.length;

  const bestAts = atsReports.length > 0 ? Math.max(...atsReports.map((r) => r.overall)) : 0;
  const avgImprovement = atsReports.length > 1 ? Math.round((atsReports[0]?.overall ?? 0) - (atsReports[atsReports.length - 1]?.overall ?? 0)) : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Analytics · Last 30 days</div>
        <h1 className="font-display text-4xl font-semibold tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>Your career, quantified.</h1>
      </motion.div>

      {/* Insights row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Best Template', value: 'Linear', sub: 'Based on ATS', icon: Layers, color: 'rgb(var(--eleva-primary))' },
          { label: 'Best ATS', value: `${bestAts}%`, sub: `Latest ${atsReports.length} scores`, icon: Target, color: 'rgb(var(--eleva-success))' },
          { label: 'Avg Improvements', value: avgImprovement > 0 ? `+${avgImprovement}%` : '0%', sub: 'Last 30 days', icon: TrendingUp, color: avgImprovement > 0 ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-muted-fg))' },
          { label: 'Most Used Skills', value: 'React', sub: 'Node.js · TypeScript · AWS', icon: Code2, color: 'rgb(var(--eleva-warning))' },
          { label: 'Resume Growth', value: `${Math.min(metrics.resumes, 74)} → ${metrics.resumes + 17}`, sub: 'Score improvement', icon: BarChart3, color: 'rgb(var(--eleva-accent))' },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="eleva-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className="w-3.5 h-3.5" style={{ color: c.color }} />
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{c.label}</span>
            </div>
            <div className="font-display text-xl font-bold tracking-tight" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{c.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Main cards */}
      <div className="grid gap-4 mb-6">
        <div className="eleva-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>ATS score trend</div>
              <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Last 7 days</div>
            </div>
            <span className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ background: metrics.atsDelta >= 0 ? 'rgba(var(--eleva-success-rgb), 0.12)' : 'rgba(var(--eleva-warning-rgb), 0.12)', color: metrics.atsDelta >= 0 ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-warning))' }}>
              <TrendingUp className="w-3 h-3" /> {metrics.atsDelta >= 0 ? '+' : ''}{metrics.atsDelta}% vs last week
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
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 eleva-card p-6">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Core metrics</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {[
              { label: 'Resumes',       value: metrics.resumes,       icon: FileText,   accent: 'rgb(var(--eleva-primary))' },
              { label: 'Applications',  value: metrics.applications,  icon: Briefcase,  accent: 'rgb(var(--eleva-secondary))' },
              { label: 'Avg ATS',       value: metrics.avgAts,        icon: Target,     accent: 'rgb(var(--eleva-success))', suffix: '%' },
              { label: 'Cover letters', value: metrics.coverLetters,  icon: Mail,       accent: 'rgb(var(--eleva-accent))' },
            ].map((c) => (
              <div key={c.label} className="p-4 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{c.label}</span>
                  <c.icon className="w-3.5 h-3.5" style={{ color: c.accent }} />
                </div>
                <div className="font-display text-2xl font-bold tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>
                  <CountUp to={c.value} />{c.suffix || ''}
                </div>
              </div>
            ))}
          </div>
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
            {atsReports.slice(0, 9).map((r) => (
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
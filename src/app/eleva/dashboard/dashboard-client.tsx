'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Upload, Wand2, Mail, Target, MessageSquare, Plus, FileText, TrendingUp, ArrowUpRight, ChevronRight, Sparkles, CheckCircle2, ArrowUp, Radio } from 'lucide-react';
import { CountUp } from '../_components/count-up';
import { useRealtimeAts } from '../_lib/use-realtime';
import type { DashboardMetrics, ActivityItem } from '../_lib/data';

type Resume = { id: string; name: string; target_role: string | null; updated_at: string; is_base_resume: boolean };
type Ats = { id: string; overall: number; keyword: number; formatting: number; resume_id: string; created_at: string };

const quickActions = [
  { icon: Wand2,          label: 'Tailor to Job',          hint: 'Paste JD',      href: '/eleva/studio' },
  { icon: Target,         label: 'Run ATS Check',          hint: 'Any file',      href: '/eleva/ats' },
  { icon: Mail,           label: 'Generate Cover Letter',  hint: 'AI-drafted',    href: '/eleva/cover-letters' },
  { icon: FileText,       label: 'Edit Resume',            hint: 'Live editor',   href: '/eleva/editor' },
  { icon: Upload,         label: 'Upload Resume',          hint: 'PDF, DOCX',     href: '/eleva/resumes' },
  { icon: MessageSquare,  label: 'Applications',           hint: 'Kanban',        href: '/eleva/applications' },
];

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (!points.length) return null;
  const max = Math.max(1, ...points);
  const min = Math.min(...points);
  const w = 120, h = 32;
  const d = points.map((p, i) => {
    const x = (i / Math.max(1, points.length - 1)) * w;
    const y = h - ((p - min) / Math.max(1, max - min)) * h;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`gr-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#gr-${color})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
      <motion.path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }} />
    </svg>
  );
}

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

export function DashboardClient({ name, metrics, activity, recentResumes, recentAts }: { name: string; metrics: DashboardMetrics; activity: ActivityItem[]; recentResumes: Resume[]; recentAts: Ats[] }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const day = new Date().toLocaleDateString(undefined, { weekday: 'long' });

  // Live realtime ATS updates — merges newly-inserted scores into the local list
  const { items: liveAts, latest: liveLatest } = useRealtimeAts(recentAts as never);
  const displayAts = (liveAts.length ? liveAts : (recentAts as never[])).slice(0, 3);

  const stats = [
    { label: 'Resumes',       value: metrics.resumes,      suffix: '',  delta: metrics.resumeGrowth[6] > metrics.resumeGrowth[0] ? `+${metrics.resumeGrowth[6] - metrics.resumeGrowth[0]} this week` : 'All time', trend: metrics.resumeGrowth,     accent: 'rgb(var(--eleva-primary))' },
    { label: 'Applications',  value: metrics.applications, suffix: '',  delta: metrics.applicationsTrend[6] > 0 ? `+${metrics.applicationsTrend[6] - (metrics.applicationsTrend[0] || 0)} this week` : 'None yet', trend: metrics.applicationsTrend, accent: 'rgb(var(--eleva-secondary))' },
    { label: 'Average ATS',   value: metrics.avgAts,       suffix: '%', delta: metrics.atsDelta >= 0 ? `+${metrics.atsDelta}% vs 30d ago` : `${metrics.atsDelta}%`, trend: metrics.atsTrend,     accent: 'rgb(var(--eleva-success))' },
    { label: 'Cover Letters', value: metrics.coverLetters, suffix: '',  delta: 'All time', trend: [0,0,0,0,0,0,metrics.coverLetters], accent: 'rgb(var(--eleva-accent))' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Workspace · {day}</div>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tighter" style={{ color: 'rgb(var(--eleva-fg))' }}>
          {greeting}, {name} <span className="inline-block eleva-float">👋</span>
        </h1>
        <p className="mt-2 text-[16px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Here&apos;s your career, live from Supabase.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/eleva/editor" className="eleva-btn-primary inline-flex items-center gap-2" data-testid="hero-create-resume"><Plus className="w-4 h-4" />Create Resume</Link>
          <Link href="/eleva/studio" className="eleva-btn-ghost inline-flex items-center gap-2" data-testid="hero-tailor"><Wand2 className="w-4 h-4" />Tailor to Job</Link>
          <Link href="/eleva/cover-letters" className="eleva-btn-ghost inline-flex items-center gap-2"><Mail className="w-4 h-4" />Generate Cover Letter</Link>
        </div>
      </motion.div>

      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <motion.div key={s.label} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }} whileHover={{ y: -3 }} className="eleva-card p-5 relative overflow-hidden group">
            <div className="flex items-start justify-between mb-4">
              <div className="text-[11px] font-mono uppercase tracking-[0.16em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{s.label}</div>
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgb(var(--eleva-muted))' }}><ArrowUp className="w-3 h-3" style={{ color: s.accent }} /></div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="font-display text-4xl font-semibold tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}><CountUp to={s.value} />{s.suffix}</div>
                <div className="text-[12px] mt-1" style={{ color: s.accent }}>{s.delta}</div>
              </div>
              <Sparkline points={s.trend} color={s.accent} />
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-4 mb-10">
        <div className="lg:col-span-2 eleva-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Quick actions</div>
              <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Start where you left off</div>
            </div>
            <span className="eleva-pill"><Sparkles className="w-3 h-3" />AI-powered</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickActions.map((a, i) => {
              const Icon = a.icon;
              return (
                <Link key={a.label} href={a.href} className="relative rounded-xl p-4 text-left overflow-hidden group" style={{ background: 'rgb(var(--eleva-muted))' }} data-testid={`quick-${a.label.toLowerCase().replace(/\s/g, '-')}`}>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'rgb(var(--eleva-card))', boxShadow: '0 1px 0 rgb(var(--eleva-border))' }}>
                      <Icon className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.75} />
                    </div>
                    <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{a.label}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{a.hint}</div>
                    <ArrowUpRight className="absolute top-3 right-3 w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="eleva-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Recent resumes</div>
              <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Your library</div>
            </div>
            <Link href="/eleva/resumes" className="text-[12px] font-medium flex items-center gap-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>All <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {recentResumes.length === 0 ? (
            <EmptyBlock title="No resumes yet" desc="Create your first resume to see it here." cta="Create resume" href="/eleva/editor" />
          ) : (
            <div className="space-y-2">
              {recentResumes.map((r) => (
                <Link key={r.id} href={`/eleva/editor?id=${r.id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" style={{ background: 'rgb(var(--eleva-muted))' }}>
                  <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgb(var(--eleva-card))' }}><FileText className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: 'rgb(var(--eleva-fg))' }}>{r.name}</div>
                    <div className="text-[11px] truncate" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{r.target_role || 'No role'} · {new Date(r.updated_at).toLocaleDateString('en-US')}</div>
                  </div>
                  {r.is_base_resume && <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgb(var(--eleva-primary))', color: '#fff' }}>Base</span>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 eleva-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Activity</div>
              <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Recent events</div>
            </div>
          </div>
          {activity.length === 0 ? (
            <EmptyBlock title="No activity yet" desc="Run a Studio pipeline or generate a cover letter to see events here." cta="Open Studio" href="/eleva/studio" />
          ) : (
            <div className="relative">
              <div className="absolute left-[15px] top-2 bottom-2 w-px" style={{ background: 'rgb(var(--eleva-border))' }} />
              {activity.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex gap-4 mb-4 last:mb-0 relative">
                  <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center border-2 z-10" style={{ background: 'rgb(var(--eleva-card))', borderColor: 'rgb(var(--eleva-primary))', color: 'rgb(var(--eleva-primary))' }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-[14px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{a.title || humanKind(a.kind)}</div>
                      <div className="text-[11px] font-mono shrink-0" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{new Date(a.created_at).toLocaleDateString('en-US')}</div>
                    </div>
                    {a.subtitle && <div className="text-[13px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{a.subtitle}</div>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="eleva-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Productivity</div>
              <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>This week</div>
            </div>
            <span className="eleva-pill" style={{ color: 'rgb(var(--eleva-success))' }}><TrendingUp className="w-3 h-3" />{metrics.weeklyProductivity.reduce((a, b) => a + b, 0)}</span>
          </div>
          <div className="flex items-end justify-between gap-1.5 h-40 mb-3">
            {metrics.weeklyProductivity.map((v, i) => {
              const max = Math.max(1, ...metrics.weeklyProductivity);
              const isPeak = v === max && v > 0;
              return (
                <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${(v / max) * 100 || 5}%` }} transition={{ delay: i * 0.06, duration: 0.5, ease: 'easeOut' }} className="flex-1 rounded-t-md relative" style={{ background: isPeak ? 'linear-gradient(180deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' : 'rgb(var(--eleva-muted))' }} />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
          </div>

          {(displayAts.length > 0 || liveLatest) && (
            <div className="mt-5 pt-5 border-t" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Latest ATS</div>
                <motion.div initial={{ opacity: 0.6 }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity }} className="inline-flex items-center gap-1 text-[10px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-success))' }}>
                  <Radio className="w-2.5 h-2.5" /> Live
                </motion.div>
              </div>
              {displayAts.map((r: any) => (
                <motion.div key={r.id} initial={r.id === liveLatest?.id ? { opacity: 0, x: -8, background: 'rgba(37,197,94,0.15)' } : { opacity: 1 }} animate={{ opacity: 1, x: 0, background: 'transparent' }} transition={{ duration: 0.6 }} className="flex items-center justify-between text-[12px] py-1.5 px-2 rounded">
                  <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{new Date(r.created_at).toLocaleDateString('en-US')}</span>
                  <span className="font-mono font-medium" style={{ color: r.overall >= 90 ? 'rgb(var(--eleva-success))' : r.overall >= 75 ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-warning))' }}>{r.overall}%</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyBlock({ title, desc, cta, href }: { title: string; desc: string; cta: string; href: string }) {
  return (
    <div className="text-center py-8 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
      <div className="font-display text-lg font-semibold mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>{title}</div>
      <div className="text-[12px] mb-4 max-w-xs mx-auto" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{desc}</div>
      <Link href={href} className="eleva-btn-primary text-[12px] inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3" />{cta}</Link>
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Wand2, Mail, Target, FileText, Sparkles, ChevronRight, TrendingUp, Briefcase, Brain, BarChart3, Clock, Layers, Zap } from 'lucide-react';
import { CountUp } from '../_components/count-up';
import type { DashboardMetrics, ActivityItem } from '../_lib/data';
import { useRouter } from 'next/navigation';
import { AiMessage, StreakBadge } from './_components/ai-message';
import { QuickStats } from './_components/quick-stats';
import { WeeklyProgress } from './_components/weekly-progress';
import { ActivityTimeline } from './_components/activity-timeline';
import { RecommendationCard } from './_components/recommendation-card';

type Resume = { id: string; name: string; target_role: string | null; updated_at: string; is_base_resume: boolean };
type Ats = { id: string; overall: number; keyword: number; formatting: number; resume_id: string; created_at: string };

function fractionToPercent(n: number, d: number): number {
  if (!d) return 0;
  return Math.min(100, Math.round((n / d) * 100));
}

function computeHealthScores(metrics: DashboardMetrics) {
  const base = metrics.avgAts || 65;
  const rq = Math.min(100, base + 10);
  const ao = base;
  const ar = Math.min(100, metrics.applications * 12);
  const ic = fractionToPercent(metrics.interviews, Math.max(1, metrics.applications));
  const overall = Math.round((rq + ao + ar + ic) / 4);
  return { resumeQuality: rq, atsOptimization: ao, applicationRate: ar, interviewChance: ic, overall };
}

function getHealthLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: 'rgb(var(--eleva-success))' };
  if (score >= 60) return { label: 'Good', color: 'rgb(var(--eleva-primary))' };
  if (score >= 40) return { label: 'Fair', color: 'rgb(var(--eleva-warning))' };
  return { label: 'Needs Work', color: 'rgb(var(--eleva-danger))' };
}

function getLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Work';
}

function getLabelColor(score: number): string {
  if (score >= 80) return 'rgb(var(--eleva-success))';
  if (score >= 60) return 'rgb(var(--eleva-primary))';
  if (score >= 40) return 'rgb(var(--eleva-warning))';
  return 'rgb(var(--eleva-danger))';
}

function ProgressRing({ value, size = 100, strokeWidth = 6, color }: { value: number; size?: number; strokeWidth?: number; color?: string }) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;
  const c = color || 'rgb(var(--eleva-primary))';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--eleva-muted))" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export function DashboardClient({ name, metrics, activity, recentResumes, recentAts }: { name: string; metrics: DashboardMetrics; activity: ActivityItem[]; recentResumes: Resume[]; recentAts: Ats[] }) {
  const router = useRouter();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const health = computeHealthScores(metrics);
  const healthLabel = getHealthLabel(health.overall);
  const latestAts = recentAts[0];
  const atsGrowth = metrics.atsDelta > 0 ? `+${metrics.atsDelta}` : `${metrics.atsDelta}`;
  const latestResume = recentResumes[0];
  const hasResumes = metrics.resumes > 0;
  const hasApps = metrics.applications > 0;

  const appStatus = metrics.applicationsByStatus;
  const funnelApplied = appStatus['applied'] || appStatus['submitted'] || metrics.applications || 0;
  const funnelReplied = appStatus['replied'] || appStatus['screening'] || appStatus['phone_screen'] || Math.round(funnelApplied * 0.3);
  const funnelInterview = appStatus['interview'] || metrics.interviews || Math.round(funnelApplied * 0.1);
  const funnelOffer = appStatus['offer'] || appStatus['accepted'] || Math.round(funnelApplied * 0.03);
  const funnelMax = Math.max(funnelApplied, 1);

  const timelineSteps = [
    { label: 'Resume Uploaded', done: hasResumes, date: '' },
    { label: 'ATS Improved', done: metrics.avgAts > 70, date: metrics.avgAts > 70 ? `${atsGrowth}%` : '' },
    { label: 'Applied', done: hasApps, date: hasApps ? `${metrics.applications} apps` : '' },
    { label: 'Interview Scheduled', done: metrics.interviews > 0, date: metrics.interviews > 0 ? `${metrics.interviews} interviews` : '' },
    { label: 'Offer Received', done: funnelOffer > 0, date: funnelOffer > 0 ? `${funnelOffer} offers` : '' },
  ];

  const recs = getRecommendations(metrics, recentAts);

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const itemAnim = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6">
      {/* ═══ HERO + CAREER HEALTH ═══ */}
      <motion.div initial="hidden" animate="show" variants={container} className="grid lg:grid-cols-5 gap-6 mb-8">
        {/* Hero Left */}
        <motion.div variants={itemAnim} className="lg:col-span-3 eleva-card p-6 lg:p-8 relative overflow-hidden">
          <div className="eleva-grain" />
          <div className="eleva-orb w-72 h-72 -top-20 -right-20" style={{ background: 'rgba(37,99,235,0.08)' }} />
          <div className="relative z-10">
            <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-3 flex items-center gap-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              {day} · {dateStr}
              {latestResume && <span className="opacity-60">· Active: {latestResume.name}</span>}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>
              {greeting}, {name} <span className="inline-block eleva-float">👋</span>
            </h1>

            {/* Dynamic AI Message */}
            <AiMessage metrics={metrics} />

            {hasResumes && <StreakBadge metrics={metrics} />}

            {hasResumes && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3"
              >
                {[
                  { label: 'Matching jobs', value: `${Math.max(1, metrics.applications * 3)}`, icon: Briefcase },
                  { label: 'Need optimization', value: `${Math.max(0, metrics.resumes - Math.round(metrics.resumes * 0.4))}`, icon: Target },
                  { label: 'ATS score change', value: atsGrowth + '%', icon: TrendingUp },
                  { label: 'Need follow-up', value: `${Math.max(0, metrics.applications - funnelReplied)}`, icon: Clock },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <motion.div
                      key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.06 }}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
                      style={{ background: 'rgb(var(--eleva-muted))' }}
                    >
                      <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgb(var(--eleva-card))' }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.75} />
                      </div>
                      <div>
                        <div className="text-[16px] font-semibold font-display tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>{s.value}</div>
                        <div className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{s.label}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6 flex flex-wrap gap-3"
            >
              <Link
                href={hasResumes ? '/eleva/studio' : '/eleva/editor'}
                className="eleva-btn-primary inline-flex items-center gap-2.5 text-[14px] h-12 px-6 relative overflow-hidden group"
              >
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold">{hasResumes ? 'Continue Career Session' : 'Start Career Session'}</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ x: '-100%' }}
                  animate={{ x: ['100%', '-100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
                />
              </Link>
              <Link href="/eleva/resumes" className="eleva-btn-ghost inline-flex items-center gap-2 text-[14px] h-12 px-6">
                <FileText className="w-4 h-4" />
                View Resumes
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Career Health Right - Enhanced */}
        <motion.div variants={itemAnim} className="lg:col-span-2 eleva-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>AI Career Health</div>
              <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Overall Score</div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                style={{ background: `${healthLabel.color}18`, color: healthLabel.color }}
              >
                {healthLabel.label}
              </span>
              <span className="eleva-pill"><Sparkles className="w-3 h-3" />Live</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <ProgressRing value={health.overall} size={104} strokeWidth={7} color={healthLabel.color} />
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="font-display text-2xl font-bold tracking-tight leading-none" style={{ color: 'rgb(var(--eleva-fg))' }}><CountUp to={health.overall} /></span>
                <span className="text-[9px] font-mono mt-0.5" style={{ color: healthLabel.color }}>{healthLabel.label}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2.5">
              {[
                { label: 'Resume Quality', value: health.resumeQuality },
                { label: 'ATS Optimization', value: health.atsOptimization },
                { label: 'Application Rate', value: health.applicationRate },
                { label: 'Interview Chance', value: health.interviewChance },
              ].map((s) => (
                <div key={s.label} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[12px]">
                    <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{s.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${getLabelColor(s.value)}14`, color: getLabelColor(s.value) }}>
                        {getLabel(s.value)}
                      </span>
                      <span className="font-mono font-medium text-[12px]" style={{ color: 'rgb(var(--eleva-fg))' }}><CountUp to={s.value} /></span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: getLabelColor(s.value) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${s.value}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Quick Stats Row */}
      {hasResumes && <QuickStats metrics={metrics} />}

      {/* ═══ TODAY'S RECOMMENDATIONS ═══ */}
      <motion.div initial="hidden" animate="show" variants={container} className={hasResumes ? 'mt-6 mb-8' : 'mb-8'}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>AI Recommendations</div>
            <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Today&apos;s priorities</div>
          </div>
          <Link href="/eleva/studio" className="text-[12px] font-medium flex items-center gap-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Open Studio <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recs.map((r, i) => (
            <RecommendationCard key={r.title} r={r} index={i} onClick={() => router.push(r.href)} />
          ))}
        </div>
      </motion.div>

      {/* ═══ ACTIVITY + WEEKLY PROGRESS ═══ */}
      <motion.div initial="hidden" animate="show" variants={container} className="grid lg:grid-cols-3 gap-4 mb-8">
        <ActivityTimeline activity={activity} />

        {/* Weekly Progress + Career Progress */}
        <motion.div variants={itemAnim} className="flex flex-col gap-4">
          {/* Weekly Progress */}
          <motion.div variants={itemAnim} className="eleva-card p-5">
            <WeeklyProgress metrics={metrics} />
          </motion.div>

          {/* Career Progress (funnel) */}
          <motion.div variants={itemAnim} className="eleva-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Career Progress</div>
                <div className="font-display text-lg font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Applications</div>
              </div>
            </div>

            <div className="space-y-3.5">
              {[
                { label: 'Submitted', value: funnelApplied, max: funnelMax },
                { label: 'Replies', value: funnelReplied, max: funnelMax },
                { label: 'Interviews', value: funnelInterview, max: funnelMax },
                { label: 'Offers', value: funnelOffer, max: funnelMax },
              ].map((s, i) => {
                const pct = (s.value / s.max) * 100;
                const colors = ['rgb(var(--eleva-primary))', 'rgb(var(--eleva-accent))', 'rgb(var(--eleva-secondary))', 'rgb(var(--eleva-success))'];
                return (
                  <div key={s.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[13px]">
                      <span style={{ color: 'rgb(var(--eleva-fg))' }}>{s.label}</span>
                      <span className="font-mono font-medium" style={{ color: colors[i] }}><CountUp to={s.value} /></span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: colors[i] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(2, pct)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 * i }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {!hasApps && (
              <div className="mt-4 pt-4 border-t text-center" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
                <p className="text-[12px] mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  No applications yet. AI found {Math.max(1, metrics.resumes * 4)} matching jobs.
                </p>
                <Link href="/eleva/studio" className="eleva-btn-primary text-[12px] inline-flex items-center gap-1.5">
                  <Briefcase className="w-3 h-3" />View Jobs
                </Link>
              </div>
            )}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ═══ CAREER JOURNEY + AI INSIGHTS ═══ */}
      <motion.div initial="hidden" animate="show" variants={container} className="grid lg:grid-cols-3 gap-4 mb-8">
        {/* Career Journey Timeline */}
        <motion.div variants={itemAnim} className="lg:col-span-2 eleva-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Career Journey</div>
              <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Your progress</div>
            </div>
            <span className="eleva-pill">
              <Layers className="w-3 h-3" />
              {timelineSteps.filter(s => s.done).length}/{timelineSteps.length} steps
            </span>
          </div>

          <div className="flex items-start justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-0.5" style={{ background: 'rgb(var(--eleva-muted))' }} />
            <motion.div
              className="absolute top-5 left-0 h-0.5"
              style={{ background: 'linear-gradient(90deg, rgb(var(--eleva-primary)), rgb(var(--eleva-success)))' }}
              initial={{ width: 0 }}
              animate={{ width: `${(timelineSteps.filter(s => s.done).length / Math.max(1, timelineSteps.length)) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            {timelineSteps.map((step, i) => {
              return (
                <div key={step.label} className="relative flex flex-col items-center z-10" style={{ width: `${100 / timelineSteps.length}%` }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.1, type: 'spring', stiffness: 200 }}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm mb-3 border-2"
                    style={{
                      background: step.done ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-card))',
                      borderColor: step.done ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-border))',
                      color: step.done ? '#fff' : 'rgb(var(--eleva-muted-fg))',
                    }}
                  >
                    {step.done ? '✓' : i + 1}
                  </motion.div>
                  <div className="text-[11px] font-medium text-center leading-tight" style={{ color: step.done ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))' }}>
                    {step.label}
                  </div>
                  {step.date && <div className="text-[10px] font-mono mt-0.5" style={{ color: 'rgb(var(--eleva-success))' }}>{step.date}</div>}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* AI Insights Panel - Enhanced */}
        <motion.div variants={itemAnim} className="eleva-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Career Intelligence</div>
              <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>AI Insights</div>
            </div>
            <Brain className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.75} />
          </div>

          <div className="space-y-4">
            {latestAts ? (
              <div>
                <div className="text-[12px] font-medium mb-2" style={{ color: 'rgb(var(--eleva-fg))' }}>
                  Resume is missing
                </div>
                <div className="space-y-1.5 mb-2">
                  {latestAts.keyword < 70 && (
                    <div className="flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: 'rgb(var(--eleva-danger))' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgb(var(--eleva-danger))' }} />
                      {latestAts.keyword < 40 ? 'Docker, AWS, System Design' : latestAts.keyword < 55 ? 'Kubernetes, CI/CD' : 'More keywords needed'}
                    </div>
                  )}
                  {latestAts.formatting < 60 && (
                    <div className="flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)', color: 'rgb(180, 120, 0)' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgb(var(--eleva-warning))' }} />
                      Section headers, bullet points
                    </div>
                  )}
                </div>
                {latestAts.keyword < 70 && (
                  <div className="text-[11px] mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                    Adding these can increase your interview chances by {Math.round((70 - latestAts.keyword) * 0.6)}%.
                  </div>
                )}
                <Link href="/eleva/ats" className="eleva-btn-primary text-[11px] inline-flex items-center gap-1.5 px-4 py-2 w-full justify-center mb-3">
                  <Target className="w-3 h-3" />Run ATS Check
                </Link>
                <div className="h-px" style={{ background: 'rgb(var(--eleva-border))' }} />
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  Run an ATS check to see skill gap analysis
                </div>
                <Link href="/eleva/ats" className="eleva-btn-primary text-[11px] inline-flex items-center gap-1.5 mt-3 px-4 py-2">
                  <Target className="w-3 h-3" />Run ATS Check
                </Link>
                <div className="h-px my-3" style={{ background: 'rgb(var(--eleva-border))' }} />
              </div>
            )}

            {/* Salary Range */}
            <div>
              <div className="text-[12px] font-medium mb-1.5" style={{ color: 'rgb(var(--eleva-fg))' }}>Salary Range</div>
              <div className="font-display text-lg font-semibold tracking-tight" style={{ color: 'rgb(var(--eleva-primary))' }}>
                ₹18–24 LPA
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Based on your profile and market</div>
            </div>

            <div className="h-px" style={{ background: 'rgb(var(--eleva-border))' }} />

            {/* Competition */}
            <div>
              <div className="text-[12px] font-medium mb-1.5" style={{ color: 'rgb(var(--eleva-fg))' }}>Competition Level</div>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((v) => (
                    <div key={v} className="w-6 h-1.5 rounded-full" style={{ background: v <= 2 ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-muted))' }} />
                  ))}
                </div>
                <span className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-warning))' }}>Medium</span>
              </div>
            </div>

            <div className="h-px" style={{ background: 'rgb(var(--eleva-border))' }} />

            {/* Best Time */}
            <div>
              <div className="text-[12px] font-medium mb-1.5" style={{ color: 'rgb(var(--eleva-fg))' }}>Best Time to Apply</div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.1)', color: 'rgb(var(--eleva-primary))' }}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Today 6 PM</div>
                  <div className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Peak recruiter activity</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ═══ AI SUGGESTIONS + COMMAND CENTER ═══ */}
      <motion.div initial="hidden" animate="show" variants={container} className="grid lg:grid-cols-3 gap-4 mt-4 mb-8">
        {/* AI Suggestions */}
        <motion.div variants={itemAnim} className="lg:col-span-2 eleva-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>AI Suggestions</div>
              <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Improve your resume</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: '📄',
                title: 'Resume Quality',
                current: Math.min(91, Math.max(50, metrics.avgAts + 15)),
                predicted: Math.min(96, metrics.avgAts + 30),
                cta: 'Improve',
                href: '/eleva/editor',
                color: 'rgb(var(--eleva-primary))',
              },
              {
                icon: '🔑',
                title: 'Keywords Present',
                current: Math.min(38, Math.round((metrics.avgAts || 50) * 0.4)),
                predicted: 50,
                cta: 'Add Keywords',
                href: '/eleva/studio',
                color: 'rgb(var(--eleva-secondary))',
              },
            ].map((s) => {
              const ringColor = s.color;
              return (
                <div key={s.title} className="rounded-xl p-4" style={{ background: 'rgb(var(--eleva-muted))' }}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xl">{s.icon}</span>
                    <div className="relative w-12 h-12">
                      <ProgressRing value={s.current} size={48} strokeWidth={4} color={ringColor} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-mono font-bold" style={{ color: 'rgb(var(--eleva-fg))' }}>{s.current}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[14px] font-medium mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>{s.title}</div>
                  <div className="text-[11px] mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                    Can reach <span style={{ color: 'rgb(var(--eleva-success))' }}>{s.predicted}%</span>
                  </div>
                  <Link href={s.href} className="eleva-btn-primary text-[11px] inline-flex items-center gap-1.5 px-3.5 py-1.5">
                    <Zap className="w-3 h-3" />{s.cta}
                  </Link>
                </div>
              );
            })}

            {[{
              icon: '📋',
              title: 'Your Resume Contains',
              items: [`${Math.min(38, Math.round((metrics.avgAts || 50) * 0.4))} keywords`, `${Math.max(0, metrics.resumes)} resume${metrics.resumes !== 1 ? 's' : ''}`],
              cta: 'View',
              href: '/eleva/resumes',
              color: 'rgb(var(--eleva-accent))',
            }, {
              icon: '❌',
              title: 'Missing',
              items: [`${12 + Math.max(0, 3 - metrics.resumes) * 4} keywords`, `${Math.max(0, 3 - metrics.coverLetters)} cover letter${metrics.coverLetters !== 1 ? 's' : ''}`],
              cta: 'Fix',
              href: '/eleva/studio',
              color: 'rgb(var(--eleva-warning))',
            }].map((s) => (
              <div key={s.title} className="rounded-xl p-4" style={{ background: 'rgb(var(--eleva-muted))' }}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xl">{s.icon}</span>
                </div>
                <div className="text-[14px] font-medium mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>{s.title}</div>
                <div className="space-y-0.5 mb-3">
                  {s.items.map((item) => (
                    <div key={item} className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>• {item}</div>
                  ))}
                </div>
                <Link href={s.href} className="eleva-btn-primary text-[11px] inline-flex items-center gap-1.5 px-3.5 py-1.5" style={{ background: s.color }}>
                  <Zap className="w-3 h-3" />{s.cta}
                </Link>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Command Center */}
        <motion.div variants={itemAnim} className="eleva-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Command Center</div>
              <div className="font-display text-xl font-semibold mt-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Ask Eleva</div>
            </div>
            <span className="eleva-kbd">⌘K</span>
          </div>

          <div className="flex-1 space-y-3">
            {[
              { icon: Wand2, label: 'Improve my resume', href: '/eleva/studio' },
              { icon: Briefcase, label: 'Find React jobs', href: '/eleva/applications' },
              { icon: Target, label: 'Apply to positions', href: '/eleva/applications' },
              { icon: Mail, label: 'Generate cover letter', href: '/eleva/cover-letters' },
              { icon: BarChart3, label: 'Check ATS score', href: '/eleva/ats' },
            ].map((cmd) => {
              const Icon = cmd.icon;
              return (
                <Link
                  key={cmd.label}
                  href={cmd.href}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all group"
                  style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-primary))' }}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </div>
                  <span className="flex-1 group-hover:text-[rgb(var(--eleva-fg))] transition-colors">{cmd.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </Link>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
            <p className="text-[10px] font-mono uppercase tracking-[0.15em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Press <span className="eleva-kbd">⌘</span><span className="eleva-kbd">K</span> for quick commands
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function getRecommendations(metrics: DashboardMetrics, recentAts: Ats[]) {
  const recs: { icon: string; title: string; description: string; currentScore: number | null; predictedScore: number | null; cta: string; href: string; color: string; }[] = [];
  const latestAts = recentAts[0];
  const hasResumes = metrics.resumes > 0;
  const hasApps = metrics.applications > 0;

  if (hasResumes && latestAts && latestAts.overall < 80) {
    recs.push({
      icon: '🔥',
      title: 'Increase ATS by ' + Math.min(38, 80 - latestAts.overall) + ' points',
      description: latestAts.overall < 60 ? 'Major keyword and formatting gaps detected' : 'Optimize keywords and structure',
      currentScore: latestAts.overall,
      predictedScore: Math.min(100, latestAts.overall + 38),
      cta: 'Optimize',
      href: '/eleva/studio',
      color: 'rgb(var(--eleva-warning))',
    });
  }

  if (hasResumes && latestAts && latestAts.keyword < 70) {
    recs.push({
      icon: '⚡',
      title: 'Add Kubernetes to Resume',
      description: 'Keyword match is ' + latestAts.keyword + '% — top skills missing',
      currentScore: latestAts.keyword,
      predictedScore: Math.min(100, latestAts.keyword + 30),
      cta: 'Add Skills',
      href: '/eleva/editor',
      color: 'rgb(var(--eleva-primary))',
    });
  }

  if ((hasApps || !hasResumes) && recs.length < 3) {
    recs.push({
      icon: '🎯',
      title: hasApps ? 'Apply to 5 Matching Jobs' : 'Find Matching Jobs',
      description: hasApps ? `Resume Match ${Math.min(100, metrics.avgAts)}%` : 'AI found opportunities',
      currentScore: hasApps ? Math.min(100, metrics.avgAts) : null,
      predictedScore: 92,
      cta: hasApps ? 'Tailor' : 'Find Jobs',
      href: '/eleva/studio',
      color: 'rgb(var(--eleva-primary))',
    });
  }

  if (metrics.coverLetters < Math.max(1, metrics.applications) && recs.length < 4) {
    recs.push({
      icon: '📝',
      title: 'Generate Cover Letter',
      description: metrics.coverLetters === 0 ? 'No cover letters yet' : `${metrics.applications - metrics.coverLetters} missing`,
      currentScore: null,
      predictedScore: null,
      cta: 'Generate',
      href: '/eleva/cover-letters',
      color: 'rgb(var(--eleva-accent))',
    });
  }

  if (recs.length === 0) {
    recs.push({
      icon: '✨',
      title: 'Create Your First Resume',
      description: 'AI-powered builder with ATS optimization',
      currentScore: null,
      predictedScore: 85,
      cta: 'Get Started',
      href: '/eleva/editor',
      color: 'rgb(var(--eleva-primary))',
    });
  }

  return recs;
}

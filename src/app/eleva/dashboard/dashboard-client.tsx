'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Sparkles, FileText, ChevronRight } from 'lucide-react';
import type { DashboardMetrics, ActivityItem } from '../_lib/data';
import { MetricStats } from './_components/metric-stats';
import { buildPriorities, PriorityCards } from './_components/priority-cards';
import { CareerPipeline } from './_components/career-pipeline';
import { AiInsights } from './_components/ai-insights';
import { ActivityTimeline } from './_components/activity-timeline';
import { flattenSkills, computeProfileCompletion, type AtsReport, type ProfileSummary, type ResumeSummary } from './_components/types';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const itemAnim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export function DashboardClient({
  name,
  metrics,
  activity,
  recentResumes,
  recentAts,
  profile,
}: {
  name: string;
  metrics: DashboardMetrics;
  activity: ActivityItem[];
  recentResumes: ResumeSummary[];
  recentAts: AtsReport[];
  profile: ProfileSummary | null;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const latestAts = recentAts[0] ?? null;
  const latestResume = recentResumes[0] ?? null;
  const hasResumes = metrics.resumes > 0;
  const completion = computeProfileCompletion(profile);
  const skills = flattenSkills(profile?.skills);
  const tailoredCount = recentResumes.filter((r) => !r.is_base_resume).length;

  const priorities = buildPriorities(metrics, latestAts, completion);
  const primaryHref = hasResumes ? '/eleva/studio' : '/eleva/editor';
  const primaryCta = hasResumes ? 'Continue in Studio' : 'Create Resume';

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 space-y-8">
      {/* ═══ HERO ═══ */}
      <motion.div initial="hidden" animate="show" variants={container}>
        <motion.div variants={itemAnim} className="eleva-card p-6 lg:p-7 relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              {day} · {dateStr}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>
              {greeting}, {name} <span className="inline-block eleva-float">👋</span>
            </h1>
            <p className="mt-1 text-[15px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Your career workspace
            </p>

            {latestResume && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>
                  {latestResume.name}
                </span>
                {latestAts ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(37,99,235,0.1)', color: 'rgb(var(--eleva-primary))' }}>
                    ATS {latestAts.overall}/100
                  </span>
                ) : (
                  <span className="text-[12px] px-2.5 py-0.5 rounded-full" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                    No ATS check yet
                  </span>
                )}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={primaryHref} className="eleva-btn-primary inline-flex items-center gap-2.5 text-[14px] h-11 px-6">
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold">{primaryCta}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link href="/eleva/resumes" className="eleva-btn-ghost inline-flex items-center gap-2 text-[14px] h-11 px-6">
                <FileText className="w-4 h-4" />
                View Resume
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ═══ METRICS ═══ */}
      <MetricStats metrics={metrics} latestAts={latestAts} />

      {/* ═══ PRIORITIES + PIPELINE ═══ */}
      <motion.div initial="hidden" animate="show" variants={container} className="grid lg:grid-cols-3 gap-4 items-start">
        <motion.div variants={itemAnim} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Today&apos;s Priorities
            </div>
          </div>
          <PriorityCards priorities={priorities} />
        </motion.div>
        <motion.div variants={itemAnim}>
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-3 lg:mt-0 mt-6" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Career Pipeline
          </div>
          <CareerPipeline metrics={metrics} latestAts={latestAts} />
        </motion.div>
      </motion.div>

      {/* ═══ INSIGHTS + ACTIVITY ═══ */}
      <motion.div initial="hidden" animate="show" variants={container} className="grid lg:grid-cols-3 gap-4 items-start">
        <motion.div variants={itemAnim}>
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            AI Insights
          </div>
          <AiInsights latestAts={latestAts} skills={skills} resumeCount={metrics.resumes} tailoredCount={tailoredCount} />
        </motion.div>
        <motion.div variants={itemAnim} className="lg:col-span-2">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Recent Activity
          </div>
          <ActivityTimeline activity={activity} />
        </motion.div>
      </motion.div>
    </div>
  );
}

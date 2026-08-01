'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FileText, Target, UserCircle, BriefcaseBusiness, FolderCheck, ArrowRight } from 'lucide-react';
import type { DashboardMetrics } from '../../_lib/data';
import type { AtsReport } from './types';

type Priority = {
  icon: typeof Target;
  title: string;
  description: string;
  cta: string;
  href: string;
  color: string;
};

export function buildPriorities(metrics: DashboardMetrics, latestAts: AtsReport | null, completion: { pct: number; missing: string[] }): Priority[] {
  const hasResumes = metrics.resumes > 0;
  const out: Priority[] = [];

  if (!hasResumes) {
    out.push({
      icon: FileText,
      title: 'Create your first resume',
      description: 'Your workspace is ready. Add a resume to start tailoring and ATS checks.',
      cta: 'Create Resume',
      href: '/eleva/editor',
      color: 'rgb(var(--eleva-primary))',
    });
  } else if (!latestAts) {
    out.push({
      icon: Target,
      title: 'Run your first ATS check',
      description: 'See how your resume performs against ATS parsers and job keywords.',
      cta: 'Run ATS Check',
      href: '/eleva/ats',
      color: 'rgb(var(--eleva-primary))',
    });
  } else if (latestAts.overall < 80) {
    const parts = [`Score ${latestAts.overall}/100`, `Keyword match ${latestAts.keyword}%`, `Formatting ${latestAts.formatting}%`];
    out.push({
      icon: Target,
      title: 'Improve ATS match',
      description: parts.join(' · '),
      cta: 'Optimize Resume',
      href: '/eleva/studio',
      color: 'rgb(var(--eleva-warning))',
    });
  }

  if (completion.pct < 100) {
    const missing = completion.missing.length ? `Missing: ${completion.missing.join(', ')}` : 'A complete profile strengthens every tailored resume.';
    out.push({
      icon: UserCircle,
      title: 'Complete career profile',
      description: `${completion.pct}% complete · ${missing}`,
      cta: 'Complete Profile',
      href: '/eleva/career',
      color: 'rgb(var(--eleva-secondary))',
    });
  }

  if (out.length < 2 && metrics.applications === 0) {
    out.push({
      icon: BriefcaseBusiness,
      title: 'Log your first application',
      description: 'Track applications and interviews so your pipeline builds itself.',
      cta: 'Add Application',
      href: '/eleva/applications',
      color: 'rgb(var(--eleva-accent))',
    });
  }

  if (out.length === 0) {
    out.push({
      icon: FolderCheck,
      title: 'You\u2019re all caught up',
      description: 'Everything looks current. Review your resumes or dig into analytics.',
      cta: 'Review Resumes',
      href: '/eleva/resumes',
      color: 'rgb(var(--eleva-success))',
    });
  }

  return out.slice(0, 2);
}

export function PriorityCards({ priorities }: { priorities: Priority[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {priorities.map((p, i) => {
        const Icon = p.icon;
        return (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.06, duration: 0.4 }}
            className="rounded-xl p-5 flex flex-col"
            style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${p.color}14`, color: p.color }}>
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </div>
              <div className="text-[15px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{p.title}</div>
            </div>
            <p className="text-[13px] leading-relaxed flex-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              {p.description}
            </p>
            <Link
              href={p.href}
              className="mt-4 inline-flex items-center gap-1.5 self-start text-[13px] font-medium px-4 h-9 rounded-lg transition-all"
              style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}
            >
              {p.cta}
              <ArrowRight className="w-3.5 h-3.5" style={{ color: p.color }} />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

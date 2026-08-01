'use client';

import { motion } from 'framer-motion';
import { Check, FileText, Gauge, Send, PhoneCall, Award } from 'lucide-react';
import type { DashboardMetrics } from '../../_lib/data';
import { getOffers, getResponseRate, type AtsReport } from './types';

type Step = {
  label: string;
  value: number;
  suffix?: string;
  done: boolean;
  icon: typeof FileText;
};

export function CareerPipeline({ metrics, latestAts }: { metrics: DashboardMetrics; latestAts: AtsReport | null }) {
  const ats = latestAts?.overall ?? 0;
  const offers = getOffers(metrics);
  const responseRate = getResponseRate(metrics);

  const steps: Step[] = [
    { label: 'Resume Ready', value: metrics.resumes, done: metrics.resumes > 0, icon: FileText },
    { label: 'ATS Score', value: ats, suffix: '/100', done: ats >= 70, icon: Gauge },
    { label: 'Applied', value: metrics.applications, done: metrics.applications > 0, icon: Send },
    { label: 'Interview', value: metrics.interviews, done: metrics.interviews > 0, icon: PhoneCall },
    { label: 'Offer', value: offers, done: offers > 0, icon: Award },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="rounded-xl p-5" style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[15px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Career Pipeline</div>
        <span className="text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{doneCount}/5</span>
      </div>

      <div className="flex items-start gap-1">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05, duration: 0.35 }}
              className="flex-1 min-w-0"
            >
              <div className="flex flex-col items-center text-center px-1">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center mb-2 border"
                  style={{
                    background: s.done ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-muted))',
                    borderColor: s.done ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-border))',
                    color: s.done ? '#fff' : 'rgb(var(--eleva-muted-fg))',
                  }}
                >
                  {s.done ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Icon className="w-4 h-4" strokeWidth={1.75} />}
                </div>
                <div className="text-[11px] font-medium leading-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>
                  {s.label}
                </div>
                <div className="text-[12px] font-mono mt-0.5" style={{ color: s.done ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-muted-fg))' }}>
                  {s.value}
                  {s.suffix}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 pt-3.5 border-t text-[12px]" style={{ borderColor: 'rgb(var(--eleva-border))', color: 'rgb(var(--eleva-muted-fg))' }}>
        {metrics.applications} Applications
        <span className="mx-2" style={{ color: 'rgb(var(--eleva-border))' }}>·</span>
        {metrics.interviews} Interviews
        <span className="mx-2" style={{ color: 'rgb(var(--eleva-border))' }}>·</span>
        {responseRate}% response rate
      </div>
    </div>
  );
}

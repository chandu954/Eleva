'use client';

import { motion } from 'framer-motion';
import { Gauge, BriefcaseBusiness, PhoneCall, Award } from 'lucide-react';
import { CountUp } from '../../_components/count-up';
import type { DashboardMetrics } from '../../_lib/data';
import { getOffers, getResponseRate, type AtsReport } from './types';

type Metric = {
  label: string;
  value: number;
  sub: string;
  icon: typeof Gauge;
  color: string;
  suffix?: string;
};

function deltaLabel(delta: number, unit: string, none: string): string {
  if (delta > 0) return `+${delta} ${unit}`;
  if (delta < 0) return `${delta} ${unit}`;
  return none;
}

export function MetricStats({ metrics, latestAts }: { metrics: DashboardMetrics; latestAts: AtsReport | null }) {
  const appsThisWeek = metrics.applicationsTrend.length >= 2
    ? metrics.applicationsTrend[metrics.applicationsTrend.length - 1] - metrics.applicationsTrend[0]
    : 0;
  const offers = getOffers(metrics);
  const responseRate = getResponseRate(metrics);

  const metricsList: Metric[] = [
    {
      label: 'ATS Score',
      value: latestAts?.overall ?? 0,
      suffix: '/ 100',
      sub: latestAts
        ? deltaLabel(metrics.atsDelta, 'in 30 days', 'No change in 30 days')
        : 'No ATS checks yet',
      icon: Gauge,
      color: 'rgb(var(--eleva-primary))',
    },
    {
      label: 'Applications',
      value: metrics.applications,
      sub: deltaLabel(appsThisWeek, 'this week', 'No applications this week'),
      icon: BriefcaseBusiness,
      color: 'rgb(var(--eleva-secondary))',
    },
    {
      label: 'Interviews',
      value: metrics.interviews,
      sub: responseRate > 0 ? `${responseRate}% response rate` : 'No interviews yet',
      icon: PhoneCall,
      color: 'rgb(var(--eleva-accent))',
    },
    {
      label: 'Offers',
      value: offers,
      sub: offers > 0 ? 'Keep it going' : 'No offers yet',
      icon: Award,
      color: 'rgb(var(--eleva-success))',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {metricsList.map((m, i) => {
        const Icon = m.icon;
        const isAts = m.label === 'ATS Score';
        return (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
            className="rounded-xl px-5 py-4"
            style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))' }}
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                {m.label}
              </div>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${m.color}14`, color: m.color }}
              >
                <Icon className="w-4 h-4" strokeWidth={1.75} />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="font-display text-3xl font-bold tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>
                {isAts && !latestAts ? '—' : <CountUp to={m.value} />}
              </span>
              {isAts && latestAts && (
                <span className="text-[12px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{m.suffix}</span>
              )}
            </div>
            <div className="text-[11px] mt-1 truncate" style={{ color: m.value > 0 ? 'rgb(var(--eleva-muted-fg))' : 'rgb(var(--eleva-muted-fg))' }}>
              {m.sub}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { FileText, Phone, Percent, Award } from 'lucide-react';
import { CountUp } from '../../_components/count-up';
import type { DashboardMetrics } from '../../_lib/data';

function fractionToPercent(n: number, d: number): number {
  if (!d) return 0;
  return Math.min(100, Math.round((n / d) * 100));
}

export function QuickStats({ metrics }: { metrics: DashboardMetrics }) {
  const apps = metrics.applications;
  const interviews = metrics.interviews;
  const responseRate = fractionToPercent(metrics.interviews, Math.max(1, metrics.applications));
  const offers = Object.entries(metrics.applicationsByStatus)
    .filter(([k]) => k === 'offer' || k === 'accepted')
    .reduce((s, [, v]) => s + v, 0);

  const stats = [
    { icon: FileText, label: 'Applications Sent', value: apps, color: 'rgb(var(--eleva-primary))' },
    { icon: Phone, label: 'Interviews', value: interviews, color: 'rgb(var(--eleva-accent))' },
    { icon: Percent, label: 'Response Rate', value: responseRate, suffix: '%', color: 'rgb(var(--eleva-secondary))' },
    { icon: Award, label: 'Offers', value: offers, color: 'rgb(var(--eleva-success))' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-3"
    >
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.06 }}
            className="rounded-xl px-4 py-3.5 flex items-center gap-3"
            style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `rgba(${s.color.match(/\d+/g)?.slice(0, 3).join(',')}, 0.1)` }}
            >
              <Icon className="w-4 h-4" style={{ color: s.color }} strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-lg font-semibold font-display tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>
                <CountUp to={s.value} />
                {s.suffix}
              </div>
              <div className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{s.label}</div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

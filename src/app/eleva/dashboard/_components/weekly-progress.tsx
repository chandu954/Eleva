'use client';

import { motion } from 'framer-motion';
import type { DashboardMetrics } from '../../_lib/data';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function currentWeekProductivity(metrics: DashboardMetrics): number[] {
  const raw = metrics.weeklyProductivity;
  if (raw.length >= 7) return raw.slice(-7);
  const padded = new Array(7).fill(0);
  for (let i = 0; i < raw.length; i++) padded[padded.length - raw.length + i] = raw[i];
  return padded;
}

export function WeeklyProgress({ metrics }: { metrics: DashboardMetrics }) {
  const data = currentWeekProductivity(metrics);
  const max = Math.max(...data, 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[12px] font-medium tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>
          Weekly Progress
        </div>
        <div className="text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
          {data.reduce((a, b) => a + b, 0)} actions
        </div>
      </div>
      <div className="flex items-end gap-2 h-24">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(v / max) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.06, ease: 'easeOut' }}
              className="w-full rounded-md relative group"
              style={{
                background: v > 0
                  ? 'linear-gradient(180deg, rgb(var(--eleva-primary)), rgb(var(--eleva-accent)))'
                  : 'rgb(var(--eleva-muted))',
                opacity: v > 0 ? 0.85 : 0.4,
                minHeight: v > 0 ? 4 : 0,
              }}
            >
              {v > 0 && (
                <div
                  className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'rgb(var(--eleva-primary))' }}
                >
                  {v}
                </div>
              )}
            </motion.div>
            <span className="text-[9px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{DAYS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

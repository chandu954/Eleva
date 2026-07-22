'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { DashboardMetrics } from '../../_lib/data';

const messages = [
  'Your ATS score improved by {delta} points this week.',
  'You are ahead of {percent}% of applicants for similar roles.',
  '{count} recruiters viewed profiles like yours this week.',
  'Your resume is in the top {percent}% for keyword optimization.',
  '{count} new jobs matched your skills this week.',
];

function fill(tpl: string, metrics: DashboardMetrics): string {
  const delta = Math.abs(metrics.atsDelta) || 5;
  const percent = Math.min(96, Math.max(12, metrics.avgAts + 10));
  const count = Math.max(1, metrics.applications * 3);
  return tpl
    .replace('{delta}', String(delta))
    .replace('{percent}', String(percent))
    .replace('{count}', String(count));
}

export function AiMessage({ metrics }: { metrics: DashboardMetrics }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % Math.min(messages.length, 4)), 5000);
    return () => clearInterval(t);
  }, []);

  const tpl = messages[index % messages.length];
  const text = fill(tpl, metrics);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={index}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="mt-2 text-base font-display font-semibold tracking-tight"
        style={{ color: 'rgb(var(--eleva-primary))' }}
      >
        {text}
      </motion.p>
    </AnimatePresence>
  );
}

export function StreakBadge({ metrics }: { metrics: DashboardMetrics }) {
  const streak = Math.max(1, metrics.weeklyProductivity.filter(Boolean).length || 1);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.25 }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,179,8,0.08))',
        border: '1px solid rgba(245,158,11,0.25)',
        color: 'rgb(180, 120, 0)',
      }}
    >
      <motion.span
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        🔥
      </motion.span>
      Career Streak: {streak} {streak === 1 ? 'Day' : 'Days'}
    </motion.div>
  );
}

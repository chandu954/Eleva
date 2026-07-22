'use client';

import { motion } from 'framer-motion';
import { Zap, Clock, TrendingUp } from 'lucide-react';

interface RecommendationCardData {
  icon: string;
  title: string;
  description: string;
  currentScore: number | null;
  predictedScore: number | null;
  cta: string;
  href: string;
  color: string;
}

const estimatedTimes = ['2 min', '5 min', '8 min', '3 min'];

function getImpact(score: number | null): { label: string; color: string; index: number } {
  if (score === null) return { label: 'High Impact', color: 'rgb(var(--eleva-primary))', index: 2 };
  if (score >= 90) return { label: 'Very High Impact', color: 'rgb(var(--eleva-success))', index: 3 };
  if (score >= 70) return { label: 'High Impact', color: 'rgb(var(--eleva-primary))', index: 2 };
  if (score >= 40) return { label: 'Medium Impact', color: 'rgb(var(--eleva-warning))', index: 1 };
  return { label: 'Low Impact', color: 'rgb(var(--eleva-muted-fg))', index: 0 };
}

export function RecommendationCard({
  r,
  index: i,
  onClick,
}: {
  r: RecommendationCardData;
  index: number;
  onClick: () => void;
}) {
  const impact = getImpact(r.predictedScore);
  const time = estimatedTimes[i % estimatedTimes.length];
  const boost = r.currentScore !== null && r.predictedScore !== null ? r.predictedScore - r.currentScore : null;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0 },
      }}
      whileHover={{ y: -3 }}
      className="eleva-card p-5 relative overflow-hidden group cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
          {r.icon}
        </div>
        <TrendingUp className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
      </div>
      <h3 className="font-display text-base font-semibold tracking-tight mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>
        {r.title}
      </h3>
      <p className="text-[12px] mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
        {r.description}
      </p>

      {/* Impact + Time badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {boost !== null && boost > 0 && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full"
            style={{
              background: `rgba(${impact.color.match(/\d+/g)?.slice(0, 3).join(',') || '37,99,235'}, 0.1)`,
              color: impact.color,
            }}
          >
            <TrendingUp className="w-2.5 h-2.5" />
            +{boost} Score
          </span>
        )}
        <span
          className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full"
          style={{
            background: 'rgba(100,116,139,0.1)',
            color: 'rgb(var(--eleva-muted-fg))',
          }}
        >
          <Clock className="w-2.5 h-2.5" />
          {time}
        </span>
        <span
          className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full"
          style={{
            background: `rgba(${impact.color.match(/\d+/g)?.slice(0, 3).join(',') || '37,99,235'}, 0.1)`,
            color: impact.color,
          }}
        >
          {impact.label}
        </span>
      </div>

      {(r.currentScore !== null && r.predictedScore !== null) && (
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Current</span>
            <span style={{ color: r.color || 'rgb(var(--eleva-fg))' }}>{r.currentScore}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>AI predicts</span>
            <span style={{ color: 'rgb(var(--eleva-success))' }}>{r.predictedScore} <span className="text-[10px]">after optimization</span></span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${r.color || 'rgb(var(--eleva-muted-fg))'}, rgb(var(--eleva-success)))` }}
              initial={{ width: 0 }}
              animate={{ width: `${r.predictedScore}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
        </div>
      )}

      <div className="eleva-btn-primary text-[12px] inline-flex items-center gap-1.5 px-4 py-2">
        <Zap className="w-3 h-3" />{r.cta}
      </div>
    </motion.div>
  );
}

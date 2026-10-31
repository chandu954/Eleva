'use client';

import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart3, TrendingUp, TrendingDown, ArrowRight, Lightbulb } from 'lucide-react';
import type { JobScore } from '../_lib/studio-types';
import type { StudioPipelineSummary } from '../_lib/use-studio-pipeline';

interface ATSReportTabProps {
  scoreData: JobScore | null;
  rescoreData: JobScore | null;
  summary: StudioPipelineSummary | null;
}

export function ATSReportTab({ scoreData, rescoreData }: ATSReportTabProps) {
  if (!scoreData && !rescoreData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BarChart3 className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-[13px]">No ATS score available.</p>
        <p className="text-[11px] mt-1">Run the pipeline to score your resume.</p>
      </div>
    );
  }

const sd = scoreData ?? { overall: 0, keyword: 0, formatting: 0, readability: 0, impact: 0, recruiter: 0, matched: [], missing: [], suggestions: [] };
  const rd = rescoreData ?? { overall: 0, keyword: 0, formatting: 0, readability: 0, impact: 0, recruiter: 0, matched: [], missing: [], suggestions: [] };

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="max-w-[650px] mx-auto space-y-6">
        {/* Before/After */}
        <div className="grid grid-cols-2 gap-4">
          {(['overall', 'keyword', 'formatting', 'readability', 'impact', 'recruiter'] as const).map((metric) => {
            const before = Number(sd[metric] ?? 0);
            const after = Number(rd[metric] ?? 0);
            const diff = after - before;
            const pct = before > 0 ? Math.round((after - before) / before * 100) : after > 0 ? 100 : 0;
            return (
              <div key={metric} className="p-4 rounded-xl" style={{ background: 'rgba(var(--eleva-card), 0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgb(var(--eleva-border))' }}>
                                <div className="text-[10px] font-mono uppercase mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{metric.replace(/_/g, ' ')}</div>
                                <div className="flex items-baseline gap-2">
                                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{before}%</motion.span>
                                  <ArrowRight className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                                  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="font-display text-2xl font-bold" style={{ color: diff >= 0 ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-danger))' }}>{after}%</motion.span>
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  {diff >= 0 ? <TrendingUp className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /> : <TrendingDown className="w-3 h-3" style={{ color: 'rgb(var(--eleva-danger))' }} />}
                                  <span className="text-[11px] font-semibold" style={{ color: diff >= 0 ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-danger))' }}>
                                    {diff >= 0 ? '+' : ''}{diff} ({pct >= 0 ? '+' : ''}{pct}%)
                                  </span>
                                </div>
                                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, after)}%`, background: after >= 80 ? 'rgb(var(--eleva-success))' : after >= 60 ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-danger))', transition: 'width 0.8s ease-out' }} />
                                </div>
                              </div>
                            );
          })}
        </div>

        {/* Matched vs Missing */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl" style={{ background: 'rgba(var(--eleva-success-rgb), 0.06)', border: '1px solid rgba(var(--eleva-success-rgb), 0.15)' }}>
            <h4 className="text-[10px] font-mono uppercase mb-2" style={{ color: 'rgb(var(--eleva-success))' }}>Matched Keywords</h4>
            <div className="font-display text-2xl font-bold mb-2" style={{ color: 'rgb(var(--eleva-success))' }}>{(rd.matched ?? []).length}</div>
            <div className="flex flex-wrap gap-1">
              {(rd.matched ?? []).slice(0, 15).map((k: string) => (
                <span key={k} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(var(--eleva-success-rgb), 0.1)', color: 'rgb(var(--eleva-success))' }}>{k}</span>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'rgba(var(--eleva-danger-rgb), 0.06)', border: '1px solid rgba(var(--eleva-danger-rgb), 0.15)' }}>
            <h4 className="text-[10px] font-mono uppercase mb-2" style={{ color: 'rgb(var(--eleva-danger))' }}>Missing Keywords</h4>
            <div className="font-display text-2xl font-bold mb-2" style={{ color: 'rgb(var(--eleva-danger))' }}>{(rd.missing ?? []).length}</div>
            <div className="flex flex-wrap gap-1">
              {(rd.missing ?? []).slice(0, 15).map((k: string) => (
                <span key={k} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(var(--eleva-danger-rgb), 0.1)', color: 'rgb(var(--eleva-danger))' }}>{k}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Suggestions */}
        {(rd.suggestions ?? []).length > 0 && (
          <div className="p-4 rounded-xl" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.04)', border: '1px solid rgb(var(--eleva-border))' }}>
            <h4 className="text-[10px] font-mono uppercase mb-2" style={{ color: 'rgb(var(--eleva-primary))' }}>Recommendations</h4>
            <div className="space-y-2">
              {rd.suggestions.map((sg, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                  <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: sg.type === 'success' ? 'rgb(var(--eleva-success))' : sg.type === 'warning' ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-primary))' }} />
                  <div className="flex-1">
                    <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-fg))' }}>{sg.text}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{sg.action}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

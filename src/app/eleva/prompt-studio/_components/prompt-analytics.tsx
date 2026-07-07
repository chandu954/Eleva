'use client';

import { motion } from 'framer-motion';
import {
  BarChart3,
  Clock,
  Coins,
  Zap,
  CheckCircle2,
  XCircle,
  Calendar,
} from 'lucide-react';
import type { PromptAnalytics as PromptAnalyticsType, AIPrompt } from '../types';

export function PromptAnalytics({
  analytics,
  prompt,
}: {
  analytics: PromptAnalyticsType;
  prompt: AIPrompt;
}) {
  const metrics = [
    { icon: BarChart3, label: 'Executions', value: analytics.executions.toLocaleString(), color: 'rgb(var(--eleva-primary))' },
    { icon: CheckCircle2, label: 'Success Rate', value: `${analytics.successRate}%`, color: 'rgb(var(--eleva-success))' },
    { icon: XCircle, label: 'Failure Rate', value: `${analytics.failureRate}%`, color: analytics.failureRate > 10 ? '#ef4444' : 'rgb(var(--eleva-muted-fg))' },
    { icon: Zap, label: 'Avg Tokens', value: analytics.avgTokens.toLocaleString(), color: 'rgb(var(--eleva-warning))' },
    { icon: Clock, label: 'Avg Latency', value: `${analytics.avgLatency}ms`, color: 'rgb(var(--eleva-muted-fg))' },
    { icon: Coins, label: 'Avg Cost', value: `$${analytics.avgCost.toFixed(6)}`, color: 'rgb(var(--eleva-muted-fg))' },
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="font-display text-xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Prompt Analytics</h2>
          <p className="text-[13px] mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Performance metrics for &ldquo;{prompt.title}&rdquo; (last 30 days)
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {metrics.map((m) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl"
              style={{ background: 'rgb(var(--eleva-muted))' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <m.icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  {m.label}
                </span>
              </div>
              <div className="font-display text-2xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>
                {m.value}
              </div>
            </motion.div>
          ))}
        </div>

        {analytics.lastUsed && (
          <div className="flex items-center gap-2 text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            <Calendar className="w-3.5 h-3.5" />
            Last used: {new Date(analytics.lastUsed).toLocaleDateString('en-US', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {analytics.dailyUsage.length > 0 && (
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Daily Usage
            </div>
            <div className="rounded-xl p-4 border" style={{ background: 'rgb(var(--eleva-card))', borderColor: 'rgb(var(--eleva-border))' }}>
              <BarChart data={analytics.dailyUsage.map((d) => ({ label: d.date.slice(5), value: d.count }))} />
            </div>
          </div>
        )}

        {analytics.weeklyUsage.length > 0 && (
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Weekly Usage
            </div>
            <div className="rounded-xl p-4 border" style={{ background: 'rgb(var(--eleva-card))', borderColor: 'rgb(var(--eleva-border))' }}>
              <BarChart data={analytics.weeklyUsage.map((w) => ({ label: w.week, value: w.count }))} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((d, i) => {
        const height = (d.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: `${Math.max(height || 2, 2)}%`,
                background: 'linear-gradient(180deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))',
                opacity: d.value > 0 ? 1 : 0.3,
              }}
            />
            <span className="text-[8px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

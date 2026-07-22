'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, Lightbulb, Target } from 'lucide-react';

const ROLE_KEYWORDS: Record<string, string[]> = {
  engineer: [
    'React', 'TypeScript', 'Node.js', 'API', 'System Design', 'Microservices', 'AWS', 'Docker',
    'CI/CD', 'Testing', 'Performance', 'Scalability', 'REST', 'GraphQL', 'PostgreSQL', 'MongoDB',
    'Agile', 'Git', 'TDD', 'Kubernetes', 'Redis', 'Event-Driven', 'Observability', 'Monitoring',
  ],
  'product manager': [
    'Roadmap', 'Stakeholder', 'Cross-functional', 'A/B Testing', 'User Research', 'Analytics',
    'OKRs', 'Sprint', 'Backlog', 'KPI', 'Retrospective', 'MVP', 'GTM', 'Data-Driven',
    'Customer Development', 'PRD', 'Competitive Analysis', 'Agile', 'Wireframes', 'SQL',
  ],
  designer: [
    'Figma', 'User Research', 'Prototyping', 'Wireframes', 'Design System', 'Accessibility',
    'Usability Testing', 'Interaction Design', 'Visual Design', 'Information Architecture',
    'Responsive', 'Motion Design', 'Design Thinking', 'Typography', 'Color Theory',
  ],
  developer: [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'API', 'Git', 'Testing', 'CI/CD',
    'Database', 'SQL', 'REST', 'GraphQL', 'Docker', 'Cloud', 'Agile', 'Debugging',
  ],
  data: [
    'Python', 'SQL', 'Machine Learning', 'Statistics', 'Data Pipeline', 'ETL', 'Airflow',
    'Spark', 'Tableau', 'Power BI', 'A/B Testing', 'Regression', 'Classification',
    'Deep Learning', 'NLP', 'Feature Engineering', 'Model Deployment',
  ],
  'machine learning': [
    'PyTorch', 'TensorFlow', 'Transformer', 'Computer Vision', 'NLP', 'Reinforcement Learning',
    'MLOps', 'Model Serving', 'Hyperparameter Tuning', 'Evaluation', 'Data Augmentation',
    'Attention', 'Embeddings', 'RAG', 'Fine-Tuning', 'Inference Optimization',
  ],
};

function inferRoleKeywords(role: string): string[] {
  const r = role.toLowerCase();
  for (const [key, words] of Object.entries(ROLE_KEYWORDS)) {
    if (r.includes(key)) return words;
  }
  return ROLE_KEYWORDS.engineer;
}

function extractText(data: any): string {
  const parts: string[] = [];
  if (data.summary) parts.push(data.summary);
  data.experience?.forEach((e: any) => {
    e.bullets?.forEach((b: any) => parts.push(b.text));
  });
  data.skills?.forEach((c: any) => parts.push(c.items.join(' ')));
  data.projects?.forEach((p: any) => parts.push(p.description || ''));
  return parts.join(' ');
}

export function KeywordHeatmap({ data, role: targetRole }: { data: any; role?: string }) {
  const [showAll, setShowAll] = useState(false);
  const keywords = inferRoleKeywords(targetRole || data.role || 'engineer');
  const text = extractText(data).toLowerCase();

  const results = keywords.map((kw) => ({
    keyword: kw,
    matched: text.includes(kw.toLowerCase()),
    count: (text.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length,
  }));

  const matched = results.filter((r) => r.matched);
  const missing = results.filter((r) => !r.matched);
  const coverage = Math.round((matched.length / keywords.length) * 100);

  const displayed = showAll ? results : [...matched, ...missing.slice(0, 8)];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} />
          <span className="text-[13px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Keyword Match</span>
        </div>
        <span className="font-display text-2xl font-bold" style={{ color: coverage >= 70 ? 'rgb(var(--eleva-success))' : coverage >= 40 ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-danger))' }}>
          {coverage}%
        </span>
      </div>

      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: coverage >= 70 ? 'rgb(var(--eleva-success))' : coverage >= 40 ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-danger))' }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, coverage)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <div className="flex items-center gap-3 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: 'rgb(var(--eleva-success))' }} />
          Matched ({matched.length})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: 'rgb(var(--eleva-muted-fg))', opacity: 0.4 }} />
          Missing ({missing.length})
        </span>
      </div>

      {missing.length > 0 && (
        <div className="rounded-lg p-2.5 flex items-start gap-2" style={{ background: 'rgba(var(--eleva-warning-rgb), 0.08)' }}>
          <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'rgb(var(--eleva-warning))' }} />
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            {missing.length} keyword{missing.length > 1 ? 's' : ''} missing. Add relevant terms to improve ATS matching.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {displayed.map((r, i) => (
          <motion.span
            key={r.keyword}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02 }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-medium cursor-default"
            style={{
              background: r.matched
                ? 'rgba(var(--eleva-success-rgb), 0.12)'
                : 'rgba(var(--eleva-muted-fg-rgb), 0.08)',
              color: r.matched
                ? 'rgb(var(--eleva-success))'
                : 'rgb(var(--eleva-muted-fg))',
            }}
            title={r.matched ? `${r.count} occurrence${r.count > 1 ? 's' : ''}` : 'Not found'}
          >
            {r.matched ? (
              <Check className="w-2.5 h-2.5" />
            ) : (
              <Plus className="w-2.5 h-2.5" />
            )}
            {r.keyword}
            {r.matched && r.count > 1 && (
              <span className="text-[10px] opacity-60">x{r.count}</span>
            )}
          </motion.span>
        ))}
      </div>

      {results.length > 12 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200"
          style={{
            background: 'rgb(var(--eleva-muted))',
            color: 'rgb(var(--eleva-muted-fg))',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          {showAll ? `Show fewer` : `Show all ${results.length} keywords`}
        </button>
      )}
    </motion.div>
  );
}

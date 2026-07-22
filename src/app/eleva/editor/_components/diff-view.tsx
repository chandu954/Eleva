'use client';

import { useMemo } from 'react';

function words(s: string): string[] {
  return s.split(/(\s+)/);
}

function computeDiff(a: string, b: string) {
  const wa = words(a);
  const wb = words(b);
  const m = wa.length;
  const n = wb.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (wa[i - 1] === wb[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const removed: number[] = [];
  const added: number[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && wa[i - 1] === wb[j - 1]) {
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      added.unshift(j - 1);
      j--;
    } else {
      removed.unshift(i - 1);
      i--;
    }
  }

  const inAdded = new Set(added);
  const inRemoved = new Set(removed);

  const oldParts = wa.map((w, idx) => ({ text: w, type: inRemoved.has(idx) ? 'removed' as const : 'unchanged' as const }));
  const newParts = wb.map((w, idx) => ({ text: w, type: inAdded.has(idx) ? 'added' as const : 'unchanged' as const }));

  return { oldParts, newParts };
}

export function DiffView({ original, suggestion }: { original: string; suggestion: string }) {
  const diff = useMemo(() => computeDiff(original, suggestion), [original, suggestion]);

  return (
    <div className="space-y-3 text-[13px] leading-relaxed">
      {/* Before */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Before</div>
        <div className="p-2.5 rounded-lg" style={{ background: 'rgba(var(--eleva-danger-rgb), 0.06)' }}>
          {diff.oldParts.map((p, i) => (
            <span
              key={i}
              style={p.type === 'removed' ? {
                background: 'rgba(239,68,68,0.2)',
                color: 'rgb(239,68,68)',
                textDecoration: 'line-through',
                borderRadius: 3,
                padding: '0 2px',
              } : { color: 'rgb(var(--eleva-fg))' }}
            >{p.text}</span>
          ))}
        </div>
      </div>

      {/* After */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>After</div>
        <div className="p-2.5 rounded-lg" style={{ background: 'rgba(var(--eleva-success-rgb), 0.06)' }}>
          {diff.newParts.map((p, i) => (
            <span
              key={i}
              style={p.type === 'added' ? {
                background: 'rgba(39,174,96,0.2)',
                color: 'rgb(39,174,96)',
                borderRadius: 3,
                padding: '0 2px',
              } : { color: 'rgb(var(--eleva-fg))' }}
            >{p.text}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

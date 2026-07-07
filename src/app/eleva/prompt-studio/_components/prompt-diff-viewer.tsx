'use client';

import { useMemo } from 'react';
import { X, ArrowLeft, Plus, Minus } from 'lucide-react';

function computeDiff(oldText: string, newText: string) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const maxLen = Math.max(oldLines.length, newLines.length);
  const lines: { type: 'same' | 'added' | 'removed'; old?: string; new?: string }[] = [];

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    if (oldLine === newLine) {
      lines.push({ type: 'same', old: oldLine, new: newLine });
    } else {
      if (oldLine !== undefined) lines.push({ type: 'removed', old: oldLine });
      if (newLine !== undefined) lines.push({ type: 'added', new: newLine });
    }
  }

  return lines;
}

export function PromptDiffViewer({
  oldText,
  newText,
  onClose,
}: {
  oldText: string;
  newText: string;
  onClose: () => void;
}) {
  const diffs = useMemo(() => computeDiff(oldText, newText), [oldText, newText]);

  const added = diffs.filter((d) => d.type === 'added').length;
  const removed = diffs.filter((d) => d.type === 'removed').length;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[rgb(var(--eleva-muted))]">
              <ArrowLeft className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
            </button>
            <div>
              <h2 className="font-display text-xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Diff View</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-[12px]" style={{ color: '#ef4444' }}>
                  <Minus className="w-3 h-3" /> {removed} removed
                </span>
                <span className="flex items-center gap-1 text-[12px]" style={{ color: '#22c55e' }}>
                  <Plus className="w-3 h-3" /> {added} added
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[rgb(var(--eleva-muted))]">
            <X className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
          </button>
        </div>

        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
          <div className="grid grid-cols-2" style={{ borderBottom: '1px solid rgb(var(--eleva-border))' }}>
            <div className="p-3 text-[10px] font-mono uppercase tracking-wider bg-[rgb(var(--eleva-muted))] text-center" style={{ color: 'rgb(var(--eleva-muted-fg))', borderRight: '1px solid rgb(var(--eleva-border))' }}>Old</div>
            <div className="p-3 text-[10px] font-mono uppercase tracking-wider bg-[rgb(var(--eleva-muted))] text-center" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>New</div>
          </div>
          <div className="grid grid-cols-2 text-[12px] font-mono leading-relaxed">
            <div>
              {diffs.map((d, i) => (
                <div
                  key={i}
                  className="px-4 py-1 whitespace-pre-wrap"
                  style={{
                    background: d.type === 'removed' ? 'rgba(239,68,68,0.08)' : d.type === 'added' && !d.old ? 'rgba(34,197,94,0.08)' : 'transparent',
                    color: d.type === 'removed' ? '#ef4444' : 'rgb(var(--eleva-fg))',
                    borderRight: '1px solid rgb(var(--eleva-border))',
                  }}
                >
                  {d.old !== undefined ? d.old : ''}
                </div>
              ))}
            </div>
            <div>
              {diffs.map((d, i) => (
                <div
                  key={i}
                  className="px-4 py-1 whitespace-pre-wrap"
                  style={{
                    background: d.type === 'added' ? 'rgba(34,197,94,0.08)' : 'transparent',
                    color: d.type === 'added' ? '#22c55e' : 'rgb(var(--eleva-fg))',
                  }}
                >
                  {d.new !== undefined ? d.new : ''}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

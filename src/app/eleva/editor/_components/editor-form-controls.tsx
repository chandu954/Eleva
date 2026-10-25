'use client';

/*
 * Small editor form controls (section AI toolbar, chip-pair inputs).
 * Extracted from page.tsx to keep the page render-focused.
 */

import { useState } from 'react';
import { BarChart3, Expand, Loader2, Shrink, Sparkles, SpellCheck } from 'lucide-react';

export function SectionToolbar({ text, onAction, processingAction }: { text: string; onAction: (action: string) => void; processingAction: string | null }) {
  const actions: { id: string; label: string; icon: typeof Sparkles }[] = [
    { id: 'rewrite', label: 'Rewrite', icon: Sparkles },
    { id: 'shorten', label: 'Shorten', icon: Shrink },
    { id: 'metric', label: 'Add Metric', icon: BarChart3 },
    { id: 'grammar', label: 'Grammar', icon: SpellCheck },
    { id: 'ats', label: 'Improve ATS', icon: BarChart3 },
    { id: 'expand', label: 'Expand', icon: Expand },
  ];

  return (
    <div className="mt-3 flex items-center gap-1 h-8 px-2 rounded-lg flex-wrap" style={{ background: 'rgb(var(--eleva-muted))' }}>
      {actions.map((a) => {
        const Icon = a.icon;
        const busy = processingAction === a.id;
        return (
          <button
            key={a.id}
            onClick={() => onAction(a.id)}
            disabled={busy || !text.trim()}
            className="text-[11px] font-medium px-2 h-6 rounded-md hover:bg-[rgb(var(--eleva-card))] inline-flex items-center gap-1 disabled:opacity-40"
            style={{ color: 'rgb(var(--eleva-primary))' }}
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

export function SkillInput({ onAdd }: { onAdd: (item: string) => void }) {
  const [value, setValue] = useState('');
  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && value.trim()) {
      e.preventDefault();
      onAdd(value.trim());
      setValue('');
    }
  };
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKey}
      onBlur={() => { if (value.trim()) { onAdd(value.trim()); setValue(''); } }}
      className="text-[12px] px-2 py-1 rounded-full outline-none bg-transparent border border-dashed"
      style={{ borderColor: 'rgb(var(--eleva-border))', color: 'rgb(var(--eleva-muted-fg))', minWidth: 80 }}
      placeholder="Add skill..."
    />
  );
}

export function TechInput({ onAdd }: { onAdd: (tech: string) => void }) {
  const [value, setValue] = useState('');
  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && value.trim()) {
      e.preventDefault();
      onAdd(value.trim());
      setValue('');
    }
  };
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKey}
      onBlur={() => { if (value.trim()) { onAdd(value.trim()); setValue(''); } }}
      className="text-[11px] px-2 py-0.5 rounded-full outline-none bg-transparent border border-dashed"
      style={{ borderColor: 'rgb(var(--eleva-border))', color: 'rgb(var(--eleva-muted-fg))', minWidth: 70 }}
      placeholder="+ tech"
    />
  );
}

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Variable, Copy, Check } from 'lucide-react';
import type { PromptVariable } from '../types';

const BUILTIN_VARIABLES = [
  { name: 'resume', description: 'Full resume data' },
  { name: 'job_description', description: 'Target job description' },
  { name: 'skills', description: 'Skills list' },
  { name: 'experience', description: 'Work experience' },
  { name: 'projects', description: 'Project list' },
  { name: 'education', description: 'Education history' },
  { name: 'company', description: 'Target company name' },
  { name: 'role', description: 'Target role title' },
  { name: 'ats_score', description: 'ATS compatibility score' },
  { name: 'keywords', description: 'ATS keywords' },
  { name: 'language', description: 'Output language' },
  { name: 'tone', description: 'Desired tone' },
  { name: 'user_name', description: 'User display name' },
  { name: 'target_role', description: 'Target role for tailoring' },
  { name: 'years_experience', description: 'Years of experience' },
  { name: 'linkedin_profile', description: 'LinkedIn profile URL' },
  { name: 'github', description: 'GitHub profile URL' },
  { name: 'portfolio', description: 'Portfolio URL' },
  { name: 'certifications', description: 'Certifications list' },
  { name: 'today', description: 'Current date' },
  { name: 'current_year', description: 'Current year' },
  { name: 'industry', description: 'Target industry' },
];

export function VariablesPanel({
  onInsert,
  currentVariables,
}: {
  onInsert: (name: string) => void;
  currentVariables: PromptVariable[];
}) {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const allVars = [...currentVariables, ...BUILTIN_VARIABLES.filter((bv) => !currentVariables.some((cv) => cv.name === bv.name))];
  const filtered = search ? allVars.filter((v) => v.name.includes(search) || v.description?.includes(search)) : allVars;

  const handleCopy = (name: string) => {
    navigator.clipboard.writeText(`{{${name}}}`);
    setCopied(name);
    setTimeout(() => setCopied(null), 1000);
  };

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="border-l overflow-hidden shrink-0"
      style={{ borderColor: 'rgb(var(--eleva-border))', background: 'rgb(var(--eleva-card))' }}
    >
      <div className="p-4 border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Variables
          </span>
          <button onClick={() => onInsert('')} className="p-1 rounded-md hover:bg-[rgb(var(--eleva-muted))]">
            <X className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search variables..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md text-[12px] outline-none"
            style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}
          />
        </div>
      </div>

      <div className="overflow-y-auto p-2 space-y-1" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
        <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
          Custom
        </div>
        {currentVariables.length === 0 && (
          <div className="px-2 py-3 text-[12px] text-center" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            No custom variables defined
          </div>
        )}
        {currentVariables.map((v) => (
          <VariableRow key={v.name} name={v.name} description={v.description} onInsert={onInsert} copied={copied} onCopy={handleCopy} />
        ))}

        <div className="px-2 py-1 mt-3 text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
          Built-in
        </div>
        {filtered.filter((v) => !currentVariables.some((cv) => cv.name === v.name)).map((v) => (
          <VariableRow key={v.name} name={v.name} description={v.description} onInsert={onInsert} copied={copied} onCopy={handleCopy} />
        ))}
      </div>
    </motion.div>
  );
}

function VariableRow({ name, description, onInsert, copied, onCopy }: {
  name: string;
  description?: string;
  onInsert: (name: string) => void;
  copied: string | null;
  onCopy: (name: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onInsert(name)}
      onContextMenu={(e) => { e.preventDefault(); onCopy(name); }}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors hover:bg-[rgb(var(--eleva-muted))] group"
    >
      <Variable className="w-3 h-3 shrink-0" style={{ color: 'rgb(var(--eleva-primary))' }} />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-mono" style={{ color: 'rgb(var(--eleva-fg))' }}>{`{{${name}}}`}</div>
        {description && (
          <div className="text-[10px] truncate" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{description}</div>
        )}
      </div>
      {copied === name ? (
        <Check className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} />
      ) : (
        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
      )}
    </button>
  );
}

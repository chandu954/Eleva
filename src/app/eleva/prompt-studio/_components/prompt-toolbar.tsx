'use client';

import {
  Search,
  Plus,
  Save,
  Import,
  BarChart3,
  History,
  Eye,
  Code2,
  LayoutTemplate,
} from 'lucide-react';
import type { AIPrompt } from '../types';

type View = 'editor' | 'preview' | 'history' | 'analytics' | 'diff';

export function PromptToolbar({
  onSearch,
  searchQuery,
  onCreate,
  onTemplates,
  onImportExport,
  selectedPrompt,
  onViewChange,
  currentView,
}: {
  onSearch: (q: string) => void;
  searchQuery: string;
  onCreate: () => void;
  onTemplates: () => void;
  onImportExport: () => void;
  selectedPrompt: AIPrompt | null;
  onViewChange: (v: View) => void;
  currentView: View;
}) {
  const views: { id: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'editor', label: 'Editor', icon: Code2 },
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'history', label: 'History', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div
      className="h-14 px-4 border-b flex items-center justify-between gap-3 shrink-0"
      style={{ borderColor: 'rgb(var(--eleva-border))', background: 'rgb(var(--eleva-card))' }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {!selectedPrompt && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
            <input
              data-prompt-search
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search prompts... (⌘K)"
              className="w-full pl-9 pr-3 py-1.5 rounded-md text-[13px] outline-none"
              style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}
            />
          </div>
        )}
        {selectedPrompt && (
          <div className="flex items-center gap-2">
            {views.map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  onClick={() => onViewChange(v.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] transition-colors"
                  style={{
                    background: currentView === v.id ? 'rgb(var(--eleva-muted))' : 'transparent',
                    color: currentView === v.id ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {v.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onTemplates}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] hover:bg-[rgb(var(--eleva-muted))] transition-colors"
          style={{ color: 'rgb(var(--eleva-muted-fg))' }}
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          Templates
        </button>
        <button
          onClick={onImportExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] hover:bg-[rgb(var(--eleva-muted))] transition-colors"
          style={{ color: 'rgb(var(--eleva-muted-fg))' }}
        >
          <Import className="w-3.5 h-3.5" />
          Import/Export
        </button>

        {selectedPrompt && (
          <button
            onClick={() => {
              const form = document.getElementById('prompt-editor-form') as HTMLFormElement;
              if (form) form.requestSubmit();
            }}
            className="eleva-btn-primary text-[12px] flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
        )}

        <button
          onClick={onCreate}
          className="eleva-btn-primary text-[12px] flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          New Prompt
        </button>
      </div>
    </div>
  );
}



'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { AIPrompt, PromptCategory, PromptTag, PromptVersion, PromptAnalytics } from './types';
import { PromptSidebar } from './_components/prompt-sidebar';
import { PromptToolbar } from './_components/prompt-toolbar';
import { PromptCardGrid } from './_components/prompt-card-grid';
import { PromptEditor } from './_components/prompt-editor';
import { PromptPreview } from './_components/prompt-preview';
import { PromptHistory } from './_components/prompt-history';
import { PromptAnalytics as PromptAnalyticsView } from './_components/prompt-analytics';
import { PromptDiffViewer } from './_components/prompt-diff-viewer';
import { PromptImportExport } from './_components/prompt-import-export';
import { PromptTemplates } from './_components/prompt-templates';
import type { PromptTemplate } from './_components/prompt-templates';
import * as actions from './_lib/actions';

type View = 'editor' | 'preview' | 'history' | 'analytics' | 'diff';

export function PromptStudioClient({
  initialPrompts,
  categories,
  tags,
}: {
  initialPrompts: AIPrompt[];
  categories: PromptCategory[];
  tags: PromptTag[];
}) {
  const [prompts, setPrompts] = useState<AIPrompt[]>(initialPrompts);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null);
  const [currentView, setCurrentView] = useState<View>('editor');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(
    initialPrompts.filter((p) => p.is_favorite).map((p) => p.id)
  ));
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [analytics, setAnalytics] = useState<PromptAnalytics | null>(null);
  const [showDiff, setShowDiff] = useState<{ old: string; new: string } | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [showImportExport, setShowImportExport] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[data-prompt-search]')?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && selectedPrompt) {
        e.preventDefault();
        const form = document.getElementById('prompt-editor-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPrompt]);

  const filteredPrompts = useMemo(() => {
    let result = prompts;
    if (selectedCategory) {
      result = result.filter((p) => p.category?.slug === selectedCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.key.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [prompts, selectedCategory, searchQuery]);

  const favoritesList = useMemo(
    () => prompts.filter((p) => favorites.has(p.id)),
    [prompts, favorites]
  );

  const recentlyEdited = useMemo(
    () => [...prompts].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5),
    [prompts]
  );

  const handleSelectPrompt = useCallback(async (prompt: AIPrompt) => {
    setSelectedPrompt(prompt);
    setCurrentView('editor');
    setLoadState('loading');
    try {
      const [verRes, anRes] = await Promise.all([
        fetch(`/eleva/prompt-studio/api?action=versions&promptId=${prompt.id}`).then((r) => r.json()),
        fetch(`/eleva/prompt-studio/api?action=analytics&promptId=${prompt.id}`).then((r) => r.json()),
      ]);
      setVersions(verRes.versions ?? []);
      setAnalytics(anRes);
    } catch {
      setVersions([]);
      setAnalytics(null);
    }
    setLoadState('idle');
  }, []);

  type ActionResult<T = unknown> = { error: string } | { data: T } | { success: boolean } | { favorited: boolean };

  const handleToggleFavorite = useCallback(async (promptId: string) => {
    const res: ActionResult<{ favorited: boolean }> = await actions.toggleFavorite(promptId);
    if ('error' in res) { toast.error(res.error); return; }
    const favorited = 'favorited' in res ? res.favorited : false;
    setFavorites((prev) => {
      const next = new Set(prev);
      if (favorited) next.add(promptId);
      else next.delete(promptId);
      return next;
    });
    toast.success(favorited ? 'Added to favorites' : 'Removed from favorites');
  }, []);

  const handleSavePrompt = useCallback(async (promptId: string, data: Record<string, unknown>) => {
    setLoadState('loading');
    const fd = new FormData();
    fd.append('body', JSON.stringify(data));
    const res: ActionResult<AIPrompt> = await actions.updatePrompt(promptId, fd);
    if ('error' in res) { toast.error(res.error); setLoadState('idle'); return; }
    const updated = 'data' in res ? res.data : null;
    if (updated) {
      setPrompts((prev) => prev.map((p) => (p.id === promptId ? { ...p, ...updated } : p)));
      setSelectedPrompt((prev) => prev ? { ...prev, ...updated } : null);
    }
    setLoadState('idle');
    toast.success('Prompt saved');
  }, []);

  const handleDuplicate = useCallback(async (promptId: string) => {
    const res: ActionResult<AIPrompt> = await actions.duplicatePrompt(promptId);
    if ('error' in res) { toast.error(res.error); return; }
    const dup = 'data' in res ? res.data : null;
    if (dup) {
      setPrompts((prev) => [dup, ...prev]);
      toast.success('Prompt duplicated');
    }
  }, []);

  const handleDelete = useCallback(async (promptId: string) => {
    const res: ActionResult = await actions.deletePrompt(promptId);
    if ('error' in res) { toast.error(res.error); return; }
    setPrompts((prev) => prev.filter((p) => p.id !== promptId));
    if (selectedPrompt?.id === promptId) setSelectedPrompt(null);
    toast.success('Prompt deleted');
  }, [selectedPrompt]);

  const handleCreate = useCallback(() => {
    const blankPrompt: AIPrompt = {
      id: '',
      user_id: null,
      category_id: null,
      key: '',
      title: '',
      description: '',
      system_prompt: '',
      user_prompt_template: '',
      model: 'anthropic/claude-sonnet-4.5',
      temperature: 0.7,
      max_tokens: 4096,
      is_active: true,
      is_builtin: false,
      is_locked: false,
      locked_sections: null,
      editable_instructions: null,
      variables: [],
      tags: [],
      usage_count: 0,
      success_count: 0,
      failure_count: 0,
      avg_latency_ms: 0,
      avg_tokens: 0,
      avg_cost: 0,
      version: 1,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSelectedPrompt(blankPrompt);
    setCurrentView('editor');
  }, []);

  const handleRestoreVersion = useCallback(async (versionId: string) => {
    if (!selectedPrompt) return;
    const res: ActionResult<AIPrompt> = await actions.restoreVersion(selectedPrompt.id, versionId);
    if ('error' in res) { toast.error(res.error); return; }
    const updated = 'data' in res ? res.data : null;
    if (updated) {
      setSelectedPrompt({ ...selectedPrompt, ...updated });
      setPrompts((prev) => prev.map((p) => (p.id === selectedPrompt.id ? { ...p, ...updated } : p)));
      toast.success('Version restored');
    }
  }, [selectedPrompt]);

  const handleApplyTemplate = useCallback((template: PromptTemplate) => {
    const blankPrompt: AIPrompt = {
      id: '',
      user_id: null,
      category_id: categories.find((c) => c.name === template.category)?.id || null,
      key: template.id,
      title: template.name,
      description: template.description,
      system_prompt: template.systemPrompt,
      user_prompt_template: '',
      model: template.model,
      temperature: template.temperature,
      max_tokens: template.maxTokens,
      is_active: true,
      is_builtin: false,
      is_locked: true,
      locked_sections: template.systemPrompt,
      editable_instructions: '## Instructions\nCustomize this prompt for your needs.',
      variables: [],
      tags: template.tags,
      usage_count: 0,
      success_count: 0,
      failure_count: 0,
      avg_latency_ms: 0,
      avg_tokens: 0,
      avg_cost: 0,
      version: 1,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSelectedPrompt(blankPrompt);
    setCurrentView('editor');
    setShowTemplates(false);
  }, [categories]);

  const handleCompareVersions = useCallback((oldVersion: PromptVersion, newVersion: PromptVersion) => {
    setShowDiff({
      old: oldVersion.system_prompt,
      new: newVersion.system_prompt,
    });
    setCurrentView('diff');
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden" style={{ background: 'rgb(var(--eleva-bg))' }}>
      <PromptSidebar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        promptCount={filteredPrompts.length}
        favoritesCount={favoritesList.length}
        recentlyEdited={recentlyEdited}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PromptToolbar
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
          onCreate={handleCreate}
          onTemplates={() => setShowTemplates(true)}
          onImportExport={() => setShowImportExport(true)}
          selectedPrompt={selectedPrompt}
          onViewChange={setCurrentView}
          currentView={currentView}
        />

        <div className="flex-1 overflow-y-auto">
          {selectedPrompt ? (
            <div className="h-full flex">
              <div className="flex-1 min-w-0 overflow-y-auto">
                {currentView === 'editor' && (
                  <PromptEditor
                    prompt={selectedPrompt}
                    onSave={handleSavePrompt}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                    categories={categories}
                    tags={tags}
                    loadState={loadState}
                  />
                )}
                {currentView === 'preview' && (
                  <PromptPreview prompt={selectedPrompt} />
                )}
                {currentView === 'history' && (
                  <PromptHistory
                    versions={versions}
                    onRestore={handleRestoreVersion}
                    onCompare={handleCompareVersions}
                  />
                )}
                {currentView === 'analytics' && analytics && (
                  <PromptAnalyticsView analytics={analytics} prompt={selectedPrompt} />
                )}
                {currentView === 'diff' && showDiff && (
                  <PromptDiffViewer oldText={showDiff.old} newText={showDiff.new} onClose={() => { setShowDiff(null); setCurrentView('history'); }} />
                )}
              </div>
            </div>
          ) : (
            <PromptCardGrid
              prompts={filteredPrompts}
              onSelect={handleSelectPrompt}
              onToggleFavorite={handleToggleFavorite}
              onDuplicate={handleDuplicate}
              favorites={favorites}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showImportExport && (
          <PromptImportExport
            prompts={prompts}
            onClose={() => setShowImportExport(false)}
          />
        )}
        {showTemplates && (
          <PromptTemplates
            onApply={handleApplyTemplate}
            onClose={() => setShowTemplates(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

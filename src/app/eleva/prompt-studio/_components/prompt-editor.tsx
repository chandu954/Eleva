'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Save,
  Copy,
  Trash2,
  Sparkles,
  Plus,
  X,
  GripVertical,
  Loader2,
  Variable,
  Check,
  AlertTriangle,
} from 'lucide-react';
import type { AIPrompt, PromptCategory, PromptTag, PromptVariable } from '../types';
import { VariablesPanel } from './prompt-variables-panel';

export function PromptEditor({
  prompt,
  onSave,
  onDuplicate,
  onDelete,
  categories,
  tags,
  loadState,
}: {
  prompt: AIPrompt;
  onSave: (id: string, data: Record<string, unknown>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  categories: PromptCategory[];
  tags: PromptTag[];
  loadState: 'idle' | 'loading' | 'error';
}) {
  const isNew = !prompt.id;
  const [title, setTitle] = useState(prompt.title || '');
  const [description, setDescription] = useState(prompt.description || '');
  const [systemPrompt, setSystemPrompt] = useState(prompt.system_prompt || '');
  const [userTemplate, setUserTemplate] = useState(prompt.user_prompt_template || '');
  const [editableInstructions, setEditableInstructions] = useState(prompt.editable_instructions || '');
  const [model, setModel] = useState(prompt.model || 'anthropic/claude-sonnet-4.5');
  const [temperature, setTemperature] = useState(prompt.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(prompt.max_tokens ?? 4096);
  const [categoryId, setCategoryId] = useState(prompt.category_id || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(prompt.tags || []);
  const [variables, setVariables] = useState<PromptVariable[]>(prompt.variables || []);
  const [showVariables, setShowVariables] = useState(false);
  const [showOptimize, setShowOptimize] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedResult, setOptimizedResult] = useState<{
    optimized: string;
    explanation: string;
    improvements: string[];
  } | null>(null);
  const [changeDescription, setChangeDescription] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lockedSections] = useState(prompt.locked_sections || '');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSave(prompt.id, {
      title,
      description,
      system_prompt: lockedSections ? `${lockedSections}\n\n${editableInstructions}\n\n${systemPrompt}` : systemPrompt,
      user_prompt_template: userTemplate,
      editable_instructions: editableInstructions,
      model,
      temperature,
      max_tokens: maxTokens,
      category_id: categoryId,
      tags: selectedTags,
      variables,
      change_description: changeDescription,
    });
  }, [title, description, systemPrompt, userTemplate, editableInstructions, model, temperature, maxTokens, categoryId, selectedTags, variables, changeDescription, lockedSections, prompt.id, onSave]);

  const insertVariable = useCallback((varName: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    setSystemPrompt(text.slice(0, start) + `{{${varName}}}` + text.slice(end));
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + varName.length + 4, start + varName.length + 4);
    }, 0);
  }, []);

  const handleOptimize = useCallback(async () => {
    setOptimizing(true);
    try {
      const fd = new FormData();
      fd.append('body', JSON.stringify({
        system_prompt: systemPrompt,
        title,
        description,
      }));
      const res = await fetch('/eleva/prompt-studio/api/optimize', { method: 'POST', body: fd });
      const data = await res.json();
      setOptimizedResult(data);
      setShowOptimize(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Optimization failed');
    }
    setOptimizing(false);
  }, [systemPrompt, title, description]);

  const handleCreate = useCallback(async () => {
    const fd = new FormData();
    fd.append('body', JSON.stringify({
      title,
      description,
      system_prompt: systemPrompt,
      user_prompt_template: userTemplate,
      editable_instructions: editableInstructions,
      model,
      temperature,
      max_tokens: maxTokens,
      category_id: categoryId,
      tags: selectedTags,
      variables,
    }));
    const { createPrompt } = await import('../_lib/actions');
    const res = await createPrompt(fd) as { error?: string; data?: unknown };
    if (res.error) { toast.error(res.error); return; }
    toast.success('Prompt created');
    window.location.reload();
  }, [title, description, systemPrompt, userTemplate, editableInstructions, model, temperature, maxTokens, categoryId, selectedTags, variables]);

  return (
    <form id="prompt-editor-form" onSubmit={isNew ? handleCreate : handleSubmit} className="h-full flex">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Prompt title"
                className="w-full text-2xl font-display font-semibold bg-transparent outline-none"
                style={{ color: 'rgb(var(--eleva-fg))' }}
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this prompt does"
                className="w-full text-[13px] bg-transparent outline-none"
                style={{ color: 'rgb(var(--eleva-muted-fg))' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleOptimize} disabled={optimizing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] hover:bg-[rgb(var(--eleva-muted))]" style={{ color: 'rgb(var(--eleva-primary))' }}>
                {optimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Optimize
              </button>
              <button type="button" onClick={() => onDuplicate(prompt.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] hover:bg-[rgb(var(--eleva-muted))]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </button>
              {!prompt.is_builtin && (
                <button type="button" onClick={() => { if (confirm('Delete this prompt?')) onDelete(prompt.id); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] hover:bg-red-50" style={{ color: '#ef4444' }}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 py-2 rounded-md text-[12px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}>
                <option value="">Uncategorized</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Model</label>
              <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full px-3 py-2 rounded-md text-[12px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}>
                <option value="anthropic/claude-sonnet-4.5">Claude Sonnet 4.5</option>
                <option value="anthropic/claude-opus-4.0">Claude Opus 4.0</option>
                <option value="openai/gpt-5.2">GPT-5.2</option>
                <option value="openai/gpt-4.1">GPT-4.1</option>
                <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B</option>
                <option value="deepseek/deepseek-r1">DeepSeek R1</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Temperature</label>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="2" step="0.05" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="flex-1" />
                <span className="text-[12px] font-mono w-8 text-right" style={{ color: 'rgb(var(--eleva-fg))' }}>{temperature.toFixed(2)}</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Max Tokens</label>
              <input type="number" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))} className="w-full px-3 py-2 rounded-md text-[12px] outline-none font-mono" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const active = selectedTags.includes(tag.slug);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSelectedTags((prev) => active ? prev.filter((t) => t !== tag.slug) : [...prev, tag.slug])}
                  className="text-[10px] font-mono px-2 py-1 rounded-md transition-colors"
                  style={{
                    background: active ? tag.color || 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-muted))',
                    color: active ? '#fff' : 'rgb(var(--eleva-muted-fg))',
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>

          {prompt.is_locked && (
            <div className="p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" style={{ color: 'rgb(var(--eleva-warning))' }} />
                <span className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-warning))' }}>Protected Prompt</span>
              </div>
              <div className="text-[12px] whitespace-pre-wrap font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                {lockedSections || prompt.locked_sections}
              </div>
              {editableInstructions !== null && (
                <div className="mt-3">
                  <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Editable Instructions</label>
                  <textarea
                    value={editableInstructions}
                    onChange={(e) => setEditableInstructions(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-md text-[12px] outline-none resize-none font-mono"
                    style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}
                    placeholder="Add your custom instructions here..."
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                System Prompt
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  {systemPrompt.length} chars · ~{Math.ceil(systemPrompt.length / 4)} tokens
                </span>
                <button type="button" onClick={() => setShowVariables(!showVariables)} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md hover:bg-[rgb(var(--eleva-muted))]" style={{ color: 'rgb(var(--eleva-primary))' }}>
                  <Variable className="w-3 h-3" /> Variables
                </button>
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={16}
              className="w-full px-4 py-3 rounded-xl text-[13px] outline-none resize-none font-mono leading-relaxed"
              style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))', border: '1px solid rgb(var(--eleva-border))' }}
              placeholder="Enter your system prompt here... Use {{variable_name}} for dynamic values."
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider block mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              User Prompt Template
            </label>
            <textarea
              value={userTemplate}
              onChange={(e) => setUserTemplate(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 rounded-xl text-[13px] outline-none resize-none font-mono leading-relaxed"
              style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))', border: '1px solid rgb(var(--eleva-border))' }}
              placeholder="Template for the user message. E.g.: Generate a resume for {{role}} at {{company}}..."
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider block mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Variables
            </label>
            <div className="space-y-2">
              {variables.map((v, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
                  <GripVertical className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                  <input value={v.name} onChange={(e) => { const nv = [...variables]; nv[i] = { ...nv[i], name: e.target.value }; setVariables(nv); }} placeholder="Variable name" className="flex-1 px-2 py-1 rounded text-[12px] outline-none font-mono bg-transparent" style={{ color: 'rgb(var(--eleva-fg))' }} />
                  <input value={v.description || ''} onChange={(e) => { const nv = [...variables]; nv[i] = { ...nv[i], description: e.target.value }; setVariables(nv); }} placeholder="Description" className="flex-1 px-2 py-1 rounded text-[12px] outline-none bg-transparent" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                  <button type="button" onClick={() => setVariables(variables.filter((_, j) => j !== i))} className="p-1 hover:bg-red-50 rounded"><X className="w-3 h-3" style={{ color: '#ef4444' }} /></button>
                </div>
              ))}
              <button type="button" onClick={() => setVariables([...variables, { name: '', description: '' }])} className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md hover:bg-[rgb(var(--eleva-muted))]" style={{ color: 'rgb(var(--eleva-primary))' }}>
                <Plus className="w-3 h-3" /> Add Variable
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider block mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Change Description (optional)
            </label>
            <input value={changeDescription} onChange={(e) => setChangeDescription(e.target.value)} placeholder="What changed in this version?" className="w-full px-3 py-2 rounded-md text-[12px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} />
          </div>

          <div className="flex items-center gap-3 pb-8">
            <button type="submit" disabled={loadState === 'loading'} className="eleva-btn-primary flex items-center gap-1.5">
              {loadState === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isNew ? 'Create Prompt' : 'Save Changes'}
            </button>
            {isNew && (
              <button type="button" onClick={() => window.history.back()} className="px-4 py-2 rounded-md text-[13px] hover:bg-[rgb(var(--eleva-muted))]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {showVariables && (
        <VariablesPanel onInsert={insertVariable} currentVariables={variables} />
      )}

      {showOptimize && optimizedResult && (
        <OptimizeModal
          result={optimizedResult}
          currentPrompt={systemPrompt}
          onAccept={(optimized) => { setSystemPrompt(optimized); setShowOptimize(false); toast.success('Optimized prompt applied'); }}
          onReject={() => setShowOptimize(false)}
          onClose={() => setShowOptimize(false)}
        />
      )}
    </form>
  );
}

function OptimizeModal({ result, currentPrompt, onAccept, onReject, onClose }: {
  result: { optimized: string; explanation: string; improvements: string[] };
  currentPrompt: string;
  onAccept: (optimized: string) => void;
  onReject: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-[800px] max-h-[80vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: 'rgb(var(--eleva-card))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: 'rgb(var(--eleva-primary))' }} />
            <h2 className="font-display text-xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>AI Optimized Prompt</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[rgb(var(--eleva-muted))]"><X className="w-4 h-4" /></button>
        </div>

        {result.improvements?.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] font-mono uppercase mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Improvements Made</div>
            <ul className="space-y-1">
              {result.improvements.map((imp: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
                  <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'rgb(var(--eleva-success))' }} />
                  {imp}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
            <div className="text-[10px] font-mono uppercase mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Current</div>
            <pre className="text-[12px] whitespace-pre-wrap line-clamp-10 font-mono" style={{ color: 'rgb(var(--eleva-fg))' }}>{currentPrompt}</pre>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="text-[10px] font-mono uppercase mb-1" style={{ color: 'rgb(var(--eleva-success))' }}>Optimized</div>
            <pre className="text-[12px] whitespace-pre-wrap line-clamp-10 font-mono" style={{ color: 'rgb(var(--eleva-fg))' }}>{result.optimized}</pre>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => onAccept(result.optimized)} className="eleva-btn-primary flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Accept
          </button>
          <button onClick={onReject} className="px-4 py-2 rounded-md text-[13px] hover:bg-[rgb(var(--eleva-muted))]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Reject
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

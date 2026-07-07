'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Upload, FileJson, FileText, FileCode2, Check, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AIPrompt } from '../types';

export function PromptImportExport({
  prompts,
  onClose,
}: {
  prompts: AIPrompt[];
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'export' | 'import'>('export');
  const [format, setFormat] = useState<'json' | 'yaml' | 'txt'>('json');
  const [exportData, setExportData] = useState('');
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const generateExport = () => {
    const data = prompts.map((p) => ({
      key: p.key,
      title: p.title,
      description: p.description,
      system_prompt: p.system_prompt,
      user_prompt_template: p.user_prompt_template,
      model: p.model,
      temperature: p.temperature,
      max_tokens: p.max_tokens,
      tags: p.tags,
      variables: p.variables,
      category: p.category?.slug || null,
    }));

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'txt') {
      return data.map((p) => `=== ${p.title} ===\n${p.system_prompt}\n`).join('\n');
    } else {
      return data.map((p) => {
        return `- key: ${p.key}\n  title: ${p.title}\n  system_prompt: |\n    ${(p.system_prompt || '').split('\n').join('\n    ')}\n`;
      }).join('\n');
    }
  };

  const handleExport = () => {
    const data = generateExport();
    setExportData(data);
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompts-export.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported successfully');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportData || generateExport());
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
    toast.success('Copied to clipboard');
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      let parsed: Record<string, unknown>[];
      if (file.name.endsWith('.json')) {
        parsed = JSON.parse(text);
      } else {
        toast.error('Only JSON import is supported currently');
        setImporting(false);
        return;
      }

      let imported = 0;
      for (const item of parsed) {
        const fd = new FormData();
        fd.append('body', JSON.stringify({
          title: item.title as string,
          description: item.description as string,
          system_prompt: item.system_prompt as string,
          user_prompt_template: item.user_prompt_template as string,
          model: item.model as string,
          temperature: item.temperature as number,
          max_tokens: item.max_tokens as number,
          tags: (item.tags as string[]) || [],
          variables: (item.variables as { name: string }[]) || [],
          key: (item.key as string) || ((item.title as string) || '').toLowerCase().replace(/\s+/g, '-'),
        }));
        const { createPrompt } = await import('../_lib/actions');
        const res = await createPrompt(fd) as { error?: string };
        if (!res.error) imported++;
      }
      toast.success(`Imported ${imported} prompts`);
      if (imported > 0) window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    }
    setImporting(false);
  };

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
        className="w-[600px] rounded-2xl p-6"
        style={{ background: 'rgb(var(--eleva-card))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Import / Export</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[rgb(var(--eleva-muted))]">
            <X className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
          </button>
        </div>

        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setMode('export')}
            className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors ${mode === 'export' ? 'eleva-btn-primary' : ''}`}
            style={mode !== 'export' ? { background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' } : {}}
          >
            <Download className="w-3.5 h-3.5 inline mr-1.5" /> Export
          </button>
          <button
            onClick={() => setMode('import')}
            className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors ${mode === 'import' ? 'eleva-btn-primary' : ''}`}
            style={mode !== 'import' ? { background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' } : {}}
          >
            <Upload className="w-3.5 h-3.5 inline mr-1.5" /> Import
          </button>
        </div>

        {mode === 'export' ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['json', 'yaml', 'txt'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] ${format === f ? 'eleva-btn-primary' : ''}`}
                  style={format !== f ? { background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' } : {}}
                >
                  {f === 'json' ? <FileJson className="w-3 h-3" /> : f === 'yaml' ? <FileCode2 className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                  .{f}
                </button>
              ))}
            </div>
            <pre className="p-4 rounded-xl text-[12px] font-mono max-h-60 overflow-y-auto whitespace-pre-wrap" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))', border: '1px solid rgb(var(--eleva-border))' }}>
              {exportData || generateExport()}
            </pre>
            <div className="flex items-center gap-3">
              <button onClick={handleExport} className="eleva-btn-primary flex items-center gap-1.5">
                <Download className="w-4 h-4" /> Download .{format}
              </button>
              <button onClick={handleCopy} className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] hover:bg-[rgb(var(--eleva-muted))]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-[rgb(var(--eleva-muted))] transition-colors"
              style={{ borderColor: 'rgb(var(--eleva-border))' }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
              <div className="font-display text-lg font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Import Prompts</div>
              <div className="text-[13px] mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                Upload a JSON file exported from Prompt Studio
              </div>
              <input ref={fileRef} type="file" accept=".json" onChange={handleFileImport} className="hidden" />
            </div>
            {importing && (
              <div className="flex items-center justify-center gap-2 text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                <Loader2 className="w-4 h-4 animate-spin" /> Importing...
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

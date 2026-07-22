'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Loader2,
  StopCircle,
  Clock,
  Coins,
  XCircle,
  Copy,
  Check,
  Variable,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';
import type { AIPrompt } from '../types';

export function PromptPreview({ prompt }: { prompt: AIPrompt }) {
  const [inputVars, setInputVars] = useState<Record<string, string>>({});
  const [output, setOutput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState<{
    latency: number;
    tokensIn: number;
    tokensOut: number;
    cost: number;
    model: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedModel, setSelectedModel] = useState(prompt.model || 'anthropic/claude-sonnet-4.5');
  const [temperature, setTemperature] = useState(prompt.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(prompt.max_tokens ?? 4096);
  const abortRef = useRef<AbortController | null>(null);

  const variables = prompt.variables || [];

  const handleRun = useCallback(async () => {
    setOutput('');
    setError(null);
    setResult(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/eleva/api/prompts/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: prompt.id,
          variables: inputVars,
          model: selectedModel,
          temperature,
          maxTokens,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to run prompt');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullOutput = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'token') {
              fullOutput += parsed.content;
              setOutput(fullOutput);
            } else if (parsed.type === 'done') {
              setResult({
                latency: parsed.latency,
                tokensIn: parsed.tokensIn,
                tokensOut: parsed.tokensOut,
                cost: parsed.cost,
                model: parsed.model,
              });
            } else if (parsed.type === 'error') {
              setError(parsed.message);
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && 'name' in err && (err as { name: string }).name !== 'AbortError') {
        setError(err.message);
      }
    }

    setStreaming(false);
    abortRef.current = null;
  }, [prompt.id, inputVars, selectedModel, temperature, maxTokens]);

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  return (
    <div className="h-full flex">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          <div>
            <h2 className="font-display text-xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Prompt Playground</h2>
            <p className="text-[13px] mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Test your prompt with sample inputs
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Model</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full px-3 py-2 rounded-md text-[12px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}>
                <option value="openrouter/free">OpenRouter Free (auto)</option>
                <option value="nvidia/nemotron-3-super-120b-a12b:free">Nemotron 3 Super 120B (Free)</option>
                <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B (Free)</option>
                <option value="google/gemma-4-31b-it:free">Gemma 4 31B (Free)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Temperature</label>
              <input type="number" min="0" max="2" step="0.05" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full px-3 py-2 rounded-md text-[12px] outline-none font-mono" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Max Tokens</label>
              <input type="number" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))} className="w-full px-3 py-2 rounded-md text-[12px] outline-none font-mono" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} />
            </div>
          </div>

          {variables.length > 0 && (
            <div className="space-y-3">
              <div className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Input Variables</div>
              {variables.map((v) => (
                <div key={v.name}>
                  <label className="text-[12px] font-mono block mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>
                    {`{{${v.name}}}`}
                    {v.description && <span className="text-[11px] ml-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{v.description}</span>}
                  </label>
                  <textarea
                    value={inputVars[v.name] || ''}
                    onChange={(e) => setInputVars({ ...inputVars, [v.name]: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none font-mono"
                    style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}
                    placeholder={`Enter value for ${v.name}...`}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleRun}
              disabled={streaming}
              className="eleva-btn-primary flex items-center gap-1.5"
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {streaming ? 'Running...' : 'Run Prompt'}
            </button>
            {streaming && (
              <button
                onClick={handleStop}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px]"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                <StopCircle className="w-4 h-4" /> Stop
              </button>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <XCircle className="w-5 h-5 shrink-0" style={{ color: '#ef4444' }} />
              <div>
                <div className="text-[13px] font-medium" style={{ color: '#ef4444' }}>Error</div>
                <div className="text-[13px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{error}</div>
              </div>
            </div>
          )}

          {output && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Output</div>
                <button onClick={() => { navigator.clipboard.writeText(output); setCopied(true); toast.success('Copied'); setTimeout(() => setCopied(false), 1000); }} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md hover:bg-[rgb(var(--eleva-muted))]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                </button>
              </div>
              <div className="p-4 rounded-xl whitespace-pre-wrap text-[13px] leading-relaxed font-mono" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))', border: '1px solid rgb(var(--eleva-border))' }}>
                {output}
                {streaming && <span className="animate-pulse">▊</span>}
              </div>
            </div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-4 gap-3"
            >
              <MetricCard icon={Clock} label="Latency" value={`${result.latency}ms`} />
              <MetricCard icon={Variable} label="Tokens In" value={result.tokensIn.toLocaleString()} />
              <MetricCard icon={Variable} label="Tokens Out" value={result.tokensOut.toLocaleString()} />
              <MetricCard icon={Coins} label="Cost" value={`$${result.cost.toFixed(6)}`} />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
        <span className="text-[10px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{label}</span>
      </div>
      <div className="font-display text-lg font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{value}</div>
    </div>
  );
}

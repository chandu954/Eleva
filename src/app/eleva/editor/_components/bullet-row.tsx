'use client';

/*
 * Bullet row with inline AI rewrite affordance. Extracted from page.tsx so
 * the editor page stays a thin view layer over use-resume-editor.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { Check, GripVertical, Loader2, RotateCcw, Sparkles, Trash2, X } from 'lucide-react';

import { DiffView } from './diff-view';
import { REWRITE_MODE_OPTIONS, type RewriteMode } from '@/app/eleva/api/tool/rewrite/rewrite-utils';
import type { BulletItem } from '../_lib/use-resume-editor';

export function BulletRow({ bullet, onEdit, onRewrite, onAccept, onReject, onDelete }: {
  bullet: BulletItem;
  onEdit: (text: string) => void;
  onRewrite: (mode?: RewriteMode) => void;
  onAccept: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const isEdited = bullet.text !== bullet.original;
  const confidence = bullet.rewriteMeta?.confidence ?? 0;
  const reason = bullet.rewriteMeta?.reason ?? '';
  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="group rounded-lg hover:bg-[rgb(var(--eleva-muted))] p-3 -mx-3">
      <div className="flex gap-3">
        <GripVertical className="w-3.5 h-3.5 mt-1.5 opacity-0 group-hover:opacity-100 shrink-0" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
        <div className="w-1.5 h-1.5 rounded-full mt-2.5 shrink-0" style={{ background: 'rgb(var(--eleva-primary))' }} />
        <textarea
          value={bullet.text}
          onChange={(e) => onEdit(e.target.value)}
          rows={2}
          className="flex-1 text-[14px] leading-relaxed bg-transparent outline-none resize-none"
          style={{ color: 'rgb(var(--eleva-fg))' }}
        />
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onRewrite('professional')} disabled={bullet.streaming} className="w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }} title="Rewrite with AI">
            {bullet.streaming ? <Loader2 className="w-3 h-3 animate-spin text-white" /> : <Sparkles className="w-3 h-3 text-white" />}
          </button>
          <button onClick={onDelete} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-red-50" title="Delete">
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
          {isEdited && (
            <button onClick={() => onRewrite('professional')} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[rgb(var(--eleva-card))]" title="Revert">
              <RotateCcw className="w-3 h-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {bullet.suggestion !== undefined && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="ml-6 mt-2 rounded-lg overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(37,99,235,.08), rgba(124,58,237,.08))', border: '1px solid rgba(37,99,235,.25)' }}
          >
            <div className="px-3 py-2 flex items-center justify-between border-b" style={{ borderColor: 'rgba(37,99,235,.15)' }}>
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-primary))' }}>
                {bullet.streaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Eleva suggestion
              </div>
              {!bullet.streaming && (
                <div className="flex gap-1">
                  <button onClick={onAccept} className="text-[11px] font-medium px-2 h-6 rounded-md inline-flex items-center gap-1" style={{ background: 'rgb(var(--eleva-success))', color: '#fff' }}>
                    <Check className="w-3 h-3" /> Accept
                  </button>
                  <button onClick={onReject} className="text-[11px] font-medium px-2 h-6 rounded-md inline-flex items-center gap-1" style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-muted-fg))' }}>
                    <X className="w-3 h-3" /> Reject
                  </button>
                </div>
              )}
            </div>
            <div className="px-3 py-2.5">
              {bullet.streaming ? (
                <div className="flex items-center gap-2 text-[13px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
                  <span>Generating suggestion…</span>
                  <span className="inline-block w-1.5 h-3 rounded-sm" style={{ background: 'rgb(var(--eleva-primary))', animation: 'eleva-blink 1s infinite' }} />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                    <div className="rounded-lg px-3 py-2 bg-white/80 border border-[rgba(37,99,235,.16)]">
                      <div className="uppercase tracking-widest font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Confidence</div>
                      <div className="text-sm font-semibold" style={{ color: 'rgb(var(--eleva-primary))' }}>{confidence || '—'}{confidence ? '%' : ''}</div>
                    </div>
                    <div className="rounded-lg px-3 py-2 bg-white/80 border border-[rgba(16,185,129,.16)]">
                      <div className="uppercase tracking-widest font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Reason</div>
                      <div className="text-xs leading-relaxed" style={{ color: 'rgb(var(--eleva-fg))' }}>{reason || 'AI generated a rewrite'}</div>
                    </div>
                    <div className="rounded-lg px-3 py-2 bg-white/80 border border-[rgba(244,114,182,.16)]">
                      <div className="uppercase tracking-widest font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Fabrication Risk</div>
                      <div className="text-sm font-semibold capitalize" style={{ color: 'rgb(var(--eleva-fg))' }}>{bullet.rewriteMeta?.fabricationRisk ?? 'none'}</div>
                    </div>
                  </div>

                  {bullet.rewriteMeta?.attempts && bullet.rewriteMeta.attempts.length > 0 && (
                    <div className="rounded-lg p-3 bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                      <div className="font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Attempts</div>
                      {bullet.rewriteMeta.attempts.map((attempt) => (
                        <div key={`${attempt.attempt}-${attempt.model}`} className="flex items-center justify-between gap-2">
                          <span style={{ color: 'rgb(var(--eleva-fg))' }}>Attempt {attempt.attempt} · {attempt.model}</span>
                          <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{attempt.status}{attempt.latencyMs ? ` · ${attempt.latencyMs}ms` : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <DiffView original={bullet.text} suggestion={bullet.suggestion || ''} />

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {REWRITE_MODE_OPTIONS.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => onRewrite(mode.value)}
                        disabled={bullet.streaming}
                        className="text-[10px] px-2 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                        title={mode.description}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

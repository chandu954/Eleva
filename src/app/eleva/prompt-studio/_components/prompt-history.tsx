'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  RotateCcw,
  GitCompare,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PromptVersion } from '../types';

export function PromptHistory({
  versions,
  onRestore,
  onCompare,
}: {
  versions: PromptVersion[];
  onRestore: (versionId: string) => void;
  onCompare: (oldVer: PromptVersion, newVer: PromptVersion) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedOld, setSelectedOld] = useState<string | null>(null);
  const [selectedNew, setSelectedNew] = useState<string | null>(null);

  if (versions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgb(var(--eleva-muted))' }}>
            <Clock className="w-7 h-7" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
          </div>
          <div className="font-display text-xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>No version history</div>
          <div className="text-[13px] mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Save this prompt to create the first version.
          </div>
        </div>
      </div>
    );
  }

  const handleCompare = () => {
    if (!selectedOld || !selectedNew) {
      toast.error('Select two versions to compare');
      return;
    }
    const oldVer = versions.find((v) => v.id === selectedOld);
    const newVer = versions.find((v) => v.id === selectedNew);
    if (oldVer && newVer) {
      onCompare(oldVer, newVer);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Version History</h2>
            <p className="text-[13px] mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              {versions.length} version{versions.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setCompareMode(!compareMode); setSelectedOld(null); setSelectedNew(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] transition-colors ${compareMode ? 'eleva-btn-primary' : ''}`}
              style={compareMode ? {} : { color: 'rgb(var(--eleva-muted-fg))' }}
            >
              <GitCompare className="w-3.5 h-3.5" /> Compare
            </button>
            {compareMode && (
              <button onClick={handleCompare} className="eleva-btn-primary text-[12px] flex items-center gap-1.5">
                <GitCompare className="w-3.5 h-3.5" /> Compare Selected
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-[23px] top-3 bottom-3 w-px" style={{ background: 'rgb(var(--eleva-border))' }} />

          {versions.map((ver, i) => {
            const isExpanded = expanded === ver.id;
            return (
              <motion.div
                key={ver.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="relative mb-3 last:mb-0"
              >
                <div className="flex items-start gap-4">
                  {compareMode ? (
                    <div className="relative z-10 mt-1">
                      <input
                        type="checkbox"
                        checked={selectedOld === ver.id || selectedNew === ver.id}
                        onChange={() => {
                          if (selectedOld === ver.id) setSelectedOld(null);
                          else if (selectedNew === ver.id) setSelectedNew(null);
                          else if (!selectedOld) setSelectedOld(ver.id);
                          else if (!selectedNew) setSelectedNew(ver.id);
                          else { setSelectedOld(ver.id); setSelectedNew(null); }
                        }}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'rgb(var(--eleva-primary))' }}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-[14px] h-[14px] rounded-full border-2 mt-1 z-10 shrink-0"
                      style={{ borderColor: 'rgb(var(--eleva-primary))', background: i === 0 ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-card))' }}
                    />
                  )}

                  <div
                    className="flex-1 rounded-xl p-4 cursor-pointer transition-colors"
                    style={{
                      background: isExpanded ? 'rgb(var(--eleva-muted))' : 'transparent',
                      border: isExpanded ? `1px solid rgb(var(--eleva-border))` : '1px solid transparent',
                    }}
                    onClick={() => setExpanded(isExpanded ? null : ver.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                            v{ver.version}
                          </span>
                          {i === 0 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: 'rgb(var(--eleva-success))', color: '#fff' }}>
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                          {new Date(ver.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {i > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); if (confirm('Restore version v' + ver.version + '?')) onRestore(ver.id); }}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] hover:bg-[rgb(var(--eleva-muted))]"
                            style={{ color: 'rgb(var(--eleva-primary))' }}
                          >
                            <RotateCcw className="w-3 h-3" /> Restore
                          </button>
                        )}
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />}
                      </div>
                    </div>

                    {ver.change_description && (
                      <div className="mt-1.5 text-[12px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
                        {ver.change_description}
                      </div>
                    )}

                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-3 space-y-2"
                      >
                        <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>System Prompt</div>
                        <pre className="p-3 rounded-lg text-[12px] whitespace-pre-wrap font-mono max-h-60 overflow-y-auto" style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-fg))', border: '1px solid rgb(var(--eleva-border))' }}>
                          {ver.system_prompt}
                        </pre>
                        {ver.model && (
                          <div className="flex items-center gap-3 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                            <span>Model: {ver.model}</span>
                            {ver.temperature !== null && <span>Temperature: {ver.temperature}</span>}
                            {ver.max_tokens !== null && <span>Max Tokens: {ver.max_tokens}</span>}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

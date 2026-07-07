'use client';

import { motion } from 'framer-motion';
import {
  Star,
  Copy,
  Sparkles,
  Zap,
  BarChart3,
  FileText,
  Briefcase,
  FolderGit2,
  Target,
  Mail,
  Linkedin,
  MessageSquare,
  FileSearch,
  MessageCircle,
  Search,
} from 'lucide-react';
import type { AIPrompt } from '../types';

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  FileText, Briefcase, FolderGit2, Target, Mail,
  Linkedin, MessageSquare, FileSearch, MessageCircle, Search,
};

export function PromptCardGrid({
  prompts,
  onSelect,
  onToggleFavorite,
  onDuplicate,
  favorites,
}: {
  prompts: AIPrompt[];
  onSelect: (p: AIPrompt) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicate: (id: string) => void;
  favorites: Set<string>;
}) {
  if (prompts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgb(var(--eleva-muted))' }}>
            <Sparkles className="w-7 h-7" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
          </div>
          <div className="font-display text-xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>No prompts found</div>
          <div className="text-[13px] mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Try a different search or create a new prompt.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {prompts.map((prompt, i) => {
          const CategoryIcon = iconMap[prompt.category?.icon || ''] || FileText;
          return (
            <motion.div
              key={prompt.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ y: -3 }}
              className="group relative rounded-xl p-5 cursor-pointer border transition-all"
              style={{
                background: 'rgb(var(--eleva-card))',
                borderColor: 'rgb(var(--eleva-border))',
              }}
              onClick={() => onSelect(prompt)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgb(var(--eleva-muted))' }}
                  >
                    <CategoryIcon className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>
                      {prompt.title}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      {prompt.category?.name || 'Uncategorized'} · v{prompt.version}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(prompt.id); }}
                    className="p-1.5 rounded-md hover:bg-[rgb(var(--eleva-muted))]"
                  >
                    <Star
                      className="w-3.5 h-3.5"
                      style={{
                        color: favorites.has(prompt.id) ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-muted-fg))',
                        fill: favorites.has(prompt.id) ? 'rgb(var(--eleva-warning))' : 'none',
                      }}
                    />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicate(prompt.id); }}
                    className="p-1.5 rounded-md hover:bg-[rgb(var(--eleva-muted))]"
                  >
                    <Copy className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                  </button>
                </div>
              </div>

              {prompt.description && (
                <p className="text-[12px] mb-3 line-clamp-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  {prompt.description}
                </p>
              )}

              <div className="flex items-center gap-3 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {prompt.model?.split('/').pop() || 'default'}
                </span>
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  {prompt.usage_count}
                </span>
                {(prompt.avg_latency_ms > 0) && (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {Math.round(prompt.avg_latency_ms)}ms
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {prompt.tags?.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded"
                    style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import {
  Search,
  Star,
  Clock,
  FileText,
  Briefcase,
  FolderGit2,
  Target,
  Mail,
  Linkedin,
  MessageSquare,
  FileSearch,
  MessageCircle,
  SearchIcon,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react';
import type { PromptCategory } from '../types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, Briefcase, FolderGit2, Target, Mail,
  Linkedin, MessageSquare, FileSearch, MessageCircle, Search: SearchIcon,
};

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'recent', label: 'Recently Edited', icon: Clock },
];

export function PromptSidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  promptCount,
  favoritesCount,
  recentlyEdited,
  open,
  onToggle,
}: {
  categories: PromptCategory[];
  selectedCategory: string | null;
  onSelectCategory: (slug: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  promptCount: number;
  favoritesCount: number;
  recentlyEdited: { id: string; title: string; updated_at: string }[];
  open: boolean;
  onToggle: () => void;
}) {
  void recentlyEdited;
  return (
    <motion.aside
      animate={{ width: open ? 256 : 56 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="shrink-0 border-r flex flex-col overflow-hidden"
      style={{ borderColor: 'rgb(var(--eleva-border))', background: 'rgb(var(--eleva-card))' }}
    >
      <div className="h-14 flex items-center justify-between px-4 border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
        {open && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] font-mono uppercase tracking-[0.2em]"
            style={{ color: 'rgb(var(--eleva-muted-fg))' }}
          >
            Prompt Studio
          </motion.span>
        )}
        <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-[rgb(var(--eleva-muted))]">
          {open ? <ChevronLeft className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} /> : <ChevronRight className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />}
        </button>
      </div>

      {open && (
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
            <input
              data-prompt-search
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search prompts..."
              className="w-full pl-8 pr-3 py-2 rounded-md text-[12px] outline-none"
              style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = (item.id === 'overview' && !selectedCategory) ||
            (item.id === 'favorites' && selectedCategory === '__favorites__');
          const badge = item.id === 'favorites' ? favoritesCount : item.id === 'overview' ? promptCount : undefined;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'favorites') onSelectCategory('__favorites__');
                else if (item.id === 'overview') onSelectCategory(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 h-8 rounded-lg text-[12px] transition-colors"
              style={{
                background: isActive ? 'rgb(var(--eleva-muted))' : 'transparent',
                color: isActive ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))',
              }}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {open && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[rgb(var(--eleva-muted))]">
                      {badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}

        {open && (
          <div className="pt-3 pb-1">
            <div className="px-3 text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Categories
            </div>
          </div>
        )}

        {categories.map((cat) => {
          const Icon = iconMap[cat.icon || ''] || FileText;
          const isActive = selectedCategory === cat.slug;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isActive ? null : cat.slug)}
              className="w-full flex items-center gap-2.5 px-3 h-8 rounded-lg text-[12px] transition-colors"
              style={{
                background: isActive ? 'rgb(var(--eleva-muted))' : 'transparent',
                color: isActive ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))',
              }}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {open && (
                <>
                  <span className="flex-1 text-left">{cat.name}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </motion.aside>
  );
}

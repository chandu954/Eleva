'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  FileText,
  Target,
  Mail,
  Settings,
  Upload,
  Wand2,
  BarChart3,
  Plus,
  Briefcase,
  Palette,
  Loader2,
  LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Ctx { open: () => void; close: () => void }
const CommandPaletteCtx = createContext<Ctx>({ open: () => {}, close: () => {} });
export const useCommandPalette = () => useContext(CommandPaletteCtx);

type Command = { label: string; icon: LucideIcon; href: string; hint?: string; group: string };

const staticCommands: Command[] = [
  { label: 'Create Resume from Scratch',   icon: Plus,      href: '/eleva/editor',        hint: '⌘N', group: 'AI Actions' },
  { label: 'Optimize Resume for Job',      icon: Wand2,     href: '/eleva/studio',        hint: '⌘O', group: 'AI Actions' },
  { label: 'Generate Cover Letter',        icon: Mail,      href: '/eleva/cover-letters', hint: '⌘L', group: 'AI Actions' },
  { label: 'Run ATS Check',                icon: Target,    href: '/eleva/ats',           hint: '⌘A', group: 'AI Actions' },
  { label: 'Upload Resume',                icon: Upload,    href: '/eleva/resumes',       hint: '⌘U', group: 'AI Actions' },
  { label: 'Go to Dashboard',              icon: BarChart3, href: '/eleva/dashboard',     group: 'Navigate' },
  { label: 'Open Applications Kanban',     icon: Briefcase, href: '/eleva/applications',  group: 'Navigate' },
  { label: 'Browse Templates',             icon: Palette,   href: '/eleva/templates',     group: 'Navigate' },
  { label: 'View Analytics',               icon: BarChart3, href: '/eleva/analytics',     group: 'Navigate' },
  { label: 'Open Settings',                icon: Settings,  href: '/eleva/settings',      group: 'Navigate' },
  { label: 'Resumes Library',              icon: FileText,  href: '/eleva/resumes',       group: 'Navigate' },
];

type SearchResults = {
  resumes:       Array<{ id: string; name: string; target_role: string | null; updated_at: string }>;
  applications:  Array<{ id: string; company: string; role: string; status: string; updated_at: string }>;
  cover_letters: Array<{ id: string; company: string; role: string; created_at: string }>;
  ats_scores:    Array<{ id: string; overall: number; resume_id: string; created_at: string }>;
  templates:     Array<{ id: string; name: string; category: string; description: string }>;
};

const emptyResults: SearchResults = { resumes: [], applications: [], cover_letters: [], ats_scores: [], templates: [] };

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const open = useCallback(() => { setIsOpen(true); setQuery(''); setSelected(0); }, []);
  const close = useCallback(() => setIsOpen(false), []);

  // Keyboard shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((v) => !v);
      } else if (e.key === 'Escape' && isOpen) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  // Search debounced
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 1) { setResults(emptyResults); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/eleva/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults((await res.json()).results as SearchResults);
      } finally { setLoading(false); }
    }, 180);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const filteredStatic = useMemo(() => {
    if (!query) return staticCommands;
    const q = query.toLowerCase();
    return staticCommands.filter((c) => c.label.toLowerCase().includes(q));
  }, [query]);

  // Build combined list
  type Row = { label: string; sub?: string; icon: LucideIcon; href: string; hint?: string; group: string; badge?: string };
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    if (query) {
      results.resumes.forEach((r) => out.push({ label: r.name || 'Untitled', sub: r.target_role ?? '', icon: FileText, href: `/eleva/editor?id=${r.id}`, group: 'Resumes', badge: 'resume' }));
      results.applications.forEach((a) => out.push({ label: `${a.role} · ${a.company}`, sub: a.status, icon: Briefcase, href: `/eleva/applications`, group: 'Applications', badge: a.status }));
      results.cover_letters.forEach((c) => out.push({ label: `Cover letter · ${c.company}`, sub: c.role, icon: Mail, href: `/eleva/cover-letters`, group: 'Cover letters' }));
      results.ats_scores.forEach((a) => out.push({ label: `ATS ${a.overall}%`, sub: new Date(a.created_at).toLocaleString(), icon: Target, href: `/eleva/ats`, group: 'ATS reports' }));
      results.templates.forEach((t) => out.push({ label: t.name, sub: t.description.slice(0, 60), icon: Palette, href: `/eleva/templates`, group: 'Templates' }));
    }
    filteredStatic.forEach((c) => out.push({ label: c.label, icon: c.icon, href: c.href, hint: c.hint, group: c.group }));
    return out;
  }, [query, results, filteredStatic]);

  // Group for display
  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      if (!map.has(r.group)) map.set(r.group, []);
      map.get(r.group)!.push(r);
    }
    return Array.from(map.entries());
  }, [rows]);

  const go = (href: string) => { close(); router.push(href); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, rows.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(0, s - 1)); }
      else if (e.key === 'Enter') { e.preventDefault(); const r = rows[selected]; if (r) go(r.href); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, rows, selected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setSelected(0); }, [query]);

  let rowIndex = 0;

  return (
    <CommandPaletteCtx.Provider value={{ open, close }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" style={{ background: 'rgba(2,6,23,0.45)', backdropFilter: 'blur(6px)' }} onClick={close} data-testid="command-palette-overlay">
            <motion.div initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }} className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))', boxShadow: '0 30px 80px -20px rgba(2,6,23,0.35)' }} onClick={(e) => e.stopPropagation()} data-testid="command-palette-modal">
              <div className="flex items-center gap-3 px-4 h-14 border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'rgb(var(--eleva-muted-fg))' }} /> : <Search className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />}
                <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search resumes, applications, templates, or type a command…" className="flex-1 bg-transparent outline-none text-[15px]" style={{ color: 'rgb(var(--eleva-fg))' }} data-testid="command-palette-input" />
                <span className="eleva-kbd">ESC</span>
              </div>
              <div className="max-h-[480px] overflow-y-auto p-2">
                {grouped.length === 0 ? (
                  <div className="text-center text-sm py-12" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                    No matches for &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  grouped.map(([groupName, groupRows]) => (
                    <div key={groupName} className="mb-2">
                      <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{groupName}</div>
                      {groupRows.map((item) => {
                        const idx = rowIndex++;
                        const isActive = idx === selected;
                        const Icon = item.icon;
                        return (
                          <button key={groupName + item.label + idx} onMouseEnter={() => setSelected(idx)} onClick={() => go(item.href)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors" style={{ background: isActive ? 'rgb(var(--eleva-muted))' : 'transparent', color: 'rgb(var(--eleva-fg))' }}>
                            <div className="w-7 h-7 flex items-center justify-center rounded-md shrink-0" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-primary))' }}>
                              <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium truncate">{item.label}</div>
                              {item.sub && <div className="text-[11px] truncate" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{item.sub}</div>}
                            </div>
                            {item.badge && <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>{item.badge}</span>}
                            {item.hint && <span className="eleva-kbd">{item.hint}</span>}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between px-4 h-10 border-t text-[11px]" style={{ borderColor: 'rgb(var(--eleva-border))', color: 'rgb(var(--eleva-muted-fg))' }}>
                <div className="flex items-center gap-3">
                  <span><span className="eleva-kbd">↑</span> <span className="eleva-kbd">↓</span> navigate</span>
                  <span><span className="eleva-kbd">↵</span> select</span>
                </div>
                <span className="font-mono">Eleva · Search v2</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CommandPaletteCtx.Provider>
  );
}

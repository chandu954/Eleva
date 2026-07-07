'use client';

import { Search, Sparkles, Sun, Moon, Menu } from 'lucide-react';
import { useElevaTheme } from './theme-provider';
import { useCommandPalette } from './command-palette';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { NotificationBell } from './notification-bell';

export function ElevaHeader() {
  const { theme, toggle } = useElevaTheme();
  const { open } = useCommandPalette();

  return (
    <header
      className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 lg:px-8 border-b backdrop-blur-xl"
      style={{
        borderColor: 'rgb(var(--eleva-border))',
        background: 'rgba(var(--eleva-bg), 0.7)',
      }}
      data-testid="eleva-header"
    >
      <button
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg"
        style={{ background: 'rgb(var(--eleva-muted))' }}
        data-testid="mobile-menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      <button
        onClick={open}
        data-testid="command-palette-trigger"
        className="group flex-1 max-w-xl h-10 flex items-center gap-2.5 px-3.5 rounded-xl border transition-all hover:border-[rgb(var(--eleva-primary))]/40"
        style={{
          background: 'rgb(var(--eleva-muted))',
          borderColor: 'rgb(var(--eleva-border))',
          color: 'rgb(var(--eleva-muted-fg))',
        }}
      >
        <Search className="w-4 h-4" strokeWidth={1.75} />
        <span className="text-sm font-medium">Search resumes, jobs, AI commands…</span>
        <div className="ml-auto flex items-center gap-1">
          <span className="eleva-kbd">⌘</span>
          <span className="eleva-kbd">K</span>
        </div>
      </button>

      <div className="hidden md:flex items-center gap-2 ml-auto">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="hidden lg:flex items-center gap-1.5 h-9 px-3 rounded-lg cursor-pointer"
          style={{
            background:
              'linear-gradient(135deg, rgba(37,99,235,.12), rgba(124,58,237,.12))',
            border: '1px solid rgba(37,99,235,.25)',
          }}
          data-testid="credits-pill"
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-primary))' }} />
          <span className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-primary))' }}>
            2,480 credits
          </span>
        </motion.div>

        <button
          onClick={toggle}
          data-testid="theme-toggle"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[rgb(var(--eleva-muted))]"
          style={{ color: 'rgb(var(--eleva-muted-fg))' }}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" strokeWidth={1.75} /> : <Sun className="w-4 h-4" strokeWidth={1.75} />}
        </button>

        <NotificationBell />

        <UserMenu />
      </div>
    </header>
  );
}

function UserMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ email: string | null; initials: string }>({ email: null, initials: 'EL' });

  useEffect(() => {
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    sb.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        const initials = data.user.email.slice(0, 2).toUpperCase();
        setUser({ email: data.user.email, initials });
      }
    });
  }, []);

  async function signOut() {
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    await sb.auth.signOut();
    window.location.href = '/eleva';
  }

  if (!user.email) {
    return (
      <a href="/eleva/auth/login" className="eleva-btn-primary text-[12px]">Sign in</a>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }} data-testid="user-avatar">
        {user.initials}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 rounded-xl overflow-hidden shadow-xl z-50" style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))' }}>
            <div className="p-3 border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
              <div className="text-[11px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Signed in as</div>
              <div className="text-[13px] font-medium truncate" style={{ color: 'rgb(var(--eleva-fg))' }}>{user.email}</div>
            </div>
            <a href="/eleva/settings" className="block px-3 py-2 text-[13px] hover:bg-[rgb(var(--eleva-muted))]" style={{ color: 'rgb(var(--eleva-fg))' }}>Settings</a>
            <a href="/eleva/analytics" className="block px-3 py-2 text-[13px] hover:bg-[rgb(var(--eleva-muted))]" style={{ color: 'rgb(var(--eleva-fg))' }}>Analytics</a>
            <a href="/eleva/templates" className="block px-3 py-2 text-[13px] hover:bg-[rgb(var(--eleva-muted))]" style={{ color: 'rgb(var(--eleva-fg))' }}>Templates</a>
            <button onClick={signOut} className="w-full text-left px-3 py-2 text-[13px] border-t hover:bg-[rgb(var(--eleva-muted))]" style={{ color: 'rgb(var(--eleva-fg))', borderColor: 'rgb(var(--eleva-border))' }}>Sign out</button>
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Bell, CheckCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../_lib/use-notifications';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { items, unread, markRead, markAllRead } = useNotifications();

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[rgb(var(--eleva-muted))]" style={{ color: 'rgb(var(--eleva-muted-fg))' }} data-testid="notifications-button" aria-label="Notifications">
        <Bell className="w-4 h-4" strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full text-[9px] font-mono font-medium text-white flex items-center justify-center" style={{ background: 'rgb(var(--eleva-primary))' }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-0 top-full mt-2 w-80 max-h-[500px] rounded-xl overflow-hidden shadow-2xl z-50 flex flex-col" style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))' }}>
              <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Inbox</div>
                  <div className="font-display text-[15px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{unread} unread</div>
                </div>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-[11px] inline-flex items-center gap-1" style={{ color: 'rgb(var(--eleva-primary))' }}><CheckCheck className="w-3 h-3" />Mark all</button>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                {items.length === 0 ? (
                  <div className="p-8 text-center">
                    <Sparkles className="w-6 h-6 mx-auto mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                    <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>All clear</div>
                    <div className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Real-time updates appear here.</div>
                  </div>
                ) : (
                  items.map((n) => (
                    <Link key={n.id} href={n.href || '#'} onClick={() => { markRead(n.id); setOpen(false); }} className="block px-3 py-2.5 border-b transition-colors" style={{ borderColor: 'rgb(var(--eleva-border))', background: n.read ? 'transparent' : 'rgba(37,99,235,0.06)' }}>
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="w-1.5 h-1.5 mt-2 rounded-full shrink-0" style={{ background: 'rgb(var(--eleva-primary))' }} />}
                        <div className={n.read ? 'ml-3.5 flex-1 min-w-0' : 'flex-1 min-w-0'}>
                          <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{n.title}</div>
                          {n.body && <div className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{n.body}</div>}
                          <div className="text-[10px] font-mono mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

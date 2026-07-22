'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export type Notification = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  created_at: string;
};

function useSupabaseBrowser() {
  const ref = useRef<ReturnType<typeof createBrowserClient> | null>(null);
  if (!ref.current) {
    ref.current = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return ref.current;
}

export function useNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useSupabaseBrowser();

  async function getUserId(): Promise<string | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      return user?.user?.id ?? null;
    } catch {
      return null;
    }
  }

  const fetchNotifs = useCallback(async () => {
    let userId: string | null = null;
    try {
      const { data: user } = await supabase.auth.getUser();
      userId = user?.user?.id ?? null;
    } catch {
      userId = null;
    }
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30);
    setItems((data ?? []) as Notification[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let sub: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      const userId = await getUserId();
      if (!userId) { setLoading(false); return; }
      await fetchNotifs();
      if (cancelled) return;
      sub = supabase
        .channel(`notif:${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload: { new: Record<string, unknown> }) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev].slice(0, 30));
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload: { new: Record<string, unknown> }) => {
          const u = payload.new as Notification;
          setItems((prev) => prev.map((p) => (p.id === u.id ? u : p)));
        })
        .subscribe();
    })();
    return () => { cancelled = true; if (sub) supabase.removeChannel(sub); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  }, [supabase]);

  const markAllRead = useCallback(async () => {
    const unread = items.filter((n) => !n.read).map((n) => n.id);
    if (!unread.length) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from('notifications').update({ read: true }).in('id', unread);
  }, [items, supabase]);

  const unread = items.filter((n) => !n.read).length;

  return { items, unread, loading, markRead, markAllRead, refetch: fetchNotifs };
}

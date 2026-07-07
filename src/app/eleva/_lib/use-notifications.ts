'use client';

import { useEffect, useState, useCallback } from 'react';
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

export function useNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const fetchNotifs = useCallback(async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setLoading(false); return; }
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.user.id).order('created_at', { ascending: false }).limit(30);
    setItems((data ?? []) as Notification[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let sub: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) { setLoading(false); return; }
      await fetchNotifs();
      if (cancelled) return;
      sub = supabase
        .channel(`notif:${user.user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.user.id}` }, (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev].slice(0, 30));
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.user.id}` }, (payload) => {
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

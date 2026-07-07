'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type AtsScore = { id: string; user_id: string; resume_id: string; overall: number; keyword: number; formatting: number; readability: number; impact: number; recruiter: number; created_at: string };
type Resume = { id: string; user_id: string; name: string; target_role: string | null; updated_at: string; is_base_resume: boolean; document_settings?: { template?: string } | null; professional_summary?: string | null };

export function useRealtimeResumes(initial: Resume[] = []) {
  const [items, setItems] = useState<Resume[]>(initial);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const refetch = useCallback(async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    const { data } = await supabase.from('resumes').select('id, user_id, name, target_role, updated_at, is_base_resume').eq('user_id', userRes.user.id).order('updated_at', { ascending: false });
    if (data) setItems(data as Resume[]);
  }, [supabase]);

  useEffect(() => {
    let sub: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user || cancelled) return;
      sub = supabase
        .channel(`resumes:${userRes.user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'resumes', filter: `user_id=eq.${userRes.user.id}` }, (p) => setItems((prev) => [p.new as Resume, ...prev]))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'resumes', filter: `user_id=eq.${userRes.user.id}` }, (p) => setItems((prev) => prev.map((r) => (r.id === (p.new as Resume).id ? (p.new as Resume) : r))))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'resumes', filter: `user_id=eq.${userRes.user.id}` }, (p) => setItems((prev) => prev.filter((r) => r.id !== (p.old as Resume).id)))
        .subscribe();
    })();
    return () => { cancelled = true; if (sub) supabase.removeChannel(sub); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { items, refetch };
}

export function useRealtimeApplicationCount() {
  const [count, setCount] = useState<number | null>(null);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const refetch = useCallback(async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) { setCount(0); return; }
    const { count: c } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', userRes.user.id);
    setCount(c ?? 0);
  }, [supabase]);

  useEffect(() => {
    let sub: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user || cancelled) return;
      await refetch();
      sub = supabase
        .channel(`applications-count:${userRes.user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `user_id=eq.${userRes.user.id}` }, () => refetch())
        .subscribe();
    })();
    return () => { cancelled = true; if (sub) supabase.removeChannel(sub); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { count, refetch };
}

export function useRealtimeAts(initial: AtsScore[] = []) {
  const [items, setItems] = useState<AtsScore[]>(initial);
  const [latest, setLatest] = useState<AtsScore | null>(initial[0] ?? null);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  useEffect(() => {
    let sub: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user || cancelled) return;
      sub = supabase
        .channel(`ats:${userRes.user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ats_scores', filter: `user_id=eq.${userRes.user.id}` }, (p) => {
          const row = p.new as AtsScore;
          setItems((prev) => [row, ...prev].slice(0, 50));
          setLatest(row);
        })
        .subscribe();
    })();
    return () => { cancelled = true; if (sub) supabase.removeChannel(sub); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { items, latest };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/utils/supabase/server';
import type { AIPrompt, PromptCategory, PromptVersion, PromptExecution, PromptAnalytics, PromptTag } from '../types';

export async function getPromptCategories(): Promise<PromptCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('prompt_categories').select('*').order('sort_order');
  return (data ?? []) as PromptCategory[];
}

export async function getPrompts(categorySlug?: string, search?: string): Promise<AIPrompt[]> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  let query = supabase
    .from('ai_prompts')
    .select(`*, category:prompt_categories(*), is_favorite:prompt_favorites!left(user_id)`)
    .eq('is_active', true)
    .order('is_builtin', { ascending: false })
    .order('updated_at', { ascending: false });

  if (categorySlug) {
    query = query.eq('category.slug', categorySlug);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,system_prompt.ilike.%${search}%`);
  }

  const { data } = await query;
  const mapped = (data ?? []).map((r: any) => ({
    ...r,
    is_favorite: Array.isArray(r.is_favorite) ? r.is_favorite.some((f: any) => f?.user_id === user.user?.id) : !!r.is_favorite,
  })) as AIPrompt[];
  return mapped;
}

export async function getPrompt(id: string): Promise<AIPrompt | null> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  const { data } = await supabase
    .from('ai_prompts')
    .select(`*, category:prompt_categories(*), is_favorite:prompt_favorites!left(user_id)`)
    .eq('id', id)
    .single();
  if (!data) return null;
  return {
    ...data,
    is_favorite: Array.isArray((data as any).is_favorite) ? (data as any).is_favorite.some((f: any) => f?.user_id === user.user?.id) : !!(data as any).is_favorite,
  } as AIPrompt;
}

export async function getPromptByKey(key: string): Promise<AIPrompt | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('ai_prompts').select('*').eq('key', key).eq('is_active', true).single();
  return data as AIPrompt | null;
}

export async function getPromptVersions(promptId: string): Promise<PromptVersion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('prompt_versions')
    .select('*')
    .eq('prompt_id', promptId)
    .order('version', { ascending: false });
  return (data ?? []) as PromptVersion[];
}

export async function getPromptExecutions(promptId: string, limit = 50): Promise<PromptExecution[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('prompt_executions')
    .select('*')
    .eq('prompt_id', promptId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as PromptExecution[];
}

export async function getPromptAnalytics(promptId: string): Promise<PromptAnalytics> {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const iso = thirtyDaysAgo.toISOString();

  const { data: executions } = await supabase
    .from('prompt_executions')
    .select('*')
    .eq('prompt_id', promptId)
    .gte('created_at', iso)
    .order('created_at', { ascending: true });

  const list = (executions ?? []) as PromptExecution[];
  const total = list.length;
  const successes = list.filter((e) => e.success).length;
  const failures = list.filter((e) => !e.success).length;

  const dayMap: Record<string, number> = {};
  const weekMap: Record<string, number> = {};
  const monthMap: Record<string, number> = {};

  for (const e of list) {
    const d = e.created_at.slice(0, 10);
    dayMap[d] = (dayMap[d] || 0) + 1;
    const w = d.slice(0, 7);
    weekMap[w] = (weekMap[w] || 0) + 1;
    const m = d.slice(0, 7);
    monthMap[m] = (monthMap[m] || 0) + 1;
  }

  return {
    executions: total,
    successRate: total ? Math.round((successes / total) * 100) : 0,
    avgTokens: total ? Math.round(list.reduce((s, e) => s + e.tokens_input + e.tokens_output, 0) / total) : 0,
    avgCost: total ? list.reduce((s, e) => s + e.cost, 0) / total : 0,
    avgLatency: total ? Math.round(list.reduce((s, e) => s + e.latency_ms, 0) / total) : 0,
    failureRate: total ? Math.round((failures / total) * 100) : 0,
    lastUsed: list.length ? list[list.length - 1].created_at : null,
    dailyUsage: Object.entries(dayMap).map(([date, count]) => ({ date, count })),
    weeklyUsage: Object.entries(weekMap).map(([week, count]) => ({ week, count })),
    monthlyUsage: Object.entries(monthMap).map(([month, count]) => ({ month, count })),
  };
}

export async function getPromptTags(): Promise<PromptTag[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('prompt_tags').select('*').order('name');
  return (data ?? []) as PromptTag[];
}

import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { apiError } from '@/lib/api-response';

export const runtime = 'nodejs';

const createSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  status: z.enum(['wishlist', 'applied', 'interview', 'offer', 'rejected', 'archived']).default('wishlist'),
  location: z.string().optional(),
  salary: z.string().optional(),
  recruiter: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  job_description: z.string().optional(),
  job_url: z.string().optional(),
  notes: z.string().optional(),
  resume_id: z.string().uuid().optional(),
  cover_letter_id: z.string().uuid().nullable().optional(),
  source: z.string().optional(),
  match_score: z.number().int().min(0).max(100).nullable().optional(),
  ats_score: z.number().int().min(0).max(100).nullable().optional(),
  applied_at: z.string().datetime().nullable().optional(),
  interview_at: z.string().datetime().nullable().optional(),
  pinned: z.boolean().optional(),
  favorite: z.boolean().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return apiError('UNAUTHENTICATED', 'Not authenticated');
  const { data, error } = await supabase.from('applications').select('*').eq('user_id', userRes.user.id).order('updated_at', { ascending: false });
  if (error) return apiError('INTERNAL_ERROR', error.message);
  return Response.json({ applications: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return apiError('UNAUTHENTICATED', 'Not authenticated');
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return apiError('INVALID_BODY', 'Invalid request body', { detail: parsed.error.flatten() });
  const now = new Date().toISOString();
  const { data, error } = await supabase.from('applications').insert({ ...parsed.data, user_id: userRes.user.id, created_at: now, updated_at: now }).select().single();
  if (error) return apiError('INTERNAL_ERROR', error.message);
  await supabase.from('activity_log').insert({ user_id: userRes.user.id, kind: 'application_added', title: `${parsed.data.status === 'applied' ? 'Applied to' : 'Added'} ${parsed.data.company}`, subtitle: parsed.data.role });
  return Response.json({ application: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return apiError('UNAUTHENTICATED', 'Not authenticated');
  const body = (await req.json()) as { id: string; patch: Record<string, unknown> };
  if (!body?.id) return apiError('BAD_REQUEST', 'Missing id');
  const { data, error } = await supabase.from('applications').update({ ...body.patch, updated_at: new Date().toISOString() }).eq('id', body.id).eq('user_id', userRes.user.id).select().single();
  if (error) return apiError('INTERNAL_ERROR', error.message);
  return Response.json({ application: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return apiError('UNAUTHENTICATED', 'Not authenticated');
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return apiError('BAD_REQUEST', 'Missing id');
  const { error } = await supabase.from('applications').delete().eq('id', id).eq('user_id', userRes.user.id);
  if (error) return apiError('INTERNAL_ERROR', error.message);
  return Response.json({ ok: true });
}

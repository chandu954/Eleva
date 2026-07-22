import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

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
});

export async function GET() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const { data, error } = await supabase.from('applications').select('*').eq('user_id', userRes.user.id).order('updated_at', { ascending: false });
  if (error) return Response.json({ error: error.message, applications: [] }, { status: 500 });
  return Response.json({ applications: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'invalid_body', issues: parsed.error.flatten() }, { status: 400 });
  const now = new Date().toISOString();
  const { data, error } = await supabase.from('applications').insert({ ...parsed.data, user_id: userRes.user.id, created_at: now, updated_at: now }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await supabase.from('activity_log').insert({ user_id: userRes.user.id, kind: 'application_added', title: `Applied to ${parsed.data.company}`, subtitle: parsed.data.role });
  return Response.json({ application: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const body = (await req.json()) as { id: string; patch: Record<string, unknown> };
  if (!body?.id) return Response.json({ error: 'missing_id' }, { status: 400 });
  const { data, error } = await supabase.from('applications').update({ ...body.patch, updated_at: new Date().toISOString() }).eq('id', body.id).eq('user_id', userRes.user.id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ application: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'missing_id' }, { status: 400 });
  const { error } = await supabase.from('applications').delete().eq('id', id).eq('user_id', userRes.user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

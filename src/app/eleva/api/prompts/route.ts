import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  const category = searchParams.get('category');

  const base = supabase.from('ai_prompts').select('*, category:prompt_categories(*)').eq('is_active', true);

  if (key) {
    const { data, error } = await base.eq('key', key).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data);
  }

  let query = base.order('is_builtin', { ascending: false }).order('updated_at', { ascending: false });
  if (category) {
    query = base.eq('category.slug', category).order('updated_at', { ascending: false });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const { data, error } = await supabase.from('ai_prompts').insert({
    user_id: user.user.id,
    key: body.key || body.title.toLowerCase().replace(/\s+/g, '-'),
    title: body.title,
    description: body.description,
    system_prompt: body.system_prompt,
    user_prompt_template: body.user_prompt_template,
    model: body.model,
    temperature: body.temperature ?? 0.7,
    max_tokens: body.max_tokens ?? 4096,
    variables: body.variables || [],
    tags: body.tags || [],
    category_id: body.category_id,
    is_builtin: false,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

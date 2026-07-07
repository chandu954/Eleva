/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { AIProvider, z } from '@/lib/eleva-ai-provider';

export async function createPrompt(formData: FormData) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { error: 'Not authenticated' };

  const body = JSON.parse(formData.get('body') as string);
  const { data, error } = await supabase.from('ai_prompts').insert({
    user_id: user.user.id,
    category_id: body.category_id || null,
    key: body.key || body.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    title: body.title,
    description: body.description || null,
    system_prompt: body.system_prompt,
    user_prompt_template: body.user_prompt_template || null,
    model: body.model || null,
    temperature: body.temperature ?? 0.7,
    max_tokens: body.max_tokens ?? 4096,
    variables: body.variables || [],
    tags: body.tags || [],
    is_builtin: false,
    is_locked: false,
    editable_instructions: body.editable_instructions || null,
  }).select().single();

  if (error) return { error: error.message };
  revalidatePath('/eleva/prompt-studio');
  return { data };
}

export async function updatePrompt(id: string, formData: FormData) {
  const supabase = await createClient();
  const body = JSON.parse(formData.get('body') as string);

  const updates: Record<string, any> = {
    title: body.title,
    description: body.description,
    system_prompt: body.system_prompt,
    user_prompt_template: body.user_prompt_template,
    model: body.model,
    temperature: body.temperature,
    max_tokens: body.max_tokens,
    variables: body.variables,
    tags: body.tags,
    category_id: body.category_id,
    editable_instructions: body.editable_instructions,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase.from('ai_prompts').select('version').eq('id', id).single();
  if (existing) {
    updates.version = (existing.version ?? 0) + 1;
  }

  const { data, error } = await supabase.from('ai_prompts').update(updates).eq('id', id).select().single();
  if (error) return { error: error.message };

  await supabase.from('prompt_versions').insert({
    prompt_id: id,
    version: updates.version,
    system_prompt: body.system_prompt,
    user_prompt_template: body.user_prompt_template,
    model: body.model,
    temperature: body.temperature,
    max_tokens: body.max_tokens,
    variables: body.variables,
    change_description: body.change_description || null,
  });

  revalidatePath('/eleva/prompt-studio');
  return { data };
}

export async function duplicatePrompt(id: string) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { error: 'Not authenticated' };

  const { data: original } = await supabase.from('ai_prompts').select('*').eq('id', id).single();
  if (!original) return { error: 'Prompt not found' };

  const { data, error } = await supabase.from('ai_prompts').insert({
    user_id: user.user.id,
    category_id: original.category_id,
    key: `${original.key}-copy`,
    title: `${original.title} (Copy)`,
    description: original.description,
    system_prompt: original.system_prompt,
    user_prompt_template: original.user_prompt_template,
    model: original.model,
    temperature: original.temperature,
    max_tokens: original.max_tokens,
    variables: original.variables,
    tags: original.tags,
    is_builtin: false,
    is_locked: false,
    editable_instructions: original.editable_instructions,
  }).select().single();

  if (error) return { error: error.message };
  revalidatePath('/eleva/prompt-studio');
  return { data };
}

export async function deletePrompt(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('ai_prompts').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/eleva/prompt-studio');
  return { success: true };
}

export async function toggleFavorite(promptId: string) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { error: 'Not authenticated' };

  const { data: existing } = await supabase
    .from('prompt_favorites')
    .select('id')
    .eq('prompt_id', promptId)
    .eq('user_id', user.user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('prompt_favorites').delete().eq('id', existing.id);
    return { favorited: false };
  } else {
    await supabase.from('prompt_favorites').insert({ prompt_id: promptId, user_id: user.user.id });
    return { favorited: true };
  }
}

export async function restoreVersion(promptId: string, versionId: string) {
  const supabase = await createClient();
  const { data: ver } = await supabase.from('prompt_versions').select('*').eq('id', versionId).single();
  if (!ver) return { error: 'Version not found' };

  const formData = new FormData();
  formData.append('body', JSON.stringify({
    title: undefined,
    description: undefined,
    system_prompt: ver.system_prompt,
    user_prompt_template: ver.user_prompt_template,
    model: ver.model,
    temperature: ver.temperature,
    max_tokens: ver.max_tokens,
    variables: ver.variables,
    change_description: `Restored from version ${ver.version}`,
  }));

  return updatePrompt(promptId, formData);
}

export async function runPrompt(formData: FormData) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { error: 'Not authenticated' };

  const body = JSON.parse(formData.get('body') as string);
  const { promptId, variables, temperature, maxTokens } = body;

    const { data: prompt } = await supabase.from('ai_prompts').select('*').eq('id', promptId).single();
    if (!prompt) return { error: 'Prompt not found' };

    const startTime = Date.now();

    try {
      const systemPrompt = prompt.editable_instructions
        ? `${prompt.locked_sections || ''}\n\n${variables.instructions || prompt.editable_instructions}`
        : prompt.system_prompt;

      let userPrompt = prompt.user_prompt_template || '';
      for (const [k, v] of Object.entries(variables)) {
        if (k === 'instructions') continue;
        userPrompt = userPrompt.replaceAll(`{{${k}}}`, String(v ?? ''));
      }

      const aiRes = await AIProvider.generate({
        system: systemPrompt,
        prompt: userPrompt,
        temperature: temperature ?? prompt.temperature ?? 0.7,
        maxTokens: maxTokens ?? prompt.max_tokens ?? 4096,
        config: {
          plan: 'free',
          model: prompt.model ?? undefined,
          maxRetries: 3,
          timeout: 30000,
        },
      });

      const latency = Date.now() - startTime;
      const output = aiRes.text;

      // Provider currently returns usage.tokens but we avoid breaking schema if absent.
      const tokensIn = aiRes.usage?.promptTokens ?? 0;
      const tokensOut = aiRes.usage?.completionTokens ?? 0;
      const cost = 0;

    await supabase.from('prompt_executions').insert({
      prompt_id: promptId,
      user_id: user.user.id,
      version: prompt.version,
      input_variables: variables,
      output_text: output,
      model: prompt.model,
      temperature: temperature ?? prompt.temperature,
      max_tokens: maxTokens ?? prompt.max_tokens,
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      latency_ms: latency,
      cost,
      success: true,
    });

    await updatePromptStats(promptId, latency, tokensIn + tokensOut, cost, true);

    return { output, latency, tokensIn, tokensOut, cost, model: prompt.model };
  } catch (err: any) {
    await supabase.from('prompt_executions').insert({
      prompt_id: promptId,
      user_id: user.user.id,
      version: prompt.version,
      input_variables: variables,
      output_text: null,
      model: prompt.model,
      temperature: temperature ?? prompt.temperature,
      max_tokens: maxTokens ?? prompt.max_tokens,
      tokens_input: 0,
      tokens_output: 0,
      latency_ms: Date.now() - startTime,
      cost: 0,
      success: false,
      error_message: err.message,
    });

    await updatePromptStats(promptId, 0, 0, 0, false);
    return { error: err.message };
  }
}

async function updatePromptStats(promptId: string, latency: number, tokens: number, cost: number, success: boolean) {
  const supabase = await createClient();
  const { data: prompt } = await supabase.from('ai_prompts').select('usage_count, success_count, failure_count, avg_latency_ms, avg_tokens, avg_cost').eq('id', promptId).single();
  if (!prompt) return;

  const cnt = (prompt.usage_count || 0) + 1;
  const newAvgLatency = ((prompt.avg_latency_ms || 0) * (cnt - 1) + latency) / cnt;
  const newAvgTokens = ((prompt.avg_tokens || 0) * (cnt - 1) + tokens) / cnt;
  const newAvgCost = ((prompt.avg_cost || 0) * (cnt - 1) + cost) / cnt;

  await supabase.from('ai_prompts').update({
    usage_count: cnt,
    success_count: (prompt.success_count || 0) + (success ? 1 : 0),
    failure_count: (prompt.failure_count || 0) + (success ? 0 : 1),
    avg_latency_ms: Math.round(newAvgLatency * 100) / 100,
    avg_tokens: Math.round(newAvgTokens),
    avg_cost: Math.round(newAvgCost * 1000000) / 1000000,
  }).eq('id', promptId);
}

export async function optimizePrompt(formData: FormData) {
  const body = JSON.parse(formData.get('body') as string);
  const { system_prompt, title, description } = body;

  const schema = z.object({
    optimized: z.string(),
    explanation: z.string(),
    improvements: z.array(z.string()),
  });

  const result = await AIProvider.generateObject({
    system: 'You are an expert prompt engineer. Analyze and optimize the given prompt. Return ONLY valid JSON matching the requested schema.',
    prompt: `Title: ${title}\nDescription: ${description}\n\nCurrent Prompt:\n${system_prompt}\n\nOptimize this prompt for clarity, effectiveness, and reliability.`,
    schema,
    temperature: 0.3,
    maxTokens: 4096,
    config: {
      plan: 'free',
      maxRetries: 3,
      timeout: 30000,
    },
  });

  return result;
}

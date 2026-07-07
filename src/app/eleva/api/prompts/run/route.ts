import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AIProvider } from '@/lib/eleva-ai-provider';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { promptId, variables, model, temperature, maxTokens } = await req.json();

  const { data: prompt } = await supabase.from('ai_prompts').select('*').eq('id', promptId).single();
  if (!prompt) return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();
      let output = '';
      let tokensIn = 0;
      let tokensOut = 0;
      let cost = 0;

      try {
        const systemPrompt = prompt.editable_instructions
          ? `${prompt.locked_sections || ''}\n\n${variables.instructions || prompt.editable_instructions}`
          : prompt.system_prompt;

        let userPrompt = prompt.user_prompt_template || '';
        for (const [k, v] of Object.entries(variables)) {
          if (k === 'instructions') continue;
          userPrompt = userPrompt.replaceAll(`{{${k}}}`, String(v ?? ''));
        }

        const result = await AIProvider.generate({
          system: systemPrompt,
          prompt: userPrompt,
          temperature: temperature ?? prompt.temperature ?? 0.7,
          maxTokens: maxTokens ?? prompt.max_tokens ?? 4096,
          config: {
            model: model || prompt.model || undefined,
          },
        });

        output = result.text;

        const latency = Date.now() - startTime;

        // Emit tokens in chunks for streaming-like experience
        const words = output.split(' ');
        for (const word of words) {
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'token', content: word + ' ' }) + '\n'));
        }

        tokensIn = result.usage?.promptTokens || 0;
        tokensOut = result.usage?.completionTokens || 0;
        cost = (tokensIn * 0.000003) + (tokensOut * 0.000015);

        await supabase.from('prompt_executions').insert({
          prompt_id: promptId,
          user_id: user.user.id,
          version: prompt.version,
          input_variables: variables,
          output_text: output,
          model: model || prompt.model || result.model,
          temperature: temperature ?? prompt.temperature,
          max_tokens: maxTokens ?? prompt.max_tokens,
          tokens_input: tokensIn,
          tokens_output: tokensOut,
          latency_ms: latency,
          cost,
          success: true,
        });

        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'done',
          latency,
          tokensIn,
          tokensOut,
          cost,
          model: model || prompt.model || result.model,
        }) + '\n'));
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        await supabase.from('prompt_executions').insert({
          prompt_id: promptId,
          user_id: user.user.id,
          version: prompt.version,
          input_variables: variables,
          output_text: output || null,
          model: model || prompt.model,
          temperature: temperature ?? prompt.temperature,
          max_tokens: maxTokens ?? prompt.max_tokens,
          tokens_input: tokensIn,
          tokens_output: tokensOut,
          latency_ms: Date.now() - startTime,
          cost: 0,
          success: false,
          error_message: errorMessage,
        });

        controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: errorMessage }) + '\n'));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

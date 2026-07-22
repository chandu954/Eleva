import { NextRequest } from 'next/server';
import { AIProvider } from '@/lib/eleva-ai-provider';
import { buildRewritePrompt, makeSafeLocalRewrite, type RewriteMode, summarizeRewriteAttempts } from './rewrite-utils';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();

    const { bullet, role, jobDescription, mode } = body as {
      bullet?: string;
      role?: string;
      jobDescription?: string;
      mode?: RewriteMode;
    };

    if (!bullet || typeof bullet !== 'string' || !bullet.trim()) {
      return Response.json({
        success: false,
        error: 'Bullet text is required before rewriting.',
        missingField: 'bullet',
      }, { status: 400 });
    }

    const original = bullet.trim();
    const attempts: Array<{ attempt: number; model: string; status: 'success' | 'empty' | 'error' | 'fallback'; latencyMs: number; empty?: boolean; finishReason?: string; error?: string }> = [];

    const { system, prompt } = buildRewritePrompt({ bullet: original, role, jobDescription, mode });

    const candidateConfigs = [
      { plan: 'free' as const, maxRetries: 2, timeout: 20000 },
      { plan: 'free' as const, maxRetries: 1, timeout: 20000 },
    ];

    let rewritten = '';
    let lastError: string | null = null;

    for (const [index, config] of candidateConfigs.entries()) {
      const attempt = index + 1;
      const attemptStart = Date.now();
      try {
        const result = await AIProvider.generate({
          system,
          prompt,
          config,
          temperature: 0.6,
          maxTokens: 320,
        });
        const candidate = result.text?.trim() ?? '';
        attempts.push({
          attempt,
          model: result.model,
          status: candidate ? 'success' : 'empty',
          latencyMs: Date.now() - attemptStart,
          empty: !candidate,
          finishReason: result.finishReason,
        });
        if (candidate) {
          rewritten = candidate;
          break;
        }
        lastError = 'AI returned an empty response.';
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        attempts.push({ attempt, model: 'unknown', status: 'error', latencyMs: Date.now() - attemptStart, error: message });
        lastError = message;
      }
    }

    if (!rewritten) {
      rewritten = makeSafeLocalRewrite(original, mode);
      if (rewritten) {
        attempts.push({ attempt: attempts.length + 1, model: 'local-fallback', status: 'fallback', latencyMs: 0 });
      }
    }

    if (!rewritten) {
      const latency = Date.now() - startTime;
      console.error('[rewrite] failed', JSON.stringify({ latency, attempts: summarizeRewriteAttempts(attempts) }));
      return Response.json({
        success: false,
        error: lastError || 'AI could not rewrite this bullet right now. Please try again.',
        attempts,
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      original,
      rewritten,
      attempts,
    });
  } catch (err) {
    const latency = Date.now() - startTime;
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[rewrite] error', { latency, error: message });
    return Response.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}

import { NextRequest } from 'next/server';
import { AIProvider } from '@/lib/eleva-ai-provider';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { bullet, role, jobDescription } = (await req.json()) as {
    bullet: string;
    role?: string;
    jobDescription?: string;
  };

  const system = `${AIProvider.getSystemPrompt()}\n\nYou are rewriting a single resume bullet. Return ONLY the rewritten bullet — no preamble, no bullet symbol, no markdown.`;

  const prompt = `Rewrite this bullet to be stronger, add a metric, keep it truthful for a ${
    role ?? 'senior engineer'
  } role.${jobDescription ? `\n\nTarget JD context:\n${jobDescription.slice(0, 2000)}` : ''}\n\nOriginal: ${bullet}`;

  // Debug: ensure request is received and inputs are reasonable
  console.log('[eleva/rewrite] received', {
    role: role ?? null,
    bulletLen: bullet?.length ?? 0,
    hasJobDescription: !!jobDescription,
  });

  const stream = AIProvider.stream({
    system,
    prompt,
    config: {
      plan: 'free',
      maxRetries: 3,
      timeout: 30000,
    },
    temperature: 0.7,
    maxTokens: 300,
  });

  // Debug: track stream start (chunks are client-side decoded)
  console.log('[eleva/rewrite] streaming started');

  return stream.toTextStreamResponse();
}

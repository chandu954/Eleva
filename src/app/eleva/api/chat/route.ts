import { NextRequest } from 'next/server';
import { AIProvider } from '@/lib/eleva-ai-provider';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body as { messages?: { role: string; content: string }[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = await AIProvider.stream({
      system: `${AIProvider.getSystemPrompt()}\n\nYou are the Eleva Copilot — a sharp AI career assistant. Answer concisely. Use markdown for structure. When the user asks to rewrite a bullet, produce ONE stronger version with a metric. When they ask for ATS, request they paste the JD. When they ask for a cover letter, request company/role and draft it.`,
      messages: messages.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
      maxTokens: 1000,
    });

    return stream.toDataStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

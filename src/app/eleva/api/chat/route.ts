import { NextRequest } from 'next/server';
import { AIProvider } from '@/lib/eleva-ai-provider';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ClientMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: ClientMessage[] };

  const stream = AIProvider.stream({
    system: `${AIProvider.getSystemPrompt()}\n\nYou are the Eleva Copilot — a sharp AI career assistant. Answer concisely. Use markdown for structure. When the user asks to rewrite a bullet, produce ONE stronger version with a metric. When they ask for ATS, request they paste the JD. When they ask for a cover letter, request company/role and draft it.`,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    maxTokens: 1000,
  });

  return stream.toDataStreamResponse();
}

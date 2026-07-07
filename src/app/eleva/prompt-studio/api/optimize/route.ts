import { NextRequest, NextResponse } from 'next/server';
import { AIProvider, z } from '@/lib/eleva-ai-provider';

const optimizeSchema = z.object({
  optimized: z.string(),
  explanation: z.string(),
  improvements: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { system_prompt, title, description } = body;

  const system = `You are an expert prompt engineer. Analyze and optimize the given prompt.
Return ONLY JSON that matches the requested schema.`;

  const prompt = `Title: ${title}
Description: ${description}

Current Prompt:
${system_prompt}

Optimize this prompt for clarity, effectiveness, and reliability.`;

  const result = await AIProvider.generateObject({
    system,
    prompt,
    schema: optimizeSchema,
    temperature: 0.3,
    maxTokens: 4096,
    config: {
      plan: 'free',
      maxRetries: 3,
      timeout: 30000,
    },
  });

  return NextResponse.json(result);
}

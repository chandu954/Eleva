import { NextRequest } from 'next/server';
import { AIProvider, z } from '@/lib/eleva-ai-provider';

export const runtime = 'nodejs';
export const maxDuration = 45;

const bodySchema = z.object({
  company: z.string(),
  role: z.string(),
  tone: z.enum(['confident', 'friendly', 'technical', 'concise', 'warm']).default('confident'),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  achievements: z.string().optional(),
  jobDescription: z.string().optional(),
  resume: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: 'invalid_body', issues: parsed.error.flatten() }, { status: 400 });
  }
  const args = parsed.data;

  const wordCount = args.length === 'short' ? 180 : args.length === 'long' ? 420 : 280;
  const maxOut = args.length === 'short' ? 700 : args.length === 'long' ? 1400 : 1000;

  const prompt = [
    `Write a ${args.length} cover letter with a ${args.tone} tone for ${args.role} at ${args.company}.`,
    args.achievements ? `Weave in these achievements: ${args.achievements}` : '',
    args.jobDescription ? `Target JD:\n${args.jobDescription.slice(0, 3000)}` : '',
    args.resume ? `Candidate resume:\n${args.resume.slice(0, 3000)}` : '',
    'Open with a specific hook about the company. Close with a specific ask.',
  ].filter(Boolean).join('\n\n');

  const system = `${AIProvider.getSystemPrompt()}

Draft a cover letter. Output plain text only, no markdown, no headers, no signature block. Target ~${wordCount} words.`;

  const stream = AIProvider.stream({
    system,
    prompt,
    config: {
      plan: 'free',
      maxRetries: 3,
      timeout: 30000,
    },
    temperature: 0.7,
    maxTokens: maxOut,
  });

  return stream.toTextStreamResponse();
}

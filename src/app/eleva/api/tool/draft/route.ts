import { NextRequest } from 'next/server';
import { AIProvider, z } from '@/lib/eleva-ai-provider';

export const runtime = 'nodejs';
export const maxDuration = 45;

const bodySchema = z.object({
  company: z.string(),
  role: z.string(),
  tone: z.enum(['confident', 'friendly', 'technical', 'concise', 'warm']).default('confident'),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  focus: z.string().optional(),
  achievements: z.string().optional(),
  jobDescription: z.string().optional(),
  resume: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
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

COVER LETTER RULES:
- Output plain text only, no markdown, no headers, no signature block. Target ~${wordCount} words.
- Open with a specific hook about the company mentioned in the JD. Close with a specific ask.
- Use a ${args.tone} tone and ${args.length} length.
${args.focus ? `- Emphasize ${args.focus} in the body.` : ''}

FACTUAL ACCURACY RULES (override any other instruction):
- Extract experiences, skills, and achievements STRICTLY from the resume provided below.
- If a skill or achievement is not in the resume, DO NOT attribute it to the candidate.
- For missing requirements from the JD, use honest framing: "While my experience is in X, I am excited about Y."
- Never write "I mentored N engineers" unless the resume explicitly states mentoring with a number.
- Never write "I built [specific system]" unless the resume contains that exact project.
- Never write "reduced costs by X%" unless the resume contains that exact metric.
- If the resume is empty or unavailable, state that you only have the job description and write conservatively.`;

    const stream = await AIProvider.stream({
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}

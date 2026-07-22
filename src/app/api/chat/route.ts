import { ToolInvocation } from 'ai';
import { AIProvider } from '@/lib/eleva-ai-provider';
import { Resume, Job } from '@/lib/types';
import { type AIConfig } from '@/utils/ai-tools';
import { AI_ASSISTANT_SYSTEM_MESSAGE } from '@/lib/prompts';
import { AIUsageError } from '@/lib/ai/usage-ledger';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolInvocation[];
}

interface ChatRequest {
  messages: Message[];
  resume: Resume;
  target_role: string;
  config?: AIConfig;
  job?: Job;
}

  // OpenRouter client is now handled by the centralized AIProvider.


export async function POST(req: Request) {
  try {
    const requestBody = await req.json();
    const { messages, target_role, config, job, resume }: ChatRequest = requestBody;

    // Hard requirement: only OpenRouter FREE models.
    // Central AIProvider enforces free-only regardless of subscription.
    const aiConfig = { plan: 'free', model: config?.model };

    const baseSystemPrompt = config?.customPrompts?.aiAssistant
      ?? (AI_ASSISTANT_SYSTEM_MESSAGE.content as string);

    const systemPrompt = `${baseSystemPrompt}

      TOOL USAGE INSTRUCTIONS:
      1. For work experience improvements:
         - Use 'suggest_work_experience_improvement' with 'index' and 'improved_experience' fields
         - Always include company, position, date, and description
      
      2. For project improvements:
         - Use 'suggest_project_improvement' with 'index' and 'improved_project' fields
         - Always include name and description
      
      3. For skill improvements:
         - Use 'suggest_skill_improvement' with 'index' and 'improved_skill' fields
         - Only use for adding new or removing existing skills
      
      4. For education improvements:
         - Use 'suggest_education_improvement' with 'index' and 'improved_education' fields
         - Always include school, degree, field, and date
      
      5. For viewing resume sections:
         - Use 'getResume' with 'sections' array
         - Valid sections: 'all', 'personal_info', 'work_experience', 'education', 'skills', 'projects'

      6. For multiple section updates:
         - Use 'modifyWholeResume' when changing multiple sections at once

      Aim to use a maximum of 5 tools in one go, then confirm with the user if they would like you to continue.
      The target role is ${target_role}. The job is ${job ? JSON.stringify(job) : 'No job specified'}.
      Current resume summary: ${resume ? `${resume.first_name} ${resume.last_name} - ${resume.target_role}` : 'No resume data'}.
      `;


    const result = await AIProvider.stream({
      system: systemPrompt,
      messages,
      config: aiConfig,
    });

    return result.toDataStreamResponse({
      sendUsage: false,
      getErrorMessage: (error: unknown) => {
        if (!error) return 'Unknown error occurred';
        if (error instanceof Error) return error.message;
        return JSON.stringify(error);
      },
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    if (error instanceof AIUsageError) {
      const retryAfter = error.code === 'rate_limited'
        ? parseInt(error.message.match(/(\d+) seconds/)?.[1] ?? '60', 10)
        : undefined;

      return new Response(
        JSON.stringify({
          error: error.message,
          ...(retryAfter ? { expirationTimestamp: Date.now() + retryAfter * 1000 } : {}),
        }),
        {
          status: error.status,
          headers: {
            'Content-Type': 'application/json',
            ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}),
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

import { createClient } from '@/utils/supabase/server';

type PromptResult = {
  systemPrompt: string;
  userTemplate: string | null;
  model: string;
  temperature: number;
  maxTokens: number;
  variables: { name: string; description?: string }[];
};

const fallbackPrompts: Record<string, PromptResult> = {
  'eleva-system': {
    systemPrompt: `You are Eleva AI, a helpful career assistant embedded in the Eleva platform.
You help users build better resumes, prepare for interviews, optimize their LinkedIn, and land their dream jobs.
Be concise, professional, and actionable.`,
    userTemplate: null,
    model: 'anthropic/claude-sonnet-4.5',
    temperature: 0.7,
    maxTokens: 4096,
    variables: [],
  },
};

export async function getPromptByKey(key: string): Promise<PromptResult | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('key', key)
      .eq('is_active', true)
      .single();

    if (data) {
      return {
        systemPrompt: data.editable_instructions
          ? `${data.locked_sections || ''}\n\n${data.editable_instructions}`
          : data.system_prompt,
        userTemplate: data.user_prompt_template,
        model: data.model || 'anthropic/claude-sonnet-4.5',
        temperature: data.temperature ?? 0.7,
        maxTokens: data.max_tokens ?? 4096,
        variables: (data.variables as { name: string; description?: string }[]) || [],
      };
    }
  } catch {}

  return fallbackPrompts[key] || null;
}

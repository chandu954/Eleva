export interface PromptCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export interface AIPrompt {
  id: string;
  user_id: string | null;
  category_id: string | null;
  key: string;
  title: string;
  description: string | null;
  system_prompt: string;
  user_prompt_template: string | null;
  model: string | null;
  temperature: number | null;
  max_tokens: number | null;
  is_active: boolean;
  is_builtin: boolean;
  is_locked: boolean;
  locked_sections: string | null;
  editable_instructions: string | null;
  variables: PromptVariable[];
  tags: string[];
  usage_count: number;
  success_count: number;
  failure_count: number;
  avg_latency_ms: number;
  avg_tokens: number;
  avg_cost: number;
  version: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  category?: PromptCategory;
  is_favorite?: boolean;
}

export interface PromptVariable {
  name: string;
  description?: string;
  required?: boolean;
  default?: string;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  version: number;
  system_prompt: string;
  user_prompt_template: string | null;
  model: string | null;
  temperature: number | null;
  max_tokens: number | null;
  variables: PromptVariable[];
  change_description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PromptExecution {
  id: string;
  prompt_id: string;
  user_id: string;
  version: number;
  input_variables: Record<string, string>;
  output_text: string | null;
  model: string | null;
  temperature: number | null;
  max_tokens: number | null;
  tokens_input: number;
  tokens_output: number;
  latency_ms: number;
  cost: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface PromptTag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

export interface PromptAnalytics {
  executions: number;
  successRate: number;
  avgTokens: number;
  avgCost: number;
  avgLatency: number;
  failureRate: number;
  lastUsed: string | null;
  dailyUsage: { date: string; count: number }[];
  weeklyUsage: { week: string; count: number }[];
  monthlyUsage: { month: string; count: number }[];
}

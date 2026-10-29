// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import type {
  AIPrompt,
  PromptCategory,
  PromptTag,
  PromptVersion,
} from "@/app/eleva/prompt-studio/types";
import { PromptStudioClient } from "@/app/eleva/prompt-studio/prompt-studio-client";

export const categories: PromptCategory[] = [
  {
    id: "cat-resume",
    name: "Resume",
    slug: "resume",
    description: null,
    icon: "FileText",
    sort_order: 0,
  },
  {
    id: "cat-cover",
    name: "Cover Letter",
    slug: "cover-letter",
    description: null,
    icon: "Mail",
    sort_order: 1,
  },
];

export const tags: PromptTag[] = [
  { id: "tag-ats", name: "ATS", slug: "ats", color: null },
  { id: "tag-email", name: "Email", slug: "email", color: null },
];

export const version: PromptVersion = {
  id: "ver-1",
  prompt_id: "prompt-1",
  version: 1,
  system_prompt: "You are a resume writer.",
  user_prompt_template: "Write for {{role}}",
  model: "openrouter/free",
  temperature: 0.7,
  max_tokens: 4096,
  variables: [],
  change_description: "Initial version",
  created_by: "user-1",
  created_at: "2026-01-01T00:00:00.000Z",
};

export const analytics = {
  executions: 5,
  successRate: 90,
  avgTokens: 120,
  avgCost: 0.0005,
  avgLatency: 250,
  failureRate: 10,
  lastUsed: null,
  dailyUsage: [],
  weeklyUsage: [],
  monthlyUsage: [],
};

export function makePrompt(overrides: Partial<AIPrompt> = {}): AIPrompt {
  return {
    id: "prompt-1",
    user_id: "user-1",
    category_id: "cat-resume",
    key: "resume-writer",
    title: "Resume Writer",
    description: "Write strong resumes",
    system_prompt: "You are a resume writer.",
    user_prompt_template: "Write for {{role}}",
    model: "openrouter/free",
    temperature: 0.7,
    max_tokens: 4096,
    is_active: true,
    is_builtin: false,
    is_locked: false,
    locked_sections: null,
    editable_instructions: null,
    variables: [{ name: "role", description: "Target role" }],
    tags: ["ats"],
    usage_count: 3,
    success_count: 3,
    failure_count: 0,
    avg_latency_ms: 100,
    avg_tokens: 50,
    avg_cost: 0,
    version: 1,
    metadata: {},
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

export const resumePrompt = makePrompt({
  id: "prompt-1",
  title: "Resume Writer",
  is_favorite: true,
  category: categories[0],
});

export const coverPrompt = makePrompt({
  id: "prompt-2",
  key: "cover-letter-pro",
  title: "Cover Letter Pro",
  description: "Write tailored cover letters",
  category_id: null,
  category: undefined,
  tags: ["email"],
  is_favorite: false,
  system_prompt: "You are a cover letter expert.",
});

export function setupClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

export function renderClient(prompts: AIPrompt[] = [resumePrompt, coverPrompt]) {
  return render(
    <PromptStudioClient
      initialPrompts={prompts}
      categories={categories}
      tags={tags}
    />
  );
}

export function cardFor(title: string) {
  const card = screen.getByText(title).closest(".group");
  if (!card) throw new Error(`Card not found for ${title}`);
  return within(card as HTMLElement);
}

export function formBody(formData: FormData) {
  return JSON.parse(String(formData.get("body")));
}

export function jsonResponse(data: unknown) {
  return { ok: true, json: async () => data } as unknown as Response;
}

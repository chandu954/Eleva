// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIPrompt } from "../types";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => (props: Record<string, unknown>) => {
        const {
          initial,
          animate,
          exit,
          transition,
          whileHover,
          whileTap,
          variants,
          layout,
          layoutId,
          ...rest
        } = props;
        void initial;
        void animate;
        void exit;
        void transition;
        void whileHover;
        void whileTap;
        void variants;
        void layout;
        void layoutId;
        return React.createElement(tag, rest);
      },
    }
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

vi.mock("../../_lib/ai-status", () => ({
  reportAiRun: vi.fn(),
  reportAiDone: vi.fn(),
}));

import { toast } from "sonner";
import { reportAiDone, reportAiRun } from "../../_lib/ai-status";
import { PromptPreview } from "./prompt-preview";

function makePrompt(overrides: Partial<AIPrompt> = {}): AIPrompt {
  return {
    id: "prompt-1",
    user_id: "user-1",
    category_id: "cat-resume",
    key: "resume-writer",
    title: "Resume Writer",
    description: "Write strong resumes",
    system_prompt: "You are a resume writer.",
    user_prompt_template: "Write for {{role}} at {{company}}",
    model: "openrouter/free",
    temperature: 0.5,
    max_tokens: 2048,
    is_active: true,
    is_builtin: false,
    is_locked: false,
    locked_sections: null,
    editable_instructions: null,
    variables: [
      { name: "role", description: "Target role" },
      { name: "company" },
    ],
    tags: [],
    usage_count: 0,
    success_count: 0,
    failure_count: 0,
    avg_latency_ms: 0,
    avg_tokens: 0,
    avg_cost: 0,
    version: 1,
    metadata: {},
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function streamResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  let index = 0;
  const reader = {
    read: vi.fn(async () => {
      if (index >= chunks.length) {
        return { done: true, value: undefined };
      }
      return {
        done: false,
        value: encoder.encode(chunks[index++]),
      };
    }),
  };
  return {
    ok: true,
    body: { getReader: () => reader },
  } as unknown as Response;
}

function setupClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

function runRequest(init?: RequestInit) {
  return JSON.parse(String(init?.body));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  setupClipboard();
});

describe("PromptPreview", () => {
  it("renders playground defaults and prompt variables", () => {
    render(<PromptPreview prompt={makePrompt()} />);

    expect(
      screen.getByRole("heading", { name: "Prompt Playground" })
    ).toBeInTheDocument();
    expect(screen.getByText("Test your prompt with sample inputs")).toBeInTheDocument();

    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toHaveValue("openrouter/free");
    const numbers = screen.getAllByRole("spinbutton");
    expect(numbers[0]).toHaveValue(0.5);
    expect(numbers[1]).toHaveValue(2048);

    expect(screen.getByText("Input Variables")).toBeInTheDocument();
    expect(screen.getByText("{{role}}")).toBeInTheDocument();
    expect(screen.getByText("Target role")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter value for role...")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter value for company...")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run Prompt/ })).toBeEnabled();
  });

  it("hides the variables section when the prompt has none", () => {
    render(<PromptPreview prompt={makePrompt({ variables: [] })} />);

    expect(screen.queryByText("Input Variables")).not.toBeInTheDocument();
    expect(screen.queryByText("{{role}}")).not.toBeInTheDocument();
  });

  it("streams output, records metrics, and reports AI status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      streamResponse([
        '{"type":"token","content":"Hello "}\n{"type":"token","content":"Ada"}\n',
        '{"type":"done","latency":123,"tokensIn":12,"tokensOut":34,"cost":0.000123,"model":"openrouter/free"}\n',
      ])
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<PromptPreview prompt={makePrompt()} />);

    fireEvent.change(screen.getByPlaceholderText("Enter value for role..."), {
      target: { value: "Engineer" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter value for company..."), {
      target: { value: "Acme" },
    });

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], {
      target: { value: "meta-llama/llama-3.3-70b-instruct:free" },
    });
    const numbers = screen.getAllByRole("spinbutton");
    fireEvent.change(numbers[0], { target: { value: "0.2" } });
    fireEvent.change(numbers[1], { target: { value: "512" } });

    fireEvent.click(screen.getByRole("button", { name: /Run Prompt/ }));

    expect(screen.getByText("Running...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Stop/ })).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("Hello Ada")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("123ms")).toBeInTheDocument());

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("34")).toBeInTheDocument();
    expect(screen.getByText("$0.000123")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run Prompt/ })).toBeEnabled();

    expect(fetchMock).toHaveBeenCalledWith(
      "/eleva/api/prompts/run",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(runRequest(fetchMock.mock.calls[0][1] as RequestInit)).toEqual({
      promptId: "prompt-1",
      variables: { role: "Engineer", company: "Acme" },
      model: "meta-llama/llama-3.3-70b-instruct:free",
      temperature: 0.2,
      maxTokens: 512,
    });

    expect(reportAiRun).toHaveBeenCalledWith("Running preset", "prompt-run");
    expect(reportAiDone).toHaveBeenCalledWith(
      "Prompt run",
      expect.any(Number),
      "prompt-run",
      false
    );
  });

  it("shows the server error message when the request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Prompt not found" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<PromptPreview prompt={makePrompt()} />);

    fireEvent.click(screen.getByRole("button", { name: /Run Prompt/ }));

    await screen.findByText("Prompt not found");
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run Prompt/ })).toBeEnabled();
    expect(reportAiDone).toHaveBeenCalledWith(
      "Prompt run",
      expect.any(Number),
      "prompt-run",
      true
    );
  });

  it("handles streamed error events and ignores malformed lines", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        streamResponse([
          '{"type":"token","content":"Partial output"}\nnot-json\n',
          '{"type":"error","message":"Model unavailable"}\n',
        ])
      )
    );
    render(<PromptPreview prompt={makePrompt()} />);

    fireEvent.click(screen.getByRole("button", { name: /Run Prompt/ }));

    await screen.findByText("Model unavailable");
    expect(screen.getByText("Partial output")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("shows a network error and recovers the run button", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network down"))
    );
    render(<PromptPreview prompt={makePrompt()} />);

    fireEvent.click(screen.getByRole("button", { name: /Run Prompt/ }));

    await screen.findByText("Network down");
    expect(screen.getByRole("button", { name: /Run Prompt/ })).toBeEnabled();
  });

  it("aborts an in-flight run from the stop button", async () => {
    let receivedSignal: AbortSignal | undefined;
    const fetchMock = vi.fn(
      (_input: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          receivedSignal = init?.signal ?? undefined;
          receivedSignal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<PromptPreview prompt={makePrompt()} />);

    fireEvent.click(screen.getByRole("button", { name: /Run Prompt/ }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Stop/ })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Stop/ }));

    expect(receivedSignal?.aborted).toBe(true);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Run Prompt/ })).toBeInTheDocument()
    );
    expect(screen.queryByText("Error")).not.toBeInTheDocument();
  });

  it("copies the streamed output to the clipboard", async () => {
    const writeText = setupClipboard();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        streamResponse(['{"type":"token","content":"Ready output"}\n'])
      )
    );
    render(<PromptPreview prompt={makePrompt()} />);

    fireEvent.click(screen.getByRole("button", { name: /Run Prompt/ }));
    await screen.findByText("Ready output");

    fireEvent.click(screen.getByRole("button", { name: /Copy/ }));

    expect(writeText).toHaveBeenCalledWith("Ready output");
    expect(toast.success).toHaveBeenCalledWith("Copied");
  });
});

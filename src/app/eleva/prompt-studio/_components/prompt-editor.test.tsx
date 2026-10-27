// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIPrompt, PromptCategory, PromptTag } from "../types";

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

vi.mock("../_lib/actions", () => ({
  createPrompt: vi.fn(),
}));

import { toast } from "sonner";
import * as actions from "../_lib/actions";
import { PromptEditor } from "./prompt-editor";

const categories: PromptCategory[] = [
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

const tags: PromptTag[] = [
  { id: "tag-ats", name: "ATS", slug: "ats", color: null },
  { id: "tag-email", name: "Email", slug: "email", color: null },
];

function makePrompt(overrides: Partial<AIPrompt> = {}): AIPrompt {
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

function renderEditor(prompt: AIPrompt = makePrompt()) {
  const onSave = vi.fn();
  const onDuplicate = vi.fn();
  const onDelete = vi.fn();
  const view = render(
    <PromptEditor
      prompt={prompt}
      onSave={onSave}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      categories={categories}
      tags={tags}
      loadState="idle"
    />
  );
  return { ...view, onSave, onDuplicate, onDelete };
}

function setupClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  setupClipboard();
});

describe("PromptEditor", () => {
  it("renders an existing prompt with its metadata and controls", () => {
    const prompt = makePrompt();
    const { container } = renderEditor(prompt);

    expect(screen.getByPlaceholderText("Prompt title")).toHaveValue(
      "Resume Writer"
    );
    expect(
      screen.getByPlaceholderText("Brief description of what this prompt does")
    ).toHaveValue("Write strong resumes");
    expect(
      screen.getByPlaceholderText(
        "Enter your system prompt here... Use {{variable_name}} for dynamic values."
      )
    ).toHaveValue("You are a resume writer.");
    expect(
      screen.getByPlaceholderText(
        "Template for the user message. E.g.: Generate a resume for {{role}} at {{company}}..."
      )
    ).toHaveValue("Write for {{role}}");
    expect(
      screen.getByText(
        `${prompt.system_prompt.length} chars · ~${Math.ceil(
          prompt.system_prompt.length / 4
        )} tokens`
      )
    ).toBeInTheDocument();

    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toHaveValue("cat-resume");
    expect(selects[1]).toHaveValue("openrouter/free");
    expect(container.querySelector('input[type="range"]')).toHaveValue("0.7");
    expect(screen.getByText("0.70")).toBeInTheDocument();
    expect(container.querySelector('input[type="number"]')).toHaveValue(4096);
    expect(screen.getByRole("button", { name: "ATS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save Changes/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Optimize/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Duplicate/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("edits every field and hands the full payload to onSave", () => {
    const { container, onSave } = renderEditor();

    fireEvent.change(screen.getByPlaceholderText("Prompt title"), {
      target: { value: "Senior Resume Writer" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Brief description of what this prompt does"),
      { target: { value: "Updated description" } }
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "Enter your system prompt here... Use {{variable_name}} for dynamic values."
      ),
      { target: { value: "Updated system prompt" } }
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "Template for the user message. E.g.: Generate a resume for {{role}} at {{company}}..."
      ),
      { target: { value: "Write for {{role}} at {{company}}" } }
    );

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "cat-cover" } });
    fireEvent.change(selects[1], {
      target: { value: "meta-llama/llama-3.3-70b-instruct:free" },
    });
    fireEvent.change(container.querySelector('input[type="range"]') as Element, {
      target: { value: "1.25" },
    });
    fireEvent.change(container.querySelector('input[type="number"]') as Element, {
      target: { value: "2048" },
    });

    fireEvent.click(screen.getByRole("button", { name: "ATS" }));
    fireEvent.click(screen.getByRole("button", { name: "Email" }));
    fireEvent.change(
      screen.getByPlaceholderText("What changed in this version?"),
      { target: { value: "Tightened instructions" } }
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/ }));

    expect(onSave).toHaveBeenCalledWith(
      "prompt-1",
      expect.objectContaining({
        title: "Senior Resume Writer",
        description: "Updated description",
        system_prompt: "Updated system prompt",
        user_prompt_template: "Write for {{role}} at {{company}}",
        model: "meta-llama/llama-3.3-70b-instruct:free",
        temperature: 1.25,
        max_tokens: 2048,
        category_id: "cat-cover",
        tags: ["email"],
        variables: [{ name: "role", description: "Target role" }],
        editable_instructions: "",
        change_description: "Tightened instructions",
      })
    );
  });

  it("creates a new prompt from the create form and supports cancel", async () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    vi.mocked(actions.createPrompt).mockResolvedValue({
      data: { id: "new-prompt" },
    });
    renderEditor(
      makePrompt({
        id: "",
        title: "",
        description: "",
        system_prompt: "",
        user_prompt_template: "",
        category_id: null,
        tags: [],
        variables: [],
      })
    );

    fireEvent.change(screen.getByPlaceholderText("Prompt title"), {
      target: { value: "Brand New Prompt" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        "Enter your system prompt here... Use {{variable_name}} for dynamic values."
      ),
      { target: { value: "New system prompt" } }
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(back).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Create Prompt/ }));

    await waitFor(() => expect(actions.createPrompt).toHaveBeenCalledTimes(1));
    const formData = vi.mocked(actions.createPrompt).mock.calls[0][0];
    expect(JSON.parse(String(formData.get("body")))).toEqual(
      expect.objectContaining({
        title: "Brand New Prompt",
        system_prompt: "New system prompt",
        tags: [],
        variables: [],
      })
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Prompt created")
    );
  });

  it("composes locked sections with editable instructions when saving", () => {
    const prompt = makePrompt({
      is_locked: true,
      locked_sections: "LOCKED RULES",
      editable_instructions: "Original instructions",
      system_prompt: "Original system prompt",
    });
    const { container, onSave } = renderEditor(prompt);

    expect(screen.getByText("Protected Prompt")).toBeInTheDocument();
    expect(screen.getByText("LOCKED RULES")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save Changes/ })).toBeDisabled();

    fireEvent.change(
      screen.getByPlaceholderText("Add your custom instructions here..."),
      { target: { value: "Edited instructions" } }
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "Enter your system prompt here... Use {{variable_name}} for dynamic values."
      ),
      { target: { value: "New system prompt" } }
    );

    fireEvent.submit(container.querySelector("#prompt-editor-form") as HTMLFormElement);

    expect(onSave).toHaveBeenCalledWith(
      "prompt-1",
      expect.objectContaining({
        editable_instructions: "Edited instructions",
        system_prompt:
          "LOCKED RULES\n\nEdited instructions\n\nNew system prompt",
      })
    );
  });

  it("hides delete for built-in prompts and wires duplicate", () => {
    const { onDuplicate } = renderEditor(makePrompt({ is_builtin: true }));

    expect(
      screen.queryByRole("button", { name: /Delete/ })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Duplicate/ }));
    expect(onDuplicate).toHaveBeenCalledWith("prompt-1");
  });

  it("deletes only after the confirmation is accepted", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { onDelete } = renderEditor();

    fireEvent.click(screen.getByRole("button", { name: /Delete/ }));
    expect(confirm).toHaveBeenCalledWith("Delete this prompt?");
    expect(onDelete).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: /Delete/ }));
    expect(onDelete).toHaveBeenCalledWith("prompt-1");
  });

  it("adds, edits, and removes variables", () => {
    const { onSave } = renderEditor(makePrompt({ variables: [] }));

    fireEvent.click(screen.getByRole("button", { name: /Add Variable/ }));
    fireEvent.click(screen.getByRole("button", { name: /Add Variable/ }));

    const nameInputs = screen.getAllByPlaceholderText("Variable name");
    const descriptionInputs = screen.getAllByPlaceholderText("Description");
    expect(nameInputs).toHaveLength(2);

    fireEvent.change(nameInputs[0], { target: { value: "company" } });
    fireEvent.change(descriptionInputs[0], {
      target: { value: "Target company" },
    });
    fireEvent.change(nameInputs[1], { target: { value: "tone" } });

    const firstRow = nameInputs[0].closest("div") as HTMLElement;
    fireEvent.click(within(firstRow).getByRole("button"));

    expect(screen.getAllByPlaceholderText("Variable name")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/ }));
    expect(onSave).toHaveBeenCalledWith(
      "prompt-1",
      expect.objectContaining({
        variables: [{ name: "tone", description: "" }],
      })
    );
  });

  it("inserts built-in variables into the system prompt and copies them", () => {
    const writeText = setupClipboard();
    renderEditor(
      makePrompt({ system_prompt: "Base prompt", variables: [] })
    );

    fireEvent.click(screen.getByRole("button", { name: /Variables/ }));
    expect(screen.getByText("No custom variables defined")).toBeInTheDocument();

    const variableLabel = screen.getByText("{{resume}}");
    const variableRow = variableLabel.closest("button") as HTMLElement;
    fireEvent.click(variableRow);

    expect(
      screen.getByPlaceholderText(
        "Enter your system prompt here... Use {{variable_name}} for dynamic values."
      )
    ).toHaveValue("{{resume}}Base prompt");

    const refreshedRow = screen
      .getByText("{{resume}}")
      .closest("button") as HTMLElement;
    fireEvent.contextMenu(refreshedRow);
    expect(writeText).toHaveBeenCalledWith("{{resume}}");
  });

  it("optimizes a prompt, applies the result, and supports rejecting it", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        optimized: "Optimized system prompt",
        explanation: "Clearer",
        improvements: ["Added structure", "Clarified tone"],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: /Optimize/ }));

    await screen.findByText("AI Optimized Prompt");
    expect(screen.getByText("Added structure")).toBeInTheDocument();
    expect(screen.getByText("Clarified tone")).toBeInTheDocument();

    const requestBody = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body instanceof FormData
        ? ((fetchMock.mock.calls[0][1] as RequestInit).body as FormData).get("body")
        : "")
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/eleva/prompt-studio/api/optimize",
      expect.objectContaining({ method: "POST" })
    );
    expect(requestBody).toEqual(
      expect.objectContaining({
        system_prompt: "You are a resume writer.",
        title: "Resume Writer",
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /Reject/ }));
    expect(screen.queryByText("AI Optimized Prompt")).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "Enter your system prompt here... Use {{variable_name}} for dynamic values."
      )
    ).toHaveValue("You are a resume writer.");

    fireEvent.click(screen.getByRole("button", { name: /Optimize/ }));
    await screen.findByText("AI Optimized Prompt");
    fireEvent.click(screen.getByRole("button", { name: /Accept/ }));

    expect(
      screen.getByPlaceholderText(
        "Enter your system prompt here... Use {{variable_name}} for dynamic values."
      )
    ).toHaveValue("Optimized system prompt");
    expect(toast.success).toHaveBeenCalledWith("Optimized prompt applied");
  });

  it("shows a toast when optimization fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("AI offline"))
    );
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: /Optimize/ }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("AI offline")
    );
    expect(screen.queryByText("AI Optimized Prompt")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Optimize/ })).not.toBeDisabled();
  });
});

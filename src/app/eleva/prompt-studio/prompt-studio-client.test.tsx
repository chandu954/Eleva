// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AIPrompt,
  PromptCategory,
  PromptTag,
  PromptVersion,
} from "./types";

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

vi.mock("./_lib/actions", () => ({
  toggleFavorite: vi.fn(),
  updatePrompt: vi.fn(),
  duplicatePrompt: vi.fn(),
  deletePrompt: vi.fn(),
  restoreVersion: vi.fn(),
  createPrompt: vi.fn(),
}));

import { toast } from "sonner";
import { PromptStudioClient } from "./prompt-studio-client";
import * as actions from "./_lib/actions";

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

const version: PromptVersion = {
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

const analytics = {
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

const resumePrompt = makePrompt({
  id: "prompt-1",
  title: "Resume Writer",
  is_favorite: true,
  category: categories[0],
});

const coverPrompt = makePrompt({
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

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(data: unknown) {
  return { ok: true, json: async () => data } as unknown as Response;
}

function setupClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

function renderClient(prompts: AIPrompt[] = [resumePrompt, coverPrompt]) {
  return render(
    <PromptStudioClient
      initialPrompts={prompts}
      categories={categories}
      tags={tags}
    />
  );
}

function cardFor(title: string) {
  const card = screen.getByText(title).closest(".group");
  if (!card) throw new Error(`Card not found for ${title}`);
  return within(card as HTMLElement);
}

function formBody(formData: FormData) {
  return JSON.parse(String(formData.get("body")));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  setupClipboard();

  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:mock"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });

  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("action=versions")) {
      return jsonResponse({ versions: [version] });
    }
    if (url.includes("action=analytics")) {
      return jsonResponse(analytics);
    }
    return jsonResponse({});
  });
  vi.stubGlobal("fetch", fetchMock);

  vi.mocked(actions.toggleFavorite).mockResolvedValue({ favorited: false });
  vi.mocked(actions.updatePrompt).mockResolvedValue({
    data: makePrompt({ title: "Updated Resume Writer" }),
  });
  vi.mocked(actions.duplicatePrompt).mockResolvedValue({
    data: makePrompt({
      id: "prompt-3",
      key: "resume-writer-copy",
      title: "Resume Writer (Copy)",
      is_favorite: false,
    }),
  });
  vi.mocked(actions.deletePrompt).mockResolvedValue({ success: true });
  vi.mocked(actions.restoreVersion).mockResolvedValue({
    data: makePrompt({ version: 2 }),
  });
  vi.mocked(actions.createPrompt).mockResolvedValue({
    data: makePrompt({ id: "prompt-new" }),
  });
});

describe("PromptStudioClient", () => {
  it("renders the prompt library and filters by search and category", () => {
    renderClient();

    expect(screen.getByText("Prompt Studio")).toBeInTheDocument();
    expect(screen.getByText("Resume Writer")).toBeInTheDocument();
    expect(screen.getByText("Cover Letter Pro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New Prompt/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Templates/ })).toBeInTheDocument();

    const search = screen.getByPlaceholderText("Search prompts... (⌘K)");
    fireEvent.change(search, { target: { value: "cover" } });
    expect(screen.queryByText("Resume Writer")).not.toBeInTheDocument();
    expect(screen.getByText("Cover Letter Pro")).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText("Search prompts... (⌘K)"),
      { target: { value: "ats" } }
    );
    expect(screen.getByText("Resume Writer")).toBeInTheDocument();
    expect(screen.queryByText("Cover Letter Pro")).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText("Search prompts... (⌘K)"),
      { target: { value: "does-not-exist" } }
    );
    expect(screen.getByText("No prompts found")).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText("Search prompts... (⌘K)"),
      { target: { value: "" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.getByText("Resume Writer")).toBeInTheDocument();
    expect(screen.queryByText("Cover Letter Pro")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.getByText("Cover Letter Pro")).toBeInTheDocument();
  });

  it("opens a prompt, loads versions and analytics, saves edits, and switches views", async () => {
    renderClient();

    fireEvent.click(screen.getByText("Resume Writer"));

    const titleInput = await screen.findByPlaceholderText("Prompt title");
    expect(titleInput).toHaveValue("Resume Writer");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual([
      "/eleva/prompt-studio/api?action=versions&promptId=prompt-1",
      "/eleva/prompt-studio/api?action=analytics&promptId=prompt-1",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(
      await screen.findByRole("heading", { name: "Prompt Playground" })
    ).toBeInTheDocument();
    expect(screen.getByText("{{role}}")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editor" }));
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(
      await screen.findByRole("heading", { name: "Version History" })
    ).toBeInTheDocument();
    expect(screen.getByText("1 version")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Analytics" }));
    expect(
      await screen.findByRole("heading", { name: "Prompt Analytics" })
    ).toBeInTheDocument();
    expect(screen.getByText("Executions")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editor" }));
    fireEvent.change(screen.getByPlaceholderText("Prompt title"), {
      target: { value: "Updated Resume Writer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() =>
      expect(actions.updatePrompt).toHaveBeenCalledWith(
        "prompt-1",
        expect.any(FormData)
      )
    );
    const formData = vi.mocked(actions.updatePrompt).mock.calls[0][1];
    expect(formBody(formData)).toEqual(
      expect.objectContaining({ title: "Updated Resume Writer" })
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Prompt saved")
    );
  });

  it("toggles favorites, duplicates prompts, and reports action errors", async () => {
    renderClient();

    fireEvent.click(cardFor("Resume Writer").getAllByRole("button")[0]);
    await waitFor(() =>
      expect(actions.toggleFavorite).toHaveBeenCalledWith("prompt-1")
    );
    expect(toast.success).toHaveBeenCalledWith("Removed from favorites");

    fireEvent.click(cardFor("Resume Writer").getAllByRole("button")[1]);
    expect(await screen.findByText("Resume Writer (Copy)")).toBeInTheDocument();
    expect(actions.duplicatePrompt).toHaveBeenCalledWith("prompt-1");
    expect(toast.success).toHaveBeenCalledWith("Prompt duplicated");

    vi.mocked(actions.toggleFavorite).mockResolvedValueOnce({
      error: "Favorite failed",
    });
    fireEvent.click(cardFor("Resume Writer").getAllByRole("button")[0]);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Favorite failed")
    );

    vi.mocked(actions.duplicatePrompt).mockResolvedValueOnce({
      error: "Duplicate failed",
    });
    fireEvent.click(cardFor("Resume Writer").getAllByRole("button")[1]);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Duplicate failed")
    );
  });

  it("creates a blank prompt, cancels it, and creates a new prompt", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    renderClient();

    fireEvent.click(screen.getByRole("button", { name: /New Prompt/ }));
    expect(
      screen.getByRole("button", { name: /Create Prompt/ })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(back).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /New Prompt/ }));
    fireEvent.change(screen.getByPlaceholderText("Prompt title"), {
      target: { value: "Imported Prompt" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create Prompt/ }));

    await waitFor(() => expect(actions.createPrompt).toHaveBeenCalledTimes(1));
    const formData = vi.mocked(actions.createPrompt).mock.calls[0][0];
    expect(formBody(formData)).toEqual(
      expect.objectContaining({ title: "Imported Prompt" })
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Prompt created")
    );
    consoleError.mockRestore();
  });

  it("searches templates and applies one to a new prompt", async () => {
    renderClient();

    fireEvent.click(screen.getByRole("button", { name: /Templates/ }));
    expect(
      await screen.findByRole("heading", { name: "Prompt Templates" })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search templates..."), {
      target: { value: "devops" },
    });
    expect(screen.getByText("DevOps / SRE")).toBeInTheDocument();
    expect(screen.queryByText("ATS Optimized")).not.toBeInTheDocument();

    fireEvent.click(
      cardFor("DevOps / SRE").getByRole("button", { name: /Apply/ })
    );

    expect(await screen.findByDisplayValue("DevOps / SRE")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Prompt Templates" })
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("combobox")[0]).toHaveValue("cat-resume");
    expect(
      (screen.getByPlaceholderText(
        "Enter your system prompt here... Use {{variable_name}} for dynamic values."
      ) as HTMLTextAreaElement).value
    ).toContain("DevOps and SRE roles");
    expect(toast.success).toHaveBeenCalledWith(
      'Applied "DevOps / SRE" template'
    );
  });

  it("exports and imports prompts from the import/export dialog", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const writeText = setupClipboard();
    const { container } = renderClient();

    fireEvent.click(screen.getByRole("button", { name: /Import\/Export/ }));
    expect(
      await screen.findByRole("heading", { name: "Import / Export" })
    ).toBeInTheDocument();

    expect(container.querySelector("pre")?.textContent).toContain(
      '"title": "Resume Writer"'
    );

    fireEvent.click(screen.getByRole("button", { name: /\.yaml/ }));
    expect(container.querySelector("pre")?.textContent).toContain(
      "- key: resume-writer"
    );
    fireEvent.click(screen.getByRole("button", { name: /\.txt/ }));
    expect(container.querySelector("pre")?.textContent).toContain(
      "=== Resume Writer ==="
    );
    fireEvent.click(screen.getByRole("button", { name: /\.json/ }));

    fireEvent.click(screen.getByRole("button", { name: /Download \.json/ }));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Exported successfully");

    fireEvent.click(screen.getByRole("button", { name: /^Copy$/ }));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('"title": "Resume Writer"')
    );
    expect(toast.success).toHaveBeenCalledWith("Copied to clipboard");

    fireEvent.click(screen.getByRole("button", { name: /^Import$/ }));
    const importInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const jsonFile = new File(
      [
        JSON.stringify([
          {
            title: "Imported Prompt",
            description: "From a file",
            system_prompt: "Imported system prompt",
            tags: ["imported"],
          },
        ]),
      ],
      "prompts.json",
      { type: "application/json" }
    );
    Object.defineProperty(jsonFile, "text", {
      value: vi
        .fn()
        .mockResolvedValue(
          JSON.stringify([
            {
              title: "Imported Prompt",
              description: "From a file",
              system_prompt: "Imported system prompt",
              tags: ["imported"],
            },
          ])
        ),
    });
    fireEvent.change(importInput, { target: { files: [jsonFile] } });

    await waitFor(() => expect(actions.createPrompt).toHaveBeenCalledTimes(1));
    expect(
      formBody(vi.mocked(actions.createPrompt).mock.calls[0][0])
    ).toEqual(
      expect.objectContaining({
        title: "Imported Prompt",
        system_prompt: "Imported system prompt",
        tags: ["imported"],
      })
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Imported 1 prompts")
    );

    const textFile = new File(["not json"], "prompts.txt", {
      type: "text/plain",
    });
    Object.defineProperty(textFile, "text", {
      value: vi.fn().mockResolvedValue("not json"),
    });
    fireEvent.change(
      container.querySelector('input[type="file"]') as HTMLInputElement,
      { target: { files: [textFile] } }
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Only JSON import is supported currently"
      )
    );
    consoleError.mockRestore();
  });

  it("focuses search with Cmd+K and surfaces save errors", async () => {
    renderClient();

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getAllByPlaceholderText(/Search prompts/)[0]).toHaveFocus();

    fireEvent.click(screen.getByText("Resume Writer"));
    await screen.findByPlaceholderText("Prompt title");

    vi.mocked(actions.updatePrompt).mockResolvedValueOnce({
      error: "Save failed",
    });
    fireEvent.change(screen.getByPlaceholderText("Prompt title"), {
      target: { value: "Cannot save this" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Save failed")
    );
    expect(
      screen.getByRole("button", { name: /Save Changes/ })
    ).not.toBeDisabled();
  });

  it("deletes prompts after confirmation and surfaces delete errors", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderClient();

    fireEvent.click(screen.getByText("Resume Writer"));
    await screen.findByPlaceholderText("Prompt title");
    fireEvent.click(screen.getByRole("button", { name: /Delete/ }));

    await waitFor(() =>
      expect(actions.deletePrompt).toHaveBeenCalledWith("prompt-1")
    );
    await waitFor(() =>
      expect(screen.queryByText("Resume Writer")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Cover Letter Pro")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("Prompt deleted");

    fireEvent.click(screen.getByText("Cover Letter Pro"));
    await screen.findByPlaceholderText("Prompt title");
    vi.mocked(actions.deletePrompt).mockResolvedValueOnce({
      error: "Delete failed",
    });
    fireEvent.click(screen.getByRole("button", { name: /Delete/ }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Delete failed")
    );
    expect(screen.getByPlaceholderText("Prompt title")).toHaveValue(
      "Cover Letter Pro"
    );
  });

  it("keeps the editor usable when version and analytics loading fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    renderClient();

    fireEvent.click(screen.getByText("Resume Writer"));
    expect(await screen.findByPlaceholderText("Prompt title")).toHaveValue(
      "Resume Writer"
    );

    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(
      await screen.findByText("No version history")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Analytics" }));
    expect(
      screen.queryByRole("heading", { name: "Prompt Analytics" })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editor" }));
    expect(screen.getByPlaceholderText("Prompt title")).toHaveValue(
      "Resume Writer"
    );
  });
});

// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/app/eleva/prompt-studio/_lib/actions", () => ({
  toggleFavorite: vi.fn(),
  updatePrompt: vi.fn(),
  duplicatePrompt: vi.fn(),
  deletePrompt: vi.fn(),
  restoreVersion: vi.fn(),
  createPrompt: vi.fn(),
}));

import { toast } from "sonner";
import * as actions from "@/app/eleva/prompt-studio/_lib/actions";
import {
  analytics,
  makePrompt,
  renderClient,
  version,
} from "@/test/prompt-studio-test-utils";

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(data: unknown) {
  return { ok: true, json: async () => data } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();

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

describe("PromptStudioClient — library and editor views", () => {
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
    expect(JSON.parse(String(formData.get("body")))).toEqual(
      expect.objectContaining({ title: "Updated Resume Writer" })
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Prompt saved")
    );
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

    const templateCard = screen.getByText("DevOps / SRE").closest(".group");
    if (!templateCard) throw new Error("Template card not found");
    fireEvent.click(
      within(templateCard as HTMLElement).getByRole("button", { name: /Apply/ })
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

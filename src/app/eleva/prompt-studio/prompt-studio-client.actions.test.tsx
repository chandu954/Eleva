// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from "@testing-library/react";
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
  cardFor,
  formBody,
  makePrompt,
  renderClient,
  setupClipboard,
  version,
} from "@/test/prompt-studio-test-utils";

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(data: unknown) {
  return { ok: true, json: async () => data } as unknown as Response;
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

describe("PromptStudioClient — prompt actions", () => {
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
});

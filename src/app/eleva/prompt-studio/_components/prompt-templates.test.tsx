// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { toast } from "sonner";
import { PromptTemplates } from "./prompt-templates";

function setupClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

function renderTemplates() {
  const onApply = vi.fn();
  const onClose = vi.fn();
  const view = render(<PromptTemplates onApply={onApply} onClose={onClose} />);
  return { ...view, onApply, onClose };
}

function cardFor(name: string) {
  const card = screen.getByText(name).closest(".group");
  if (!card) throw new Error(`Template card not found for ${name}`);
  return within(card as HTMLElement);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  setupClipboard();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PromptTemplates", () => {
  it("renders the template catalog with categories and tags", () => {
    renderTemplates();

    expect(
      screen.getByRole("heading", { name: "Prompt Templates" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Choose a preset template to get started")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search templates...")
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Apply/ })).toHaveLength(12);
    expect(screen.getByText("ATS Optimized")).toBeInTheDocument();
    expect(screen.getByText("DevOps / SRE")).toBeInTheDocument();
    expect(screen.getByText("Fresher / Entry Level")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.getByText("ats")).toBeInTheDocument();
  });

  it("searches templates by name, description, and tag", () => {
    renderTemplates();

    fireEvent.change(screen.getByPlaceholderText("Search templates..."), {
      target: { value: "devops" },
    });
    expect(screen.getByText("DevOps / SRE")).toBeInTheDocument();
    expect(screen.queryByText("ATS Optimized")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Apply/ })).toHaveLength(1);

    fireEvent.change(screen.getByPlaceholderText("Search templates..."), {
      target: { value: "ATS parser" },
    });
    expect(screen.getByText("ATS Optimized")).toBeInTheDocument();
    expect(screen.queryByText("DevOps / SRE")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search templates..."), {
      target: { value: "graduate" },
    });
    expect(screen.getByText("Fresher / Entry Level")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Apply/ })).toHaveLength(1);
  });

  it("shows an empty state when no template matches", () => {
    renderTemplates();

    fireEvent.change(screen.getByPlaceholderText("Search templates..."), {
      target: { value: "does-not-exist" },
    });

    expect(screen.getByText("No templates found")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Apply/ })
    ).not.toBeInTheDocument();
  });

  it("toggles the category filter", () => {
    renderTemplates();

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.getAllByRole("button", { name: /Apply/ })).toHaveLength(12);

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.getAllByRole("button", { name: /Apply/ })).toHaveLength(12);

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getAllByRole("button", { name: /Apply/ })).toHaveLength(12);
  });

  it("applies a template, closes, and confirms with a toast", () => {
    const { onApply, onClose } = renderTemplates();

    fireEvent.click(cardFor("ATS Optimized").getByRole("button", { name: /Apply/ }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "ats-optimized",
        name: "ATS Optimized",
        category: "Resume",
        tags: ["ats", "keywords", "formatting"],
        model: "anthropic/claude-sonnet-4.5",
        temperature: 0.3,
        maxTokens: 4096,
        systemPrompt: expect.stringContaining("ATS optimization expert"),
      })
    );
    expect(toast.success).toHaveBeenCalledWith(
      'Applied "ATS Optimized" template'
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("copies a template prompt and resets the copied indicator", async () => {
    vi.useFakeTimers();
    const writeText = setupClipboard();
    renderTemplates();

    fireEvent.click(cardFor("ATS Optimized").getByRole("button", { name: /Copy/ }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("ATS optimization expert")
    );
    expect(toast.success).toHaveBeenCalledWith("System prompt copied");
    expect(screen.getByText("Copied")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });

  it("closes from the X button and the backdrop but not inner clicks", () => {
    const { container, onClose } = renderTemplates();

    fireEvent.click(screen.getByText("Prompt Templates"));
    expect(onClose).not.toHaveBeenCalled();

    const closeButton = container.querySelector("button") as HTMLButtonElement;
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(container.firstElementChild as Element);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

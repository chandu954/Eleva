// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useState, type ReactNode } from "react";

import { DescriptionPoint } from "./description-point";

// Tiptap is a ProseMirror editor; model it as a plain textarea and surface the
// editor attributes so placeholder/class forwarding can be asserted.
vi.mock("@/components/ui/tiptap", () => ({
  default: ({
    content,
    onChange,
    editorProps,
  }: {
    content: string;
    onChange?: (value: string) => void;
    editorProps?: { attributes?: { placeholder?: string; class?: string } };
  }) => (
    <textarea
      aria-label="description point"
      data-placeholder={editorProps?.attributes?.placeholder}
      data-editor-class={editorProps?.attributes?.class}
      value={content}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

// Radix renders tooltip content in a portal only while open. The unit under
// test just wires the prompt into TooltipContent, so keep that content mounted.
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

function iconButton(scope: ParentNode, icon: string): HTMLButtonElement {
  const button = Array.from(scope.querySelectorAll("button")).find((candidate) =>
    candidate.querySelector(`svg.lucide-${icon}`)
  );
  if (!button) throw new Error(`No button with ${icon} icon found`);
  return button;
}

function createProps(overrides: Partial<Parameters<typeof DescriptionPoint>[0]> = {}) {
  return {
    value: "Built a **search** pipeline.",
    onChange: vi.fn(),
    onDelete: vi.fn(),
    onImprove: vi.fn(),
    onAcceptImprovement: vi.fn(),
    onUndoImprovement: vi.fn(),
    ...overrides,
  };
}

describe("DescriptionPoint", () => {
  it("renders the value and forwards edits through onChange", async () => {
    const user = userEvent.setup();
    const props = createProps();

    function Harness() {
      const [value, setValue] = useState(props.value);
      return (
        <DescriptionPoint
          {...props}
          value={value}
          onChange={(next) => {
            props.onChange(next);
            setValue(next);
          }}
        />
      );
    }

    render(<Harness />);
    const editor = screen.getByLabelText("description point");
    expect(editor).toHaveValue("Built a **search** pipeline.");
    expect(editor).toHaveAttribute("data-placeholder", "Start with a strong action verb");
    expect(editor.getAttribute("data-editor-class")).not.toContain("border-purple-400");

    await user.clear(editor);
    await user.type(editor, "Shipped faster");
    expect(props.onChange).toHaveBeenLastCalledWith("Shipped faster");
  });

  it("uses a custom placeholder when supplied", () => {
    render(<DescriptionPoint {...createProps()} placeholder="Describe the impact" />);

    expect(screen.getByLabelText("description point")).toHaveAttribute(
      "data-placeholder",
      "Describe the impact"
    );
  });

  it("removes a point via the trash button", async () => {
    const user = userEvent.setup();
    const props = createProps();
    const { container } = render(<DescriptionPoint {...props} />);

    await user.click(iconButton(container, "trash2"));

    expect(props.onDelete).toHaveBeenCalledTimes(1);
    expect(props.onImprove).not.toHaveBeenCalled();
  });

  it("requests an improvement via the sparkles button", async () => {
    const user = userEvent.setup();
    const props = createProps();
    const { container } = render(<DescriptionPoint {...props} />);

    expect(iconButton(container, "sparkles")).toBeEnabled();
    await user.click(iconButton(container, "sparkles"));

    expect(props.onImprove).toHaveBeenCalledTimes(1);
    expect(props.onAcceptImprovement).not.toHaveBeenCalled();
    expect(props.onUndoImprovement).not.toHaveBeenCalled();
  });

  it("disables improvement and swaps in a spinner while loading", async () => {
    const props = createProps({ isLoading: true });
    const { container } = render(<DescriptionPoint {...props} />);
    const improve = iconButton(container, "loader-circle");

    expect(improve).toBeDisabled();
    expect(improve.querySelector("svg")).toHaveClass("animate-spin");
    expect(container.querySelector("svg.lucide-sparkles")).toBeNull();
  });

  it("renders the AI suggestion state with accept and undo actions", async () => {
    const user = userEvent.setup();
    const props = createProps({ isImproved: true, value: "AI-written bullet" });
    const { container } = render(<DescriptionPoint {...props} />);

    expect(screen.getByText("AI Suggestion")).toBeInTheDocument();
    expect(
      screen.getByLabelText("description point").getAttribute("data-editor-class")
    ).toContain("border-purple-400");
    expect(container.querySelector("svg.lucide-trash2")).toBeNull();
    expect(container.querySelector("button svg.lucide-sparkles")).toBeNull();

    await user.click(iconButton(container, "check"));
    await user.click(iconButton(container, "x"));

    expect(props.onAcceptImprovement).toHaveBeenCalledTimes(1);
    expect(props.onUndoImprovement).toHaveBeenCalledTimes(1);
    expect(props.onImprove).not.toHaveBeenCalled();
  });

  it("forwards the improvement prompt, placeholder, and submit action", async () => {
    const user = userEvent.setup();
    const props = createProps({
      improvementPrompt: "Focus on metrics",
      onImprovementPromptChange: vi.fn(),
      improvementPromptPlaceholder: "Add quantified impact",
    });
    render(<DescriptionPoint {...props} />);

    const prompt = screen.getByPlaceholderText("Add quantified impact");
    expect(prompt).toHaveValue("Focus on metrics");
    expect(screen.getByTestId("tooltip-content")).toBeInTheDocument();

    await user.type(prompt, "!");
    expect(props.onImprovementPromptChange).toHaveBeenCalledWith("Focus on metrics!");

    await user.click(screen.getByRole("button", { name: /Improve with AI/i }));
    expect(props.onImprove).toHaveBeenCalledTimes(1);
  });

  it("shows the loading state inside the improvement prompt", () => {
    const props = createProps({
      isLoading: true,
      improvementPrompt: "",
      onImprovementPromptChange: vi.fn(),
    });
    render(<DescriptionPoint {...props} />);

    const submit = screen.getByRole("button", { name: /Improving/i });
    expect(submit).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Improve with AI/i })).toBeNull();
  });

  it("omits the prompt UI when no change handler is provided", () => {
    render(<DescriptionPoint {...createProps()} />);

    expect(screen.queryByTestId("tooltip-content")).toBeNull();
    expect(screen.queryByPlaceholderText(/technical implementation/i)).toBeNull();
  });

  it("calls optional improved-state actions only when clicked", () => {
    const props = createProps({ isImproved: true });
    delete (props as { onAcceptImprovement?: unknown }).onAcceptImprovement;
    delete (props as { onUndoImprovement?: unknown }).onUndoImprovement;
    const { container } = render(<DescriptionPoint {...props} />);

    expect(iconButton(container, "check")).toBeInTheDocument();
    expect(iconButton(container, "x")).toBeInTheDocument();
  });
});

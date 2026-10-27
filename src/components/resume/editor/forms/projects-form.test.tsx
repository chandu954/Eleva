import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { Project, Profile } from "@/lib/types";

import { generateProjectPoints, improveProject } from "@/utils/actions/resumes/ai";
import { ProjectsForm } from "./projects-form";

/* ── module mocks ──────────────────────────────────────────────────── */

vi.mock("@/utils/actions/resumes/ai", () => ({
  generateProjectPoints: vi.fn(),
  improveProject: vi.fn(),
}));

// Tiptap is a ProseMirror editor; model it as a plain textarea keyed by content.
vi.mock("@/components/ui/tiptap", () => ({
  default: ({ content, onChange }: { content: string; onChange?: (v: string) => void }) => (
    <textarea
      aria-label={content || "empty point"}
      value={content}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

vi.mock("../../management/dialogs/import-from-profile-dialog", () => ({
  ImportFromProfileDialog: ({ onImport }: { onImport: (projects: Project[]) => void }) => (
    <button onClick={() => onImport([{ name: "Imported", description: ["Imported bullet"], technologies: [], date: "", url: "", github_url: "" }])}>
      Import from profile
    </button>
  ),
}));

vi.mock("../components/ai-generation-tooltip", () => ({
  AIGenerationSettingsTooltip: (props: {
    index: number;
    loadingAI?: boolean;
    generateAIPoints: (index: number) => void;
  }) => (
    <button onClick={() => props.generateAIPoints(props.index)} disabled={props.loadingAI}>
      Generate AI
    </button>
  ),
}));

vi.mock("../../shared/ai-improvement-prompt", () => ({
  AIImprovementPrompt: ({ value }: { value: string }) => (
    <span data-testid="ai-improvement-prompt">{value}</span>
  ),
}));

vi.mock("@/components/ui/api-error-dialog", () => ({
  ApiErrorDialog: (props: {
    open: boolean;
    errorMessage: { title: string; description: string };
    onOpenChange: (open: boolean) => void;
  }) =>
    props.open ? (
      <div role="alertdialog">
        <h2>{props.errorMessage.title}</h2>
        <p>{props.errorMessage.description}</p>
        <button onClick={() => props.onOpenChange(false)}>Close error</button>
      </div>
    ) : null,
}));

/* ── fixtures + helpers ────────────────────────────────────────────── */

const generateMock = vi.mocked(generateProjectPoints);
const improveMock = vi.mocked(improveProject);

const profile = {
  id: "p1", user_id: "u1", first_name: null, last_name: null, email: null,
  phone_number: null, location: null, website: null, linkedin_url: null,
  github_url: null, work_experience: [], education: [], skills: [], projects: [],
  created_at: "2024-01-01", updated_at: "2024-01-01",
} as Profile;

// Fresh deep copy per test: the form mutates project objects in place
// (spread copies the array, not the entries), so a shared fixture would leak state.
function fixture(): Project[] {
  return [
    {
      name: "Scheduler",
      description: ["Built a Raft-consensus scheduler."],
      technologies: ["Rust", "PostgreSQL"],
      date: "2023",
      url: "https://example.dev",
      github_url: "https://github.com/example/scheduler",
    },
    { name: "Analytics", description: [], technologies: [], date: "", url: "", github_url: "" },
  ];
}

/** Finds a rendered icon button by its lucide svg class (e.g. "trash2", "sparkles"). */
function iconButton(scope: ParentNode, icon: string): HTMLButtonElement {
  const btn = Array.from(scope.querySelectorAll("button")).find((b) =>
    b.querySelector(`svg.lucide-${icon}`)
  );
  if (!btn) throw new Error(`No button with ${icon} icon found`);
  return btn as HTMLButtonElement;
}

/** Climb from an element to the Card root div (bordered violet container). */
function cardRoot(el: Element): HTMLElement {
  let cur = el as HTMLElement | null;
  // The Card root carries backdrop-blur-md; substrings like border-violet-* also
  // occur on inputs, so use a marker unique to the card container.
  while (cur && !cur.className.includes("backdrop-blur-md")) cur = cur.parentElement;
  if (!cur) throw new Error("Card root not found");
  return cur as HTMLElement;
}

/** The Card root div that owns the input showing `value` as its project name. */
function cardOf(nameValue: string) {
  return cardRoot(screen.getByDisplayValue(nameValue));
}

/** Buttons column (trash / sparkle / check / x) of the description row with `text`. */
function pointRowButtons(text: string): HTMLElement {
  const textarea = screen.getByLabelText(text);
  const cell = textarea.parentElement as HTMLElement; // div.flex-1 wrapper
  return cell.nextElementSibling as HTMLElement;
}

function renderForm(list: Project[] = fixture()) {
  const onChangeSpy = vi.fn();
  // Wraps the form like its real parent: changes come back through props,
  // so interactions that rely on re-renders (Add Point, delete, approve…)
  // are actually exercised.
  function Harness() {
    const [items, setItems] = useState(list);
    return (
      <ProjectsForm
        projects={items}
        onChange={(next) => {
          onChangeSpy(next);
          // Break object-identity: ProjectsForm mutates shared project
          // objects in place, and its memo comparator JSON-compares props —
          // without cloning, the mutated prev/next strings match and the
          // re-render is blocked. Real parents pass immutable copies.
          setItems(structuredClone(next));
        }}
        profile={profile}
      />
    );
  }
  const utils = render(<Harness />);
  return { ...utils, onChange: onChangeSpy };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

/* ── tests ─────────────────────────────────────────────────────────── */

describe("ProjectsForm — CRUD", () => {
  // Real userEvent interaction; under v8-coverage instrumentation this can
  // exceed the 5s default, hence the explicit hedge.
  it("adds an empty project at the top of the list", { timeout: 15_000 }, async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(screen.getByRole("button", { name: /Add Project/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const [updated] = onChange.mock.calls[0] as unknown as [Project[]];
    expect(updated).toHaveLength(3);
    expect(updated[0].name).toBe("");
    expect(updated[0].description).toEqual([]);
    expect(updated[0].technologies).toEqual([]);
    expect(updated.slice(1)).toEqual(fixture());
  });

  it("prepends projects imported from the profile dialog", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(screen.getByRole("button", { name: /Import from profile/i }));

    const [updated] = onChange.mock.calls[0] as unknown as [Project[]];
    expect(updated[0].name).toBe("Imported");
    expect(updated).toHaveLength(3);
  });

  it("edits the name of an existing project", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.type(within(cardOf("Scheduler")).getByPlaceholderText("Project Name"), "X");

    const [updated] = onChange.mock.calls.at(-1) as unknown as [Project[]];
    expect(updated[0].name).toBe("SchedulerX");
    expect(updated[1].name).toBe("Analytics");
  });

  it("removes a project when the card trash button is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(iconButton(cardOf("Scheduler"), "trash2"));

    const [updated] = onChange.mock.calls[0] as unknown as [Project[]];
    expect(updated.map((p) => p.name)).toEqual(["Analytics"]);
  });

  it("reorders projects with the chevron buttons", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    // First card is at index 0, so its up-chevron must be disabled.
    expect(iconButton(cardOf("Scheduler"), "chevron-up")).toBeDisabled();

    const analyticsCard = cardRoot(screen.getAllByPlaceholderText("Project Name")[1]);
    const analyticsUp = iconButton(analyticsCard, "chevron-up");
    expect(analyticsUp).not.toBeDisabled();
    await user.click(analyticsUp);

    const [updated] = onChange.mock.calls[0] as unknown as [Project[]];
    expect(updated.map((p) => p.name)).toEqual(["Analytics", "Scheduler"]);
  });
});

describe("ProjectsForm — technologies", () => {
  it("adds a technology on Enter", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    const input = within(cardOf("Scheduler")).getByPlaceholderText(/Type a technology/i);
    await user.type(input, "Kafka");
    fireEvent.keyDown(input, { key: "Enter" });

    const [added] = onChange.mock.calls.at(-1) as unknown as [Project[]];
    expect(added[0].technologies).toEqual(["Rust", "PostgreSQL", "Kafka"]);
  });

  it("does not create a duplicate technology when re-adding an existing one", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    const input = within(cardOf("Scheduler")).getByPlaceholderText(/Type a technology/i);
    await user.type(input, "Rust"); // already in the list
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not add whitespace-only technologies", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    const input = within(cardOf("Scheduler")).getByPlaceholderText(/Type a technology/i);
    await user.type(input, "   ");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes a technology via the badge × button", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    const badgeDiv = screen.getByText("Rust").closest("div") as HTMLElement;
    await user.click(badgeDiv.querySelector("button") as HTMLButtonElement);

    const [updated] = onChange.mock.calls[0] as unknown as [Project[]];
    expect(updated[0].technologies).toEqual(["PostgreSQL"]);
  });
});

describe("ProjectsForm — description points", () => {
  it("appends an empty point via Add Point and edits it through the editor", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(within(cardOf("Scheduler")).getByRole("button", { name: /Add Point/i }));

    expect(screen.getByLabelText("empty point")).toBeInTheDocument();
    expect(screen.getByLabelText("Built a Raft-consensus scheduler.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("empty point"), { target: { value: "New point" } });
    const [written] = onChange.mock.calls.at(-1) as unknown as [Project[]];
    expect(written[0].description).toEqual(["Built a Raft-consensus scheduler.", "New point"]);
  });

  it("deletes a point via its row trash button", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(iconButton(pointRowButtons("Built a Raft-consensus scheduler."), "trash2"));

    await waitFor(() => expect(screen.queryByLabelText("Built a Raft-consensus scheduler.")).not.toBeInTheDocument());
    const [updated] = onChange.mock.calls.at(-1) as unknown as [Project[]];
    expect(updated[0].description).toEqual([]);
  });
});

describe("ProjectsForm — AI point generation", () => {
  it("calls the server action with config from localStorage and shows suggestions", async () => {
    localStorage.setItem("eleva-default-model", "gpt-test");
    localStorage.setItem("eleva-api-keys", JSON.stringify(["sk-test"]));
    generateMock.mockResolvedValue({ points: ["Sharded the queue", "Added retries"], analysis: undefined });

    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(screen.getAllByRole("button", { name: /Generate AI/i })[0]);

    await waitFor(() => expect(screen.getByText("AI Suggestions")).toBeInTheDocument());

    expect(generateMock).toHaveBeenCalledWith(
      "Scheduler",
      ["Rust", "PostgreSQL"],
      "Software Engineer",
      3, // default numPoints
      "",
      { model: "gpt-test", apiKeys: ["sk-test"] },
    );
    expect(screen.getByLabelText("Sharded the queue")).toBeInTheDocument();

    // Approve the first suggestion: it joins the description list.
    const approve = iconButton(
      (screen.getByLabelText("Sharded the queue").parentElement as HTMLElement).nextElementSibling as HTMLElement,
      "check",
    );
    await user.click(approve);

    await waitFor(() => expect(screen.getByLabelText("Sharded the queue")).toBeInTheDocument());
    const [updated] = onChange.mock.calls.at(-1) as unknown as [Project[]];
    expect(updated[0].description).toEqual(["Built a Raft-consensus scheduler.", "Sharded the queue"]);
  });

  it("surfaces a generic error dialog when generation fails", async () => {
    generateMock.mockRejectedValue(new Error("boom"));

    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getAllByRole("button", { name: /Generate AI/i })[0]);

    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument());
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText(/Failed to generate AI points/i)).toBeInTheDocument();
  });

  it("surfaces the API-key error dialog when auth fails", async () => {
    generateMock.mockRejectedValue(new Error("Invalid API key"));

    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getAllByRole("button", { name: /Generate AI/i })[0]);

    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument());
    expect(screen.getByText("API Key Error")).toBeInTheDocument();
  });
});

describe("ProjectsForm — AI point improvement", () => {
  it("rewrites an existing point, shows the review chip, and allows undo", { timeout: 15000 }, async () => {
    improveMock.mockResolvedValue("Improved bullet text");

    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(iconButton(pointRowButtons("Built a Raft-consensus scheduler."), "sparkles"));

    await waitFor(() =>
      expect(improveMock).toHaveBeenCalledWith("Built a Raft-consensus scheduler.", undefined, { model: "", apiKeys: [] })
    );
    await waitFor(() => expect(screen.getByLabelText("Improved bullet text")).toBeInTheDocument());
    expect(screen.getByText("AI Suggestion")).toBeInTheDocument();

    // Undo restores the original text.
    await user.click(iconButton(pointRowButtons("Improved bullet text"), "x"));
    await waitFor(() => expect(screen.getByLabelText("Built a Raft-consensus scheduler.")).toBeInTheDocument());
    const [restored] = onChange.mock.calls.at(-1) as unknown as [Project[]];
    expect(restored[0].description).toEqual(["Built a Raft-consensus scheduler."]);
  });

  it("surfaces a dialog when improvement fails", async () => {
    improveMock.mockRejectedValue(new Error("kaboom"));

    const user = userEvent.setup();
    renderForm();

    await user.click(iconButton(pointRowButtons("Built a Raft-consensus scheduler."), "sparkles"));

    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument());
    expect(screen.getByText(/Failed to improve point/i)).toBeInTheDocument();
  });

  it("accepts an improvement with the check button, keeping the improved text", async () => {
    improveMock.mockResolvedValue("Improved bullet text");

    const user = userEvent.setup();
    renderForm();

    await user.click(iconButton(pointRowButtons("Built a Raft-consensus scheduler."), "sparkles"));
    await waitFor(() => expect(screen.getByText("AI Suggestion")).toBeInTheDocument());

    await user.click(iconButton(pointRowButtons("Improved bullet text"), "check"));

    await waitFor(() => expect(screen.queryByText("AI Suggestion")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Improved bullet text")).toBeInTheDocument();
  });

  it("clears the review state when the improved point is edited manually", async () => {
    improveMock.mockResolvedValue("Improved bullet text");

    const user = userEvent.setup();
    renderForm();

    await user.click(iconButton(pointRowButtons("Built a Raft-consensus scheduler."), "sparkles"));
    await waitFor(() => expect(screen.getByText("AI Suggestion")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Improved bullet text"), {
      target: { value: "Hand-edited bullet" },
    });

    await waitFor(() => expect(screen.queryByText("AI Suggestion")).not.toBeInTheDocument());
  });
});

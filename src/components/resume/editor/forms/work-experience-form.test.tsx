import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { WorkExperience } from "@/lib/types";

import { generateWorkExperiencePoints, improveWorkExperience } from "@/utils/actions/resumes/ai";
import { WorkExperienceForm } from "./work-experience-form";

vi.mock("@/utils/actions/resumes/ai", () => ({
  generateWorkExperiencePoints: vi.fn(),
  improveWorkExperience: vi.fn(),
}));

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
  ImportFromProfileDialog: ({ onImport }: { onImport: (items: WorkExperience[]) => void }) => (
    <button onClick={() => onImport([{ company: "Imported", position: "Role", location: "", date: "", description: ["Imported"], technologies: [] } as WorkExperience])}>
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
  }) =>
    props.open ? (
      <div role="alertdialog">
        <h2>{props.errorMessage.title}</h2>
        <p>{props.errorMessage.description}</p>
      </div>
    ) : null,
}));

function fixture(): WorkExperience[] {
  return [
    {
      company: "Acme",
      position: "Engineer",
      location: "NYC",
      date: "2023",
      description: ["Built things"],
      technologies: ["React"],
    } as WorkExperience,
    { company: "Beta", position: "Dev", location: "", date: "", description: [], technologies: [] } as WorkExperience,
  ];
}

function renderForm(list: WorkExperience[] = fixture()) {
  const onChangeSpy = vi.fn();
  function Harness() {
    const [items, setItems] = useState<WorkExperience[]>(list);
    return (
      <WorkExperienceForm
        experiences={items}
        onChange={(next) => {
          onChangeSpy(next);
          setItems(structuredClone(next));
        }}
        profile={{ id: "p1", work_experience: [], projects: [], education: [], skills: [] } as unknown as never}
      />
    );
  }
  const utils = render(<Harness />);
  return { ...utils, onChange: onChangeSpy };
}

const generateMock = vi.mocked(generateWorkExperiencePoints);
const improveMock = vi.mocked(improveWorkExperience);

/** Finds a rendered icon button by its lucide svg class (e.g. "trash2", "sparkles"). */
function iconButton(scope: ParentNode, icon: string): HTMLButtonElement {
  const btn = Array.from(scope.querySelectorAll("button")).find((b) =>
    b.querySelector(`svg.lucide-${icon}`)
  );
  if (!btn) throw new Error(`No button with ${icon} icon found`);
  return btn as HTMLButtonElement;
}

/** Climb from an element to the Card root div (bordered cyan container). */
function cardRoot(el: Element): HTMLElement {
  let cur = el as HTMLElement | null;
  while (cur && !cur.className.includes("backdrop-blur-md")) cur = cur.parentElement;
  if (!cur) throw new Error("Card root not found");
  return cur as HTMLElement;
}

function cardOf(positionValue: string) {
  return cardRoot(screen.getByDisplayValue(positionValue));
}

/** Buttons column (trash / sparkle / check / x) of the description row with `text`. */
function pointRowButtons(text: string): HTMLElement {
  const textarea = screen.getByLabelText(text);
  const cell = textarea.parentElement as HTMLElement;
  return cell.nextElementSibling as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("WorkExperienceForm", () => {
  // Real userEvent interaction; under v8-coverage instrumentation this can
  // exceed the 5s default, hence the explicit hedge.
  it("adds a new work experience entry", { timeout: 15_000 }, async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();
    await user.click(screen.getByRole("button", { name: /Add Work Experience/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const [updated] = onChange.mock.calls[0] as unknown as [WorkExperience[]];
    expect(updated).toHaveLength(3);
    expect(updated[0].company).toBe("");
  });

  it("edits an existing entry", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();
    const companyInput = screen.getAllByDisplayValue("Acme")[0];
    await user.clear(companyInput);
    await user.type(companyInput, "NewCo");
    expect(onChange).toHaveBeenCalled();
  });

  it("reorders entries with the chevron buttons", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    expect(iconButton(cardOf("Engineer"), "chevron-up")).toBeDisabled();

    const betaCard = cardRoot(screen.getAllByPlaceholderText("Position Title")[1]);
    await user.click(iconButton(betaCard, "chevron-up"));

    const [updated] = onChange.mock.calls[0] as unknown as [WorkExperience[]];
    expect(updated.map((entry) => entry.company)).toEqual(["Beta", "Acme"]);
  });

  it("appends and edits a description point", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(within(cardOf("Engineer")).getByRole("button", { name: /Add Point/i }));
    fireEvent.change(screen.getByLabelText("empty point"), {
      target: { value: "Owned the release pipeline" },
    });

    const [updated] = onChange.mock.calls.at(-1) as unknown as [WorkExperience[]];
    expect(updated[0].description).toEqual(["Built things", "Owned the release pipeline"]);
  });

  it("generates suggestions with the stored model and target role, then approves one", async () => {
    localStorage.setItem("eleva-default-model", "gpt-test");
    localStorage.setItem("eleva-api-keys", JSON.stringify(["sk-test"]));
    generateMock.mockResolvedValue({
      points: ["Shipped the billing migration", "Mentored two engineers"],
      analysis: undefined,
    } as never);

    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(screen.getAllByRole("button", { name: /Generate AI/i })[0]);

    await waitFor(() => expect(screen.getByText("AI Suggestions")).toBeInTheDocument());
    expect(generateMock).toHaveBeenCalledWith(
      "Engineer",
      "Acme",
      ["React"],
      "Software Engineer",
      3,
      "",
      { model: "gpt-test", apiKeys: ["sk-test"] },
    );

    const approve = iconButton(
      (screen.getByLabelText("Shipped the billing migration").parentElement as HTMLElement)
        .nextElementSibling as HTMLElement,
      "check",
    );
    await user.click(approve);

    const [updated] = onChange.mock.calls.at(-1) as unknown as [WorkExperience[]];
    expect(updated[0].description).toEqual([
      "Built things",
      "Shipped the billing migration",
    ]);
  });

  it("rewrites a point, shows the review chip, and restores it on undo", { timeout: 15000 }, async () => {
    improveMock.mockResolvedValue("Improved responsibility");

    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(iconButton(pointRowButtons("Built things"), "sparkles"));

    await waitFor(() =>
      expect(improveMock).toHaveBeenCalledWith("Built things", undefined, {
        model: "",
        apiKeys: [],
      }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Improved responsibility")).toBeInTheDocument(),
    );
    expect(screen.getByText("AI Suggestion")).toBeInTheDocument();

    await user.click(iconButton(pointRowButtons("Improved responsibility"), "x"));

    await waitFor(() => expect(screen.getByLabelText("Built things")).toBeInTheDocument());
    const [restored] = onChange.mock.calls.at(-1) as unknown as [WorkExperience[]];
    expect(restored[0].description).toEqual(["Built things"]);
  });

  it("surfaces a generic error dialog when generation fails", async () => {
    generateMock.mockRejectedValue(new Error("boom"));

    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getAllByRole("button", { name: /Generate AI/i })[0]);

    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument());
    expect(screen.getByText(/Failed to generate AI points/i)).toBeInTheDocument();
  });
});

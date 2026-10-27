// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { Profile, Skill } from "@/lib/types";

import { SkillsForm } from "./skills-form";

/* ── module mocks ──────────────────────────────────────────────────── */

vi.mock("../../management/dialogs/import-from-profile-dialog", () => ({
  ImportFromProfileDialog: ({ onImport }: { onImport: (items: Skill[]) => void }) => (
    <button
      onClick={() =>
        onImport([
          { category: "Imported Category", items: ["Imported Skill"] },
        ])
      }
    >
      Import from profile
    </button>
  ),
}));

/* ── fixtures + helpers ────────────────────────────────────────────── */

const profile = {
  id: "p1",
  user_id: "u1",
  first_name: null,
  last_name: null,
  email: null,
  phone_number: null,
  location: null,
  website: null,
  linkedin_url: null,
  github_url: null,
  work_experience: [],
  education: [],
  skills: [],
  projects: [],
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
} as Profile;

function fixture(): Skill[] {
  return [
    { category: "Languages", items: ["TypeScript", "Go"] },
    { category: "Frameworks", items: ["React"] },
  ];
}

/** Finds a rendered icon button by its lucide svg class (e.g. "trash2"). */
function iconButton(scope: ParentNode, icon: string): HTMLButtonElement {
  const btn = Array.from(scope.querySelectorAll("button")).find((b) =>
    b.querySelector(`svg.lucide-${icon}`)
  );
  if (!btn) throw new Error(`No button with ${icon} icon found`);
  return btn as HTMLButtonElement;
}

/** Climb from an element to the Card root div (bordered rose container). */
function cardRoot(el: Element): HTMLElement {
  let cur = el as HTMLElement | null;
  while (cur && !cur.className.includes("backdrop-blur-md")) cur = cur.parentElement;
  if (!cur) throw new Error("Card root not found");
  return cur as HTMLElement;
}

/** The Card root div that owns the category input showing `value`. */
function cardOf(category: string) {
  return cardRoot(screen.getByDisplayValue(category));
}

const NEW_SKILL_PLACEHOLDER = /Type a skill and press Enter/i;

function skillInput(card: HTMLElement) {
  return within(card).getByPlaceholderText(NEW_SKILL_PLACEHOLDER);
}

function renderForm(list: Skill[] = fixture()) {
  const onChangeSpy = vi.fn();
  function Harness() {
    const [items, setItems] = useState(list);
    return (
      <SkillsForm
        skills={items}
        onChange={(next) => {
          onChangeSpy(next);
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

describe("SkillsForm — categories", () => {
  it("adds an empty skill category at the top of the list", { timeout: 15_000 }, async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(screen.getByRole("button", { name: /Add Skill Category/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const [updated] = onChange.mock.calls[0] as unknown as [Skill[]];
    expect(updated).toHaveLength(3);
    expect(updated[0]).toEqual({ category: "", items: [] });
    expect(updated.slice(1)).toEqual(fixture());
  });

  it("prepends categories imported from the profile dialog", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(screen.getByRole("button", { name: /Import from profile/i }));

    const [updated] = onChange.mock.calls[0] as unknown as [Skill[]];
    expect(updated[0]).toEqual({
      category: "Imported Category",
      items: ["Imported Skill"],
    });
    expect(updated).toHaveLength(3);
  });

  it("edits a category name", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.type(within(cardOf("Languages")).getByPlaceholderText("Category Name"), "!");

    const [updated] = onChange.mock.calls.at(-1) as unknown as [Skill[]];
    expect(updated[0].category).toBe("Languages!");
    expect(updated[1].category).toBe("Frameworks");
  });

  it("removes a category with the card trash button", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(iconButton(cardOf("Languages"), "trash2"));

    const [updated] = onChange.mock.calls[0] as unknown as [Skill[]];
    expect(updated.map((skill) => skill.category)).toEqual(["Frameworks"]);
  });

  it("renders an empty state with only the add/import actions", () => {
    renderForm([]);

    expect(screen.queryByPlaceholderText("Category Name")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Skill Category/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Import from profile/i })).toBeInTheDocument();
  });
});

describe("SkillsForm — skills", () => {
  it("adds a skill on Enter and clears the input", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();
    const card = cardOf("Languages");
    const input = skillInput(card);

    await user.type(input, "Kafka");
    fireEvent.keyPress(input, { key: "Enter", charCode: 13 });

    const [updated] = onChange.mock.calls.at(-1) as unknown as [Skill[]];
    expect(updated[0].items).toEqual(["TypeScript", "Go", "Kafka"]);
    expect(skillInput(card)).toHaveValue("");
  });

  it("adds a skill with the plus button", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();
    const card = cardOf("Frameworks");

    await user.type(skillInput(card), "Next.js");
    await user.click(iconButton(card, "plus"));

    const [updated] = onChange.mock.calls.at(-1) as unknown as [Skill[]];
    expect(updated[0].items).toEqual(["TypeScript", "Go"]);
    expect(updated[1].items).toEqual(["React", "Next.js"]);
  });

  it("does not add whitespace-only skills", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();
    const input = skillInput(cardOf("Languages"));

    await user.type(input, "   ");
    fireEvent.keyPress(input, { key: "Enter", charCode: 13 });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not add a duplicate skill", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();
    const input = skillInput(cardOf("Languages"));

    await user.type(input, "TypeScript");
    fireEvent.keyPress(input, { key: "Enter", charCode: 13 });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes a skill via the badge × button", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    const badge = screen.getByText("TypeScript").closest("div") as HTMLElement;
    await user.click(badge.querySelector("button") as HTMLButtonElement);

    const [updated] = onChange.mock.calls[0] as unknown as [Skill[]];
    expect(updated[0].items).toEqual(["Go"]);
  });
});

describe("SkillsForm — reordering", () => {
  it("disables the first up-chevron and last down-chevron", () => {
    renderForm();

    expect(iconButton(cardOf("Languages"), "chevron-up")).toBeDisabled();
    expect(iconButton(cardOf("Languages"), "chevron-down")).not.toBeDisabled();
    expect(iconButton(cardOf("Frameworks"), "chevron-up")).not.toBeDisabled();
    expect(iconButton(cardOf("Frameworks"), "chevron-down")).toBeDisabled();
  });

  it("moves a category up and keeps its pending skill text in sync", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.type(skillInput(cardOf("Frameworks")), "Pending");

    await user.click(iconButton(cardOf("Frameworks"), "chevron-up"));

    let [updated] = onChange.mock.calls.at(-1) as unknown as [Skill[]];
    expect(updated.map((skill) => skill.category)).toEqual(["Frameworks", "Languages"]);

    // The unsubmitted input follows the category to its new index.
    const movedCard = cardOf("Frameworks");
    expect(skillInput(movedCard)).toHaveValue("Pending");

    await user.click(iconButton(movedCard, "plus"));

    [updated] = onChange.mock.calls.at(-1) as unknown as [Skill[]];
    expect(updated[0].items).toEqual(["React", "Pending"]);
    expect(updated[1].items).toEqual(["TypeScript", "Go"]);
  });

  it("moves a category down", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(iconButton(cardOf("Languages"), "chevron-down"));

    const [updated] = onChange.mock.calls[0] as unknown as [Skill[]];
    expect(updated.map((skill) => skill.category)).toEqual(["Frameworks", "Languages"]);
  });
});

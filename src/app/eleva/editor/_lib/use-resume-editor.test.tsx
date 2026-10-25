import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSectionCount, initialResume, useResumeEditor } from "./use-resume-editor";
import { rewriteBullet } from "@/app/eleva/_lib/eleva-client";

vi.mock("@/app/eleva/_lib/eleva-client", () => ({
  rewriteBullet: vi.fn(),
}));

const rewriteMock = vi.mocked(rewriteBullet);

describe("useResumeEditor — pure helpers", () => {
  it("getSectionCount counts a truthy summary as one", () => {
    expect(getSectionCount(initialResume, "summary")).toBe(1);
    expect(getSectionCount({ ...initialResume, summary: "" }, "summary")).toBe(0);
  });

  it("getSectionCount counts list sections by array length", () => {
    expect(getSectionCount(initialResume, "experience")).toBe(2);
    expect(getSectionCount(initialResume, "projects")).toBe(2);
    expect(getSectionCount(initialResume, "skills")).toBe(3);
    expect(getSectionCount(initialResume, "education")).toBe(1);
    expect(getSectionCount(initialResume, "certificates")).toBe(2);
  });
});

describe("useResumeEditor — initial state", () => {
  it("starts from the demo resume with no history to travel", () => {
    const { result } = renderHook(() => useResumeEditor());

    expect(result.current.data).toEqual(initialResume);
    expect(result.current.activeSection).toBe("experience");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.optimizing).toBe(false);
    expect(result.current.processingAction).toBeNull();
    expect(result.current.toast).toBeNull();
  });
});

describe("useResumeEditor — experience mutators", () => {
  it("addExperience appends an empty entry that enables undo", () => {
    const { result } = renderHook(() => useResumeEditor());

    act(() => result.current.addExperience());

    expect(result.current.data.experience).toHaveLength(3);
    const added = result.current.data.experience[2];
    expect(added.company).toBe("");
    expect(added.bullets).toHaveLength(1);
    expect(added.bullets[0].text).toBe("");
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it("removeExperience filters the matching entry only", () => {
    const { result } = renderHook(() => useResumeEditor());

    act(() => result.current.removeExperience("exp1"));

    expect(result.current.data.experience.map((e) => e.id)).toEqual(["exp2"]);
  });

  it("setExpField updates only the targeted entry", () => {
    const { result } = renderHook(() => useResumeEditor());

    act(() => result.current.setExpField("exp2", "role", "Principal Engineer"));

    expect(result.current.data.experience[1].role).toBe("Principal Engineer");
    expect(result.current.data.experience[0].role).toBe("Senior Backend Engineer");
  });

  it("addBullet appends an empty bullet to the entry", () => {
    const { result } = renderHook(() => useResumeEditor());

    act(() => result.current.addBullet("exp2"));

    expect(result.current.data.experience[1].bullets).toHaveLength(3);
    const added = result.current.data.experience[1].bullets[2];
    expect(added.text).toBe("");
    expect(added.original).toBe("");
    expect(added.id).not.toBe("b3");
  });

  it("setBulletText rewrites a single bullet without touching siblings", () => {
    const { result } = renderHook(() => useResumeEditor());

    act(() => result.current.setBulletText("exp1", "b1", "Rewritten bullet."));

    expect(result.current.data.experience[0].bullets[1].text).toBe("Rewritten bullet.");
    expect(result.current.data.experience[0].bullets[0].text).toBe(initialResume.experience[0].bullets[0].text);
    expect(result.current.data.experience[1].bullets[0].text).toBe(initialResume.experience[1].bullets[0].text);
  });

  it("setBulletSuggestion then acceptSuggestion commits the suggestion", () => {
    const { result } = renderHook(() => useResumeEditor());

    act(() => result.current.setBulletSuggestion("exp1", "b0", "Polished bullet."));
    expect(result.current.data.experience[0].bullets[0].suggestion).toBe("Polished bullet.");

    act(() => result.current.acceptSuggestion("exp1", "b0"));

    const bullet = result.current.data.experience[0].bullets[0];
    expect(bullet.text).toBe("Polished bullet.");
    expect(bullet.original).toBe("Polished bullet.");
    expect(bullet.suggestion).toBeUndefined();
  });

  it("deleteBullet drops only the targeted bullet", () => {
    const { result } = renderHook(() => useResumeEditor());

    act(() => result.current.deleteBullet("exp1", "b1"));

    expect(result.current.data.experience[0].bullets.map((b) => b.id)).toEqual(["b0", "b2"]);
    expect(result.current.data.experience[1].bullets.map((b) => b.id)).toEqual(["b3", "b4"]);
  });
});

describe("useResumeEditor — projects, skills, education, certificates", () => {
  it("project add/update/remove round trip works", () => {
    const { result } = renderHook(() => useResumeEditor());

    act(() => result.current.addProject());
    const id = result.current.data.projects[2].id;

    act(() => result.current.updateProject(id, "name", "Side Project"));
    expect(result.current.data.projects[2].name).toBe("Side Project");

    act(() => result.current.removeProject(id));
    expect(result.current.data.projects).toHaveLength(2);
  });

  it("addProjectTech dedupes and removeProjectTech removes", () => {
    const { result } = renderHook(() => useResumeEditor());

    act(() => result.current.addProjectTech("p1", "Redis"));
    act(() => result.current.addProjectTech("p1", "Redis"));

    expect(result.current.data.projects[0].technologies).toEqual(["Rust", "Raft", "gRPC", "PostgreSQL", "Redis"]);

    act(() => result.current.removeProjectTech("p1", "Redis"));
    expect(result.current.data.projects[0].technologies).not.toContain("Redis");
  });

  it("addSkillItem trims input, rejects blanks and duplicates", () => {
    const { result } = renderHook(() => useResumeEditor());

    act(() => result.current.addSkillItem("s1", "  Zig "));
    expect(result.current.data.skills[0].items).toContain("Zig");

    act(() => result.current.addSkillItem("s1", "Zig"));
    act(() => result.current.addSkillItem("s1", "   "));
    expect(result.current.data.skills[0].items).toEqual(["Go", "Rust", "Python", "TypeScript", "Zig"]);

    act(() => result.current.removeSkillItem("s1", "Zig"));
    expect(result.current.data.skills[0].items).toEqual(["Go", "Rust", "Python", "TypeScript"]);
  });

  it("skill category add/update/remove round trip works", () => {
    const { result } = renderHook(() => useResumeEditor());

    act(() => result.current.addSkillCategory());
    const id = result.current.data.skills[3].id;
    expect(result.current.data.skills[3].category).toBe("New Category");

    act(() => result.current.updateSkillCat(id, "Testing"));
    expect(result.current.data.skills[3].category).toBe("Testing");

    act(() => result.current.removeSkillCategory(id));
    expect(result.current.data.skills).toHaveLength(3);
  });

  it("education add/remove round trip works", () => {
    const { result } = renderHook(() => useResumeEditor());

    act(() => result.current.addEducation());
    expect(result.current.data.education).toHaveLength(2);
    const id = result.current.data.education[1].id;
    act(() => result.current.removeEducation(id));
    expect(result.current.data.education).toHaveLength(1);
  });

  it("certificates add/update/remove round trip works", () => {
    const { result } = renderHook(() => useResumeEditor());

    act(() => result.current.addCertificate());
    const id = result.current.data.certificates[2].id;
    act(() => result.current.updateCert(id, "name", "Terraform Associate"));
    expect(result.current.data.certificates[2].name).toBe("Terraform Associate");

    act(() => result.current.removeCertificate(id));
    expect(result.current.data.certificates).toHaveLength(2);
  });

  it("updateSummary and updateInfoField edit top-level fields", () => {
    const { result } = renderHook(() => useResumeEditor());

    act(() => result.current.updateSummary("New summary text."));
    expect(result.current.data.summary).toBe("New summary text.");

    act(() => result.current.updateInfoField("email", "me@example.com"));
    expect(result.current.data.email).toBe("me@example.com");
  });
});

describe("useResumeEditor — history (undo/redo)", () => {
  it("undo restores the previous state and enables redo", () => {
    const { result } = renderHook(() => useResumeEditor());

    act(() => result.current.addExperience());
    act(() => result.current.setExpField(result.current.data.experience[2].id, "company", "Vercel"));

    act(() => result.current.undo());
    expect(result.current.data.experience).toHaveLength(3);
    expect(result.current.data.experience[2].company).toBe("");
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.data.experience).toHaveLength(2);
    expect(result.current.canUndo).toBe(false);

    act(() => result.current.redo());
    expect(result.current.data.experience).toHaveLength(3);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.data.experience[2].company).toBe("Vercel");
    expect(result.current.canRedo).toBe(false);
  });

  it("keyboard Cmd/Ctrl+Z triggers undo", () => {
    const { result } = renderHook(() => useResumeEditor());

    act(() => result.current.addExperience());
    expect(result.current.data.experience).toHaveLength(3);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", metaKey: true, cancelable: true }));
    });

    expect(result.current.data.experience).toHaveLength(2);
  });
});

describe("useResumeEditor — AI rewrite flows", () => {
  beforeEach(() => {
    rewriteMock.mockReset();
  });

  it("handleBulletRewrite applies the suggestion and rewrite metadata", async () => {
    rewriteMock.mockResolvedValue({
      success: true,
      rewritten: "Sharper bullet.",
      attempts: [
        { attempt: 1, model: "openrouter/free", status: "success", latencyMs: 120 },
      ],
    });

    const { result } = renderHook(() => useResumeEditor());

    await act(async () => {
      await result.current.handleBulletRewrite("exp1", "b0");
    });

    const bullet = result.current.data.experience[0].bullets[0];
    expect(bullet.suggestion).toBe("Sharper bullet.");
    expect(bullet.streaming).toBe(false);
    expect(bullet.rewriteMeta?.confidence).toBe(96);
    expect(bullet.rewriteMeta?.reason).toBe("AI rewrite generated");
    expect(rewriteMock).toHaveBeenCalledWith(expect.objectContaining({
      bullet: expect.any(String),
      role: "Senior Backend Engineer",
      mode: "professional",
    }));
  });

  it("handleBulletRewrite falls back to the failure branch when the call rejects", async () => {
    rewriteMock.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useResumeEditor());

    await act(async () => {
      await result.current.handleBulletRewrite("exp1", "b1");
    });

    const bullet = result.current.data.experience[0].bullets[1];
    expect(bullet.suggestion).toBe("");
    expect(bullet.streaming).toBe(false);
    expect(result.current.toast).toBe("Network error.");
  });

  it("handleBulletRewrite refuses empty bullets without calling the API", async () => {
    const { result } = renderHook(() => useResumeEditor());

    await act(async () => {
      await result.current.handleBulletRewrite("exp1", "b999");
    });

    expect(rewriteMock).not.toHaveBeenCalled();
    expect(result.current.toast).toBe("Cannot rewrite an empty bullet.");
  });

  it("handleAIAction calls the provided callback with the rewritten text", async () => {
    rewriteMock.mockResolvedValue({
      success: true,
      rewritten: "Compact wording.",
      attempts: [],
    });

    const { result } = renderHook(() => useResumeEditor());
    const cb = vi.fn();

    await act(async () => {
      await result.current.handleAIAction("shorten", "A long bullet to shorten.", cb);
    });

    expect(cb).toHaveBeenCalledWith("Compact wording.");
    expect(result.current.processingAction).toBeNull();
    expect(rewriteMock).toHaveBeenCalledWith(expect.objectContaining({ mode: "ats" }));
  });

  it("handleAIAction shows a toast and skips the callback on empty input", async () => {
    const { result } = renderHook(() => useResumeEditor());
    const cb = vi.fn();

    await act(async () => {
      await result.current.handleAIAction("shorten", "   ", cb);
    });

    expect(cb).not.toHaveBeenCalled();
    expect(rewriteMock).not.toHaveBeenCalled();
    expect(result.current.toast).toBe("No text to process.");
  });
});

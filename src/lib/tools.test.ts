import { describe, expect, it } from "vitest";

import {
  getResumeTool,
  modifyWholeResumeTool,
  suggestEducationTool,
  suggestProjectTool,
  suggestSkillTool,
  suggestWorkExperienceTool,
  tools,
} from "./tools";

// These tools are schema-only: no execute handlers are registered, so the AI
// SDK validates model output against the zod schemas below before any resume
// mutation runs. The tests pin the accepted/rejected payload shapes.
function expectValid(schema: { safeParse: (value: unknown) => unknown }, value: unknown) {
  const result = schema.safeParse(value) as {
    success: boolean;
    data?: unknown;
    error?: { issues: unknown[] };
  };
  expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  return result.data;
}

function expectInvalid(schema: { safeParse: (value: unknown) => unknown }, value: unknown) {
  const result = schema.safeParse(value) as { success: boolean };
  expect(result.success).toBe(false);
}

describe("tool registry", () => {
  it("exports every tool under its stable model-facing name", () => {
    expect(Object.keys(tools).sort()).toEqual([
      "getResume",
      "modifyWholeResume",
      "suggest_education_improvement",
      "suggest_project_improvement",
      "suggest_skill_improvement",
      "suggest_work_experience_improvement",
    ]);

    expect(tools.getResume).toBe(getResumeTool);
    expect(tools.suggest_work_experience_improvement).toBe(suggestWorkExperienceTool);
    expect(tools.suggest_project_improvement).toBe(suggestProjectTool);
    expect(tools.suggest_skill_improvement).toBe(suggestSkillTool);
    expect(tools.suggest_education_improvement).toBe(suggestEducationTool);
    expect(tools.modifyWholeResume).toBe(modifyWholeResumeTool);
  });

  it("registers no execute handlers (the route applies changes explicitly)", () => {
    for (const tool of Object.values(tools)) {
      expect(tool.execute).toBeUndefined();
    }

    expect(getResumeTool.description).toMatch(/specific sections or "all"/);
    expect(suggestSkillTool.parameters.shape.improved_skill.description).toMatch(
      /ONLY use this tool to add NEW skills/
    );
  });
});

describe("getResumeTool", () => {
  it("normalizes a single section string into an array", () => {
    expect(expectValid(getResumeTool.parameters, { sections: "all" })).toEqual({
      sections: ["all"],
    });
  });

  it("normalizes an arbitrary single section string (the string branch is not enum-checked)", () => {
    expect(expectValid(getResumeTool.parameters, { sections: "work_experience" })).toEqual({
      sections: ["work_experience"],
    });
    // The union's string arm accepts any string; only array members are
    // constrained by the enum. Pinned here so a future tightening is visible.
    expect(expectValid(getResumeTool.parameters, { sections: "bogus_section" })).toEqual({
      sections: ["bogus_section"],
    });
  });

  it("accepts an array of known sections and preserves order", () => {
    expect(
      expectValid(getResumeTool.parameters, {
        sections: ["personal_info", "skills"],
      })
    ).toEqual({ sections: ["personal_info", "skills"] });
  });

  it("rejects unknown array members and non-string/non-array input", () => {
    expectInvalid(getResumeTool.parameters, { sections: ["personal_info", "bogus"] });
    expectInvalid(getResumeTool.parameters, { sections: 42 });
    expectInvalid(getResumeTool.parameters, {});
  });
});

describe("suggestWorkExperienceTool", () => {
  it("accepts a minimal improvement payload", () => {
    const parsed = expectValid(suggestWorkExperienceTool.parameters, {
      index: 0,
      improved_experience: {
        date: "2023 - Present",
        company: "Acme",
        position: "Engineer",
        description: ["Built **search**"],
      },
    });

    expect(parsed).toEqual({
      index: 0,
      improved_experience: {
        date: "2023 - Present",
        company: "Acme",
        position: "Engineer",
        description: ["Built **search**"],
      },
    });
  });

  it("accepts optional location and technologies", () => {
    const parsed = expectValid(suggestWorkExperienceTool.parameters, {
      index: 2,
      improved_experience: {
        date: "2022",
        company: "Beta",
        location: "Remote",
        position: "Lead",
        description: ["Led migration"],
        technologies: ["React", "Go"],
      },
    });

    expect(parsed).toMatchObject({
      index: 2,
      improved_experience: {
        location: "Remote",
        technologies: ["React", "Go"],
      },
    });
  });

  it("rejects missing required fields and wrong nested types", () => {
    expectInvalid(suggestWorkExperienceTool.parameters, {
      index: 0,
      improved_experience: { company: "Acme", position: "Engineer", description: [] },
    });
    expectInvalid(suggestWorkExperienceTool.parameters, {
      index: "0",
      improved_experience: {
        date: "2023",
        company: "Acme",
        position: "Engineer",
        description: [],
      },
    });
    expectInvalid(suggestWorkExperienceTool.parameters, {
      index: 0,
      improved_experience: {
        date: "2023",
        company: "Acme",
        position: "Engineer",
        description: "not-an-array",
      },
    });
    expectInvalid(suggestWorkExperienceTool.parameters, {
      index: 0,
      improved_experience: {
        date: "2023",
        company: "Acme",
        position: "Engineer",
        description: [42],
      },
    });
  });
});

describe("suggestProjectTool", () => {
  it("accepts a minimal project improvement", () => {
    expect(
      expectValid(suggestProjectTool.parameters, {
        index: 1,
        improved_project: { name: "Scheduler", description: ["Built **Raft**"] },
      })
    ).toEqual({
      index: 1,
      improved_project: { name: "Scheduler", description: ["Built **Raft**"] },
    });
  });

  it("accepts all optional project links and metadata", () => {
    const parsed = expectValid(suggestProjectTool.parameters, {
      index: 0,
      improved_project: {
        name: "Scheduler",
        description: ["Built it"],
        date: "2024",
        technologies: ["Rust"],
        url: "https://example.dev",
        github_url: "https://github.com/example/scheduler",
      },
    });

    expect(parsed).toMatchObject({
      improved_project: {
        date: "2024",
        technologies: ["Rust"],
        url: "https://example.dev",
        github_url: "https://github.com/example/scheduler",
      },
    });
  });

  it("requires a name and description array", () => {
    expectInvalid(suggestProjectTool.parameters, {
      index: 0,
      improved_project: { description: ["Built it"] },
    });
    expectInvalid(suggestProjectTool.parameters, {
      index: 0,
      improved_project: { name: "Scheduler" },
    });
    expectInvalid(suggestProjectTool.parameters, { index: 0 });
  });
});

describe("suggestSkillTool", () => {
  it("accepts a full replacement category", () => {
    expect(
      expectValid(suggestSkillTool.parameters, {
        index: 3,
        improved_skill: { category: "Languages", items: ["TypeScript", "Go"] },
      })
    ).toEqual({
      index: 3,
      improved_skill: { category: "Languages", items: ["TypeScript", "Go"] },
    });
  });

  it("rejects a missing category or non-string items", () => {
    expectInvalid(suggestSkillTool.parameters, {
      index: 0,
      improved_skill: { items: ["TypeScript"] },
    });
    expectInvalid(suggestSkillTool.parameters, {
      index: 0,
      improved_skill: { category: "Languages", items: [1] },
    });
    expectInvalid(suggestSkillTool.parameters, {
      index: 0,
      improved_skill: { category: "Languages", items: "TypeScript" },
    });
  });
});

describe("suggestEducationTool", () => {
  const minimal = {
    school: "State University",
    degree: "BSc",
    field: "Computer Science",
    date: "2020",
  };

  it("accepts a minimal education entry", () => {
    expect(
      expectValid(suggestEducationTool.parameters, {
        index: 0,
        improved_education: minimal,
      })
    ).toEqual({ index: 0, improved_education: minimal });
  });

  it("accepts optional location, GPA, and achievements", () => {
    expect(
      expectValid(suggestEducationTool.parameters, {
        index: 0,
        improved_education: {
          ...minimal,
          location: "Boston, MA",
          gpa: "3.9",
          achievements: ["Dean's List", "Hackathon winner"],
        },
      })
    ).toMatchObject({
      improved_education: {
        location: "Boston, MA",
        gpa: "3.9",
        achievements: ["Dean's List", "Hackathon winner"],
      },
    });
  });

  it("rejects missing required fields and invalid achievements", () => {
    expectInvalid(suggestEducationTool.parameters, {
      index: 0,
      improved_education: { ...minimal, field: undefined },
    });
    expectInvalid(suggestEducationTool.parameters, {
      index: 0,
      improved_education: { ...minimal, achievements: "Dean's List" },
    });
    expectInvalid(suggestEducationTool.parameters, {
      index: 0,
      improved_education: { ...minimal, degree: 42 },
    });
  });
});

describe("modifyWholeResumeTool", () => {
  it("accepts an empty object because every section is optional", () => {
    expect(expectValid(modifyWholeResumeTool.parameters, {})).toEqual({});
  });

  it("accepts a full multi-section update", () => {
    const payload = {
      basic_info: {
        first_name: "Ada",
        last_name: "Lovelace",
        email: "ada@example.com",
        phone_number: "555-0100",
        location: "London",
        website: "https://ada.dev",
        linkedin_url: "https://linkedin.com/in/ada",
        github_url: "https://github.com/ada",
      },
      work_experience: [
        {
          company: "Analytical Engines",
          position: "Engineer",
          location: "London",
          date: "1842",
          description: ["Wrote the first **program**"],
          technologies: ["Analytical Engine"],
        },
      ],
      education: [
        {
          school: "Home",
          degree: "Self-taught",
          field: "Mathematics",
          date: "1830",
          gpa: "N/A",
          achievements: ["Published notes"],
        },
      ],
      skills: [{ category: "Math", items: ["Algebra", "Calculus"] }],
      projects: [
        {
          name: "Engine Notes",
          description: ["Documented the engine"],
          date: "1843",
          technologies: ["Pencil"],
          url: "https://example.dev/notes",
          github_url: "https://github.com/ada/notes",
        },
      ],
    };

    expect(expectValid(modifyWholeResumeTool.parameters, payload)).toEqual(payload);
  });

  it("accepts partially populated sections", () => {
    expect(
      expectValid(modifyWholeResumeTool.parameters, {
        basic_info: { first_name: "Ada" },
        work_experience: [],
        skills: [],
      })
    ).toEqual({
      basic_info: { first_name: "Ada" },
      work_experience: [],
      skills: [],
    });
  });

  it("strips unknown keys instead of failing the whole update", () => {
    expect(
      expectValid(modifyWholeResumeTool.parameters, {
        basic_info: { first_name: "Ada", nickname: "The Countess" },
        unexpected_section: { anything: true },
      })
    ).toEqual({ basic_info: { first_name: "Ada" } });
  });

  it("rejects malformed nested sections", () => {
    expectInvalid(modifyWholeResumeTool.parameters, {
      work_experience: { company: "Acme" },
    });
    expectInvalid(modifyWholeResumeTool.parameters, {
      skills: [{ category: "Languages", items: "TypeScript" }],
    });
    expectInvalid(modifyWholeResumeTool.parameters, {
      education: [
        { school: "University", degree: "BSc", field: "CS", date: 2020 },
      ],
    });
    expectInvalid(modifyWholeResumeTool.parameters, {
      projects: [{ name: "Project", description: [1, 2] }],
    });
    expectInvalid(modifyWholeResumeTool.parameters, {
      basic_info: { email: 42 },
    });
  });
});

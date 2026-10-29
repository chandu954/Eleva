// @vitest-environment node
import { NextRequest } from "next/server";

import { stubTable } from "@/test/postgrest-stub";

export function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/eleva/api/studio/pipeline", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

export const JD =
  "We are hiring a Senior Backend Engineer to build TypeScript services with PostgreSQL, Docker and AWS.";

export const RESUME_ID = "123e4567-e89b-12d3-a456-426614174000";

export const extractFixture = {
  company: "Acme",
  role: "Senior Backend Engineer",
  required_skills: ["TypeScript", "PostgreSQL"],
  nice_to_have: ["AWS"],
  summary: "Build reliable backend services.",
};

export const initialScoreFixture = {
  overall: 62,
  keyword: 55,
  formatting: 80,
  readability: 82,
  impact: 60,
  recruiter: 58,
  matched: ["TypeScript", "PostgreSQL"],
  missing: ["Kubernetes", "AWS"],
  suggestions: [{ type: "warning" as const, text: "Add cloud depth", action: "Mention AWS projects" }],
  summary: "Initial ATS estimate.",
};

export const rescoreFixture = {
  ...initialScoreFixture,
  overall: 88,
  keyword: 85,
  matched: ["TypeScript", "PostgreSQL", "Docker"],
  missing: ["Kubernetes"],
  summary: "Tailored ATS estimate.",
};

export const planFixture = {
  compatibility: 55,
  rewriteSummary: true,
  rewriteExperience: true,
  rewriteProjects: true,
  rewriteSkills: true,
  sectionsToSkip: [],
  keywordsToInject: ["Kubernetes"],
  transferableSkills: [],
  hardTruthNote: null,
};

export const summaryFixture = {
  professional_summary:
    "Backend engineer with eight years building TypeScript services and PostgreSQL platforms.",
};

export const skillsFixture = {
  skills: [
    { category: "Languages", skills: ["TypeScript", "Go"] },
    { category: "Cloud", skills: ["AWS"] },
  ],
};

export const experienceFixture = {
  work_experience: [
    {
      company: "Acme",
      position: "Senior Engineer",
      location: "Remote",
      start_date: "2020",
      end_date: "Present",
      description: "Built services",
      responsibilities: ["Built TypeScript services", "Scaled PostgreSQL"],
    },
  ],
};

export const projectsFixture = {
  projects: [
    {
      name: "Eleva",
      description: ["Built the tailoring pipeline"],
      technologies: ["Next.js", "TypeScript"],
      url: null,
    },
  ],
};

export const qualityFixture = { passed: true, issues: [], score: 90 };

export const reviewFixture = {
  wouldInterview: true,
  score: 88,
  strengths: ["Strong backend depth"],
  weaknesses: ["Limited Kubernetes exposure"],
  genericAreas: [],
  recommendation: "Hire for a backend interview.",
  confidence: 80,
};

export const letterFixture = {
  text: "Dear Acme team,\n\nI build TypeScript systems at scale.\n\nBest,\nAda",
  model: "test/model",
  latency: 1,
};

export const resumeRow = {
  id: RESUME_ID,
  user_id: "user-1",
  name: "Base Resume",
  target_role: "Backend Engineer",
  professional_summary: "Old summary",
  work_experience: [{ company: "Acme", position: "Engineer", description: ["Old bullet"] }],
  skills: [{ category: "Languages", skills: ["TypeScript"] }],
  projects: [{ name: "Old project", description: ["Old"] }],
  education: [{ school: "Oxford", degree: "MSc" }],
  certifications: [{ name: "AWS" }],
};

export interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}

export function parseSse(payload: string): SseEvent[] {
  return payload
    .split("\n\n")
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split("\n");
      const event = lines.find((line) => line.startsWith("event: "))?.slice(7) ?? "";
      const data = lines.find((line) => line.startsWith("data: "))?.slice(6) ?? "{}";
      return { event, data: JSON.parse(data) as Record<string, unknown> };
    });
}

export function schemaShape(schema: unknown): Record<string, unknown> {
  return ((schema as { shape?: Record<string, unknown> }).shape ?? {});
}

export function respondToSchema(params: { schema: unknown; prompt?: string }): never {
  const shape = schemaShape(params.schema);
  if ("wouldInterview" in shape) return reviewFixture as never;
  if ("matched" in shape) {
    return (params.prompt?.startsWith("Rewritten Resume:")
      ? rescoreFixture
      : initialScoreFixture) as never;
  }
  if ("required_skills" in shape) return extractFixture as never;
  if ("compatibility" in shape) return planFixture as never;
  if ("professional_summary" in shape) return summaryFixture as never;
  if ("work_experience" in shape) return experienceFixture as never;
  if ("projects" in shape) return projectsFixture as never;
  if ("skills" in shape) return skillsFixture as never;
  if ("passed" in shape) return qualityFixture as never;
  throw new Error("unexpected pipeline schema");
}

export function resumePersistenceTables(row: Record<string, unknown> | null) {
  const select = stubTable({ data: row, error: null });
  const insert = stubTable({ data: null, error: null });
  const atsScores = stubTable({ data: null, error: null });
  const coverLetters = stubTable({ data: { id: "cl-1" }, error: null });
  const activity = stubTable({ data: null, error: null });
  const notifications = stubTable({ data: null, error: null });
  return {
    select,
    insert,
    atsScores,
    coverLetters,
    activity,
    notifications,
    tables: {
      resumes: [select, insert],
      ats_scores: atsScores,
      cover_letters: coverLetters,
      activity_log: activity,
      notifications,
    },
  };
}

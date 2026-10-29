// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Job, Resume } from "@/lib/types";
import { TailoredJobCard } from "@/components/resume/management/cards/tailored-job-card";

export const job: Job = {
  id: "job-1",
  user_id: "user-1",
  company_name: "Acme Corp",
  position_title: "Senior Engineer",
  job_url: "https://acme.example/jobs/1",
  description: "Build reliable distributed systems.",
  location: "Toronto",
  salary_range: "$150,000 - $180,000",
  keywords: ["React", "TypeScript", "Node.js"],
  work_location: "in_person",
  employment_type: "full_time",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  is_active: true,
};

export const resume = {
  id: "resume-1",
  user_id: "user-1",
  job_id: "job-1",
  is_base_resume: false,
} as Resume;

export const formattedJob = {
  company_name: "Acme Corp",
  position_title: "Senior Engineer",
  job_url: "",
  description: "Build reliable distributed systems.",
  location: "Toronto",
  salary_range: "$150,000 - $180,000",
  keywords: ["React"],
  work_location: "in_person",
  employment_type: "full_time",
};

export const validDescription =
  "We are looking for a senior engineer to build reliable distributed systems with React and TypeScript.";

export function renderCreateCard() {
  return render(<TailoredJobCard jobId={null} job={null} isLoading={false} />);
}

export async function openCreateDialog() {
  const user = userEvent.setup({ delay: null });
  renderCreateCard();
  await user.click(
    screen.getByRole("button", { name: /create (new )?job listing/i }),
  );
  return user;
}

export async function submitDescription(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByPlaceholderText("Paste the job description here..."),
    validDescription,
  );
  await user.click(screen.getByRole("button", { name: "Create with AI" }));
}

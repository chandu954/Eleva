import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuickStats } from "./quick-stats";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock("../../_components/count-up", () => ({
  CountUp: ({ to }: { to: number }) => <>{to}</>,
}));

const defaultMetrics = {
  resumes: 5,
  applications: 10,
  avgAts: 82,
  coverLetters: 2,
  interviews: 3,
  atsTrend: [70, 75, 78, 80, 82, 81, 82],
  applicationsTrend: [1, 2, 0, 3, 1, 2, 1],
  resumeGrowth: [1, 0, 1, 1, 0, 1, 1],
  weeklyProductivity: [3, 5, 2, 7, 4, 6, 3],
  atsDelta: 3,
  applicationsByStatus: { applied: 4, screening: 2, interview: 3, offer: 2, accepted: 1, rejected: 3 },
};

describe("QuickStats", () => {
  it("renders Applications Sent stat", () => {
    render(<QuickStats metrics={defaultMetrics} />);
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("renders multiple stat cards with value 3", () => {
    render(<QuickStats metrics={defaultMetrics} />);
    expect(screen.getAllByText("3")).toHaveLength(2);
  });

  it("calculates response rate", () => {
    render(<QuickStats metrics={defaultMetrics} />);
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("renders all four labels", () => {
    render(<QuickStats metrics={defaultMetrics} />);
    expect(screen.getByText("Applications Sent")).toBeInTheDocument();
    expect(screen.getByText("Interviews")).toBeInTheDocument();
    expect(screen.getByText("Response Rate")).toBeInTheDocument();
    expect(screen.getByText("Offers")).toBeInTheDocument();
  });
});

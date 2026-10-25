import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { StepLogPanel } from "./step-log-panel";

const logs = [
  { time: "10:00:01", message: "Extracting ✓", status: "done" as const, step: "extract" },
  { time: "10:00:02", message: "Tailoring resume", status: "running" as const, step: "tailor" },
  { time: "10:00:03", message: "Failed: rate limited", status: "error" as const, step: "score" },
];

describe("StepLogPanel", () => {
  it("renders nothing when there are no logs", () => {
    const { container } = render(<StepLogPanel logs={[]} defaultOpen />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the open log list with entries by default", () => {
    render(<StepLogPanel logs={logs} />);

    expect(screen.getByRole("button", { name: /Activity Log/i })).toHaveTextContent("(3)");
    expect(screen.getByText("10:00:01")).toBeInTheDocument();
    expect(screen.getByText("Extracting")).toBeInTheDocument();
    expect(screen.getByText("Tailoring resume")).toBeInTheDocument();
    expect(screen.getByText("Failed: rate limited")).toBeInTheDocument();
  });

  it("strips the ✓ marker from rendered messages", () => {
    render(<StepLogPanel logs={[{ time: "10:00:00", message: "Done ✓", status: "done" }]} />);
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("collapses and re-expands without unmounting entries", async () => {
    const user = userEvent.setup();
    render(<StepLogPanel logs={logs} defaultOpen />);

    await user.click(screen.getByRole("button", { name: /Activity Log/i }));
    await waitFor(() => expect(screen.queryByText("10:00:01")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Activity Log/i }));
    await waitFor(() => expect(screen.getByText("10:00:01")).toBeInTheDocument());
  });

  it("starts collapsed when defaultOpen is false", () => {
    render(<StepLogPanel logs={logs} defaultOpen={false} />);

    // Header still renders with the count…
    expect(screen.getByRole("button", { name: /Activity Log/i })).toHaveTextContent("(3)");
    // …but no entries are visible.
    expect(screen.queryByText("10:00:01")).not.toBeInTheDocument();
  });
});

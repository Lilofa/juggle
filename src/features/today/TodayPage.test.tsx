import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleTask } from "../../test/fixtures";
import { toDayString } from "../../lib/dates";
import { TodayPage } from "./TodayPage";

// TEST DATA ONLY: the Rust side is replaced with fake answers.
vi.mock("../../api/tasks", () => ({
  listOpenTasks: vi.fn(),
  updateTask: vi.fn(),
  taskToInput: vi.fn(),
}));
vi.mock("../../api/projects", () => ({ listProjects: vi.fn() }));

import { listOpenTasks } from "../../api/tasks";
import { listProjects } from "../../api/projects";

const yesterday = toDayString(new Date(Date.now() - 86_400_000));
const today = toDayString(new Date());

describe("TodayPage", () => {
  beforeEach(() => {
    vi.mocked(listProjects).mockResolvedValue([
      {
        id: 1,
        name: "Test project",
        color: "#2f6fed",
        description: "",
        archived: false,
        position: 1,
        openTaskCount: 3,
        createdAt: "",
        updatedAt: "",
      },
    ]);
  });

  it("groups tasks by deadline", async () => {
    vi.mocked(listOpenTasks).mockResolvedValue([
      sampleTask({ id: 1, title: "Late post", dueDate: yesterday }),
      sampleTask({ id: 2, title: "Post reel", dueDate: today }),
      sampleTask({ id: 3, title: "Sort photos", dueDate: null }),
    ]);
    render(<TodayPage />, { wrapper: MemoryRouter });

    const overdue = await screen.findByRole("region", { name: "Overdue" });
    expect(within(overdue).getByText("Late post")).toBeInTheDocument();
    expect(within(overdue).getByText("1 day overdue")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Today" })).getByText("Post reel"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "No deadline" })).getByText("Sort photos"),
    ).toBeInTheDocument();
  });

  it("says when everything is done", async () => {
    vi.mocked(listOpenTasks).mockResolvedValue([]);
    render(<TodayPage />, { wrapper: MemoryRouter });
    expect(await screen.findByText(/Nothing to do/)).toBeInTheDocument();
  });
});

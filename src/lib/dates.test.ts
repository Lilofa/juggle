import { describe, expect, it } from "vitest";
import { sampleTask } from "../test/fixtures";
import { buildMonthGrid, dueLabel, groupTasksByDue, isOverdue } from "./dates";

// Wednesday, 29 October 2026 (local time).
const NOW = new Date(2026, 9, 29, 12, 0);

describe("groupTasksByDue", () => {
  it("puts each task in the right group", () => {
    const tasks = [
      sampleTask({ id: 1, dueDate: "2026-10-28" }),
      sampleTask({ id: 2, dueDate: "2026-10-29" }),
      sampleTask({ id: 3, dueDate: "2026-11-01" }), // Sunday, same week
      sampleTask({ id: 4, dueDate: "2026-11-02" }), // next Monday
      sampleTask({ id: 5, dueDate: null }),
    ];
    const g = groupTasksByDue(tasks, NOW);
    expect(g.overdue.map((t) => t.id)).toEqual([1]);
    expect(g.today.map((t) => t.id)).toEqual([2]);
    expect(g.thisWeek.map((t) => t.id)).toEqual([3]);
    expect(g.later.map((t) => t.id)).toEqual([4]);
    expect(g.noDate.map((t) => t.id)).toEqual([5]);
  });
});

describe("dueLabel", () => {
  it("uses friendly words", () => {
    expect(dueLabel("2026-10-29", NOW)).toBe("Today");
    expect(dueLabel("2026-10-30", NOW)).toBe("Tomorrow");
    expect(dueLabel("2026-10-27", NOW)).toBe("2 days overdue");
    expect(dueLabel("2026-10-28", NOW)).toBe("1 day overdue");
    expect(dueLabel("2026-11-02", NOW)).toBe("Mon 2 Nov");
    expect(dueLabel("2027-01-15", NOW)).toBe("15 Jan 2027");
  });

  it("knows what is overdue", () => {
    expect(isOverdue("2026-10-28", NOW)).toBe(true);
    expect(isOverdue("2026-10-29", NOW)).toBe(false);
    expect(isOverdue(null, NOW)).toBe(false);
  });
});

describe("buildMonthGrid", () => {
  it("shows full Monday–Sunday weeks around the month", () => {
    const grid = buildMonthGrid(new Date(2026, 9, 15)); // October 2026
    expect(grid.from).toBe("2026-09-28");
    expect(grid.to).toBe("2026-11-01");
    expect(grid.weeks).toHaveLength(5);
    expect(grid.weeks.every((w) => w.length === 7)).toBe(true);
    expect(grid.weeks[0]![0]).toEqual({ day: "2026-09-28", inMonth: false });
    expect(grid.weeks[0]![3]).toEqual({ day: "2026-10-01", inMonth: true });
  });

  it("handles a month that needs 6 weeks", () => {
    const grid = buildMonthGrid(new Date(2026, 7, 1)); // August 2026 starts on Saturday
    expect(grid.weeks).toHaveLength(6);
  });
});

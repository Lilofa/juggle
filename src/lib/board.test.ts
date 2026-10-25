import { describe, expect, it } from "vitest";
import { sampleTask } from "../test/fixtures";
import { columnId, findColumn, moveTask, toColumns } from "./board";

const columns = () =>
  toColumns([
    sampleTask({ id: 1, status: "todo", position: 0 }),
    sampleTask({ id: 2, status: "todo", position: 1 }),
    sampleTask({ id: 3, status: "todo", position: 2 }),
    sampleTask({ id: 4, status: "doing", position: 0 }),
  ]);
const ids = (c: ReturnType<typeof columns>) => ({
  todo: c.todo.map((t) => t.id),
  doing: c.doing.map((t) => t.id),
  done: c.done.map((t) => t.id),
});

describe("board helpers", () => {
  it("finds the column of a card or column id", () => {
    expect(findColumn(columns(), 4)).toBe("doing");
    expect(findColumn(columns(), columnId("done"))).toBe("done");
    expect(findColumn(columns(), 99)).toBeNull();
  });

  it("moves a card down inside one column", () => {
    expect(ids(moveTask(columns(), 1, 3)).todo).toEqual([2, 3, 1]);
  });

  it("moves a card up inside one column", () => {
    expect(ids(moveTask(columns(), 3, 1)).todo).toEqual([3, 1, 2]);
  });

  it("moves a card before another card in a different column", () => {
    const next = moveTask(columns(), 2, 4);
    expect(ids(next)).toEqual({ todo: [1, 3], doing: [2, 4], done: [] });
    expect(next.doing[0]!.status).toBe("doing");
  });

  it("moves a card to the end of an empty column", () => {
    expect(ids(moveTask(columns(), 1, columnId("done")))).toEqual({
      todo: [2, 3],
      doing: [4],
      done: [1],
    });
  });

  it("does not change the input", () => {
    const before = columns();
    moveTask(before, 1, 4);
    expect(ids(before).todo).toEqual([1, 2, 3]);
  });
});

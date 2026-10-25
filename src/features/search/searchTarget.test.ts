import { describe, expect, it } from "vitest";
import { searchTarget } from "./searchTarget";

describe("searchTarget", () => {
  const base = { id: 7, projectId: 3, title: "x", snippet: "" };
  it("opens the right page for each kind", () => {
    expect(searchTarget({ ...base, kind: "project", projectId: 7 })).toBe("/projects/7/board");
    expect(searchTarget({ ...base, kind: "task" })).toBe("/projects/3/board?task=7");
    expect(searchTarget({ ...base, kind: "note" })).toBe("/projects/3/notes?note=7");
    expect(searchTarget({ ...base, kind: "file" })).toBe("/projects/3/files");
    expect(searchTarget({ ...base, kind: "post", projectId: null })).toBe("/calendar?post=7");
  });
});

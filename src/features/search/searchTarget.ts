import type { SearchResult } from "../../api/types";

/** The page to open for a search result. */
export function searchTarget(r: SearchResult): string {
  switch (r.kind) {
    case "project":
      return `/projects/${r.id}/board`;
    case "task":
      return `/projects/${r.projectId}/board?task=${r.id}`;
    case "note":
      return `/projects/${r.projectId}/notes?note=${r.id}`;
    case "file":
      return `/projects/${r.projectId}/files`;
    case "post":
      return `/calendar?post=${r.id}`;
  }
}

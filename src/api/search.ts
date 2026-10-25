import { call } from "./client";
import type { SearchResult } from "./types";

export const search = (query: string) => call<SearchResult[]>("search", { query });

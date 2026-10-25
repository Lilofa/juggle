import { invoke } from "@tauri-apps/api/core";

type Listener = () => void;
const listeners = new Set<Listener>();

/** Subscribe to "some data changed" signals. Returns an unsubscribe function. */
export function onDataChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyDataChanged() {
  listeners.forEach((l) => l());
}

/** Calls a Rust command. Errors from Rust arrive as plain text and become `Error`s. */
export async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (e) {
    throw new Error(typeof e === "string" ? e : String(e), { cause: e });
  }
}

/** Like `call`, then tells open screens to reload their data. */
export async function mutate<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const result = await call<T>(command, args);
  notifyDataChanged();
  return result;
}

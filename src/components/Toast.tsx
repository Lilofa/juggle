import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Kind = "info" | "error";
interface ToastItem {
  id: number;
  text: string;
  kind: Kind;
}

const ToastContext = createContext<(text: string, kind?: Kind) => void>(() => {});
let nextId = 1;

/** Small messages in the corner, for example "3 links added" or an error. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback((text: string, kind: Kind = "info") => {
    const id = nextId++;
    setItems((list) => [...list, { id, text, kind }]);
    setTimeout(
      () => setItems((list) => list.filter((i) => i.id !== id)),
      kind === "error" ? 7000 : 3500,
    );
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`toast toast-${item.kind}`}>
            {item.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

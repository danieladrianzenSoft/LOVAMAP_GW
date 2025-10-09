import { useEffect } from "react";

type Handler = (event: Event) => void;

export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: React.RefObject<T>,
  handler: Handler,
  options?: { mouseEvent?: "mousedown" | "click" | "pointerdown"; touchEvent?: boolean }
) {
  useEffect(() => {
    const mouseEvt = options?.mouseEvent ?? "mousedown";

    const listener = (event: Event) => {
      const el = ref?.current;
      // If no ref or click is inside element, do nothing
      if (!el || el.contains(event.target as Node)) return;
      handler(event);
    };

    document.addEventListener(mouseEvt, listener);
    if (options?.touchEvent ?? true) {
      document.addEventListener("touchstart", listener);
    }

    return () => {
      document.removeEventListener(mouseEvt, listener);
      if (options?.touchEvent ?? true) {
        document.removeEventListener("touchstart", listener);
      }
    };
  }, [ref, handler, options?.mouseEvent, options?.touchEvent]);
}
import {
  Dispatch,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
  useCallback,
} from "react";

type UsePanelResizeOptions = {
  axis: "x" | "y";
  decreaseKey: string;
  getMax: () => number;
  increaseKey: string;
  min: number;
  resizeCursor: "col-resize" | "row-resize";
  setSize: Dispatch<SetStateAction<number>>;
  size: number;
};

export const usePanelResize = ({
  axis,
  decreaseKey,
  getMax,
  increaseKey,
  min,
  resizeCursor,
  setSize,
  size,
}: UsePanelResizeOptions) => {
  const clamp = useCallback(
    (value: number) => Math.min(getMax(), Math.max(min, Math.round(value))),
    [getMax, min]
  );

  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const startPosition = axis === "x" ? event.clientX : event.clientY;
      const previousCursor = document.body.style.cursor;
      const previousSelection = document.body.style.userSelect;
      document.body.style.cursor = resizeCursor;
      document.body.style.userSelect = "none";

      const move = (pointerEvent: PointerEvent) => {
        const position =
          axis === "x" ? pointerEvent.clientX : pointerEvent.clientY;
        setSize(clamp(size + startPosition - position));
      };
      const stop = () => {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousSelection;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
    },
    [axis, clamp, resizeCursor, setSize, size]
  );

  const resizeWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 64 : 16;
    let nextSize: number | undefined;
    if (event.key === increaseKey) nextSize = size + step;
    if (event.key === decreaseKey) nextSize = size - step;
    if (event.key === "Home") nextSize = min;
    if (event.key === "End") nextSize = getMax();
    if (nextSize === undefined) return;
    event.preventDefault();
    setSize(clamp(nextSize));
  };

  return { resizeWithKeyboard, startResize };
};
